"use strict";

require("dotenv").config();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const debug = require("debug")("bot-express:test");
const crypto = require("crypto");
const request = require("request");
const line_event = require("../service/line-event");
const db = require("../service/salesforce");
Promise = require("bluebird");
Promise.promisifyAll(request);

chai.use(chaiAsPromised);
let should = chai.should();

describe("Test activate-account skill", function(){
    let user_id = process.env.TEST_USER_ID;

    describe("User agrees to activate account.", function(){
        it("should reserve payment and get transaction id. also create order record in database.", function(){
            return Promise.resolve().then(function(){
                let event = {
                    type: "bot-express:push",
                    timestamp: Date.now(),
                    to: {
                        type: "user",
                        userId: user_id
                    },
                    intent: {
                        name: "activate-account"
                    }
                }
                return line_event.fire(event);
            }).then(function(response){
                response.body.intent.name.should.equal("activate-account");

                let event ={
                    type: "message",
                    timestamp: Date.now(),
                    source: {
                        type: "user",
                        userId: user_id,
                    },
                    message: {
                        type: "text",
                        text: "はい"
                    }
                }
                return line_event.fire(event);
            }).then(function(response){
                response.body.confirmed.should.have.property("transaction_id");
                response.body.confirmed.should.have.property("order_id");

                return db.retrieve("diet_order__c/order_id__c", response.body.confirmed.order_id);
            }).then(function(response){
                response.should.have.property("amount__c");
                response.should.have.property("transaction_id__c");
                response.should.have.property("order_id__c");
                response.should.have.property("currency__c");
                response.should.have.property("status__c").and.equal("reserved");
                response.should.have.property("diet_user__c");

                return db.delete("diet_order__c", response.Id);
            }).then(function(response){
                response.should.have.property("id");
            });
        });
    });
});
