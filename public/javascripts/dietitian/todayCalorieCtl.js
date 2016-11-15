angular.module("dietitian")
.controller("todayCalorieCtl", function($scope, $log, socket, state){
    $scope.state = state;
    $scope.ui = {};
    $scope.ui.todayCalorie = 0;
    $scope.ui.todayCaloriePercentage = 0;
    $scope.ui.todayCalorieToGo = 0;

    function drawTodayCalorie(requiredCalorie, todayCalorie){
        var ctx = document.getElementById("today-calorie-chart");
        var options = {
            responsive: false,
        };

        if (todayCalorie > requiredCalorie){
            requiredCalorie = todayCalorie;
        }
        var data = {
            labels: ["摂取済み","残り"],
            datasets: [{
                data: [todayCalorie, requiredCalorie - todayCalorie],
                backgroundColor: [
                    "#FF6384",
                    "#DDDDDD"
                ]
            }]
        };
        if ($scope.ui.todayCalorieChart){
            $scope.ui.todayCalorieChart.destroy();
        }
        $scope.ui.todayCalorieChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
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
            $scope.ui.todayCalorie += diet.calorie || 0;
        });
        state.reloadTodayCalorieChart();
    }

    $scope.$watch("state.requestReloadTodayCalorieChart", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        $scope.ui.todayCaloriePercentage = Math.round(100 * $scope.ui.todayCalorie / state.person.requiredCalorie);
        $scope.ui.todayCalorieToGo = state.person.requiredCalorie - $scope.ui.todayCalorie;
        drawTodayCalorie(state.person.requiredCalorie, $scope.ui.todayCalorie);
    });

    $scope.$watch("state.person.requiredCalorie", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        state.reloadTodayCalorieChart();
    });

    $scope.$watch("state.todayDietList", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        processDietList(newVal);
    });

    registerIoEvent(socket.connection);
});
