"use strict";

require("dotenv").config();

const debug = require("debug")("bot-express:service");
const jsforce = require("jsforce");
const cache = require("memory-cache");

Promise = require('bluebird');

class ServiceSalesforce {

    constructor(options = {}){
        const username = options.username || process.env.SF_USERNAME;
        const password = options.password || process.env.SF_PASSWORD;

        let credential = cache.get("salesforce");
        if (credential){
            debug("We have credential to access salesforce.");
            this.done_connection = Promise.resolve(credential)
        } else {
            debug("We don't have credential to access salesforce.");
            const conn = new jsforce.Connection();
            this.done_connection = conn.login(username, password).then((response) => {
                let credential = {
                    accessToken: conn.accessToken,
                    instanceUrl: conn.instanceUrl
                }
                cache.put("salesforce", credential, 1000 * 60 * 60); // Retain 60 min.
                return credential;
            });
        }
    }

    create(sobject, data){
        return this.done_connection.then((credential) => {
            const conn = new jsforce.Connection(credential);
            return conn.sobject(sobject).create(data);
        });
    }

    upsert(sobject, data, ext_key){
        return this.done_connection.then((credential) => {
            const conn = new jsforce.Connection(credential);
            return conn.sobject(sobject).upsert(data, ext_key);
        });
    }

    retrieve(sobject, id){
        return this.done_connection.then((credential) => {
            const conn = new jsforce.Connection(credential);
            return conn.sobject(sobject).retrieve(id);
        });
    }

    query(query){
        return this.done_connection.then((credential) => {
            const conn = new jsforce.Connection(credential);
            return conn.query(query);
        });
    }
}

module.exports = new ServiceSalesforce();
