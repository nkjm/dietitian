"use strict";

require("dotenv").config();

const express = require('express');
const router = express.Router();
const debug = require("debug")("bot-express:route");
const cache = require("memory-cache");
const body_parser = require("body-parser");
const app = require("../index");
const calorie = require("../service/calorie");
const nutrition = require("../service/nutrition");
const Salesforce = require("../service/salesforce");
const db = new Salesforce();
Promise = require('bluebird');

router.use(body_parser.json());

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
        debug("Going to get user...");
        db.get_user(req.session.user_id).then((user) => {
            debug("Completed get user.");
            return res.render("dashboard", {releaseMode: "development", person: user});
        });
    } else {
        debug("Could not find user id in session. Initiating OAuth flow.");
        res.redirect("/oauth");
    }
});

router.get('/api/today_diet_history/:user_id', (req, res, next) => {
    if (req.session.user_id != req.params.user_id){
        debug("session not found.");
    }
    debug("Going to get today diet history...");
    return db.get_today_history(req.params.user_id).then((history) => {
        debug("Completed get today diet history.");
        return res.json(history);
    }).catch((error) => {
        debug(error);
        return res.sendStatus(500);
    });
});

router.put('/api/user/:user_id', (req, res, next) => {
    let user = req.body.person;
    user.user_id = req.params.user_id;
    user.first_login = 0;
    debug("Going to upsert user...");
    return db.upsert_user(user, "user_id__c").then((response) => {
        debug("Completed upsert user.");
        return res.sendStatus(200);
    }, (error) => {
        debug(error);
        return res.sendStatus(500);
    });
});

router.get('/api/user/:user_id', (req, res, next) => {
    debug("Going to get user...");
    return db.get_user(req.params.user_id).then((response) => {
        debug("Completed get user.");
        return res.json(response);
    }, (error) => {
        debug(error);
        return res.sendStatus(500);
    });
});

module.exports = router;
