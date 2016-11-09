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
require('date-utils');

Promise.config({
    // Enable cancellation
    cancellation: true
});

router.post('/', (req, res, next) => {

    // Signature Validation
    if (!LineBot.validateSignature(req.get('X-Line-Signature'), req.rawBody)){
        return res.status(401).send('Signature validation failed.');
    }
    console.log('Signature validation succeeded.');

    // Webhookへのリクエストから必要な情報を抜き出す。
    let eventType = req.body.events[0].type;

    if (eventType == 'follow'){
        // ---------------------------------------------------------------------
        // イベントが友達追加だった場合の処理。
        // ---------------------------------------------------------------------
        /*
        1. ユーザーのプロファイルを取得する。
        2. 私の栄養士サービスにアカウント登録する。
        3. マイページのURLをメッセージで送る。
        */
        let replyToken = req.body.events[0].replyToken;
        let lineId = req.body.events[0].source.userId;

        // ユーザーのプロファイルを取得する。
        LineBot.getProfile(lineId)
        .then(
            // 私の栄養士サービスにアカウント登録する。
            function(profile){
                return PersonDb.createPerson({
                    line_id: profile.lineId,
                    display_name: profile.displayName,
                    icon_url: profile.pictureUrl
                });
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
            // マイページのURLをメッセージで送る。
            function(){
                return Dietitian.greet(replyToken, message);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
            function(){
                res.status(200).end();
                return;
            },
            function(error){
                console.log(error);
                res.status(200).end();
            }
        );
    } else if (eventType == 'message'){
        // ---------------------------------------------------------------------
        // イベントがメッセージだった場合の処理。
        // ユーザーがいきなり話しかけてきた場合、およびBotが「朝食は何食べたの？」という質問への返信時にこちらの処理が走る。
        // ---------------------------------------------------------------------
        /*
        1. ユーザー情報を取得する。
        2. メッセージから食品っぽい単語を抽出する。
        3. 食品っぽい単語それぞれについて栄養価を取得する。
        4. どの食事か特定し食事履歴に保存する。
        5. スレッドを削除、WebSocketで更新を通知、残りカロリーを取得する。
        6. 残りカロリーに応じたメッセージを送信する。
        */
        let replyToken = req.body.events[0].replyToken;
        let lineId = req.body.events[0].source.userId;
        let message = req.body.events[0].message.text;
        // ユーザー情報を取得する。
        let person;
        let p = PersonDb.getPerson(lineId)
        .then(
            function(response){
                person = response;
                // メッセージから食品っぽい単語を抽出する。
                return TextMiner.getFoodListFromMessage(message);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
            function(foodList){
                // もし認識された食品がなければ、処理をストップしてごめんねメッセージを送る。
                if (foodList.length == 0){
                    console.log('No food word found.');
                    Dietitian.apologize(replyToken)
                    .then(
                        function(){
                            res.status(200).end();
                        }
                    );
                    p.cancel();
                    return;
                }

                // 食品リストの食品それぞれについて、栄養情報を取得する。
                console.log('Getting Food List with Nutrition.');
                return FoodDb.getFoodListWithNutrition(foodList);
            },
            function(error){
                console.log(error.message);
                return Promise.reject(error);
            }
        ).then(
            function(foodListWithNutrition){
                // もし認識された食品がなければ、処理をストップしてごめんねメッセージを送る。
                if (foodListWithNutrition.length == 0){
                    console.log('No food identified.');
                    Dietitian.apologize(replyToken)
                    .then(
                        function(){
                            res.status(200).end();
                        }
                    );
                    p.cancel();
                    return;
                }

                // 何日のどの食事なのか特定する。事前に栄養士Botが尋ねた内容をスレッドから検索する。
                let thread = cache.get('thread-' + person.line_id);
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
                        console.log('Saving Diet History.');
                        return PersonalHistoryDb.saveFoodListAsDietHistory(person.line_id, dietDate, dietType, foodListWithNutrition);
                    }
                }

                // 事前の会話がなかった場合。
                //// 食品リスト（栄養情報含む）をスレッドに保存する。
                Dietitian.saveFoodList(person.line_id, foodListWithNutrition);
                //// どの食事か質問する。
                Dietitian.askDietType(person.line_id)
                .then(
                    function(){
                        res.status(200).end();
                    }
                );
                p.cancel();
                return;
            },
            function(error){
                console.log(error.message);
                return Promise.reject(error);
            }
        ).then(
            function(savedDietHistoryList){
                // スレッド（会話）を削除
                cache.del('thread-' + person.line_id);

                // WebSocketを通じて更新を通知
                let channel = cache.get('channel-' + person.line_id);
                if (channel){
                    channel.emit('personalHistoryUpdated', savedDietHistoryList);
                }

                // 残り必要カロリーを取得。
                console.log('Getting Calorie To Go.');
                return PersonalHistoryDb.getCalorieToGo(person.line_id, person.requiredCalorie);
            },
            function(error){
                return Promise.reject(error);
            }
        ).then(
            function(calorieToGo){
                // 残りカロリーに応じたメッセージを送信する。
                return Dietitian.replyBasedOnCalorieToGo(replyToken, calorieToGo);
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
    } else if (eventType == 'postback'){
        // ---------------------------------------------------------------------
        // イベントがPostbackだった場合の処理。
        // ユーザーがいきなり話しかけてきた後、Botがどの食事か質問し、その答えをタップしたときにこちらの処理が走る。
        // ---------------------------------------------------------------------
        /*
        1. スレッドから食事履歴を取得する。
        2. ユーザー情報を取得する。
        3. 食事履歴に保存する。
        4. スレッドを削除、WebSocketで更新を通知、残りカロリーを取得する。
        5. 残りカロリーに応じたメッセージを送信する。
        */
        let replyToken = req.body.events[0].replyToken;
        let lineId = req.body.events[0].source.userId;
        let postbackData = JSON.parse(req.body.events[0].postback.data);
        let dietType = postbackData.dietType;
        let dietDate = (new Date()).toFormat("YYYY-MM-DD");
        let threadList = cache.get('thread-' + lineId);
        let foodListWithNutrition;

        // 直近の会話に食事履歴があるはず、という仮定で食事履歴を取得。
        for (let thread of threadList.thread){
            if (thread.type == 'foodList' && thread.foodList.length > 0){
                console.log('Found foodList');
                foodListWithNutrition = thread.foodList;
            }
        }

        if (!foodListWithNutrition){
            // あるはずの食事履歴が見当たらないので終了。
            console.log('FoodList not found');
            return res.status(200).end();
        }

        // ユーザー情報を取得する。
        let person;
        let p = PersonDb.getPerson(lineId)
        .then(
            function(response){
                person = response;
                // 食品リスト(栄養情報含む）をユーザーの食事履歴に保存する。
                console.log('Saveing Diet History.');
                return PersonalHistoryDb.saveFoodListAsDietHistory(person.line_id, dietDate, dietType, foodListWithNutrition);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
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
            },
            function(error){
                return Promise.reject(error);
            }
        ).then(
            function(calorieToGo){
                // 残りカロリーに応じたメッセージを送信する。
                return Dietitian.replyBasedOnCalorieToGo(replyToken, calorieToGo);
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
    }
});

module.exports = router;
