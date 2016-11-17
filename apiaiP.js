'use strict';

const Promise = require('bluebird');
const apiai = require('apiai');
const uuid = require('node-uuid');
const APIAI_CLIENT_ACCESS_TOKEN = process.env.APIAI_CLIENT_ACCESS_TOKEN;

module.exports = class apiaiP {
    static textRequest(text){
        console.log('Processing text "' + text + '" via API.AI...');
        return new Promise(function(resolve, reject){
            // apiai sdkのインスタンスを初期化。
            const aiInstance = apiai(APIAI_CLIENT_ACCESS_TOKEN);
            const sessionId = uuid.v1();
            const aiRequest = aiInstance.textRequest(text, {sessionId: sessionId});
            aiRequest.on('response', function(response){
                resolve(response.result.action);
                return;
            });
            aiRequest.on('error', function(error){
                reject(error);
                return;
            });
            aiRequest.end();
        });
    }
}
