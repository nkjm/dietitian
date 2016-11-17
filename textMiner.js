'use strict';

module.exports = class textMiner {
    static extractFoodList(parsedText){
        // 各形態素を調べ、名詞だったら食品として食品リストに追加。
        const party = ['飲み会','歓迎会','送別会','忘年会','新年会'];
        let foodList = [];
        for (let elem of parsedText){
            if (elem[1] == '名詞'){
                let food = elem[0];

                if (food == '定食'){
                    // 「定食」は想定されるセット食品に変換。
                    foodList = foodList.concat(['こめ　［陸稲穀粒］　精白米','だいず　［豆腐・油揚げ類］　木綿豆腐','（だいこん類）　漬物　たくあん漬　塩押しだいこん漬']);
                } else if (party.find(p => p === food)){
                    foodList = foodList.concat(['＜アルコール飲料類＞（醸造酒類）　ビール　淡色','＜アルコール飲料類＞（醸造酒類）　ビール　淡色','＜アルコール飲料類＞（醸造酒類）　ビール　淡色','こめ　［陸稲穀粒］　精白米','＜鳥肉類＞にわとり　［若鶏肉］　もも　皮つき　から揚げ','こむぎ　［即席めん類］　即席中華めん　油揚げ']);
                } else {
                    // 食品リストに食品を追加。
                    foodList.push(food);
                }
            }
        }

        // 食品リストを返す。0個であれば空の配列を返す
        if (foodList.length == 0){
            console.log('According to TextMiner, Food not found in message');
        } else {
            console.log('We chose follwing word as food.');
            console.log(foodList);
        }

        return foodList;
    }
};
