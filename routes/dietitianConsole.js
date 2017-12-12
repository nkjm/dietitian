'use strict';

const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const request = require("request");
const crypto = require("crypto");
const PersonDb = require('../service/personDb');
const Dietitian = require('../service/dietitian');
const FoodDb = require('../service/foodDb');
const DIETITIAN_CONSOLE_SECURITY_CODE = process.env.DIETITIAN_CONSOLE_SECURITY_CODE;
Promise = require("bluebird");
Promise.promisifyAll(request);

router.use(bodyParser.json());

router.get('/api/askDietType', (req, res, next) => {
    if (!req.query.line_id) res.status(400).json('Line Id not set.');
    Dietitian.askDietType(req.query.line_id)
    .then(
        function(){
            res.status(200).end();
        },
        function(error){
            res.status(400).json(error);
        }
    );
});

router.get('/api/whatDidYouEat', (req, res, next) => {
    if (!req.query.line_id) res.status(400).json('Line Id not set.');
    if (!req.query.diet_type) res.status(400).json('Diet Type not set.');
    Dietitian.whatDidYouEat(req.query.line_id, req.query.diet_type)
    .then(
        function(){
            res.status(200).end();
        },
        function(error){
            res.status(400).json(error);
        }
    );
});


/**
API to send bot-express:push event to bot.
@param {Object} to
@param {Stirng} to.type
@param {String} to.userId
@param {String} to.roomId
@param {String} to.groupId
@param {Object} intent
*/
router.post('/api/push', (req, res, next) => {
    if (!req.body.to) res.status(400).send('Required parameter: to not set.');
    if (!req.body.to.type) res.status(400).send('Required parameter: to.type not set');
    if (!req.body.to[`${req.body.to.type}Id`]) res.status(400).send(`Required parameter: to.${req.body.to.type}Id not set`);
    if (!req.body.intent) res.status(400).json('Required parameter: intent not set.');

    const body = {
        replyToken: "dummy",
        type: "postback",
        timestamp: Date.now(),
        source: {
            type: "user",
            userId: "dummy"
        },
        postback: {
            data: {
                _type: "intent",
                to: req.body.to,
                intent: req.body.intent
            }
        }
    }
    const signature = crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(JSON.stringify(body)).digest('base64');
    const headers = {
        "X-Line-Signature": signature
    }
    request.postAsync({
        url: "http://localhost:" + process.env.PORT || 5000 + "/webhook",
        headers: headers,
        body: body,
        json: true
    }).then((response) => {
        if (response.statusCode == 200){
            res.sendStatus(200).end();
        } else {
            res.sendStatus(500).json(response.body);
        }
    })
});

router.get('/api/unidentifiedFoodList', (req, res, next) => {
    FoodDb.getUnidentifiedFoodList()
    .then(
        function(foodList){
            res.json(foodList);
        },
        function(error){
            res.status(400).json(error);
        }
    );
});

router.post('/api/food', (req, res, next) => {
    FoodDb.registerFood(req.body.food)
    .then(
        function(){
            res.status(200).end();
        },
        function(error){
            res.status(400).json(error);
        }
    );
});

router.get('/', (req, res, next) => {
    if (!req.query.security_code || req.query.security_code != DIETITIAN_CONSOLE_SECURITY_CODE){
        res.render('error', {severity: 'warning', message: 'セキュリティコードがセットされていないか、値が不正です。'});
        return;
    }

    PersonDb.getPersonList()
    .then(
        function(personList){
            // UIを出力。
            res.render('dietitianConsole', {personList: personList});
        },
        function(error){
            res.status(400).send('Could not get Person List. It seems Person Db is out of order.');
        }
    )
});

module.exports = router;
