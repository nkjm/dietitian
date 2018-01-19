"use strict";

const debug = require("debug")("bot-express:skill");

/*
** Just reply the text response provided from NLU.
*/
module.exports = class SkillSimpleResponse {
    constructor(){
        this.clear_context_on_finish = true;
    }

    finish(bot, event, context, resolve, reject){
        let message;
        if (context.intent.fulfillment && context.intent.fulfillment.messages && context.intent.fulfillment.messages.length > 0){
            let offset = Math.floor(Math.random() * (context.intent.fulfillment.messages.length));
            if (context.intent.fulfillment.messages[offset].type === 0){
                message = {
                    type: "text",
                    text: context.intent.fulfillment.messages[offset].speech
                }
            } else if (context.intent.fulfillment.messages[offset].type === 4){
                // Set payload to message as it is.
                message = context.intent.fulfillment.messages[offset].payload;
            }
        }

        let done_reply;

        // Send question to the user.
        if (context._flow == "push"){
            debug("We use send method to collect parameter since this is push flow.");
            debug("Reciever userId is " + event.to[`${event.to.type}Id`]);
            done_reply = bot.send(event.to[`${event.to.type}Id`], message);
        } else {
            debug("We use reply method to collect parameter.");
            done_reply = bot.reply(message);
        }

        done_reply.then((response) => {
            return resolve();
        });
    }
};
