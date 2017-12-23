'use strict';

require("dotenv").config();

const express = require('express');
const router = express.Router();
const request = require("request");
const debug = require("debug")("bot-express:route");
const line_pay = require("line-pay");
const user_db = require("../service/user");
Promise = require("bluebird");
Promise.promisifyAll(request);

const pay = new line_pay({
    channelId: process.env.LINE_PAY_CHANNEL_ID,
    channelSecret: process.env.LINE_PAY_CHANNEL_SECRET,
    isSandbox: true
});

/**
Payment confirm URL
*/
router.get('/confirm', (req, res, next) => {

    debug(req.body);

    // Get reserved info
    let order;
    user_db.get_order_reservation(req.query.transactionId).then((response) => {
        order = response;
        // Confirm payment.
        return pay.confirm({
            transactionId: req.query.transactionId,
            amount: order.amount,
            currency: order.currency
        });
    }).then((response) => {
        // Update order status to captured.
        return user_db.save_order({
            transaction_id: order.transaction_id,
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
                        speech: `${order.amount}円を決済しました。`
                    }]
                }
            }
        }
        return line_event.fire(event);
    }).then((response) => {
        if (response.statusCode == 200){
            res.send("決済が完了しました。この画面は閉じてOKです。");
        } else {
            debug(response.body);
            res.sendStatus(500);
        }
    })
});

module.exports = router;
