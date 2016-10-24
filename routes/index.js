'use strict';

const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const app = require('../app');

router.get('/', (req, res, next) => {
    // 仮のユーザー情報
    let person = {
        id: '12345',
        lastname: '中嶋',
        firstname: '一樹',
        sex: 'male',
        height: 179,
        weight: 68,
        birthday: 282150000,
        age: 37,
        blood: 'O',
        icon_url: 'https://pbs.twimg.com/profile_images/639581805012652032/UOExxVmi.jpg'
    };

    // Socket.IOのチャネル(Name Space)をオープン。
    if (!cache.get(person.id)){
        let channel = app.io.of('/' + person.id);

        // Socket.IOでListenするEventを登録。
        channel.on('connection', function(socket){
            // 食事履歴の更新をListenし、更新があればクライアントに通知。
            socket.on('personalHistoryUpdated', function(dietHistoryList){
                channel.emit("personalHistoryUpdated", dietHistoryList);
            });
        });

        // Channelを共有キャッシュに保存。
        cache.put(person.id, channel);
    }

    // UIを出力。
    res.render('index', {person: person});
});

module.exports = router;
