"use strict";

require("dotenv").config();

const router = require("express").Router();
const debug = require("debug")("bot-express:service");
const request = require("request");
const session = require("express-session");
const api_version = "v2.1";
Promise = require("bluebird");
Promise.promisifyAll(request);

class ServiceLineLogin {
    /**
    @constructor
    @prop {Object} options
    @prop {String} options.channel_id - LINE Channel Id
    @prop {String} options.channel_secret - LINE Channel secret
    @prop {String} options.callback_url - LINE Callback URL
    @prop {String} options.scope - Permission to ask user to approve. Supported values are "profile" and "openid".
    @prop {string} options.bot_prompt - Flag to switch how Bot Prompt is displayed after authentication. Supported values are "normal" and "aggressive".
    @prop {Object} options.session_options - Option object for express-session. Refer to https://github.com/expressjs/session for detail.
    */
    constructor(options){
        this.channel_id = options.channel_id;
        this.channel_secret = options.channel_secret;
        this.callback_url = options.callback_url;
        this.scope = options.scope;
        this.bot_prompt = options.bot_prompt;
        this.session_options = options.session_options || {
            secret: options.channel_secret,
            resave: false,
            saveUninitialized: true,
            cookie: {secure: false}
        }
        router.use(session(this.session_options));
    }

    /**
    @method
    */
    auth(){
        router.get("/", (req, res, next) => {
            const client_id = encodeURIComponent(this.channel_id);
            const redirect_uri = encodeURIComponent(this.callback_url);
            const scope = encodeURIComponent(this.scope);
            const bot_prompt = encodeURIComponent(this.bot_prompt);
            const state = req.session.line_login_state = encodeURIComponent(ServiceLineLogin._generate_state());
            let url = `https://access.line.me/oauth2/${api_version}/authorize?response_type=code&client_id=${client_id}&redirect_uri=${redirect_uri}&scope=${scope}&bot_prompt=${bot_prompt}&state=${state}`;
            debug(`Redirecting to ${url}.`);
            return res.redirect(url);
        });
        return router;
    }

    /**
    @method
    @param {Function} s - Callback function on success.
    @param {Function} f - Callback function on failure.
    */
    callback(s, f){
        router.get("/callback", (req, res, next) => {
            const code = req.query.code;
            const state = req.query.state;
            const friendship_status_changed = req.query.friendship_status_changed;

            if (!code){
                return f(new Error("Authorization failed."));
            }
            if (req.session.line_login_state !== state){
                return f(new Error("Authorization failed. State does not match."));
            }
            debug("Authorization succeeded.");

            this._get_access_token(code).then((response) => {
                s(response);
            }).catch((error) => {
                if (f) return f(error);
                throw(error);
            });
        });
        return router;
    }

    _get_access_token(code){
        const url = `https://api.line.me/oauth2/${api_version}/token`;
        const form = {
            grant_type: "authorization_code",
            code: code,
            redirect_uri: this.callback_url,
            client_id: this.channel_id,
            client_secret: this.channel_secret
        }
        return request.postAsync({
            url: url,
            form: form
        }).then((response) => {
            if (response.statusCode == 200){
                return response.body;
            }
            return Promise.reject(new Error(response.statusMessage));
        });
    }

    static _generate_state(){
        let max = 999999999;
        let min = 100000000;
        return Math.floor(Math.random() * (max - min + 1) ) + min;
    }
}

module.exports = ServiceLineLogin;
