"use strict";

require("dotenv").config();

const express = require('express');
const router = express.Router();
const debug = require("debug")("bot-express:route");
const Login = require("../service/line-login");
const db = require("../service/salesforce");
const cache = require("memory-cache");
const app = require("../index");
const CalorieCalc = require("../service/calorieCalc");
const NutritionCalc = require("../service/nutritionCalc");
Promise = require('bluebird');

router.get('/', (req, res, next) => {
    /**
    Check if user has account.
        Yes => Display Dashboard.
        No => Redirect to LINE Login.
    */

    if (process.env.NODE_ENV != "production"){
        req.session.user_id = "U2e250c5c3b8d3af3aa7dd9ad34ed15f9";
    }

    if (req.session.user_id){
        debug("Found user_id in session.");
        // Socket.IOのチャネル(Name Space)をオープン。
        if (!cache.get('channel-' + req.session.user_id)){
            let channel = app.io.of('/' + req.session.user_id);

            // Socket.IOでListenするEventを登録。
            channel.on('connection', (socket) => {
                // 食事履歴の更新をListenし、更新があればクライアントに通知。
                socket.on('personalHistoryUpdated', (dietHistoryList) => {
                    channel.emit("personalHistoryUpdated", dietHistoryList);
                });
            });

            // Channelを共有キャッシュに保存。
            cache.put('channel-' + req.session.user_id, channel);
        }
        debug("Going to get user.");
        db.get_user(req.session.user_id).then((user) => {
            debug("Got user.");
            let person = {
                line_id: user.user_id__c,
                sex: user.sex__c,
                birthday: user.birthday__c,
                height: user.height__c,
                weight: user.weight__c,
                picture_url: user.picture_url__c,
                activity: user.activity__c,
                display_name: user.display_name__c,
                first_login: user.first_login__c,
                security_code: user.security_code__c
            }
            person.birthday = new Date(person.birthday).getTime() / 1000;
            person.requiredCalorie = CalorieCalc.getRequiredCalorie(person.birthday, person.height, person.sex, person.activity);
            person.requiredNutrition = NutritionCalc.getRequiredNutrition(person.birthday, person.height, person.sex, person.activity);
            person.age = Math.floor(((new Date()).getTime() - person.birthday * 1000) / (1000 * 60 * 60 * 24 * 365));
            return res.render("dashboard", {releaseMode: "development", person: person});
        });
    } else {
        debug("Could not find user id in session. Initiating OAuth flow.");
        res.redirect("/oauth");
    }
});

module.exports = router;
