'use strict';

const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const app = require('../app');
const PersonDb = require('../personDb');
const Promise = require('bluebird');
const CalorieCalc = require('../calorieCalc');

router.get('/:line_id', (req, res, next) => {
    if (!req.params.line_id){
        return res.error(400).send('Line id not set.');
    }
    let personDb = new PersonDb();
    personDb.getPerson(req.params.line_id)
    .then(
        function(person){
            person.requiredCalorie = CalorieCalc.getRequiredCalorie(person.birthday, person.height, person.sex);
            personDb.person = person;

            // Socket.IOのチャネル(Name Space)をオープン。
            if (!cache.get(personDb.person.line_id)){
                let channel = app.io.of('/' + personDb.person.line_id);

                // Socket.IOでListenするEventを登録。
                channel.on('connection', function(socket){
                    // 食事履歴の更新をListenし、更新があればクライアントに通知。
                    socket.on('personalHistoryUpdated', function(dietHistoryList){
                        channel.emit("personalHistoryUpdated", dietHistoryList);
                    });
                });

                // Channelを共有キャッシュに保存。
                cache.put(personDb.person.line_id, channel);
            }

            // UIを出力。
            res.render('index', {person: personDb.person});
        },
        function(error){
            return res.error(400).send('Could not get person from Person Db. It seems Person Db is out of order.');
        }
    )
});

module.exports = router;
