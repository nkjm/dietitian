'use strict';

const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const app = require('../index');
const db = require("../service/salesforce");
const debug = require("debug")("bot-epxress:route");
Promise = require("bluebird");

router.get('/person/:user_id/diet_history/today', (req, res, next) => {
    return db.get_today_history(req.params.user_id).then((history) => {
        debug("Responding following diet history.");
        debug(history);
        return res.json(history);
    }).catch((error) => {
        debug(error);
        return res.json(error);
    });
});

module.exports = router;
