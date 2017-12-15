"use strict";

const lmo = require("../service/line-message-object");
const debug = require("debug")("bot-express:skill");
const mecab = require("mecabaas-client");
const food = require("../service/food");
const Salesforce = require("../service/salesforce");
const db = new Salesforce();

module.exports = class SkillKeepDietRecord {
    constructor(){
        this.required_parameter = {
            diet_type: {
                message_to_confirm: lmo.createTemplateButtonMessage({
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
                    bot.change_message_to_confirm("diet", {
                        type: "text",
                        text: `今日の${value.label}は何を食べたのかしら？`
                    });
                    resolve();
                }
            },
            diet: {
                parser: (value, bot, event, context, resolve, reject) => {
                    return food.extract_food_list_with_nutrition_by_text(value).then((food_list_with_nutrition) => {
                        // もし認識された食品がなければ、処理をストップしてごめんねメッセージを送る。
                        if (!food_list_with_nutrition || food_list_with_nutrition.length == 0){
                            debug('Could not find corresponding food in database.');
                            bot.change_message_to_confirm("diet", {
                                type: "text",
                                text: "ごめんなさい、何を食べたのかわからなかったわ。もうちょっとわかりやすくお願いできるかしら？"
                            });
                            return reject();
                        }
                        return resolve(food_list_with_nutrition);
                    });
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    if (error) return resolve();

                    let diet_history_list = [];
                    value.map((food) => {
                        diet_history_list.push({
                            diet_user: bot.extract_sender_id(),
                            diet_type: context.confirmed.diet_type.name,
                            diet_food: food.Id,
                            food_full: food
                        });
                    });

                    debug("Going to save following history.");
                    debug(diet_history_list);

                    // Save diet history.
                    return db.save_diet_history_list(diet_history_list).then((response) => {
                        return resolve();
                    }).catch((error) => {
                        return reject(error);
                    });
                }
            }
        }
    }

    finish(bot, event, context, resolve, reject){
        let query = "select sum(calorie__c) today_total_calorie from diet_history__c where diet_date__c = today and diet_user__r.user_id__c = '" + bot.extract_sender_id() + "'";
        let today_total_calorie;
        return db.query(query).then((response) => {
            if (response.records.length != 1){
                return Promise.reject(new Error("Could not get today total calorie."));
            }
            today_total_calorie = response.records[0].today_total_calorie;
            return db.get_user(bot.extract_sender_id());
        }).then((user) => {
            let calorie_to_go = user.requiredCalorie - today_total_calorie;
            let message_text;
            if (calorie_to_go > 0){
                message_text = '了解。カロリー満タンまであと' + calorie_to_go + 'kcalですよー。';
            } else if (calorie_to_go < 0){
                message_text = 'もう絶対食べたらあかん。' + calorie_to_go * -1 + 'kcal超過してます。';
            } else if (calorie_to_go == 0){
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
        })
    }
}
