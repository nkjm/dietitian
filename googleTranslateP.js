'use strict';

const Promise = require('bluebird');
const googleTranslate = require("google-translate")(process.env.GOOGLE_API_KEY);

module.exports = class googleTranslateP {
    static translate(text){
        return new Promise(function(resolve, reject){
            googleTranslate.translate(text, 'en', function(err, response) {
                if (err){
                    reject(err);
                    return;
                }
                console.log("Response follows.");
                console.log(response);
                resolve(response.translatedText);
                return;
            });
        });
    }
}
