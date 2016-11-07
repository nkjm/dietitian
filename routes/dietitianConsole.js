'use strict';

const express = require('express');
const router = express.Router();
const PersonDb = require('../personDb');
const Dietitian = require('../dietitian');

router.get('/api/askDietType', (req, res, next) => {
    console.log('hoge');
    if (!req.query.line_id) res.status(400).json('Line Id not set.');
    Dietitian.askDietType(req.query.line_id)
    .then(
        function(){
            res.status(200).end();
        },
        function(error){
            res.status(400).json(error);
        }
    );
});

router.get('/api/whatDidYouEat', (req, res, next) => {
    if (!req.query.line_id) res.status(400).json('Line Id not set.');
    if (!req.query.diet_type) res.status(400).json('Diet Type not set.');
    Dietitian.whatDidYouEat(req.query.line_id, req.query.diet_type)
    .then(
        function(){
            res.status(200).end();
        },
        function(error){
            res.status(400).json(error);
        }
    );
});

router.get('/', (req, res, next) => {
    PersonDb.getPersonList()
    .then(
        function(personList){
            // UIを出力。
            res.render('dietitianConsole', {personList: personList});
        },
        function(error){
            res.status(400).send('Could not get Person List. It seems Person Db is out of order.');
        }
    )
});

module.exports = router;
