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

        // スレッドを確認し、直近に栄養士が質問していたらその答えだと想定する。
        // 何日のどの食事なのか特定する。事前に栄養士Botが尋ねた内容をスレッドから検索する。
        let latestConversation = Dietitian.getLatestConversation(lineId);
        if (latestConversation){
            console.log("Found thread.");
        }

        let person;
        let p = PersonDb.getPerson(lineId)
        .then(
            function(response){
                // ユーザー情報を保存
                person = response;

                // 一旦メッセージを英訳。
                return GoogleTranslate.translate(messageText);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
            function(translatedMessageText){
                // Intentを特定する。
                return Apiai.textRequest(translatedMessageText);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
            function(action){
                if (action){
                    console.log("Intent of this message is " + action);
                } else {
                    console.log("Intent not identified.");
                }

                if (latestConversation && latestConversation.source == 'dietitian' && latestConversation.type == 'whatDidYouEat'){
                    console.log("It seems dietitian asked what the client ate for " + latestConversation.dietType + ".");
                    switch (action){
                        // 食べなかった旨のレポート
                        case 'skipped-meal':
                            cache.del('thread-' + person.line_id);
                            Dietitian.sorryForSkippingMeal(replyToken)
                            .then(function(){
                                return;
                            });
                            p.cancel();
                            break;
                        // まだ食べてない旨のレポート
                        case 'not-yet':
                            cache.del('thread-' + person.line_id);
                            Dietitian.tellMeLater(replyToken)
                            .then(function(){
                                return;
                            })
                            p.cancel();
                            break;
                        // 食事のレポート
                        default:
                            return mecab.parse(messageText);
                            break;
                    }
                } else {
                    switch (action){
                        // マイページのリクエスト
                        case 'get-mypage':
                            cache.del('thread-' + person.line_id);
                            Dietitian.sendMyPage(replyToken, person.line_id, person.security_code)
                            .then(function(){
                                return;
                            })
                            p.cancel();
                            break;
                        // オススメの食事のリクエスト
                        case 'get-recommendation':
                            cache.del('thread-' + person.line_id);
                            Dietitian.recommend(replyToken)
                            .then(function(){
                                return;
                            })
                            p.cancel();
                            break;
                        // 食べなかった旨のレポート
                        case 'skipped-meal':
                            cache.del('thread-' + person.line_id);
                            Dietitian.sorryForSkippingMeal(replyToken)
                            .then(function(){
                                return;
                            })
                            p.cancel();
                            break;
                        // 食事のレポートだと仮定
                        default:
                            return mecab.parse(messageText);
                            break;
                    }
                }
            },
            function(response){
                return Promise.reject(response);
            }
        )
        .then(
            function(parsedText){
                let foodList = TextMiner.extractFoodList(parsedText);

                // もし認識された食品がなければ、処理をストップしてごめんねメッセージを送る。
                if (foodList.length == 0){
                    console.log('No food word found.');
                    Dietitian.apologize(replyToken)
                    .then(
                        function(){
                            return;
                        }
                    );
                    p.cancel();
                    return;
                }

                // 食品リストの食品それぞれについて、栄養情報を取得する。
                console.log('Getting Food List with Nutrition.');
                return FoodDb.getFoodListWithNutrition(foodList, true);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
            function(foodListWithNutrition){
                // もし認識された食品がなければ、処理をストップしてごめんねメッセージを送る。
                if (foodListWithNutrition.length == 0){
                    console.log('No food identified in foodDb.');
                    Dietitian.apologize(replyToken)
                    .then(
                        function(){
                            return;
                        }
                    );
                    p.cancel();
                    return;
                }

                // もしどの食事か特定されていなければ確認のメッセージを送る。
                if (!latestConversation || latestConversation.source != 'dietitian' || latestConversation.type != 'whatDidYouEat'){
                    //// 食品リスト（栄養情報含む）をスレッドに保存する。
                    Dietitian.saveFoodList(person.line_id, foodListWithNutrition);
                    //// どの食事か確認するメッセージを送信。
                    Dietitian.confirmDietType(replyToken, person.line_id, timestamp)
                    .then(
                        function(){
                            return;
                        }
                    )
                    p.cancel();
                    return;
                }

                // 食品リスト(栄養情報含む）をユーザーの食事履歴に保存する。
                console.log('Saving Diet History.');
                return PersonalHistoryDb.saveFoodListAsDietHistory(person.line_id, latestConversation.dietDate, latestConversation.dietType, foodListWithNutrition);
            },
            function(error){
                return Promise.reject(error);
            }
        )
        .then(
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
                return Dietitian.replyBasedOnCalorieToGo(replyToken, calorieToGo, person.line_id, person.security_code);
            },
            function(error){
                return Promise.reject(error);
            }
        ).then(
            function(response){
                console.log("End of message event handler.");
            },
            function(error){
                console.log(error);
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
        console.log("Got postback event.");

        let replyToken = req.body.events[0].replyToken;
        let lineId = req.body.events[0].source.userId;
        let postbackData = JSON.parse(req.body.events[0].postback.data);
        let dietType = postbackData.dietType;
        let dietDate = (new Date()).toFormat("YYYY-MM-DD");
        let thread = cache.get('thread-' + lineId);
        let foodListWithNutrition;

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

        // 直近の会話に食事履歴があるはず、という仮定で食事履歴を取得。
        for (let conversation of thread){
            if (conversation.type == 'foodList' && conversation.foodList.length > 0){
                console.log('Found foodList');
                foodListWithNutrition = conversation.foodList;
            }
        }

        if (!foodListWithNutrition){
            // あるはずの食事履歴が見当たらないので終了。
            console.log('FoodList not found');
            return;
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
                return Dietitian.replyBasedOnCalorieToGo(replyToken, calorieToGo, person.line_id, person.security_code);
            },
            function(error){
                return Promise.reject(error);
            }
        ).then(
            function(response){
                console.log("End of postback event handler.");
            },
            function(error){
                console.log(error);
            }
        );
    } else {
        if (eventType){
            console.log(eventType + " is unsupported so skipped.");
        }
    }
});

module.exports = router;
