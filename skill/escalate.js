"use strict";

const debug = require("debug")("bot-express:skill");
const line_admin_user_id = process.env.LINE_ADMIN_USER_ID;
const supported_message_types = ["text", "sticker", "location"];
Promise = require("bluebird");

module.exports = class SkillEscalate {
    constructor(){
        this.clear_context_on_finish = true;
    }

    finish(bot, event, context, resolve, reject){

        if (!supported_message_types.includes(event.message.type)){
            debug(`${event.message.type} message type is not supported in simple-forward skill. Supported message types are text and sticker message type. We just skip processing this event.`);
            return resolve();
        }

        let tasks = [];

        // Send escalation message to admin.
        let messages_to_admin = [];
        tasks.push(
            Promise.resolve()
            .then((response) => {
                // Get sender's displayName.
                return bot.plugin.line.sdk.getProfile(bot.extract_sender_id());
            })
            .then((response) => {
                messages_to_admin.push({
                    type: "text",
                    text: `${response.displayName}さんからいただいた次のメッセージがわかりませんでした。`
                });

                let orig_message = JSON.parse(JSON.stringify(event.message));
                delete orig_message.id;
                messages_to_admin.push(orig_message);

                messages_to_admin.push({
                    type: "template",
                    altText: `さて、どうしますか？`,
                    template: {
                        type: "buttons",
                        text: `さて、どうしますか？`,
                        actions: [{
                            type: "postback",
                            label: "回答する",
                            data: JSON.stringify({
                                _type: "intent",
                                intent: {
                                    name: "human-reply",
                                    parameters: {
                                        user_id: bot.extract_sender_id(),
                                        question: orig_message.text
                                    }
                                }
                            })
                        }]
                    }
                });

                // Send message to admin.
                return bot.send(line_admin_user_id, messages_to_admin);
            })
        );

        return Promise.all(tasks).then((response) => {
            return resolve();
        });
    }
};
