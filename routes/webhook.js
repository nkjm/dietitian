'use strict';

const express = require('express');
const router = express.Router();
const cache = require('memory-cache');
const Promise = require('bluebird');
const TextMiner = require('../textMiner');
const mecab = require('mecabaas-client');
const FoodDb = require('../foodDb');
const PersonalHistoryDb = require('../personalHistoryDb');
const PersonDb = require('../personDb');
const LineBot = require('../lineBot');
const Dietitian = require('../dietitian');
const GoogleTranslate = require('../googleTranslateP');
const Apiai = require('../apiaiP');


require('date-utils');

Promise.config({
    // Enable cancellation
    cancellation: true
});

router.post('/', (req, res, next) => {
    res.status(200).end();

    // Signature Validation
    if (!LineBot.validateSignature(req.get('X-Line-Signature'), req.rawBody)){
        console.log('Signature validation failed.');
        return;
    }

    console.log('Signature validation succeeded.');

    // Webhookへのリクエストから必要な情報を抜き出す。
    let eventType = req.body.events[0].type;

    if (eventType == "unfollow"){
        /*
        let lineId = req.body.events[0].source.userId;
        PersonDb.deletePerson(lineId)
        .then(
            function(){
                console.log("End of unfollow event.");
            },
            function(error){
                console.log(error);
            }
        );
        */
        console.log("Got unfollow event. Do nothing for now.");
    } else if (eventType == 'follow'){
        // ---------------------------------------------------------------------
        // イベントが友達追加だった場合の処理。
        // ---------------------------------------------------------------------
        /*
        1. ユーザーのプロファイルを取得する。
        2. 私の栄養士サービスにアカウント登録する。
        3. マイページのURLをメッセージで送る。
        */
        console.log("Got follow event.");

        let replyToken = req.body.events[0].replyToken;
        let lineId = req.body.events[0].source.userId;

        // ユーザーがすでに登録されているかどうか確認する。
        let p = PersonDb.getPerson(lineId)
        .then(
            function(person){
                if (person){
                    // ユーザーは登録済み。
                    Dietitian.greetAgain(replyToken, person.line_id, person.security_code)
                    .then(
                        function(){
                            return;
                        },
                        function(error){
                            console.log(error);
                        }
                    )
                    p.cancel();
                    return;
                }

                // ユーザーは新規。
                return LineBot.getProfile(lineId);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
            // 私の栄養士サービスにアカウント登録する。
            function(profile){
                return PersonDb.createPerson({
                    line_id: profile.userId,
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
            function(createdPerson){
                return Dietitian.greet(replyToken, createdPerson.line_id, createdPerson.security_code);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
            function(){
                console.log("End of follow event handler.");
            },
            function(error){
                console.log(error);
            }
        );
    } else if (eventType == 'message' && req.body.events[0].message.type == 'text'){
        // ---------------------------------------------------------------------
        // イベントがメッセージかつテキストメッセージだった場合の処理。
        // ユーザーがいきなり話しかけてきた場合、およびBotが「朝食は何食べたの？」という質問への返信時にこちらの処理が走る。
        // ---------------------------------------------------------------------
        /*
        もし質問への回答だったら・・・
        1. ユーザー情報を取得する。
        2. メッセージから食品っぽい単語を抽出する。
        3. 食品っぽい単語それぞれについて栄養価を取得する。
        4. どの食事か特定し食事履歴に保存する。
        5. スレッドを削除、WebSocketで更新を通知、残りカロリーを取得する。
        6. 残りカロリーに応じたメッセージを送信する。

        もしいきなり話しかけてきていたら・・・
        1. ユーザー情報を取得する。
        2. メッセージから食品っぽい単語を抽出する。
        3. 食品っぽい単語それぞれについて栄養価を取得する。
        4. 食事をスレッドに保存し、ユーザーにどの食事だったか確認する。
        */
        console.log("Got message event.");

        let replyToken = req.body.events[0].replyToken;
        let lineId = req.body.events[0].source.userId;
        let messageText = req.body.events[0].message.text;
        let timestamp = req.body.events[0].timestamp;
        let thread = cache.get('thread-' + lineId);

        // スレッドを確認し、直近に栄養士が質問していたらその答えだと想定する。
        let latestConversation = Dietitian.getLatestConversation(lineId);
        let latestConversationType;
        if (!latestConversation || !latestConversation.type){
            latestConversationType = 'outOfBlue';
        } else {
            latestConversationType = latestConversation.type;
        }

        let p;
        switch (latestConversationType){
            case 'outOfBlue':
                p = GoogleTranslate.translate(messageText)
                .then(
                    function(translatedMessageText){
                        return Apiai.textRequest(translatedMessageText);
                    }
                ).then(
                    function(action){
                        switch(action){
                            case 'skipped-meal':
                                cache.del('thread-' + lineId);
                                Dietitian.sorryForSkippingMeal(replyToken)
                                .then(function(){
                                    return;
                                });
                                p.cancel();
                                break;
                            case 'get-mypage':
                                cache.del('thread-' + lineId);
                                Dietitian.sendMyPage(replyToken, lineId)
                                .then(function(){
                                    return;
                                })
                                p.cancel();
                                break;
                            case 'get-recommendation':
                                cache.del('thread-' + lineId);
                                Dietitian.recommend(replyToken)
                                .then(function(){
                                    return;
                                })
                                p.cancel();
                                break;
                            default:
                                // 食事レポートだと想定 //
                                foodDb.extractFoodListWithNutritionByMessageText(messageText)
                                .then(
                                    function(foodListWithNutrition){
                                        //// 食品リスト（栄養情報含む）をスレッドに保存する。
                                        Dietitian.saveFoodList(lineId, foodListWithNutrition);

                                        //// どの食事か確認するメッセージを送信。
                                        return Dietitian.confirmDietType(replyToken, lineId, timestamp)
                                    }
                                ).then(
                                    function(){
                                        console.log('confirmDietType sent.');
                                    },
                                    function(error){
                                        console.log(error);
                                    }
                                );
                                p.cancel();
                                break;
                        }
                    }
                );
                break; // End of case 'outOfBlue'
            case 'confirmDietType':
                // 通常はpostbackで回答があるはずだが、PC版では現在postbackがサポートされていないのでテキストで回答される可能性がある。
                p = GoogleTranslate.translate(messageText)
                .then(
                    function(translatedMessageText){
                        return Apiai.textRequest(translatedMessageText);
                    }
                ).then(
                    function(action){
                        switch(action){
                            case 'answer-yes':
                                // 直近の会話に食事履歴があるはず、という仮定で食事履歴を取得。
                                let foodListWithNutrition = Dietitian.rememberFoodList(lineId);

                                if (foodListWithNutrition.length == 0){
                                    // あるはずの食事履歴が見当たらないので終了。
                                    console.log('FoodList should exist but not found. exit.');
                                    return;
                                }

                                let dietDate = (new Date()).toFormat("YYYY-MM-DD");
                                let dietType = latestConversation.dietType;
                                Dietitian.saveDietHistoryAndSendSummary(replyToken, lineId, dietDate, dietType, foodListWithNutrition)
                                .then(
                                    function(){
                                        console.log("End of message handler.");
                                    },
                                    function(error){
                                        console.log(error);
                                    }
                                );
                                p.cancel();
                                return;
                                break;
                            case 'answer-no':
                                // 確認した食事タイプではなかったのでユーザーに食事タイプを訊く。
                                Dietitian.askDietType(lineId)
                                .then(
                                    function(){
                                        return;
                                    }
                                );
                                p.cancel();
                                return;
                                break;
                            default:
                                Dietitian.apologies(replyToken, '答えが理解できませんでした。')
                                .then(
                                    function(){
                                        return;
                                    }
                                );
                                p.cancel();
                                return;
                                break;
                        }
                    }
                );
                break; // End of case 'confirmDietType'
            case 'askDietType':
                // 通常はpostbackで回答があるはずだが、PC版では現在postbackがサポートされていないのでテキストで回答される可能性がある。
                p = GoogleTranslate.translate(messageText)
                .then(
                    function(translatedMessageText){
                        return Apiai.textRequest(translatedMessageText);
                    }
                ).then(
                    function(action){
                        let dietType;
                        switch(action){
                            case 'for-breakfast':
                                dietType = 'breakfast';
                                break;
                            case 'for-lunch':
                                dietType = 'lunch';
                                break;
                            case 'for-dinner':
                                dietType = 'dinner';
                                break;
                            default:
                                Dietitian.apologies(replyToken, 'そういうことは訊いてないの。')
                                .then(
                                    function(){
                                        return;
                                    }
                                );
                                p.cancel();
                                return;
                                break;
                        }

                        // 直近の会話に食事履歴があるはず、という仮定で食事履歴を取得。
                        let foodListWithNutrition = Dietitian.rememberFoodList(lineId);

                        if (foodListWithNutrition.length == 0){
                            // あるはずの食事履歴が見当たらないので終了。
                            console.log('FoodList should exist but not found. exit.');
                            p.cancel();
                            return;
                        }

                        let dietDate = (new Date()).toFormat("YYYY-MM-DD");
                        Dietitian.saveDietHistoryAndSendSummary(replyToken, lineId, dietDate, dietType, foodListWithNutrition)
                        .then(
                            function(){
                                console.log("End of message handler.");
                            },
                            function(error){
                                console.log(error);
                            }
                        );
                    }
                );
                break; // End of case 'askDietType'
            case 'whatDidYouEat':
                p = GoogleTranslate.translate(messageText)
                .then(
                    function(translatedMessageText){
                        return Apiai.textRequest(translatedMessageText);
                    }
                ).then(
                    function(action){
                        switch(action){
                            case 'skipped-meal':
                                cache.del('thread-' + lineId);
                                Dietitian.sorryForSkippingMeal(replyToken)
                                .then(function(){
                                    return;
                                });
                                p.cancel();
                                break;
                            case 'not-yet':
                                cache.del('thread-' + lineId);
                                Dietitian.tellMeLater(replyToken)
                                .then(function(){
                                    return;
                                });
                                p.cancel();
                                break;
                            default:
                                foodDb.extractFoodListWithNutritionByMessageText(messageText)
                                .then(
                                    function(foodListWithNutrition){
                                        // もし認識された食品がなければ、処理をストップしてごめんねメッセージを送る。
                                        if (foodListWithNutrition.length == 0){
                                            console.log('No food identified in foodDb.');
                                            Dietitian.apologize(replyToken, '何を食べたのかわからなかったわ。')
                                            .then(
                                                function(){
                                                    return;
                                                }
                                            );
                                            p.cancel();
                                            return;
                                        }

                                        return Dietitian.saveDietHistoryAndSendSummary(replyToken, lineId, dietDate, dietType, foodListWithNutrition);
                                    }
                                )
                                .then(
                                    function(){
                                        console.log('End of message handler.');
                                    },
                                    function(error){
                                        console.log(error);
                                    }
                                )
                                p.cancel();
                                return;
                                break;
                        } // End of switch(action)
                    }
                );
                break; // End of case 'whatDidYouEat'
        } // End of switch(latestConversationType)

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
        console.log("Got postback event.");

        let replyToken = req.body.events[0].replyToken;
        let lineId = req.body.events[0].source.userId;
        let postbackData = JSON.parse(req.body.events[0].postback.data);
        let dietType = postbackData.dietType;
        let dietDate = (new Date()).toFormat("YYYY-MM-DD");
        let thread = cache.get('thread-' + lineId);

        let latestConversation = Dietitian.getLatestConversation(lineId);
        if (!latestConversation){
            console.log('Preceeding conversation should exist but not found. exit.');
            return;
        }

        switch (latestConversation.type){
            case 'confirmDietType':
                console.log('This is a postback request to confirmDietType.');
                if (dietType == 'incorrect'){
                    // まだどの食事か特定されていないので質問する。
                    Dietitian.askDietType(lineId)
                    .then(
                        function(){
                            return;
                        }
                    );
                    return;
                }
                break;
            case 'askDietType':
                console.log('This is a postback request to askDietType');
                break;
            default:
                console.log('This is unknown postback request. Do nothing for now.');
                return;
                break;
        }

        // 直近の会話に食事履歴があるはず、という仮定で食事履歴を取得。
        let foodListWithNutrition = Dietitian.rememberFoodList(lineId);

        if (foodListWithNutrition.length == 0){
            // あるはずの食事履歴が見当たらないので終了。
            console.log('FoodList should exist but not found. exit.');
            return;
        }

        Dietitian.saveDietHistoryAndSendSummary(replyToken, lineId, dietDate, dietType, foodListWithNutrition)
        .then(
            function(){
                console.log("End of postback event.");
            }
        );

    } else {
        if (eventType){
            console.log(eventType + " is unsupported. Do nothing.");
        }
    }
});

module.exports = router;
