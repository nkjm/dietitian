"use strict";

const express = require('express');
const router = express.Router();
const debug = require("debug")("bot-express:route");
const Salesforce = require("../service/salesforce");
const db = new Salesforce();
const body_parser = require("body-parser");

router.use(body_parser.json());

router.put('/person/:user_id', (req, res, next) => {
    let user = req.body.person;
    user.user_id = req.params.user_id;
    user.first_login = 0;
    debug("Going to upsert user...");
    db.upsert_user(user, "user_id__c").then((response) => {
        debug("Completed upsert user.");
        debug(response);
        res.status(200).end();
    }, (error) => {
        debug(error);
        res.status(500).end();
    });
});

router.get('/person/:user_id', (req, res, next) => {
    debug("Going to get user...");
    db.get_user(req.params.user_id).then((response) => {
        debug("Completed get user.");
        res.json(response);
    }, (error) => {
        debug(error);
        res.status(500).end();
    });
});

module.exports = router;
