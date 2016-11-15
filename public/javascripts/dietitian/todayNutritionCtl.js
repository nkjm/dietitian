angular.module("dietitian")
.controller("todayNutritionCtl", function($scope, $log, socket, state){
    $scope.state = state;
    $scope.ui = {};
    $scope.ui.todayNutrition = {
        carb: 0,
        protein: 0,
        fat: 0,
        fiber: 0
    }

    function drawTodayNutrition(nutrition){
        var ctx = document.getElementById("today-nutrition-chart");
        var options = {
            scale: {
                ticks: {
                    stepSize: 25,
                    beginAtZero: true,
                    max: 100
                }
            }
        };
        var data = {
            labels: ["炭水化物", "たんぱく質", "脂肪", "食物繊維"],
            datasets: [{
                data: [
                    Math.round(nutrition.carb * 100 / state.person.requiredNutrition.carb),
                    Math.round(nutrition.protein * 100 / state.person.requiredNutrition.protein),
                    Math.round(nutrition.fat * 100 / state.person.requiredNutrition.fat),
                    Math.round(nutrition.fiber * 100 / state.person.requiredNutrition.fiber)
                ],
                backgroundColor: [
                    "#FF6384",
                    "#4BC0C0",
                    "#FFCE56",
                    "#E7E9ED",
                    "#36A2EB"
                ],
                label: 'My dataset' // for legend
            }],
        };
        if ($scope.ui.todayNutritionChart){
            $scope.ui.todayNutritionChart.destroy();
        }
        $scope.ui.todayNutritionChart = new Chart(ctx, {
            type: 'polarArea',
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
            $scope.ui.todayNutrition.carb += diet.carb || 0;
            $scope.ui.todayNutrition.protein += diet.protein || 0;
            $scope.ui.todayNutrition.fat += diet.fat || 0;
            $scope.ui.todayNutrition.fiber += diet.fiber || 0;
        });
        state.reloadTodayNutritionChart();
    }

    $scope.$watch("state.requestReloadTodayNutritionChart", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        drawTodayNutrition($scope.ui.todayNutrition);
    });

    $scope.$watch("state.person.requiredNutrition", function(newVal, oldVal){
        if (newVal === oldVal){
            return;
        }
        state.reloadTodayNutritionChart();
    });

    $scope.$watch("state.todayDietList", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        processDietList(newVal);
    });

    registerIoEvent(socket.connection);
});
