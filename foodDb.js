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
                    resolve(foodList);
                },
                function(error){
                    reject(error);
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
                if (error) {
                    reject(error);
                } else {
                    if (response.body && response.body.items){
                        // 仮の実装で、複数得られる可能性のある食品リストから、最初のアイテムだけを返す。
                        // 本来はもっともユーザーの入力に近いものを選定すべき。
                        if (response.body.items.length > 0){
                            resolve(response.body.items[0]);
                        } else {
                            resolve(null);
                        }
                    } else {
                        reject({message:'Failed to get FoodWithNutrition. It seems FoodDb is out of order.'});
                    }
                }
            });
        });
    }
};
