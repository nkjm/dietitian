"use strict";

module.exports = class LineMessageObject {
    static createTemplateButtonMessage(options){
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
}
