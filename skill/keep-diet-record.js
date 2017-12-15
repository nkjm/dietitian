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
                    if (["朝食", "昼食", "夕食"].includes(value)){
                        return resolve(value);
                    }
                    reject();
                },
                reaction: (error, value, bot, event, context, resolve, reject) => {
                    bot.change_message_to_confirm("diet", {
                        type: "text",
                        text: `${value}には何を食べたのかしら？`
                    });
                    resolve();
                }
            },
            diet: {
                parser: (value, bot, event, context, resolve, reject) => {
                    food.extract_food_list_with_nutrition_by_text(value).then((food_list_with_nutrition) => {
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
                    value.map((food_id) => {
                        diet_history_list.push({
                            diet_user: bot.extract_sender_id(),
                            diet_type: context.confirmed.diet_type,
                            diet_food: food_id
                        });
                    });

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
        let message = {
            type: "text",
            text: `了解。食べ過ぎはダメよ。`
        }
        return bot.reply(message).then((response) => {
            resolve();
        })
    }
}
