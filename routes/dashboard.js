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
const user_db = require("../service/user");
Promise = require('bluebird');

router.use(body_parser.json());

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
        debug("Going to get user...");
        user_db.get_user(req.session.user_id).then((user) => {
            debug("Completed get user.");
            return res.render("dashboard", {release_mode: process.env.NODE_ENV, person: user, dietitian_token: req.session.dietitian_token});
        });
    } else {
        debug("Could not find user id in session. Initiating OAuth flow.");
        res.redirect("/oauth");
    }
});

router.get('/api/today_diet_history/:user_id', (req, res, next) => {
    if (!validate_dietitian_token(req, req.session.dietitian_token)){
        return res.sendStatus(403);
    }
    debug("Going to get today diet history...");
    return user_db.get_today_history(req.params.user_id).then((history) => {
        debug("Completed get today diet history.");
        return res.json(history);
    }).catch((error) => {
        debug(error);
        return res.sendStatus(500);
    });
});

router.put('/api/user/:user_id', (req, res, next) => {
    if (!validate_dietitian_token(req, req.session.dietitian_token)){
        return res.sendStatus(403);
    }
    let user = req.body.person;
    user.user_id = req.params.user_id;
    user.first_login = 0;
    debug("Going to upsert user...");
    return user_db.upsert_user(user, "user_id__c").then((response) => {
        debug("Completed upsert user.");
        return res.sendStatus(200);
    }, (error) => {
        debug(error);
        return res.sendStatus(500);
    });
});

router.get('/api/user/:user_id', (req, res, next) => {
    if (!validate_dietitian_token(req, req.session.dietitian_token)){
        return res.sendStatus(403);
    }
    debug("Going to get user...");
    return user_db.get_user(req.params.user_id).then((response) => {
        debug("Completed get user.");
        return res.json(response);
    }, (error) => {
        debug(error);
        return res.sendStatus(500);
    });
});

function validate_dietitian_token(req, dietitian_token){
    if (!req.get("X-DIETITIAN-TOKEN")) return false;
    if (!dietitian_token) return false;

    if (req.get("X-DIETITIAN-TOKEN") === dietitian_token){
        return true;
    }
    return false;
}

module.exports = router;
