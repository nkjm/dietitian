'use strict';

const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const crypto = require('crypto');
const Promise = require('bluebird');
const TextMiner = require('../textMiner');
const FoodDb = require('../foodDb');
const PersonalHistoryDb = require('../personalHistoryDb');
const PersonDb = require('../personDb');
const LineBot = require('../lineBot');
const Dietitian = require('../dietitian');

router.post('/', (req, res, next) => {

    // Signature Validation
    if (!LineBot.validateSignature(req.get('X-Line-Signature'), req.rawBody)){
        return res.status(401).send('Signature validation failed.');
    }
    console.log('Signature validation succeeded.');

    // Webhookへのリクエストから必要な情報を抜き出す。
    let message = req.body.events[0].message.text;
    let line_id = req.body.events[0].source.userId;
    let replyToken = req.body.events[0].replyToken;

    // ユーザー情報を取得する。
    const personDb = new PersonDb();
    let p = personDb.getPerson(line_id)
    .then(
        function(person){
            // メッセージから食品を抽出する。
            personDb.person = person;
            return TextMiner.getFoodListFromMessage(message);
        },
        function(error){
            return Promise.reject(error);
        }
    )
    .then(
        function(foodList){
            // 食品リストの食品それぞれについて、栄養情報を取得する。
            return FoodDb.getFoodListWithNutrition(foodList);
        },
        function(error){
            console.log(error.message);
            return Promise.reject(error);
        }
    ).then(
        function(foodListWithNutrition){
            // 何日のどの食事なのか特定する。事前に栄養士Botが尋ねた内容をスレッドから検索する。
            let thread = cache.get('thread-' + personDb.person.line_id);
            let dietDate;
            let dietType;

            if (thread){
                console.log("Found thread.");
                // 事前の会話が存在している場合。
                let latestMessage = thread.thread[thread.thread.length - 1];
                if (latestMessage.source == 'dietitian' && latestMessage.type == 'whatDidYouEat'){
                    // Botが何を食べたか聞いていた場合。Diet TypeとDiet Dateは特定されているため、食事履歴の保存に進む。
                    dietDate = latestMessage.dietDate;
                    dietType = latestMessage.dietType;

                    // 食品リスト(栄養情報含む）をユーザーの食事履歴に保存する。
                    return PersonalHistoryDb.saveFoodListAsDietHistory(personDb.person.line_id, dietDate, dietType, foodListWithNutrition);
                }
            }

            // 事前の会話がなかった場合。
            //// 食品リスト（栄養情報含む）をスレッドに保存する。
            Dietitian.saveFoodList(personDb.person.line_id, foodListWithNutrition);
            //// どの食事か質問する。
            Dietitian.askDietType(personDb.person.line_id)
            .then(
                function(){
                    res.status(200).end();
                    p.break();
                },
                function(error){
                    return Promise.reject(error);
                }
            );
            p.break();
        },
        function(error){
            console.log(error.message);
            return Promise.reject(error);
        }
    ).then(
        function(savedDietHistoryList){
            // スレッド（会話）を削除
            cache.del('thread-' + personDb.person.line_id);

            // WebSocketを通じて更新を通知
            let channel = cache.get('channel-' + personDb.person.line_id);
            if (channel){
                channel.emit('personalHistoryUpdated', savedDietHistoryList);
            }

            // 残り必要カロリーを取得。
            return PersonalHistoryDb.getCalorieToGo(personDb.person.line_id, personDb.person.birthday, personDb.person.height, personDb.person.sex);
        },
        function(error){
            return Promise.reject(error);
        }
    ).then(
        function(calorieToGo){
            // メッセージをユーザーに送信。
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
            return LineBot.replyMessage(replyToken, message);
        },
        function(error){
            return Promise.reject(error);
        }
    ).then(
        function(response){
            // コール元のLineにステータスコード200を返す。常に200を返さなければならない。
            res.status(200).end();
        },
        function(error){
            console.log(error);
            res.status(200).end();
        }
    );
});

/*
router.get('/test', (req, res, next) => {

    // 仮のテスト用データ
    let message = '納豆';
    let person = {
        line_id: 'U35df722ecd249c60b104ee32448bfaae',
    }

    // テキストメッセージから食品リストを抽出する。
    TextMiner.getFoodListFromMessage(message)
    .then(
        function(foodList){
            // 食品リストの食品それぞれについて、栄養情報を取得する。
            return FoodDb.getFoodListWithNutrition(foodList);
        },
        function(error){
            console.log(error.message);
            Promise.reject(error);
        }
    ).then(
        function(foodListWithNutrition){
            // 食品リスト(栄養情報含む）をユーザーの食事履歴に保存する。
            let dietDate = '2016-10-24';
            let dietType = 'breakfast';
            return PersonalHistoryDb.saveFoodListAsDietHistory(person.line_id, dietDate, dietType, foodListWithNutrition);
        },
        function(error){
            console.log(error.message);
            Promise.reject(error);
        }
    ).then(
        function(savedDietHistoryList){

            // WebSocketを通じて更新を通知
            let channel = cache.get(person.line_id);
            if (channel){
                channel.emit('personalHistoryUpdated', savedDietHistoryList);
            }

            res.status(200).end();
        },
        function(error){
            console.log(error.message);
            res.json(error);
        }
    );
});
*/

module.exports = router;
