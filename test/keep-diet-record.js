"use strict";

require("dotenv").config();

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Emulator = require("../test-util/emulator");
const messenger_options = [{
    name: "line",
    options: {
        line_channel_secret: process.env.LINE_CHANNEL_SECRET
    }
}];
const db = require("../service/salesforce");

chai.use(chaiAsPromised);
const should = chai.should();

for (let messenger_option of messenger_options){
    let emu = new Emulator(messenger_option.name, messenger_option.options);

    describe("Test rate-answer skill from " + emu.messenger_type, function(){
        let user_id = process.env.TEST_USER_ID;

        describe("Dietitian sends push event to run keep-diet-record and user answers identifiable diet.", function(){
            it("will save diet record.", function(){
                this.timeout(8000);

                return emu.clear_context(user_id).then(function(){
                    return emu.send({
                        type: "bot-express:push",
                        to: {
                            type: "user",
                            userId: user_id
                        },
                        intent: {
                            name: "keep-diet-record",
                            parameters: {
                                diet_type: "昼食"
                            }
                        }
                    });
                }).then(function(context){
                    context.intent.name.should.equal("keep-diet-record");
                    context.confirming.should.equal("diet");
                    context.confirmed.diet_type.should.deep.equal({
                        name: "lunch",
                        label: "昼食"
                    });
                    let event = emu.create_message_event(user_id, "カツ丼を食べました");
                    return emu.send(event);
                }).then(function(context){
                    should.not.exist(context);
                });
            });
        });
    });
}
