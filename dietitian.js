'use strict'

const LineBot = require('./lineBot');
const PersonDb = require('./personDb');
const PersonalHistoryDb = require('./personalHistoryDb');
const cache = require('memory-cache');
const Promise = require('bluebird');
const CalorieCalc = require('./calorieCalc');
const MYPAGE_URL_BASE = decodeURIComponent(process.env.MYPAGE_URL_BASE);
require('date-utils');

const thread_timeToExpire = 1000 * 60 * 60 * 2 // 2時間

 module.exports = class dietitian {

     static saveDietHistoryAndSendSummary(replyToken, lineId, dietDate, dietType, foodListWithNutrition){
         let person;
         let p = PersonDb.getPerson(lineId)
         .then(
             function(response){
                 person = response;
                 // 食品リスト(栄養情報含む）をユーザーの食事履歴に保存する。
                 console.log('Saveing Diet History.');
                 return PersonalHistoryDb.saveFoodListAsDietHistory(person.line_id, dietDate, dietType, foodListWithNutrition);
             }
         ).then(
             function(savedDietHistoryList){
                 // スレッド（会話）を削除
                 console.log('Deleting Thread');
                 cache.del('thread-' + person.line_id);

                 // WebSocketを通じて更新を通知
                 let channel = cache.get('channel-' + person.line_id);
                 if (channel){
                     channel.emit('personalHistoryUpdated', savedDietHistoryList);
                 }

                 // 残り必要カロリーを取得。
                 console.log('Getting Calorie To Go.');
                 return PersonalHistoryDb.getCalorieToGo(person.line_id, person.requiredCalorie);
             }
         ).then(
             function(calorieToGo){
                 // 残りカロリーに応じたメッセージを送信する。
                 return dietitian.replyBasedOnCalorieToGo(replyToken, calorieToGo, person.line_id, person.security_code);
             }
         ).then(
             function(response){
                 console.log("Diet history saved and summary sent.");
             },
             function(error){
                 console.log(error);
             }
         );
         return p;
     }

     static getLatestConversation(lineId){
         let thread = cache.get('thread-' + lineId);
         if (!thread){
             return null;
         }
         return thread[thread.length - 1];
     }

     static tellMeLater(replyToken){
         let message = {
             type: 'text',
             text: 'それは失礼。また後で教えてね。'
         }
         return LineBot.replyMessage(replyToken, message);
     }

     static sorryForSkippingMeal(replyToken){
         let message = {
             type: 'text',
             text: 'なんと。お腹空いたでしょうに。カロリーメイトとか食べておいてね。'
         }
         return LineBot.replyMessage(replyToken, message);
     }

     // 仮の実装。本来は残りカロリー、栄養から特定すべき。
     static recommend(replyToken){
         let message = {
             type: 'text',
             text: 'カレーライスでもどうですか？'
         }
         return LineBot.replyMessage(replyToken, message);
     }

     static sendMyPage(replyToken, lineId){
         return PersonDb.getPerson(lineId)
         .then(
             function(person){
                 let uri = MYPAGE_URL_BASE + lineId + '?security_code=' + person.security_code;
                 let message = {
                     type: 'template',
                     altText: 'はーい、どうぞ！ ' + uri,
                     template: {
                         type: 'buttons',
                         text: 'はーい、どうぞ！',
                         actions: [{
                             type: 'uri',
                             label: 'マイページ',
                             uri: uri
                         }]
                     }
                 }
                 return LineBot.replyMessage(replyToken, message);
             }
         );
     }

     static greetAgain(replyToken, lineId, securityCode){
         let uri = MYPAGE_URL_BASE + lineId + '?security_code=' + securityCode;
         let message = {
             type: 'template',
             altText: 'おかえりなさい。また私があなたの専属栄養士としてサポートしていきます、よろしくね。マイページで自分の栄養状態をいつでもチェックできるのでブックマークしておいてね。 ' + uri,
             template: {
                 type: 'buttons',
                 text: 'おかえりなさい。また私があなたの専属栄養士としてサポートしていきます、よろしくね。下記のマイページで自分の栄養状態をいつでもチェックできるのでブックマークしておいてね。',
                 actions: [{
                     type: 'uri',
                     label: 'マイページ',
                     uri: uri
                 }]
             }
         }
         return LineBot.replyMessage(replyToken, message);
     }

     static greet(replyToken, lineId, securityCode){
         let uri = MYPAGE_URL_BASE + lineId + '?security_code=' + securityCode;
         let message = {
             type: 'template',
             altText: 'はじめまして。これから私があなたの専属栄養士としてサポートしていきます、よろしくね。下記のマイページで自分の栄養状態をいつでもチェックできるのでブックマークしておいてね。 ' + uri,
             template: {
                 type: 'buttons',
                 text: 'はじめまして。これから私があなたの専属栄養士としてサポートしていきます、よろしくね。下記のマイページで自分の栄養状態をいつでもチェックできるのでブックマークしておいてね。',
                 actions: [{
                     type: 'uri',
                     label: 'マイページ',
                     uri: uri
                 }]
             }
         }
         return LineBot.replyMessage(replyToken, message);
     }

     static apologize(replyToken, messageText){
         let message = {
             type: 'text',
             text: 'ごめんなさい、' + messageText
         }
         console.log('Replying apologies.');
         return LineBot.replyMessage(replyToken, message);
     }

     static replyBasedOnCalorieToGo(replyToken, calorieToGo, lineId, securityCode){
         let messageText;
         if (calorieToGo > 0){
             messageText = '了解。カロリー満タンまであと' + calorieToGo + 'kcalですよー。';
         } else if (calorieToGo < 0){
             messageText = 'ぎゃー食べ過ぎです。' + calorieToGo * -1 + 'kcal超過してます。';
         } else if (calorieToGo == 0){
             messageText = 'カロリー、ちょうど満タンです！';
         } else {
             messageText = 'あれ、満タンまであとどれくらいだろう・・';
         }
         let uri = MYPAGE_URL_BASE + lineId + '?security_code=' + securityCode;
         let message = {
             type: 'template',
             altText: messageText,
             template: {
                 type: 'buttons',
                 text: messageText,
                 actions: [{
                     type: 'uri',
                     label: 'マイページで確認',
                     uri: uri
                 }]
             }
         }
         console.log('Sending message based on Calorie to go.');
         return LineBot.replyMessage(replyToken, message);
     }

     static confirmDietType(replyToken, lineId, timestamp){
         console.log('sending confirmDietType.');
         let issueHour = new Date(timestamp).getHours();
         let dietType;
         if (issueHour <= 6){
             dietType = 'dinner';
         } else if (6 < issueHour && issueHour <= 11){
             dietType = 'breakfast';
         } else if (11 < issueHour && issueHour <= 16){
             dietType = 'lunch';
         } else {
             dietType = 'dinner';
         }
         let dietTypeLabel = dietitian.getDietTypeLabel(dietType);
         let messageText = 'それは' + dietTypeLabel + '?';
         let message = {
             type: 'template',
             altText: messageText,
             template: {
                 type: 'confirm',
                 text: messageText,
                 actions: [{
                     "type":"postback",
                     "label":"はい",
                     "data": JSON.stringify({
                         postbackType:'answerDietType',
                         dietType: dietType
                     })
                 },{
                     "type":"postback",
                     "label":"いいえ",
                     "data": JSON.stringify({
                         postbackType:'answerDietType',
                         dietType: 'incorrect'
                     })
                 }]
             }
         };
         // 質問をスレッドに記録。
         let conversation = {
             timestamp: (new Date()).getTime(),
             source: 'dietitian',
             type: 'confirmDietType',
             dietType: dietType
         }
         dietitian.pushToThread(lineId, conversation);

         return LineBot.replyMessage(replyToken, message);
     }

     static askDietType(lineId){
         console.log('sending askDietType.');
         let messageText = 'どの食事でいただいたの？';
         let message = {
             type: 'template',
             altText: 'どの食事でいただいたの？朝食？昼食？夕食?',
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

         // 質問をスレッドに記録。
         let conversation = {
             timestamp: (new Date()).getTime(),
             source: 'dietitian',
             type: 'askDietType'
         }
         dietitian.pushToThread(lineId, conversation);

         return LineBot.pushMessage(lineId, message);
     }

     static rememberFoodList(lineId){
         let foodListWithNutrition = [];
         let thread = cache.get('thread-' + lineId);
         if (!thread){
             return foodListWithNutrition;
         }
         for (let conversation of thread){
             if (conversation.type == 'foodList' && conversation.foodList.length > 0){
                 console.log('Found foodList in thread.');
                 foodListWithNutrition = conversation.foodList;
             }
         }
         return foodListWithNutrition;
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
         let dietTypeLabel = dietitian.getDietTypeLabel(dietType);
         if (!dietTypeLabel) reject({message: 'Unknown Diet Type'});

         let message = {
             type: 'text',
             text: '今日の' + dietTypeLabel + 'は何を食べたの？'
         }

         // 質問をスレッドに記録。
         let conversation = {
             timestamp: (new Date()).getTime(),
             source: 'dietitian',
             type: 'whatDidYouEat',
             dietType: dietType,
             dietDate: (new Date()).toFormat("YYYY-MM-DD")
         }
         dietitian.pushToThread(lineId, conversation);

         return LineBot.pushMessage(lineId, message);
     }

     static pushToThread(lineId, conversation){
         let thread = cache.get('thread-' + lineId);
         if (thread && thread.length > 0){
             thread.push(conversation);
         } else {
             thread = [conversation];
         }
         cache.put('thread-' + lineId, thread, thread_timeToExpire);
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
