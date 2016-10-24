'use strict';

const Mecab = require('mecab-async');

module.exports = class textMiner {
    static getFoodListFromMessage(message){
        return new Promise(function(resolve, reject){
            const mecab = new Mecab();

            // テキストメッセージをMecabによって形態素に分割。
            let parsedMessageList = mecab.parseSync(message);

            // 各形態素を調べ、名詞だったら食品として食品リストに追加。
            let foodList = [];
            for (let parsedMessage of parsedMessageList){
                if (parsedMessage[1] == '名詞'){
                    let food = parsedMessage[0];

                    if (food == '定食'){
                        // 「定食」は想定されるセット食品に変換。
                        foodList = foodList.concat(['こめ　［陸稲穀粒］　精白米','味噌汁','（だいこん類）　漬物　たくあん漬　塩押しだいこん漬']);
                    } else {
                        // 食品リストに食品を追加。
                        foodList.push(food);
                    }
                }
            }

            // 食品リストが1つ以上認識されていれば食品リストを返す。そうでなければエラーメッセージを返す。
            if (foodList.length > 0){
                resolve(foodList);
            } else {
                reject({message: 'Food not found.'});
            }
        });
    }
};
