angular.module("dietitianConsole")
.controller("rootCtl", function($scope, $log, personList, dietitian, foodDb){
    $scope.ui = {};
    $scope.ui.personList = personList;
    $scope.ui.currentTab = 'person';

    $scope.setCurrentTab = function(event, tab){
        event.preventDefault();
        $scope.ui.currentTab = tab;
    }

    $scope.registerFood = function(food){
        foodDb.registerFood(food)
        .then(
            function(response){
                $scope.getUnidentifiedFoodList();
            },
            function(error){
                $log.error(error);
            }
        );
    }

    $scope.getUnidentifiedFoodList = function(){
        foodDb.getUnidentifiedFoodList()
        .then(
            function(response){
                $scope.ui.unidentifiedFoodList = response.data;
            },
            function(error){
                $scope.ui.alert = "食品リスト取得に失敗しました。";
                $log.error(error);
            }
        );
    }

    $scope.whatDidYouEat = function(lineId, dietType){
        dietitian.whatDidYouEat(lineId, dietType)
        .then(
            function(){
                $scope.ui.notification = "メッセージが送信されました。";
            },
            function(error){
                $scope.ui.alert = "メッセージ送信に失敗しました。";
                $log.error(error);
            }
        );
    }

    $scope.askDietType = function(lineId){
        dietitian.askDietType(lineId)
        .then(
            function(){
                $scope.ui.notification = "メッセージが送信されました。";
            },
            function(error){
                $scope.ui.alert = "メッセージ送信に失敗しました。";
                $log.error(error);
            }
        );
    }

    $scope.getUnidentifiedFoodList();
});
