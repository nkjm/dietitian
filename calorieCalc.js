'use strict';

module.exports = class calorieCalc {
    static getRequiredCalorie(birthday, height, sex){
        const properWeight = Math.round(height * height * 0.0022);
        const age = Math.floor(((new Date()).getTime() - birthday * 1000) / (1000 * 60 * 60 * 24 * 365));
        let baseCalorieFactor;
        if (sex == 'female'){
            if (age < 12){
                baseCalorieFactor = 25; // 中嶋予想
            } else if (age <= 14){
                baseCalorieFactor = 29.6;
            } else if (age <= 17){
                baseCalorieFactor = 25.3;
            } else if (age <= 29){
                baseCalorieFactor = 23.6;
            } else if (age <= 49){
                baseCalorieFactor = 21.7;
            } else if (age <= 69){
                baseCalorieFactor = 20.7;
            } else {
                baseCalorieFactor = 17; // 中嶋予想。
            }
        } else if (sex == 'male'){
            if (age < 12){
                baseCalorieFactor = 26; // 中嶋予想
            } else if (age <= 14){
                baseCalorieFactor = 31;
            } else if (age <= 17){
                baseCalorieFactor = 27;
            } else if (age <= 29){
                baseCalorieFactor = 24;
            } else if (age <= 49){
                baseCalorieFactor = 22.3;
            } else if (age <= 69){
                baseCalorieFactor = 21.5;
            } else {
                baseCalorieFactor = 17; // 中嶋予想。
            }
        }
        const baseCalorie = properWeight * baseCalorieFactor;
        let activityFactor;
        // Activity Factor
        if (age <= 2){
            activityFactor = 1.35;
        } else if (age <= 5){
            activityFactor = 1.45;
        } else if (age <= 7){
            activityFactor = 1.55;
        } else if (age <= 9){
            activityFactor = 1.60;
        } else if (age <= 14){
            activityFactor = 1.65;
        } else if (age <= 69){
            activityFactor = 1.75;
        } else {
            activityFactor = 1.7;
        }
        const requiredCalorie = baseCalorie * activityFactor;
        return requiredCalorie;
    }
};
