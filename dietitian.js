'use strict'

const LineBot = require('./lineBot.js');
const cache = require('memory-cache');
const Promise = require('bluebird');
const CalorieCalc = require('./calorieCalc');
require('date-utils');

 module.exports = class dietitian {

     static replyBasedOnCalorieToGo(replyToken, calorieToGo){
         let messageText;
         if (calorieToGo > 0){
             messageText = '了解。満タンまであと' + calorieToGo + 'kcalですよー。';
         } else if (calorieToGo < 0){
             messageText = 'ぎゃー食べ過ぎです。' + calorieToGo * -1 + 'kcal超過してます。';
         } else if (calorieToGo == 0){
             messageText = 'カロリー、ちょうど満タンです！';
         } else {
             messageText = 'あれ、満タンまであとどれくらいだろう・・';
         }
         let message = {
             type: 'text',
             text: messageText
         }
         console.log('Sending message based on Calorie to go.');
         return LineBot.replyMessage(replyToken, message);
     }

     static askDietType(lineId){
         return new Promise(function(resolve, reject){
             let messageText = 'どの食事でいただいたの？';
             let message = {
                 type: 'template',
                 altText: messageText,
                 template: {
                     type: 'buttons',
                     text: messageText,
                     actions: [{
                         "type":"postback",
                         "label":"朝食",
                         "data": JSON.stringify({
                             postbackType:'answerDietType',
                             dietType:'breakfast'
                         })
                     },{
                         "type":"postback",
                         "label":"昼食",
                         "data": JSON.stringify({
                             postbackType:'answerDietType',
                             dietType:'lunch'
                         })
                     },{
                         "type":"postback",
                         "label":"夕食",
                         "data": JSON.stringify({
                             postbackType:'answerDietType',
                             dietType:'dinner'
                         })
                     }]
                 }
             };
             LineBot.pushMessage(lineId, message)
             .then(
                 function(response){
                     let conversation = {
                         timestamp: (new Date()).getTime(),
                         source: 'dietitian',
                         type: 'askDietType'
                     }
                     dietitian.pushToThread(lineId, conversation);
                     resolve();
                 },
                 function(error){
                     reject(error);
                 }
             )
         });
     }

     static saveFoodList(lineId, foodList){
         let conversation = {
             timestamp: (new Date()).getTime(),
             source: 'user',
             type: 'foodList',
             foodList: foodList
         }
         dietitian.pushToThread(lineId, conversation);
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
                     let conversation = {
                         timestamp: (new Date()).getTime(),
                         source: 'dietitian',
                         type: 'whatDidYouEat',
                         dietType: dietType,
                         dietDate: (new Date()).toFormat("YYYY-MM-DD")
                     }
                     dietitian.pushToThread(lineId, conversation);
                     resolve();
                 },
                 function(error){
                     reject(error);
                 }
             )
         });
     }

     static pushToThread(lineId, conversation){
         let thread = cache.get('thread-' + lineId);
         if (thread && thread.thread && thread.thread.length > 0){
             thread.thread.push(conversation);
         } else {
             thread = {thread: [conversation]}
         }
         const timeToExpire = 1000 * 60 * 60 * 2 // 2時間
         cache.put('thread-' + lineId, thread, timeToExpire);
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
