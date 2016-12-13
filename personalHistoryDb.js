'use strict';

const request = require('request');
const Promise = require('bluebird');
const CalorieCalc = require('./calorieCalc');
const dbPrefix = process.env.PERSONAL_HISTORY_DB_API_BASE;

module.exports = class personalHistoryDb {
    static getCalorieToGo(lineId, requiredCalorie){
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
                    return;
                } else {
                    if (response.body && (typeof response.body.today_total_calorie != "undefined")){
                        let today_total_calorie = response.body.today_total_calorie;
                        let calorieToGo = requiredCalorie - today_total_calorie;
                        resolve(calorieToGo);
                        return;
                    } else {
                        reject({message:'Failed to get total calorie of today. It seems no record has been saved yet.'});
                        return;
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
                    return;
                },
                function(error){
                    reject(error);
                    return;
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
                    return;
                } else {
                    resolve(dietHistory);
                    return;
                }
            });
        });
    }

};
