'use strict';

require("dotenv").config();

const request = require('request');
const mecab = require('mecabaas-client');
const debug = require("debug")("bot-express:service");
const db = require("../../service/salesforce");
const text_miner = require('../text-miner');
Promise = require('bluebird');
Promise.promisifyAll(request);

module.exports = class ServiceFoodStandard {

    /**
    Method to search food.
    @param {String} text - Unstructured text string which should contain foods.
    @return {Array.<food>} - Array of food object.
    */
    static search_food(text){
        debug("Going to process message by mecab...");
        return mecab.parse(text).then((parsed_text) => {
            let food_name_list = text_miner.extractFoodList(parsed_text);

            if (food_name_list.length == 0){
                console.log('Mecab did not recognize noun.');
                return [];
            }

            // 食品リストの食品それぞれについて、栄養情報を取得する。
            debug('Going to search food db.');
            return ServiceFoodStandard.get_food_list(food_name_list);
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
            done_get_all_food.push(ServiceFoodStandard.search_food_by_name(food_name));
        });

        return Promise.all(done_get_all_food).then((food_list_by_name) => {
            let unidentified_food_list= [];
            let identified_food_list = [];

            food_list_by_name.map((food_by_name) => {
                if (food_by_name.food_list.length > 0){
                    // 可能性のある食品が一つ以上特定された場合。仮の実装でindexが0の食品を返している。
                    identified_food_list.push(food_by_name.food_list[0]);
                } else {
                    // 食品が特定できなかった場合
                    unidentified_food_list.push(food_by_name.food_name);
                }
            });

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
                carb__c,
                fat__c,
                protein__c,
                cholesterol__c,
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
                    name: f.food_name__c,
                    db_type: "standard",
                    id: f.Id,
                    calorie: f.calorie__c,
                    carb: f.carb__c,
                    protein: f.protein__c,
                    fat: f.fat__c,
                    cholesterol: f.cholesterol__c,
                    fiber: f.fiber__c,
                    water: f.water__c,
                    ash: f.ash__c
                });
            });
            return food_list_by_name;
        });
    }

};
