"use strict";

require("dotenv").config();

const debug = require("debug")("bot-express:service");
const crypto = require("crypto");
const request = require("request");
Promise = require("bluebird");
Promise.promisifyAll(request);

module.exports = class LineEvent {
    static fire(event){
        let url = `http://localhost:${process.env.PORT || 5000}/webhook`;

        let body = {events: [event]};
        let signature = crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(JSON.stringify(body)).digest('base64');
        let headers = {"X-Line-Signature": signature};
        return request.postAsync({
            url: url,
            headers: headers,
            body: body,
            json: true
        });
    }
}
