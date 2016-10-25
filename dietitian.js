'use strict'

const LineBot = require('./lineBot.js');
const cache = require('memory-cache');
const Promise = require('bluebird');
const CalorieCalc = require('./calorieCalc');

 module.exports = class dietitian {

     static commentOnCalorie(lineId, calorieToGo){

     }

     static askDietType(lineId){
         return new Promise(function(resolve, reject){

             let message = {
                 type: 'template',
                 template: {
                     type: 'buttons',
                     text: 'どの食事でしたっけ？',
                     actions: [{
                         "type":"postback",
                         "label":"朝食",
                         "data":"postback_type=answer_diet_type&diet_type=breakfast"
                     },{
                         "type":"postback",
                         "label":"昼食",
                         "data":"postback_type=answer_diet_type&diet_type=lunch"
                     },{
                         "type":"postback",
                         "label":"夕食",
                         "data":"postback_type=answer_diet_type&diet_type=dinner"
                     }]
                 }
             };

             LineBot.pushMessage(lineId, message)
             .then(
                 function(){
                     const thread = {
                         thread: [{
                             timestamp: (new Date()).getTime(),
                             source: 'dietitian',
                             type: 'askDietType'
                         }]
                     }
                     const timeToExpire = 1000 * 60 * 60 * 2 // 2時間
                     cache.put(lineId, threads, timeToExpire);
                     resolve();
                 },
                 function(error){
                     reject(error);
                 }
             )
         });
     }

     static saveFoodList(lineId, foodList){
         const threads = {
             threads: [{
                 timestamp: (new Date()).getTime(),
                 source: 'user',
                 type: 'foodList',
                 foodList: foodList
             }]
         }
         const timeToExpire = 1000 * 60 * 60 * 2 // 2時間
         cache.put(lineId, threads, timeToExpire);
     }

     static whatDidYouEat(lineId, dietType){
         return new Promise(function(resolve, reject){

             let dietTypeLabel = dietitian.getDietTypeLabel(dietType);
             if (!dietTypeLabel) reject({message: 'Unknown Diet Type'});

             let message = {
                 type: 'text',
                 text: '今日の' + dietTypeLabel + 'は何を食べたの？'
             }

             LineBot.pushMessage(lineId, message)
             .then(
                 function(){
                     const threads = {
                         threads: [{
                             timestamp: (new Date()).getTime(),
                             source: 'dietitian',
                             type: 'whatDidYouEat',
                             dietType: dietType,
                             dietDate: (new Date()).getFullYear() + '-' + (new Date()).getMonth() + '-' + (new Date()).getDate()
                         }]
                     }
                     //const timeToExpire = 1000 * 60 * 60 * 2 // 2時間
                     const timeToExpire = 1000 * 60 * 1 // 1分
                     cache.put(lineId, threads, timeToExpire);
                     resolve();
                 },
                 function(error){
                     reject(error);
                 }
             )
         });
     }

     static getDietTypeLabel(dietType){
         let dietTypeLabel;
         if (dietType == 'breakfast'){
             dietTypeLabel = '朝食';
         } else if (dietType == 'lunch'){
             dietTypeLabel = '昼食';
         } else if (dietType == 'dinner'){
             dietTypeLabel = '夕食';
         } else {
             dietTypeLabel = null;
         }
         return dietTypeLabel;
     }
 }
