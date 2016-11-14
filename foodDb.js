'use strict';

const request = require('request');
const Promise = require('bluebird');
//const dbPrefix = 'https://apex.oracle.com/pls/apex/evangelist/nutrition';
const dbPrefix = 'https://140.86.13.12/apex/demo_gallery_for_nkjm/demo_gallery/dietitian';

Promise.config({
    // Enable cancellation
    cancellation: true
});

module.exports = class foodDb {

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
        for (let food in foodList){
            savedFoodList.push(saveUnidentifiedFood(food));
        }
        return new Promise(function(resolve, reject){
            Promise.all(saveFoodList)
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

    static getFoodListWithNutrition(foodList, autoSaveUnidentifiedFoodList){
        return new Promise(function(resolve, reject){
            if (typeof foodList != 'object' || typeof foodList.length != 'number'){
                reject({message:'foodList is invalid.'});
                return;
            }
            if (foodList.length > 5){
                reject({message:'foodList can contain less than or equal to 5 foods. Provided ' + foodList.length + '.'});
                return;
            }
            let gotFoodList = [];
            for (let food of foodList){
                gotFoodList.push(foodDb.getFoodWithNutrition(food));
            }
            const pa = Promise.all(gotFoodList)
            .then(
                function(foodWithNutritionList){
                    let unidentifiedFoodList = [];
                    let identifiedFoodList = [];

                    for (let foodWithNutrition of foodWithNutritionList){

                        if (foodWithNutrition.foodList.length > 0){
                            // 可能性のある食品が一つ以上特定された場合。仮の実装でindexが0の食品を返している。
                            identifiedFoodList.push(foodWithNutrition.foodList[0]);
                        } else {
                            // 食品が特定できなかった場合
                            unidentifiedFoodList.push(foodWithNutrition.foodKey);
                        }
                    }
                    if (identifiedFoodList.length == 0){
                        console.log('We could not identify any of the food you provided.');
                    } else {
                        console.log('Here are the foods we could identify.');
                        console.log(identifiedFoodList);
                    }

                    if (autoSaveUnidentifiedFoodList && unidentifiedFoodList.length > 0){
                        console.log("We got some unidentified foods so saving them to db...");
                        FoodDb.saveUnidentifiedFoodList(unidentifiedFoodList)
                        .then(
                            function(){
                                resolve(identifiedFoodList);
                                return;
                            },
                            function(error){
                                console.log("Failed to save unidentified foods.");
                                reject(error);
                                return;
                            }
                        );
                    } else {
                        resolve(identifiedFoodList);
                        return;
                    }
                },
                function(error){
                    reject(error);
                    return;
                }
            )
        })
    }

    static getFoodWithNutrition(food){
        return new Promise(function(resolve, reject){
            const headers = {
                'Content-Type': 'application/json'
            };
            const url = dbPrefix + '/food/' + encodeURIComponent(food);
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
                    reject({message:'Failed to get FoodWithNutrition. It seems FoodDb is out of order.'});
                    return;
                }
                let foodWithNutrition = {
                    foodKey: food,
                    foodList: []
                };
                if (body.items.length > 0){
                    foodWithNutrition.foodList = response.body.items;
                }
                resolve(foodWithNutrition);
                return;
            });
        });
    }
};
