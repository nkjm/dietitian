'use strict';

module.exports = class calorieCalc {
    static getRequiredCalorie(birthday, height){
        const properWeight = Math.round(height * height * 0.0022);
        const age = Math.floor(((new Date()).getTime() - birthday * 1000) / (1000 * 60 * 60 * 24 * 365));
        const baseCalorieFactor = 27;
        const baseCalorie = properWeight * baseCalorieFactor;

        // Activity Factor
        if (age <= 2){
            const activityFactor = 1.35;
        } else if (age <= 5){
            const activityFactor = 1.45;
        } else if (age <= 7){
            const activityFactor = 1.55;
        } else if (age <= 9){
            const activityFactor = 1.60;
        } else if (age <= 14){
            const activityFactor = 1.65;
        } else if (age <= 69){
            const activityFactor = 1.75;
        } else {
            const activityFactor = 1.7;
        }
        const requiredCalorie = baseCalorie * activityFactor;

        return requiredCalorie;
    }
};
