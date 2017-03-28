'use strict';

const CalorieCalc = require('./calorieCalc');

module.exports = class nutritionCalc {
    static getRequiredNutrition(birthday, height, sex, activity){
        const requiredCalorie = CalorieCalc.getRequiredCalorie(birthday, height, sex, activity);
        const nutrition = {};

        // 身長から適正体重を求める
        const properWeight = Math.round(height * height * 0.0022);

        // 脂肪を求める
        let fatFactor;
        if (activity == 1){
            fatFactor = 0.2;
        } else if (activity == 2){
            fatFactor = 0.25;
        } else if (activity == 3){
            fatFactor = 0.3;
        }
        nutrition.fat = Math.round(requiredCalorie * fatFactor / 9);

        // 炭水化物を求める
        let carbFactor;
        if (activity == 1){
            carbFactor = 0.5;
        } else if (activity == 2){
            carbFactor = 0.575;
        } else if (activity == 3){
            carbFactor = 0.65;
        }
        nutrition.carb = Math.round(requiredCalorie * carbFactor / 4);

        // たんぱく質を求める
        let proteinFactor;
        if (activity == 1){
            proteinFactor = 0.13;
        } else if (activity == 2){
            proteinFactor = 0.165;
        } else if (activity == 3){
            proteinFactor = 0.20;
        }
        nutrition.protein = Math.round(requiredCalorie * proteinFactor / 4);

        // 食物繊維を求める
        nutrition.fiber = 24;

        return nutrition;
    }
};
