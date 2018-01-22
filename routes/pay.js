'use strict';

require("dotenv").config();

const express = require('express');
const router = express.Router();
const request = require("request");
const debug = require("debug")("bot-express:route");
const line_pay = require("line-pay");
const user_db = require("../service/user");
const line_event = require("../service/line-event");
Promise = require("bluebird");
Promise.promisifyAll(request);

const pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    hostname: process.env.LINE_PAY_HOSTNAME,
    isSandbox: true
});

/**
Payment confirm URL
*/
router.get('/confirm', (req, res, next) => {
    // Get reserved info
    let order;
    debug(`Transaction Id is ${req.query.transactionId}`);
    debug(`Order Id is ${req.query.orderId}`);
    user_db.get_order_reservation(req.query.orderId).then((response) => {
        order = response;
        // Confirm payment.
        debug(`Going to confirm/capture payment...`);
        return pay.confirm({
            transactionId: req.query.transactionId,
            amount: order.amount,
            currency: order.currency
        });
    }).then((response) => {
        // Update order status to captured.
        debug(`Going to save order to database...`);
        return user_db.update_order_status({
            id: order.id,
            status: "captured"
        });
    }).then((response) => {
        // Notify user that payment has been completed.
        let event = {
            type: "bot-express:push",
            timestamp: Date.now(),
            to: {
                type: "user",
                userId: order.user_id,
            },
            intent: {
                name: "simple-response",
                fulfillment: {
                    messages: [{
                        type: 0,
                        speech: `${order.amount}円の決済が完了し、アカウントがアクティベートされました。`
                    }]
                }
            }
        }
        debug(`Going to notify to user that payment has been completed.`);
        debug(event);
        return line_event.fire(event);
    }).then((response) => {
        res.sendStatus(200);
    }).catch((response) => {
        debug(response);
        res.sendStatus(500);
    })
});

module.exports = router;
