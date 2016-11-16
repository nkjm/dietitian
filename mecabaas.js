'use strict';

const request = require('request');
const Promise = require('bluebird');
const hostname = 'http://mecab.oracle.tokyo';

module.exports = class mecabaas {

    static parse(text){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = hostname + '/api/parse?text=' + encodeURIComponent(text);
            request({
                url: url,
                method: 'GET',
                headers: headers,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                    return;
                }
                if (typeof body == 'undefined'){
                    reject({message:'Failed to parse.'});
                    return;
                }
                resolve(body);
                return;
            });
        });
    }

    static wakachi(text){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = hostname + '/api/wakachi?text=' + encodeURIComponent(text);
            request({
                url: url,
                method: 'GET',
                headers: headers,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                    return;
                }
                if (typeof body == 'undefined'){
                    reject({message:'Failed to parse.'});
                    return;
                }
                resolve(body);
                return;
            });
        });
    }

};
