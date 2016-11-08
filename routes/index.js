'use strict';

const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const app = require('../app');
const PersonDb = require('../personDb');
const Promise = require('bluebird');
const CalorieCalc = require('../calorieCalc');
const Line = require('../line');

Promise.config({
    // Enable cancellation
    cancellation: true
});

router.get('/', (req, res, next) => {
    res.render('login', {});
});

router.get('/callback', (req, res, next) => {
     /*
     1. 取得した認証コードでアクセストークンをリクエスト（POST）。
     2. ユーザープロファイルを取得。
     3. 取得したユーザープロファイルで私の栄養士サービスのアカウントを作成。
     4. 私の栄養士サービスのマイページにリダイレクト。
     */
     if (!req.query.code){
         console.log('Auhorization code not found in callback request');
         res.status(400).send();
         return;
     }
     
     console.log('Code is ' + req.query.code);
     const line = new Line();

     // 取得した認証コードでアクセストークンをリクエスト（POST）。
     line.requestToken(req.query.code)
     .then(
         // ユーザープロファイルを取得。
         function(){
             return line.getProfile(line.mid);
         },
         function(error){
             return Promise.reject(error);
         }
     )
     .then(
         // 取得したユーザープロファイルで私の栄養士サービスのアカウントを作成。
         function(profile){
             return PersonDb.createPerson({
                 line_id: profile.mid,
                 display_name: profile.displayName,
                 icon_url: profile.pictureUrl
             });
         },
         function(error){
            return Promise.reject(error);
         }
     )
     .then(
         // 私の栄養士サービスのマイページにリダイレクト。
         function(){
             res.redirect('https://dietitian.herokuapp.com/' + line.mid);
         },
         function(error){
             console.log(error);
             res.status(400).send();
         }
     );
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
