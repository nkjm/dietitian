"use strict";

const lmo = require("../service/line-message-object");

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
            diet: {}
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
