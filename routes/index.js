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

// LINE Loginを使ったアカウント作成処理。現在userIdが取得できないため、使用していない。
// 現在のアカウント作成処理は友達追加された際に発火する。詳しくはroutes/webhook.jsのfollowイベントの処理を参照。
router.get('/callback', (req, res, next) => {
     /*
     1. 取得した認証コードでアクセストークンをリクエスト（POST）。
     2. ユーザープロファイルを取得。
     3. 取得したユーザープロファイルで私の栄養士サービスのアカウントを作成。
     4. 私の栄養士サービスのマイページにリダイレクト。
     */
     if (!req.query.code){
         console.log('Auhorization code not found in callback request');
         res.render('error', {severity: 'danger', message: '認証コードを取得できませんでした。'});
         return;
     }

     console.log('Code is ' + req.query.code);
     const line = new Line();

     // 取得した認証コードでアクセストークンをリクエスト（POST）。
     line.requestToken(req.query.code)
     .then(
         // ユーザープロファイルを取得。
         function(response){
             line.mid = response.mid;
             line.accessToken = response.access_token;
             return line.getProfile(response.access_token);
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
             return;
         },
         function(error){
             console.log(error);
             res.render('error', {severity: 'danger', message: '予期せぬ不具合が発生しました。'});
             return;
         }
     );
});

router.get('/:line_id', (req, res, next) => {
    if (!req.params.line_id){
        res.render('error', {severity: 'warning', message: 'ユーザーIDがセットされていません。'});
        return;
    }
    if (!req.query.security_code){
        res.render('error', {severity: 'warning', message: 'セキュリティコードがセットされていません。'});
        return;
    }
    let personDb = new PersonDb();
    let p = PersonDb.getPerson(req.params.line_id)
    .then(
        function(person){
            // アカウントが存在しない場合、処理を中断してエラーページを表示。
            if (!person){
                p.cancel();
                res.render('error', {severity: 'warning', message: 'アカウントが存在しません。'});
                return;
            }

            // 認証処理
            if (person.security_code != req.query.security_code){
                p.cancel();
                res.render('error', {severity: 'warning', message: 'セキュリティコードが正しくありません。'});
                return;
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
            return;
        },
        function(error){
            console.log(error);
            res.render('error', {severity: 'danger', message: '予期せぬ不具合が発生しました。'});
            return;
        }
    )
});

module.exports = router;
