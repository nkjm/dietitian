'use strict';

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const crypto = require('crypto');
const request = require('request');
const Promise = require('bluebird');

module.exports = class LineBot {

    static pushMessage(to, message){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
            };
            let body = {
                to: to,
                messages: [message]
            }
            let url = 'https://api.line.me/v2/bot/message/push';
            request({
                url: url,
                method: 'POST',
                headers: headers,
                body: body,
                json: true
            }, function (error, response, body) {
                (error) ? reject(error) : resolve();
            });
        });
    }

    static replyMessage(replyToken, message){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
            };
            let body = {
                replyToken: replyToken,
                messages: [message]
            }
            let url = 'https://api.line.me/v2/bot/message/reply';
            request({
                url: url,
                method: 'POST',
                headers: headers,
                body: body,
                json: true
            }, function (error, response, body) {
                (error) ? reject(error) : resolve();
            });
        });
    }

    static validateSignature(signature, rawBody){
        // Signature Validation
        let hash = crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(rawBody).digest('base64');
        if (hash != signature) {
            return false;
        }
        return true;
    }

};
