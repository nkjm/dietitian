'use strict';

const express = require('express');
const router = express.Router();
const PersonDb = require('../service/personDb');

router.put('/person/:lineId', (req, res, next) => {
    PersonDb.updatePerson(req.params.lineId, req.body.person)
    .then(
        function(){
            res.status(200).end();
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

router.get('/person/:lineId', (req, res, next) => {
    PersonDb.getPerson(req.params.lineId)
    .then(
        function(person){
            res.json(person);
        },
        function(error){
            res.status(400).send(error);
        }
    );
});

module.exports = router;
