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
        let food = {};
        debug("Going to translate text...");
        return Promise.resolve().then((response) => {
            return googlet.translate(text_ja, "en");
        }).then((response) => {
            let text_en = response[0];
            debug(`Translated text is ${text_en}`);
            // Going to search food.
            let endpoint = "https://api.edamam.com/api/food-database/parser";
            let url = endpoint + `?app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_APP_KEY}&ingr=${encodeURIComponent(text_en)}`;
            debug(`Going to extract food...`);
            return request.getAsync({
                url: url,
                json: true
            });
        }).then((response) => {
            if (!response.body.hints || response.body.hints.length === 0){
                return null;
            }

            food.name = response.body.hints[0].food.label;

            // Going to get nutrient info.
            let endpoint = "https://api.edamam.com/api/food-database/nutrients";
            let url = endpoint + `?app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_APP_KEY}`;
            let body = {
                ingredients: [{
                    quantity: 0.3,
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
            if (!response.body){
                return [];
            }
            food.db_type = "edamam";
            food.calorie = response.body.calories;
            const nutrient_codes = [
                {code:"FAT", prop:"fat"},
                {code:"CHOCDF", prop: "carb"},
                {code:"PROCNT", prop: "protein"},
                {code:"FIBTG", prop: "fiber"},
                {code:"CHOLE", prop: "cholesterol"}
            ];
            nutrient_codes.map((code) => {
                if (response.body.totalNutrients[code.code]) food[code.prop] = Math.floor(response.body.totalNutrients[code.code].quantity);
            });

            // Translate food name.
            return googlet.translate(food.name, "ja");
        }).then((response) => {
            food.name = response[0];
            return [food];
        })
    }
};
