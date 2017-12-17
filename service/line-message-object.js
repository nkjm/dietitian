"use strict";

module.exports = class ServiceLineMessageObject {
    static create_template_button_message(options){
        let mo = {
            type: "template",
            altText: options.alt_text || options.text,
            template: {
                type: "buttons",
                text: options.text,
                actions: []
            }
        }
        options.labels.map((label) => {
            mo.template.actions.push({
                type: "message",
                label: label,
                text: label
            });
        });
        return mo;
    }

    static random(messages){
        let offset = Math.floor(Math.random() * (messages.length));
        return messages[offset];
    }
}
