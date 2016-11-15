angular.module("dietitian")
.controller("todayHistoryCtl", function($scope, $log, socket, state){
    $scope.state = state;
    $scope.ui = {};
    $scope.ui.dietListByType = {
        breakfast: [],
        lunch: [],
        dinner: []
    };

    $scope.setCurrentTab = function(event, area, tab){
        event.preventDefault();
        $scope.ui[area].currentTab = tab;
    }

    function registerIoEvent(connection){
        connection.on('personalHistoryUpdated', function(dietList){
            $scope.$apply(function(){
                processDietList(dietList);
            });
        });
    }

    function processDietList(dietList){
        // Diet Type別（breakfast | lunch | dinner）にDietを整理。同時に今日の摂取カロリーを積算。
        angular.forEach(dietList, function(diet, dietKey){
            $scope.ui.dietListByType[diet.diet_type].push(diet);
        });
    }

    $scope.$watch("state.todayDietList", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        processDietList(newVal);
    });

    registerIoEvent(socket.connection);
})
.directive("todayDietReportByType", function($compile){
    return {
        restrict: 'E',
        templateUrl: "todayDietReportByType",
        scope: {
            dietTypeLabel: '@',
            dietList: '='
        }
    }
})
.directive("todayDietReportByTypeMobile", function($compile){
    return {
        restrict: 'E',
        templateUrl: "todayDietReportByTypeMobile",
        scope: {
            dietTypeLabel: '@',
            dietList: '='
        }
    }
});
