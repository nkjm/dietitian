'use strict';

const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const app = require('../index');
//const PersonalHistoryDb = require('../service/personalHistoryDb');
const db = require("../service/salesforce");

router.get('/person/:user_id/diet_history/today', (req, res, next) => {
    db.get_today_history(req.params.user_id).then((history) => {
        return res.json(history);
    }).catch((error) => {
        return Promise.reject(new Error(error));
    });
    /*
    PersonalHistoryDb.getTodayHistory(req.params.user_id)
    .then(
        function(history){
            res.json(history);
        },
        function(error){
            res.json(error);
        }
    );
    */
});

module.exports = router;
