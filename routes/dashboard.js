"use strict";

const express = require('express');
const router = express.Router();
const debug = require("debug")("bot-express:route");
const cache = require("memory-cache");
const app = require("../index");
Promise = require('bluebird');

router.get('/', (req, res, next) => {
    /**
    Check if user has account.
        Yes => Display Dashboard.
        No => Redirect to LINE Login.
    */

    user_db.get_user(req.session.user_id).then((person) => {
        if (person){
            // Socket.IOのチャネル(Name Space)をオープン。
            if (!cache.get('channel-' + person.line_id)){
                let channel = app.io.of('/' + person.line_id);

                // Socket.IOでListenするEventを登録。
                channel.on('connection', (socket) => {
                    // 食事履歴の更新をListenし、更新があればクライアントに通知。
                    socket.on('personalHistoryUpdated', (dietHistoryList) => {
                        channel.emit("personalHistoryUpdated", dietHistoryList);
                    });
                });

                // Channelを共有キャッシュに保存。
                cache.put('channel-' + person.line_id, channel);
            }

            return res.render('dashboard', {person: person});
        } else {
            return res.redirect("/oauth");
        }
    });
});

module.exports = router;