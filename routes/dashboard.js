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
    if (req.session.user){
        // Socket.IOのチャネル(Name Space)をオープン。
        if (!cache.get('channel-' + req.session.user.user_id__c)){
            let channel = app.io.of('/' + req.session.user.user_id__c);

            // Socket.IOでListenするEventを登録。
            channel.on('connection', (socket) => {
                // 食事履歴の更新をListenし、更新があればクライアントに通知。
                socket.on('personalHistoryUpdated', (dietHistoryList) => {
                    channel.emit("personalHistoryUpdated", dietHistoryList);
                });
            });

            // Channelを共有キャッシュに保存。
            cache.put('channel-' + req.session.user.user_id__c, channel);
        }
        return res.render("dashboard", {user: user});
    } else {
        res.redirect("/oauth");
    }
});

module.exports = router;
