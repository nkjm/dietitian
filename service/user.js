"use strict";

require("dotenv").config();

const debug = require("debug")("bot-express:service");
const moment = require("moment");
const db = require("../service/salesforce");
const calorie = require("../service/calorie");
const nutrition = require("../service/nutrition");
const cache = require("memory-cache");

Promise = require('bluebird');

class ServiceUser {

    static get_calorie_to_go(user_id){
        let done_all_tasks = [];

        // Retrieve user to get required calorie.
        done_all_tasks.push(ServiceUser.get_user(user_id));

        // Query to get total calorie of today.
        let query = `
            select
                sum(calorie__c) today_total_calorie
            from diet_history__c
            where
                diet_date__c = today and
                diet_user__r.user_id__c = '${user_id}'
        `;
        done_all_tasks.push(db.query(query));

        // Calculate calorie to go.
        return Promise.all(done_all_tasks).then((responses) => {
            if (!responses || responses.length !== 2){
                return Promise.reject(new Error("Failed to get required information to calculate calorie to go."));
            }
            if (!responses[0].requiredCalorie){
                return Promise.reject(new Error(`Failed to get required calorie of user: ${user_id}.`));
            }
            if (!responses[1].records || responses[1].records.length !== 1){
                return Promise.reject(new Error(`Failed to get today total calorie of user: ${user_id}.`));
            }

            let required_calorie = responses[0].requiredCalorie;
            let today_total_calorie = responses[1].records[0].today_total_calorie;

            let calorie_to_go = required_calorie - today_total_calorie;
            return calorie_to_go;
        });
    }

    static save_diet_history_list(diet_history_list){
        let diet_history_list__c = [];
        diet_history_list.map((h) => {
            diet_history_list__c.push({
                diet_user__r: {
                    user_id__c: h.diet_user
                },
                diet_type__c: h.diet_type,
                diet_food__c: h.diet_food
            });
        });
        return db.create("diet_history__c", diet_history_list__c).then((response) => {
            // WebSocketを通じて更新を通知
            let channel = cache.get('channel-' + diet_history_list[0].diet_user);
            if (channel){
                let saved_diet_history_list = [];
                diet_history_list.map((h) => {
                    h.food_full.diet_type = h.diet_type;
                    h.food_full.food = h.food_full.food_name;
                    saved_diet_history_list.push(h.food_full);
                })
                channel.emit('personalHistoryUpdated', saved_diet_history_list);
            }
        });
    }

    static upsert_user(user){
        let user__c = {
            user_id__c: user.user_id,
            display_name__c: user.display_name,
            picture_url__c: user.picture_url,
            birthday__c: user.birthday,
            sex__c: user.sex,
            height__c: user.height,
            activity__c: user.activity,
            first_login__c: user.first_login,
            email__c: user.email,
            phone__c: user.phone
        }
        if (user__c.birthday__c){
            user__c.birthday__c = moment(user__c.birthday__c * 1000).format("YYYY-MM-DD");
        }
        return db.upsert("diet_user__c", user__c, "user_id__c");
    }

    static get_user(user_id){
        return db.retrieve("diet_user__c/user_id__c", user_id).then((user__c) => {
            let user = {
                line_id: user__c.user_id__c,
                sex: user__c.sex__c,
                birthday: user__c.birthday__c,
                age: user__c.age__c,
                height: user__c.height__c,
                picture_url: user__c.picture_url__c,
                activity: user__c.activity__c,
                display_name: user__c.display_name__c,
                first_login: user__c.first_login__c,
                email: user__c.email__c,
                phone: user__c.phone__c
            }
            user.birthday = new Date(user.birthday).getTime() / 1000;
            user.requiredCalorie = calorie.getRequiredCalorie(user.birthday, user.height, user.sex, user.activity);
            user.requiredNutrition = nutrition.getRequiredNutrition(user.birthday, user.height, user.sex, user.activity);
            return user;
        });
    }

    static get_today_history(user_id){
        let query = `
            select
                diet_type__c,
                diet_date__c,
                diet_food__r.food_id__c,
                diet_food__r.category__c,
                diet_food__r.food_name__c,
                diet_food__r.calorie__c,
                diet_food__r.protein__c,
                diet_food__r.carb__c,
                diet_food__r.fat__c,
                diet_food__r.fiber__c,
                diet_food__r.water__c,
                diet_food__r.ash__c,
                diet_food__r.cholesterol__c,
                diet_food__r.unidentified__c
            from diet_history__c where
                diet_user__r.user_id__c = '${user_id}' and
                diet_date__c = today
        `;
        return db.query(query).then((history_list__c) => {
            let history_list = [];
            history_list__c.records.map((h) => {
                history_list.push({
                    diet_type: h.diet_type__c,
                    diet_date: h.diet_date__c,
                    food: h.diet_food__r.food_name__c,
                    food_id: h.diet_food__r.food_id__c,
                    category: h.diet_food__r.food_name__c,
                    calorie: h.diet_food__r.calorie__c,
                    carb: h.diet_food__r.carb__c,
                    fat: h.diet_food__r.fat__c,
                    protein: h.diet_food__r.protein__c,
                    fiber: h.diet_food__r.fiber__c,
                    water: h.diet_food__r.water__c,
                    ash: h.diet_food__r.ash__c,
                    cholesterol: h.diet_food__r.cholesterol__c,
                    unidentifyied: h.diet_food__r.unidentified__c
                });
            });
            return history_list;
        });
    }
}

module.exports = ServiceUser;
