"use strict";

require("dotenv").config();

const express = require('express');
const router = express.Router();
const debug = require("debug")("bot-express:route");
const jwt = require('jsonwebtoken');
const Login = require("../service/line-login");
const db = require("../service/salesforce");
Promise = require('bluebird');

const login = new Login({
    channel_id: process.env.LINE_LOGIN_CHANNEL_ID,
    channel_secret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    callback_url: process.env.LINE_LOGIN_CALLBACK_URL,
    scope: "openid profile phone email",
    bot_prompt: "normal"
});

router.get("/", login.auth());

router.get("/callback", login.callback(
    (req, res, next, login_response) => {
        let t = jwt.decode(JSON.parse(login_response).id_token, {json:true});
        let user = {
            user_id__c: t.sub,
            display_name__c: t.name,
            picture_url__c: t.picture,
            email__c: t.email,
            phone__c: t.phone_number
        }
        debug("Upserting user...");
        db.upsert_user(user).then((response) => {
            debug("Completed upsert user.");
            req.session.user_id = user.user_id__c;

            if (response.id){
                debug("This is a new user. We flag first login.");
                user.first_login__c = 1;
                return db.upsert_user({user_id__c: user.user_id__c, first_login__c: 1});
            }
            return Promise.resolve();
        }).then((response) => {
            debug("Redirecting to dashboard.");
            return res.redirect("/dashboard");
        }).catch((error) => {
            debug(error.message);
            return res.render("error", {
                severity: "danger",
                message: "Failed to create account. - " + error.message
            });
        });
    },
    (req, res, next, error) => {
        debug(error.message);
        return res.render("error", {
            severity: "danger",
            message: "Failed to authorize. - " + error.message
        });
    }
));

module.exports = router;
