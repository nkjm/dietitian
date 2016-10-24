'use strict';

module.exports = class calorieCalc {
    static getRequiredCalorie(birthday, height){
        const properWeight = Math.round(height * height * 0.0022);
        console.log('pw:' + properWeight);
        const age = Math.floor(((new Date()).getTime() - birthday * 1000) / (1000 * 60 * 60 * 24 * 365));
        console.log('age:' + age);
        const baseCalorieFactor = 27;
        const baseCalorie = properWeight * baseCalorieFactor;
        console.log('baseCalorie:' + baseCalorie);
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
        console.log('activityFactor:' + activityFactor);
        const requiredCalorie = baseCalorie * activityFactor;
        console.log('requiredCalorie:' + requiredCalorie);
        return requiredCalorie;
    }
};
