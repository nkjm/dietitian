'use strict';

module.exports = class calorieCalc {
    static getRequiredCalorie(birthday, height, sex, activity){
        const properWeight = Math.round(height * height * 0.0022);
        const age = Math.floor(((new Date()).getTime() - birthday * 1000) / (1000 * 60 * 60 * 24 * 365));
        let baseCalorieFactor;
        if (sex == 'female'){
            if (age <= 2){
                baseCalorieFactor = 59.7;
            } else if (age <= 5){
                baseCalorieFactor = 52.2;
            } else if (age <= 7){
                baseCalorieFactor = 41.9;
            } else if (age <= 9){
                baseCalorieFactor = 38.3;
            } else if (age <= 11){
                baseCalorieFactor = 34.8;
            } else if (age <= 14){
                baseCalorieFactor = 29.6;
            } else if (age <= 17){
                baseCalorieFactor = 25.3;
            } else if (age <= 29){
                baseCalorieFactor = 22.1;
            } else if (age <= 49){
                baseCalorieFactor = 21.7;
            } else if (age <= 69){
                baseCalorieFactor = 20.7;
            } else {
                baseCalorieFactor = 20.7;
            }
        } else if (sex == 'male'){
            if (age <= 2){
                baseCalorieFactor = 61;
            } else if (age <= 5){
                baseCalorieFactor = 54.8;
            } else if (age <= 7){
                baseCalorieFactor = 44.3;
            } else if (age <= 9){
                baseCalorieFactor = 40.8;
            } else if (age <= 11){
                baseCalorieFactor = 37.4;
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
                baseCalorieFactor = 21.5;
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
            if (activity == 1){
                activityFactor = 1.35;
            } else if (activity == 2){
                activityFactor = 1.55;
            } else if (activity == 3){
                activityFactor = 1.75;
            }
        } else if (age <= 9){
            if (activity == 1){
                activityFactor = 1.4;
            } else if (activity == 2){
                activityFactor = 1.6;
            } else if (activity == 3){
                activityFactor = 1.8;
            }
        } else if (age <= 11){
            if (activity == 1){
                activityFactor = 1.45;
            } else if (activity == 2){
                activityFactor = 1.65;
            } else if (activity == 3){
                activityFactor = 1.85;
            }
        } else if (age <= 14){
            if (activity == 1){
                activityFactor = 1.45;
            } else if (activity == 2){
                activityFactor = 1.65;
            } else if (activity == 3){
                activityFactor = 1.85;
            }
        } else if (age <= 17){
            if (activity == 1){
                activityFactor = 1.55;
            } else if (activity == 2){
                activityFactor = 1.75;
            } else if (activity == 3){
                activityFactor = 1.95;
            }
        } else if (age <= 29){
            if (activity == 1){
                activityFactor = 1.5;
            } else if (activity == 2){
                activityFactor = 1.75;
            } else if (activity == 3){
                activityFactor = 2;
            }
        } else if (age <= 49){
            if (activity == 1){
                activityFactor = 1.5;
            } else if (activity == 2){
                activityFactor = 1.75;
            } else if (activity == 3){
                activityFactor = 2;
            }
        } else if (age <= 69){
            if (activity == 1){
                activityFactor = 1.5;
            } else if (activity == 2){
                activityFactor = 1.75;
            } else if (activity == 3){
                activityFactor = 2;
            }
        } else {
            if (activity == 1){
                activityFactor = 1.45;
            } else if (activity == 2){
                activityFactor = 1.7;
            } else if (activity == 3){
                activityFactor = 1.95;
            }
        }
        const requiredCalorie = Math.round(baseCalorie * activityFactor);
        return requiredCalorie;
    }
};
