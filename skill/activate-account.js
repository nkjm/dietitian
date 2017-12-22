"use javascript";

const debug = require("debug")("bot-express:skill");
const line_pay = require("line-pay");
const lmo = require("../service/line-message-object");
const user_db = require("../service/user");
Promise = require("bluebird");

const pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    isSandbox: true
});

module.exports = class SkillActivateAccount {
    constructor(){
        this.required_parameter = {
            activate: {
                message_to_confirm: lmo.create_template_button_message({
                    text: "サブスクリプションを購入しますか？",
                    altText: "サブスクリプションを購入しますか？",
                    labels: ["はい", "いいえ"]
                }),
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    if (value == "はい"){
                        let options = {
                            productName: "専属栄養士",
                            amount: 1,
                            currency: "JPY",
                            confirmUrl: process.env.LINE_PAY_CONFIRM_URL,
                            orderId: bot.extract_sender_id() + "-" + Date.now()
                        }

                        // Reserve payment via LINE Pay API
                        return pay.reserve(options).then((response) => {
                            context.confirmed.transaction_id = response.info.transactionId;
                            context.confirmed.payment_url = response.info.paymentUrl.app;

                            // Save order to order database.
                            user_db.reserve_order({
                                order_id: options.orderId,
                                transacation_id: response.info.transactionId,
                                amount: options.amount,
                                currency: options.currency,
                                user_id: bot.extract_sender_id()
                            });
                        }).then((response) => {
                            return resolve()
                        }).catch((exception) => {
                            debug(exception);
                            return reject(exception);
                        })
                    }
                }
            }
        }
        this.clear_context_on_finish = true;
    }

    finish(bot, event, context, resolve, reject){
        let message;
        if (context.confirmed.activate == "いいえ"){
            message = {
                type: "text",
                text: "無念"
            }
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
