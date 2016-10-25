angular.module("dietitianConsole")
.controller("rootCtl", function($scope, $log, personList, dietitian){
    $scope.ui = {};
    $scope.ui.personList = personList;

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
        )
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
        )
    }
});
