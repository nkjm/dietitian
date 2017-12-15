'use strict';

require("dotenv").config();

const express = require('express');
const router = express.Router();
const body_parser = require('body-parser');
const request = require("request");
const crypto = require("crypto");
const PersonDb = require('../service/personDb');
const Dietitian = require('../service/dietitian');
const FoodDb = require('../service/food');
const DIETITIAN_CONSOLE_SECURITY_CODE = process.env.DIETITIAN_CONSOLE_SECURITY_CODE;
const debug = require("debug")("bot-express:route");
Promise = require("bluebird");
Promise.promisifyAll(request);

router.use(body_parser.json());

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
