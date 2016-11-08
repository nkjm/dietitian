'use strict';

const request = require('request');
const Promise = require('bluebird');
const CalorieCalc = require('./calorieCalc');
const NutritionCalc = require('./nutritionCalc');
const dbPrefix = 'https://140.86.13.12/apex/demo_gallery_for_nkjm/demo_gallery/dietitian';

module.exports = class personDb {

    static createPerson(person){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = dbPrefix + '/person';
            request({
                url: url,
                method: 'POST',
                headers: headers,
                body: person,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    if (response.statusCode != 200){
                        reject(response);
                    }
                    resolve();
                }
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
                } else {
                    if (response.statusCode != 200){
                        reject(response);
                    }
                    resolve();
                }
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
                } else {
                    if (response.body && response.body.items){
                        resolve(response.body.items);
                    } else {
                        reject({message:'Failed to get person. It seems Person Db is out of order.'});
                    }
                }
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
                } else {
                    if (response.body && response.body.items){
                        let person = response.body.items[0];
                        person.requiredCalorie = CalorieCalc.getRequiredCalorie(person.birthday, person.height, person.sex, person.activity);
                        person.requiredNutrition = NutritionCalc.getRequiredNutrition(person.birthday, person.height, person.sex, person.activity);
                        person.age = Math.floor(((new Date()).getTime() - person.birthday * 1000) / (1000 * 60 * 60 * 24 * 365));
                        resolve(person);
                    } else {
                        reject({message:'Failed to get person. It seems Person Db is out of order.'});
                    }
                }
            });
        });
    }

};
