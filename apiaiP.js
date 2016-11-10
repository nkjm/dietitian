'use strict';

const Promise = require('bluebird');
const apiai = require('apiai');
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

module.exports = class apiaiP {
    static textRequest(text){
        console.log('Processing text via API.AI...');
        return new Promise(function(resolve, reject){
            // apiai sdkのインスタンスを初期化。
            console.log(APIAI_CLIENT_ACCESS_TOKEN);
            const aiInstance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
            const aiRequest = aiInstance.textRequest(text);
            aiRequest.on('response', (response) => {
                console.log("APIAI response follows.");
                console.log(response);
                resolve(response.result.action);
                return;
            });
            apiaiRequest.on('error', (error) => {
                console.log("Failed to process text via API.AI.");
                reject(error);
                return;
            });
            aiRequest.end();
        });
    }
}
