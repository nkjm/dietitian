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

    static get_order_reservation(transaction_id){
        return db.retrieve("diet_order__c/transaction_id__c", transaction_id).then((response) => {
            if (!response.records){
                return null
            }
            let order = {
                transaction_id: order__c.transaction_id__c,
                order_id: order__c.order_id__c,
                amount: order__c.amount__c,
                currency: order__c.currency__c,
                diet_user: order__c.diet_user__c,
                user_id: order__c.user_id__c,
                status: order__c.status__c
            }
            return order;
        })
    }

    static save_order(order){
        let diet_order__c = {
            diet_user__r: {
                user_id__c: order.user_id
            },
            transaction_id__c: order.transaction_id,
            order_id__c: order.order_id,
            amount__c: order.amount,
            currency__c: order.currency,
            status__c: order.status || "reserved"
        }
        return db.upsert("diet_order__c", diet_order__c, "transaction_id__c");
    }

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

    static save_diet_history_list(user_id, diet_type, food_list){
        let diet_history_list__c = [];
        food_list.map((f) => {
            diet_history_list__c.push({
                diet_user__r: {
                    user_id__c: user_id
                },
                diet_type__c: diet_type,
                food_name__c: f.name,
                db_type__c: f.db_type,
                food_id__c: f.id,
                calorie__c: f.calorie,
                carb__c: f.carb,
                protein__c: f.protein,
                fat__c: f.fat,
                cholesterol__c: f.cholesterol,
                fiber__c: f.fiber,
                water__c: f.water,
                ash__c: f.ash
            });
        });
        return db.create("diet_history__c", diet_history_list__c).then((response) => {
            // WebSocketを通じて更新を通知
            let channel = cache.get('channel-' + user_id);
            if (channel){
                let diet_history_list_to_emit = food_list;
                food_list.map((f) => {
                    f.diet_type = diet_type;
                    f.food = f.name;
                })
                channel.emit('personalHistoryUpdated', diet_history_list_to_emit);
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
                food_name__c,
                db_type__c,
                food_id__c,
                calorie__c,
                carb__c,
                protein__c,
                fat__c,
                cholesterol__c,
                fiber__c,
                water__c,
                ash__c
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
                    food: h.food_name__c,
                    food_id: h.food_id__c,
                    calorie: h.calorie__c,
                    carb: h.carb__c,
                    protein: h.protein__c,
                    fat: h.fat__c,
                    cholesterol: h.cholesterol__c,
                    fiber: h.fiber__c,
                    water: h.water__c,
                    ash: h.ash__c
                });
            });
            return history_list;
        });
    }
}

module.exports = ServiceUser;
