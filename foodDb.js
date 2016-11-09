'use strict';

const request = require('request');
const Promise = require('bluebird');
//const dbPrefix = 'https://apex.oracle.com/pls/apex/evangelist/nutrition';
const dbPrefix = 'https://140.86.13.12/apex/demo_gallery_for_nkjm/demo_gallery/dietitian';

module.exports = class foodDb {
    static getFoodListWithNutrition(foodList){
        return new Promise(function(resolve, reject){
            let gotFoodList = [];
            for (let food of foodList){
                gotFoodList.push(foodDb.getFoodWithNutrition(food));
            }
            Promise.all(gotFoodList)
            .then(
                function(foodList){
                    let identifiedFoodList = [];
                    for (let food of foodList){
                        if (food && typeof food.food_id != 'undefined' && food.food_id != null){
                            identifiedFoodList.push(food);
                        }
                    }
                    if (identifiedFoodList.length == 0){
                        console.log('We could not identify any of the food you provided.');
                    } else {
                        console.log('Here are the foods we could identify.');
                        console.log(identifiedFoodList);
                    }

                    resolve(identifiedFoodList);
                    return;
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
                if (body.items.length == 0){
                    resolve(null);
                    return;
                }
                resolve(response.body.items[0]);
                return;
            });
        });
    }
};
