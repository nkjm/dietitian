"use strict";

require("dotenv").config();

const express = require('express');
const router = express.Router();
const debug = require("debug")("bot-express:route");
const Login = require("../service/line-login");
Promise = require('bluebird');

const login = new Login({
    channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
    channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    callback_url: process.env.LINE_LOGIN_CALLBACK_URL,
    scope: "openid profile phone email",
    bot_prompt: "normal"
});

router.use("/", login.auth());

router.use("/callback", login.callback(
    (response) => {
        debug(response);
    },
    (error) => {
        debug(error);
    }
));

/*
router.get('/', (req, res, next) => {
    if (!req.query.code){
         console.log('Auhorization code not found.');
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
*/

module.exports = router;
