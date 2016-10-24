'use strict';

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_MID = process.env.LINE_MID;
const BOT_ADMIN_LINE_MID = process.env.BOT_ADMIN_LINE_MID;
const crypto = require('crypto');
const request = require('request');
const Promise = require('bluebird');

module.exports = class LineBot {

    static validateSignature(signature, rawBody){
        // Signature Validation
        let hash = crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(rawBody).digest('base64');
        if (hash != signature) {
            return false;
        }
        return true;
    }

    static reply(replyToken, message){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
            };
            let form = {
                replyToken: replyToken,
                messages: [{
                    type: 'text',
                    text: message
                }]
            }
            let url = 'https://api.line.me/v2/bot/message/reply';
            console.log(headers);
            console.log(form);
            request({
                url: url,
                method: 'POST',
                headers: headers,
                form: form
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

};
