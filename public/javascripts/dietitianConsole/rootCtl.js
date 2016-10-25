angular.module("dietitianConsole")
.controller("rootCtl", function($scope, $log, personList, dietitian){
    $scope.ui = {};
    $scope.ui.personList = personList;

    $scope.askDiet = function(lineId, dietType){
        dietitian.askDiet(lineId, dietType)
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
