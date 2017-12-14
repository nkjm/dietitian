"use strict";

require("dotenv").config();

const express = require('express');
const router = express.Router();
const debug = require("debug")("bot-express:route");
const Login = require("../service/line-login");
const db = require("../service/salesforce");
const cache = require("memory-cache");
const app = require("../index");
Promise = require('bluebird');

router.get('/', (req, res, next) => {
    /**
    Check if user has account.
        Yes => Display Dashboard.
        No => Redirect to LINE Login.
    */
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
            return res.render("dashboard", {releadMode: "development", person: person});
        });
    } else {
        res.redirect("/oauth");
    }
});

module.exports = router;
