'use strict';

require("dotenv").config();

const request = require('request');
const mecab = require('mecabaas-client');
const debug = require("debug")("bot-express:service");
const db = require("../service/salesforce");
const text_miner = require('./text-miner');
Promise = require('bluebird');
Promise.promisifyAll(request);

module.exports = class ServiceFood {

    static extract_food_list_with_nutrition_by_text(text){
        debug("Going to process message by mecab...");
        return mecab.parse(text).then((parsed_text) => {
            let food_name_list = text_miner.extractFoodList(parsed_text);

            if (food_name_list.length == 0){
                console.log('Mecab did not recognize noun.');
                return [];
            }

            // 食品リストの食品それぞれについて、栄養情報を取得する。
            debug('Going to search food db.');
            return ServiceFood.get_food_list(food_name_list);
        });
    }

    static get_food_list(food_name_list){
        if (typeof food_name_list != 'object' || typeof food_name_list.length != 'number'){
            return Promise.reject({message:'food name list is invalid.'});
        }

        if (food_name_list.length > 10){
            return Promise.reject({message:'food name list can contain less than or equal to 10 foods. Provided ' + food_name_list.length + '.'});
        }

        let done_get_all_food = [];
        food_name_list.map((food_name) => {
            done_get_all_food.push(ServiceFood.search_food_by_name(food_name));
        });

        return Promise.all(done_get_all_food).then((food_list_by_name) => {
            let unidentified_food_list= [];
            let identified_food_list = [];

            for (let food of food_list_by_name){
                if (food.food_list.length > 0){
                    // 可能性のある食品が一つ以上特定された場合。仮の実装でindexが0の食品を返している。
                    identified_food_list.push(food.food_list[0]);
                } else {
                    // 食品が特定できなかった場合
                    unidentified_food_list.push(food.food_name);
                }
            }

            if (identified_food_list.length == 0){
                debug('Could not find nutrition data for the food.');
            }

            return identified_food_list;
        });
    }

    static search_food_by_name(food_name){
        let query = `
            select
                Id,
                food_name__c,
                calorie__c,
                fat__c,
                protein__c,
                cholesterol__c,
                carb__c,
                fiber__c,
                ash__c,
                water__c
            from
                diet_food__c where food_name__c like '%${food_name}%'
        `;
        return db.query(query).then((response) => {
            let food_list_by_name = {
                food_name: food_name,
                food_list: []
            };
            response.records.map((f) => {
                food_list_by_name.food_list.push({
                    Id: f.Id,
                    food_name: f.food_name__c,
                    calorie: f.calorie__c,
                    fat: f.fat__c,
                    protein: f.protein__c,
                    cholesterol: f.cholesterol__c,
                    carb: f.carb__c,
                    fiber: f.fiber__c,
                    ash: f.ash__c,
                    water: f.water__c
                });
            });
            return food_list_by_name;
        });
    }

    /*
    static saveFood(food){
        return new Promise(function(resolve, reject){
            const headers = {
                'Content-Type': 'application/json'
            };
            const url = dbPrefix + '/food';
            request({
                url: url,
                method: 'POST',
                headers: headers,
                body: food,
                json: true
            }, function (error, response, body) {
                if (error){
                    reject(error);
                    return;
                }
                if (response.statusCode != 200){
                    reject({message:'Failed to save food.'});
                    return;
                }
                resolve();
                return;
            });
        });
    }

    static deleteFood(foodName){
        return new Promise(function(resolve, reject){
            const headers = {
                'Content-Type': 'application/json'
            };
            const url = dbPrefix + '/food';
            request({
                url: url,
                method: 'DELETE',
                headers: headers,
                body: {food_name: foodName},
                json: true
            }, function (error, response, body) {
                if (error){
                    reject(error);
                    return;
                }
                if (response.statusCode != 200){
                    reject({message:'Failed to delete food.'});
                    return;
                }
                resolve();
                return;
            });
        });
    }

    static registerFood(food){
        return new Promise(function(resolve, reject){
            // 新しい食品を登録
            food.unidentified = 0;
            ServiceFood.saveFood(food)
            .then(
                function(){
                    // 同名のUnidentified Foodを削除
                    return ServiceFood.deleteFood(food.food_name);
                },
                function(error){
                    return Promise.reject(error);
                }
            )
            .then(
                function(){
                    resolve();
                    return;
                },
                function(error){
                    reject(error);
                    return;
                }
            );
        });
    }

    static getUnidentifiedFoodList(){
        return new Promise(function(resolve, reject){
            const headers = {
                'Content-Type': 'application/json'
            };
            const url = dbPrefix + '/food/list/unidentified';
            request({
                url: url,
                method: 'GET',
                headers: headers,
                json: true
            }, function (error, response, body) {
                if (error){
                    reject(error);
                    return;
                }
                if (typeof body.items == 'undefined'){
                    reject({message:'Failed to get unidentified foods. It seems FoodDb is out of order.'});
                    return;
                }
                resolve(body.items);
                return;
            });
        });
    }

    static saveUnidentifiedFood(food){
        return new Promise(function(resolve, reject){
            const headers = {
                'Content-Type': 'application/json'
            };
            const url = dbPrefix + '/food/unidentified';
            request({
                url: url,
                method: 'POST',
                headers: headers,
                body: {food_name: food},
                json: true
            }, function (error, response, body) {
                if (error){
                    reject(error);
                    return;
                }
                if (response.statusCode != 200){
                    reject({message: 'Failed to save ' + food + ' to unidentified food db.'});
                    return;
                }
                resolve();
                return;
            });
        });
    }

    static saveUnidentifiedFoodList(foodList){
        let savedFoodList = [];
        for (let food of foodList){
            savedFoodList.push(ServiceFood.saveUnidentifiedFood(food));
        }
        return new Promise(function(resolve, reject){
            Promise.all(savedFoodList)
            .then(
                function(){
                    resolve();
                    return;
                },
                function(error){
                    reject(error);
                    return;
                }
            );
        });
    }
    */

};
