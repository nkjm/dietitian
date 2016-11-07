'use strict';

const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const app = require('../app');
const PersonDb = require('../personDb');
const Promise = require('bluebird');
const CalorieCalc = require('../calorieCalc');

Promise.config({
    // Enable cancellation
    cancellation: true
});

router.get('/:line_id', (req, res, next) => {
    if (!req.params.line_id){
        return res.error(400).send('Line id not set.');
    }
    let personDb = new PersonDb();
    let p = PersonDb.getPerson(req.params.line_id)
    .then(
        function(person){
            if (!person){
                p.cancel();
            }

            // Socket.IOのチャネル(Name Space)をオープン。
            if (!cache.get('channel-' + person.line_id)){
                let channel = app.io.of('/' + person.line_id);

                // Socket.IOでListenするEventを登録。
                channel.on('connection', function(socket){
                    // 食事履歴の更新をListenし、更新があればクライアントに通知。
                    socket.on('personalHistoryUpdated', function(dietHistoryList){
                        channel.emit("personalHistoryUpdated", dietHistoryList);
                    });
                });

                // Channelを共有キャッシュに保存。
                cache.put('channel-' + person.line_id, channel);
            }

            // UIを出力。
            res.render('index', {person: person});
        },
        function(error){
            return res.error(400).send('Could not get person from Person Db. It seems Person Db is out of order.');
        }
    )
});

module.exports = router;
