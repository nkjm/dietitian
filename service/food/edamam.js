'use strict';

require("dotenv").config();

const request = require('request');
const debug = require("debug")("bot-express:service");
const google_translate = require('@google-cloud/translate');
Promise = require('bluebird');
Promise.promisifyAll(request);

const googlet = google_translate({
    projectId: process.env.GOOGLE_PROJECT_ID
});

module.exports = class ServiceFoodEdamam {

    /**
    Method to search food.
    @param {String} text - Unstructured text string which should contain foods.
    @return {Array.<food>} - Array of food object.
    */
    static search_food(text_ja){
        debug("Going to translate text...");
        return Promise.resolve().then((response) => {
            return googlet.translate(text_ja, "en");
        }).then((text_en) => {
            debug(`Translated text is ${text_en}.`);
            // Going to search food.
            let endpoint = "https://api.edamam.com/api/food-database/parser";
            let url = endpoint + `?app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_APP_KEY}&ingr=${encodeURIComponent(text_en)}`;
            let food;
            return request.getAsync({
                url: url,
                json: true
            });
        }).then((response) => {
            if (!response.body.hints || response.body.hints.length === 0){
                return null;
            }

            debug(`Got follwing hints.`);
            debug(response.body.hints[0]);
            food.name = response.body.hints[0].label;

            // Going to get nutrient info.
            let endpoint = "https://api.edamam.com/api/food-database/nutrients";
            let url = endpoint;
            let body = {
                ingredients: [{
                    quantity: 1,
                    measureURI: "http://www.edamam.com/ontologies/edamam.owl#Measure_kilogram",
                    foodURI: response.body.hints[0].food.uri
                }]
            }
            debug(`Going to get nutrient info.`);
            return request.postAsync({
                url: url,
                body: body,
                json: true
            });
        }).then((response) => {
            if (!response){
                return [];
            }
            debug(`Got following nutrients`);
            debug(response);
            food.db_type = "edamam";
            food.calorie = response.calories;
            food.fat = response.totalNutrients.FAT.quantitiy;
            food.carb = response.totalNutrients.CHOCDF.quantity;
            food.protein = response.totalNutrients.PRCNT.quantity;
            food.fiber = response.totalNutrients.FIBTG.quantity;
            return [food];
        });
    }
};
