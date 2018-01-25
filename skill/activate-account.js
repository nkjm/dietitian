"use javascript";

const debug = require("debug")("bot-express:skill");
const line_pay = require("line-pay");
const lmo = require("../service/line-message-object");
const user_db = require("../service/user");
Promise = require("bluebird");

const pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    hostname: process.env.LINE_PAY_HOSTNAME,
    isSandbox: true
});

module.exports = class SkillActivateAccount {
    constructor(){
        this.required_parameter = {
            activate: {
                message_to_confirm: lmo.create_template_confirm_message({
                    text: "このスキルを利用するには専属栄養士Pro（月額300円）へのアップグレードが必要です。アップグレードしますか？",
                    altText: "このスキルを利用するには専属栄養士Pro（月額300円）へのアップグレードが必要です。アップグレードしますか？",
                    labels: ["はい", "いいえ"]
                }),
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    if (value === "いいえ"){
                        return resolve();
                    }

                    let options = {
                        productName: "専属栄養士",
                        amount: 300,
                        currency: "JPY",
                        confirmUrl: process.env.LINE_PAY_CONFIRM_URL,
                        confirmUrlType: "SERVER",
                        orderId: bot.extract_sender_id() + "-" + Date.now()
                    }

                    // Reserve payment via LINE Pay API
                    return pay.reserve(options).then((response) => {
                        context.confirmed.transaction_id = response.info.transactionId;
                        context.confirmed.order_id = options.orderId;
                        context.confirmed.payment_url = response.info.paymentUrl.web;

                        // Save order to order database.
                        return user_db.save_order({
                            order_id: options.orderId,
                            transaction_id: response.info.transactionId,
                            amount: options.amount,
                            currency: options.currency,
                            user_id: bot.extract_sender_id()
                        });
                    }).then((response) => {
                        return resolve()
                    }).catch((exception) => {
                        return reject(exception);
                    })
                }
            }
        }
        //this.clear_context_on_finish = true;
    }

    finish(bot, event, context, resolve, reject){
        let message;
        if (context.confirmed.activate == "いいえ"){
            message = lmo.random([{
                type: "text",
                text: "なんだよ。"
            },{
                type: "text",
                text: "器が小さいなー"
            }]);
        } else {
            message = {
                type: "template",
                altText: "ありがとうございます！、こちらから決済に進んでください〜",
                template: {
                    type: "buttons",
                    text: "ありがとうございます！、こちらから決済に進んでください〜",
                    actions: [
                        {type:"uri", label:"LINE Payで決済する", uri:context.confirmed.payment_url}
                    ]
                }
            }
        }
        return bot.reply(message).then((response) => {
            return resolve();
        })
    }

}
