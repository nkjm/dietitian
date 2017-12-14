"use strict";

require("dotenv").config();

const debug = require("debug")("bot-express:service");
const jsforce = require("jsforce");

Promise = require('bluebird');

class ServiceSalesforce {

    static upsert_user(user){
        debug("Going to upsert user.");
        const conn = new jsforce.Connection();
        return conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD).then((response) => {
            return conn.sobject("diet_user__c").upsert(user, "user_id__c");
        }).then((response) => {
            if (response.success){
                return response;
            } else {
                return Promise.reject(new Error(response));
            }
        })
    }

    static get_user(user_id){
        debug("Going to get user...");
        const conn = new jsforce.Connection();
        return conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD).then((response) => {
            return conn.sobject("diet_user__c/user_id__c").retrieve(user_id);
        }).then((user) => {
            return user;
        }).catch((error) => {
            return Promise.reject(new Error(error));
        })
    }

    static get_today_history(user_id){
        const conn = new jsforce.Connection();
        return conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD).then((response) => {
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
            return conn.query(query);
        }).then((response) => {
            debug(response);
            let history_list = [];
            response.records.map((h) => {
                history_list.push({
                    diet_type: h.diet_type__c,
                    diet_date: h.diet_date__c,
                    food: h.diet_food__r.food_name__c,
                    food_id: h.diet_food__r.food_id__c,
                    category: h.diet_food__r.food_name__c,
                    calorie: h.diet_food__r.calorie__c,
                    carb: h.diet_food__r.carb__c,
                    fat: h.diet_food__r.fat__c,
                    fiber: h.diet_food__r.fiber__c,
                    water: h.diet_food__r.water__c,
                    ash: h.diet_food__r.ash__c,
                    cholesterol: h.diet_food__r.cholesterol__c,
                    unidentifyied: h.diet_food__r.unidentified__c
                });
            })
            return history_list;
        }).catch((error) => {
            return Promise.reject(new Error(error));
        })
    }
}

module.exports = ServiceSalesforce;
