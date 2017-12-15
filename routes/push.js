'use strict';

require("dotenv").config();

const express = require('express');
const router = express.Router();
const body_parser = require('body-parser');
const request = require("request");
const crypto = require("crypto");
const debug = require("debug")("bot-express:route");
Promise = require("bluebird");
Promise.promisifyAll(request);

router.use(body_parser.json());

/**
API to send bot-express:push event to bot.
@param {Object} to
@param {Stirng} to.type
@param {String} to.userId
@param {String} to.roomId
@param {String} to.groupId
@param {Object} intent
*/
router.post('/', (req, res, next) => {

    debug(req.body);
    
    if (!req.body.to) return res.status(400).send('Required parameter: to not set.');
    if (!req.body.to.type) return res.status(400).send('Required parameter: to.type not set');
    if (!req.body.to[`${req.body.to.type}Id`]) return res.status(400).send(`Required parameter: to.${req.body.to.type}Id not set`);
    if (!req.body.intent) return res.status(400).json('Required parameter: intent not set.');

    const url = `http://localhost:${process.env.PORT || 5000}/webhook`;
    const body = {
        events: [{
            type: "bot-express:push",
            timestamp: Date.now(),
            to: req.body.to,
            intent: req.body.intent
        }]
    }
    const signature = crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(JSON.stringify(body)).digest('base64');
    const headers = {
        "X-Line-Signature": signature
    }

    request.postAsync({
        url: url,
        headers: headers,
        body: body,
        json: true
    }).then((response) => {
        if (response.statusCode == 200){
            res.sendStatus(200).end();
        } else {
            debug(response.body);
            res.sendStatus(500).end();
        }
    })
});

module.exports = router;
