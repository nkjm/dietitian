"use strict";

const debug = require("debug")("bot-express:skill");
const line_event = require("../service/line-event");
const user_db = require("../service/user");

module.exports = class SkillRecommendFood {
    constructor(){
    }

    begin(bot, event, context, resolve, reject){
        return user_db.check_subscription(bot.extract_sender_id()).then((response) => {
            if (response === true){
                context.confirmed.subscription = true;
                debug("This user has subscription");
                return resolve();
            }
            debug("This user does not have subscription");
            context.confirmed.subscription = false;
            return resolve();
        })
    }

    finish(bot, event, context, resolve, reject){
        if (!context.confirmed.subscription){
            return SkillRecommendFood.ask_buy_subscription(bot.extract_sender_id()).then((response) => {
                return resolve();
            });
        }

        return bot.reply({
            type: "text",
            text: "そうですね。カレーでも食べたらどうですか？"
        }).then((response) => {
            return resolve();
        })
    }

    static ask_buy_subscription(user_id){
        return line_event.fire({
            type: "bot-express:push",
            to: {
                type: "user",
                userId: user_id
            },
            intent: {
                name: "activate-account"
            }
        });
    }
}
