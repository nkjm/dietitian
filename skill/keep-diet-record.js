"use strict";

require("dotenv").config();

const lmo = require("../service/line-message-object");
const debug = require("debug")("bot-express:skill");
const mecab = require("mecabaas-client");
const user_db = require("../service/user");
const food_db = require("../service/food");
const Nlu = require("../node_modules/bot-express/module/nlu");
const nlu = new Nlu({
    options: {
        client_access_token: process.env.DIALOGFLOW_CLIENT_ACCESS_TOKEN
    }
});

module.exports = class SkillKeepDietRecord {
    constructor(){
        this.required_parameter = {
            diet_type: {
                message_to_confirm: lmo.create_template_button_message({
                    text: "どの食事でいただいたの？",
                    altText: "どの食事でいただいたの？朝食？昼食？夕食?",
                    labels: ["朝食", "昼食", "夕食"]
                }), // This parameter is expected to be filled by intent postback.
                parser: (value, bot, event, context, resolve, reject) => {
                    if (value == "朝食") return resolve({label: "朝食", name: "breakfast"});
                    if (value == "昼食") return resolve({label: "昼食", name: "lunch"});
                    if (value == "夕食") return resolve({label: "夕食", name: "dinner"});
                    reject();
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    let message;
                    if (context._flow == "push"){
                        message = {
                            type: "text",
                            text: `今日の${value.label}は何を食べたのかしら？`
                        }
                    } else {
                        let sticker_messages = [{
                            type: "sticker",
                            packageId: 2,
                            stickerId: 179
                        },{
                            type: "sticker",
                            packageId: 2,
                            stickerId: 172
                        },{
                            type: "sticker",
                            packageId: 1,
                            stickerId: 13
                        }];
                        bot.queue(lmo.random(sticker_messages));
                        let messages = [{
                            type: "text",
                            text: "わざわざどうも。何を食べたの？"
                        },{
                            type: "text",
                            text: "これはこれは。では教えてください。"
                        }];
                        message = lmo.random(messages);
                    }
                    bot.change_message_to_confirm("diet", message);
                    resolve();
                }
            },
            diet: {
                parser: (value, bot, event, context, resolve, reject) => {
                    return food_db.search_food(value).then((food_list) => {
                        if (food_list && food_list.length > 0){
                            // We found some foods.
                            return resolve(food_list);
                        }

                        debug('Could not find food.');
                        bot.change_message_to_confirm("diet", {
                            type: "text",
                            text: "ごめんなさい、何を食べたのかわからなかったわ。もうちょっとわかりやすくお願いできるかしら？"
                        });
                        return reject();
                    });
                },
                reaction: (error, food_list, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    // Save diet history.
                    return user_db.save_diet_history_list(
                        bot.extract_sender_id(),
                        context.confirmed.diet_type.name,
                        food_list
                    ).then((response) => {
                        return resolve();
                    }).catch((error) => {
                        return reject(error);
                    });
                }
            }
        }
    }

    finish(bot, event, context, resolve, reject){
        return user_db.get_calorie_to_go(bot.extract_sender_id()).then((calorie_to_go) => {
            let message_text;
            if (calorie_to_go > 0){
                if (calorie_to_go < 300){
                    let sticker_messages = [{
                        type: "sticker",
                        packageId: 1,
                        stickerId: 425
                    }];
                    bot.queue(lmo.random(sticker_messages));
                    message_text = 'そろそろやばいよ。カロリー満タンまであと' + calorie_to_go + 'kcalですからね。';
                } else {
                    let sticker_messages = [{
                        type: "sticker",
                        packageId: 1,
                        stickerId: 407
                    }];
                    bot.queue(lmo.random(sticker_messages));
                    message_text = '了解。カロリー満タンまであと' + calorie_to_go + 'kcalですよー。';
                }
            } else if (calorie_to_go < 0){
                let sticker_messages = [{
                    type: "sticker",
                    packageId: 2,
                    stickerId: 520
                },{
                    type: "sticker",
                    packageId: 1,
                    stickerId: 113
                },{
                    type: "sticker",
                    packageId: 1,
                    stickerId: 102
                },{
                    type: "sticker",
                    packageId: 1,
                    stickerId: 121
                }];
                bot.queue(lmo.random(sticker_messages));
                message_text = 'もう絶対食べたらあかん。' + calorie_to_go * -1 + 'kcal超過してます。';
            } else if (calorie_to_go == 0){
                let sticker_messages = [{
                    type: "sticker",
                    packageId: 2,
                    stickerId: 144
                }];
                bot.queue(lmo.random(sticker_messages));
                message_text = 'カロリー、ちょうど満タンです！';
            } else {
                message_text = 'あれ、満タンまであとどれくらいだろう・・';
            }
            let message = {
                type: 'template',
                altText: message_text,
                template: {
                    type: 'buttons',
                    text: message_text,
                    actions: [{
                        type: 'uri',
                        label: 'マイページで確認',
                        uri: "https://dietitian.herokuapp.com/dashboard"
                    }]
                }
            }
            return bot.reply(message);
        }).then((response) => {
            return resolve();
        }).catch((error) => {
            debug(error);
            return reject(error);
        })
    }
}
