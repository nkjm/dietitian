"use strict";

require("dotenv").config();

const debug = require("debug")("bot-express:route");
const jsforce = require("jsforce");
const jwt = require('jsonwebtoken');

Promise = require('bluebird');

class ServiceSalesforce {

    static upsert_user(user){
        const conn = new jsforce.Connection();
        return conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD).then((response) => {
            return conn.sobject("diet_user__c").upsert(user, "user_id__c");
        }).then((response) => {
            if (response.success){
                debug(response);
                return response;
            } else {
                return Promise.reject(new Error(response));
            }
        })
    }
}

module.exports = ServiceSalesforce;
