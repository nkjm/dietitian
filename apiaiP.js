'use strict';

const Promise = require('bluebird');
const apiai = require('apiai');
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;
const APIAI_LANGUAGE = process.env.APIAI_LANGUAGE;

module.exports = class apiaiP {
    static textRequest(text){
        console.log('Processing text "' + text + '" via API.AI...');
        return new Promise(function(resolve, reject){
            // apiai sdkのインスタンスを初期化。
            let aiInstance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
            console.log("aiInstance created.");
            let aiRequest = aiInstance.textRequest(text);
            console.log("aiRequest created.");
            aiRequest.on('response', function(response){
                console.log("APIAI response follows.");
                console.log(response);
                resolve(response.result.action);
                return;
            });
            apiaiRequest.on('error', function(error){
                console.log("Failed to process text via API.AI.");
                reject(error);
                return;
            });
            aiRequest.end();
        });
    }
}
