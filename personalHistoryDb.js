'use strict';

const request = require('request');
const Promise = require('bluebird');
const mecab = require('mecab-async');
const CalorieCalc = require('./calorieCalc');
const dbPrefix = 'https://140.86.13.12/apex/demo_gallery_for_nkjm/demo_gallery/dietitian';

module.exports = class personalHistoryDb {
    static getCalorieToGo(lineId, birthday, height, sex){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = dbPrefix + '/person/' + lineId + '/diet_history/today_total_calorie';
            console.log(url);
            request({
                url: url,
                method: 'GET',
                headers: headers,
                json: true,
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    if (response.body && (typeof response.body.today_total_calorie != "undefined")){
                        let today_total_calorie = response.body.today_total_calorie;
                        let calorieToGo = CalorieCalc.getRequiredCalorie(birthday, height, sex) - today_total_calorie;
                        resolve(calorieToGo);
                    } else {
                        reject({message:'Failed to get total calorie of today. It seems no record has been saved yet.'});
                    }
                }
            });
        });
    }

    static getTodayHistory(lineId){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            let url = dbPrefix + '/person/' + lineId + '/diet_history/today';
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
                        reject({message:'Failed to get Diet History of Today. It seems PersonalHistoryDb is out of order.'});
                    }
                }
            });
        });
    }

    static saveFoodListAsDietHistory(lineId, dietDate, dietType, foodList){
        return new Promise(function(resolve, reject){
            let savedFoodList = [];
            for (let food of foodList){
                if (!food || !food.food_name){
                    continue;
                }
                let dietHistory = {
                    line_id: lineId,
                    food: food.food_name,
                    diet_date: dietDate,
                    diet_type: dietType,
                    calorie: food.calorie || null,
                    fat: food.fat || null,
                    protein: food.protein || null,
                    cholesterol: food.cholesterol || null,
                    carb: food.carb || null,
                    fiber: food.fiber || null,
                    ash: food.ash || null,
                    water: food.water || null
                }
                savedFoodList.push(personalHistoryDb.saveDietHistory(dietHistory));
            }
            Promise.all(savedFoodList)
            .then(
                function(dietHistoryList){
                    resolve(dietHistoryList);
                },
                function(error){
                    reject(error);
                }
            );
        });
    }

    static saveDietHistory(dietHistory){
        return new Promise(function(resolve, reject){
            let headers = {
                'Content-Type': 'application/json'
            };
            console.log("Saving following diet.");
            console.log(dietHistory);
            request({
                url: dbPrefix + '/diet_history',
                method: 'POST',
                headers: headers,
                body: dietHistory,
                json: true
            }, function (error, response, body) {
                if (error) {
                    reject(error);
                } else {
                    resolve(dietHistory);
                }
            });
        });
    }

};
