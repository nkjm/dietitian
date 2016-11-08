'use strict';

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;
const LINE_LOGIN_REDIRECT_URI = process.env.LINE_LOGIN_REDIRECT_URI;
const request = require('request');
const Promise = require('bluebird');

module.exports = class Line {
    set accessToken(value){
        this.accessToken = value;
    }
    get accessToken(){
        return this.accessToken;
    }
    set refreshToken(value){
        this.refreshToken = value;
    }
    get refreshToken(){
        return this.refreshToken;
    }

    getProfile(mid){
        console.log("Getting profile...");
        return new Promise(function(resolve, reject){
            const url = 'https://api.line.me/v1/profile';
            const headers = {
                'Authorization': 'Bearer ' + this.accessToken
            };
            request({
                url: url,
                method: 'GET',
                headers: headers,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    console.log(response);
                    resolve(response);
                }
            });
        });
    }

    requestToken(code){
        console.log("Requesting token...");
        return new Promise(function(resolve, reject){
            const url = 'https://api.line.me/v1/oauth/accessToken';
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            const form = {
                grant_type: 'authorization_code',
                client_id: LINE_LOGIN_CHANNEL_ID,
                client_secret: LINE_LOGIN_CHANNEL_SECRET,
                code: code,
                redirect_uri: LINE_LOGIN_REDIRECT_URI
            }
            request({
                url: url,
                method: 'POST',
                headers: headers,
                form: form,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    console.log(response);
                    this.accessToken = response.access_token;
                    this.refreshToken = response.refresh_token;
                    resolve();
                }
            });
        });
    }
};
