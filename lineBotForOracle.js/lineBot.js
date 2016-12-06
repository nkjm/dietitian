'use strict';

const LINE_CHANNEL_ID = 1485503788;
const LINE_CHANNEL_SECRET = 8414e25bcb6bed8d928a77f0d23b116f;
const LINE_CHANNEL_ACCESS_TOKEN = JkIbAn3nLwihG9jyNqzxCEqjntHo7kMzkGpGac4JzSIVq47xM3uss3lxOZxgFJlZscEvfuQjVEHgWEpkmMyrcba/yRjBGavmI6ASkLqnTKCJHQuD8lNm9GK+AXT5yInMv3qf2kRfjF9TUX4n92WHpwdB04t89/1O/w1cDnyilFU=;
const crypto = require('crypto');
const request = require('request');
const Promise = require('bluebird');

module.exports = class LineBot {

    static getProfile(lineId){
        console.log("Getting profile...");
        return new Promise(function(resolve, reject){
            const url = 'https://api.line.me/v2/bot/profile/' + lineId;
            const headers = {
                'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
            };
            request({
                url: url,
                method: 'GET',
                headers: headers,
                json: true,
            }, function (error, response, body) {
                (error) ? reject(error) : resolve(body);
            });
        });
    }

    static pushMessage(to, message){
        console.log("Pushing message...");
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
        console.log("Replying message...");
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
