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
        let food_list = [];
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
                    let found_whole = false;
                    if (response.body.hints && response.body.hints.length > 0){
                        response.body.hints.map((hint) => {
                            if (hint.food.label === entity.food.label){
                                hint.measures.map((measure) => {
                                    if (measure.label === "Whole"){
                                        found_whole = true;
                                    }
                                })
                            }
                        })
                    }
                    if (!entity.quantity){
                        if (found_whole){
                            entity.quantity = 1;
                        } else {
                            entity.quantity = 0.1;
                        }
                    }
                    if (!entity.measure){
                        if (found_whole){
                            entity.measure = {uri: "http://www.edamam.com/ontologies/edamam.owl#Measure_unit"};
                        } else {
                            {uri: "http://www.edamam.com/ontologies/edamam.owl#Measure_kilogram"};
                        }
                    }
                    ingredients.push({
                        quantity: entity.quantity,
                        measureURI: entity.measure.uri,
                        foodURI: entity.food.uri
                    });
                    food_list.push({
                        name: entity.food.label
                    });
                });
            } else if (response.body.hints || response.body.hints.length > 0){
                let measureURI, quantity;
                response.body.hints[0].measures.map((measure) => {
                    if (measure.label == "Whole"){
                        quantity = 1;
                        measureURI = "http://www.edamam.com/ontologies/edamam.owl#Measure_unit";
                    }
                });
                ingredients.push({
                    quantity: quantity || 0.1,
                    measureURI: measureURI || "http://www.edamam.com/ontologies/edamam.owl#Measure_kilogram",
                    foodURI: response.body.hints[0].food.uri
                });
                food_list.push({
                    name: response.body.hints[0].food.label
                });
            } else {
                return null;
            }

            let endpoint = "https://api.edamam.com/api/food-database/nutrients";
            let url = endpoint + `?app_id=${process.env.EDAMAM_APP_ID}&app_key=${process.env.EDAMAM_APP_KEY}`;

            debug(`Going to get nutrient info of following ingredients.`);
            debug(ingredients);

            let done_get_all_nutrition = [];
            ingredients.map((ingr) => {
                done_get_all_nutrition.push(request.postAsync({
                    url: url,
                    body: {ingredients: [ingr]},
                    json: true
                }));
            })

            return Promise.all(done_get_all_nutrition);
        }).then((responses) => {
            if (responses === null){
                return null;
            }

            const nutrient_codes = [
                {code:"FAT", prop:"fat"},
                {code:"CHOCDF", prop: "carb"},
                {code:"PROCNT", prop: "protein"},
                {code:"FIBTG", prop: "fiber"},
                {code:"CHOLE", prop: "cholesterol"}
            ];

            let offset = 0;
            responses.map((response) => {
                food_list[offset].db_type = "edamam";
                food_list[offset].calorie = response.body.calories;

                nutrient_codes.map((code) => {
                    if (response.body.totalNutrients[code.code]){
                        food_list[offset][code.prop] = Math.floor(response.body.totalNutrients[code.code].quantity);
                    }
                });
                offset++;
            });

            // Translate food name.
            let food_name_list = [];
            food_list.map((food) => {
                food_name_list.push(food.name);
            });
            return googlet.translate(food_name_list, "ja");
        }).then((response) => {
            if (response === null){
                return [];
            }

            let offset = 0;
            response[0].map((translated_name) => {
                food_list[offset].name = translated_name;
                offset++;
            })
            return food_list;
        })
    }
};
