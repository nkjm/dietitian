'use strict';

const LINE_CHANNEL_ID = process.env.LINE_CHANNEL_ID;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_MID = process.env.LINE_MID;
const BOT_ADMIN_LINE_MID = process.env.BOT_ADMIN_LINE_MID;
const crypto = require('crypto');

module.exports = class LineBot {

    static validateSignature(signature, rawBody){
        // Signature Validation
        let hash = crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(rawBody).digest('base64');
        if (hash != signature) {
            return false;
        }
        return true;
    }

    static sendMessage(){
    }

};
