"use strict";

require("dotenv").config();

const debug = require("debug")("bot-express:service");
const food_db_standard = require("./food/standard");
const food_db_edamam = require("./food/edamam");
const preferred_food_db = process.env.PREFERRED_FOOD_DB || "standard";

Promise = require('bluebird');

module.exports = class ServiceFood {
    /**
    @typedef {Object} food
    @prop {String} name
    @prop {String} db_type
    @prop {String} id
    @prop {Number} calorie
    @prop {Number} carb
    @prop {Number} protein
    @prop {Number} fat
    @prop {Number} cholesterol
    @prop {Number} fiber
    @prop {Number} ash
    @prop {Number} water
    */

    /**
    Method to search food including nutrition data.
    @function
    @param {String} text - Unstructured text which should contain foods.
    @return {Array.<food>} - Array of food object.
    */
    static search_food(text){
        let done_all_search = [];

        done_all_search.push(food_db_standard.search_food(text));
        done_all_search.push(food_db_edamam.search_food(text));

        return Promise.all(done_all_search).then((responses) => {
            if (preferred_food_db == "standard"){
                if (responses[0].length > 0){
                    return responses[0];
                } else {
                    return responses[1];
                }
            } else if (preferred_food_db == "edamam"){
                if (responses[1].length > 0){
                    return responses[1];
                } else {
                    return responses[0];
                }
            }
            /*
            let merged_food_list = [];
            responses.map((food_list) => {
                food_list.map((food) => {
                    merged_food_list.push(food);
                });
            })
            return merged_food_list;
            */
        })
    }
};
