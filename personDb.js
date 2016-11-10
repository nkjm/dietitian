'use strict';

const request = require('request');
const Promise = require('bluebird');
const CalorieCalc = require('./calorieCalc');
const NutritionCalc = require('./nutritionCalc');
const dbPrefix = 'https://140.86.13.12/apex/demo_gallery_for_nkjm/demo_gallery/dietitian';
const crypto = require('crypto');
const base64url = require('base64url');

module.exports = class personDb {
    static randomStringAsBase64Url(size) {
        return base64url(crypto.randomBytes(size));
    }

    static createPerson(person){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = dbPrefix + '/person';

            // 認証用のセキュリティコードを生成
            person.security_code = personDb.randomStringAsBase64Url(40);

            request({
                url: url,
                method: 'POST',
                headers: headers,
                body: person,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                    return;
                }
                if (response.statusCode != 200){
                    reject(response);
                    return;
                }
                resolve(person);
                return;
            });
        });
    }

    static updatePerson(lineId, person){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = dbPrefix + '/person/' + lineId;
            request({
                url: url,
                method: 'PUT',
                headers: headers,
                body: person,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                    return;
                }
                if (response.statusCode != 200){
                    reject(response);
                    return;
                }
                resolve();
                return;
            });
        });
    }

    static getPersonList(){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = dbPrefix + '/person/list';
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
                if (body.items == 'undefined'){
                    reject({message:'Failed to get person list. It seems Person Db is out of order.'});
                    return;
                }
                resolve(body.items);
                return;
            });
        });
    }

    static getPerson(lineId){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = dbPrefix + '/person/' + lineId;
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
                if (typeof body.items == 'undefined'){
                    reject({message:'Failed to get person. It seems Person Db is out of order.'});
                    return;
                }
                if (body.items.length == 0){
                    resolve(null);
                    return;
                }
                let person = response.body.items[0];
                person.requiredCalorie = CalorieCalc.getRequiredCalorie(person.birthday, person.height, person.sex, person.activity);
                person.requiredNutrition = NutritionCalc.getRequiredNutrition(person.birthday, person.height, person.sex, person.activity);
                person.age = Math.floor(((new Date()).getTime() - person.birthday * 1000) / (1000 * 60 * 60 * 24 * 365));
                resolve(person);
                return;
            });
        });
    }

};
