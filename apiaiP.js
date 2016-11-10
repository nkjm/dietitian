'use strict';

const Promise = require('bluebird');
const apiai = require('apiai');
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

module.exports = class apiaiP {
    static textRequest(text){
        return new Promise(function(resolve, reject){
            // apiai sdkのインスタンスを初期化。
            const aiInstance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
            const aiRequest = aiInstance.textRequest(text);
            aiRequest.on('response', (response) => {
                console.log("APIAI response follows.");
                console.log(response);
                resolve(response.result.action);
                return;
            });
            apiaiRequest.on('error', (error) => {
                reject(error);
                return;
            });
            aiRequest.end();
        });
    }
}
