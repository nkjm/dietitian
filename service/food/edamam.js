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
        let food_name = "";
        debug("Going to translate text...");
        return Promise.resolve().then((response) => {
            return googlet.translate(text_ja, "en");
        }).then((response) => {
            let text_en = response[0];
            debug(`Translated text is ${text_en}`);
            // Going to parse sentence.
            let endpoint = "https://api.edamam.com/api/food-database/parser";
            let url = endpoint + `?app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_APP_KEY}&ingr=${encodeURIComponent(text_en)}&page=0`;
            debug(`Going to parse sentence by EDAMAM...`);
            return request.getAsync({
                url: url,
                json: true
            });
        }).then((response) => {
            let ingredients = [];
            if (response.body.parsed && response.body.parsed.length > 0){
                // We have extracted result.
                response.body.parsed.map((entity) => {
                    if (!entity.quantity) entity.quantity = 0.3;
                    if (!entity.measure) entity.measure = {uri: "http://www.edamam.com/ontologies/edamam.owl#Measure_kilogram"};
                    ingredients.push({
                        quantity: entity.quantity,
                        measureURI: entity.measure.uri,
                        foodURI: entity.food.uri
                    });
                    if (food_name === ""){
                        food_name = entity.food.label;
                    } else {
                        food_name += ` and ${entity.food.label}`;
                    }
                });
            } else if (response.body.hints || response.body.hints.length > 0){
                let measureURI, quantity;
                response.body.hints[0].measures.map((measure) => {
                    if (measure.label == "Whole"){
                        measureURI = "http://www.edamam.com/ontologies/edamam.owl#Measure_unit";
                        quantity = 1;
                    }
                });
                ingredients.push({
                    quantity: quantity || 0.3,
                    measureURI: measureURI || "http://www.edamam.com/ontologies/edamam.owl#Measure_kilogram",
                    foodURI: response.body.hints[0].food.uri
                });
                food_name = response.body.hints[0].food.label;
            } else {
                return null;
            }

            let endpoint = "https://api.edamam.com/api/food-database/nutrients";
            let url = endpoint + `?app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_APP_KEY}`;
            let body = {
                ingredients: ingredients
            }
            debug(`Going to get nutrient info of following ingredients.`);
            debug(ingredients);

            return request.postAsync({
                url: url,
                body: body,
                json: true
            });
        }).then((response) => {
            if (response === null){
                return null;
            }
            debug(response.body);
            food = {
                db_type: "edamam",
                calorie: response.body.calories
            }
            const nutrient_codes = [
                {code:"FAT", prop:"fat"},
                {code:"CHOCDF", prop: "carb"},
                {code:"PROCNT", prop: "protein"},
                {code:"FIBTG", prop: "fiber"},
                {code:"CHOLE", prop: "cholesterol"}
            ];
            nutrient_codes.map((code) => {
                if (response.body.totalNutrients[code.code]){
                    food[code.prop] = Math.floor(response.body.totalNutrients[code.code].quantity);
                }
            });

            // Translate food name.
            return googlet.translate(food_name, "ja");
        }).then((response) => {
            if (response === null){
                return [];
            }
            food.name = response[0];
            return [food];
        })
    }
};
