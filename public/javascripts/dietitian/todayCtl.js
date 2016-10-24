angular.module("dietitian")
.controller("todayCtl", function($scope, $log, socket, person, personalHistoryDb){
    $scope.ui = {};
    $scope.ui.todayCalorie = 0;
    $scope.ui.todayCaloriePercentage = 0;
    $scope.ui.todayCalorieToGo = 0;
    $scope.ui.todayNutrition = {
        carb: 0,
        protein: 0,
        fat: 0,
        fiber: 0,
        ash: 0
    }
    $scope.ui.dietListByType = {
        breakfast: [],
        lunch: [],
        dinner: []
    };

    $scope.config = {};
    $scope.config.targetCalorie = 2650;
    $scope.config.targetCarb = 65;
    $scope.config.targetProtein = 60;
    $scope.config.targetFat = 30;
    $scope.config.targetFiber = 20;
    $scope.config.targetAsh = 20;

    $scope.ui.refreshTodayCalorieChart = 1;
    $scope.ui.refreshTodayNutritionChart = 1;

    $scope.refreshTodayCalorieChart = function(){
        $scope.ui.refreshTodayCalorieChart = $scope.ui.refreshTodayCalorieChart * -1;
    }

    $scope.refreshTodayNutritionChart = function(){
        $scope.ui.refreshTodayNutritionChart = $scope.ui.refreshTodayNutritionChart * -1;
    }

    function drawTodayNutrition(nutrition){
        var ctx = document.getElementById("today_nutrition");
        var options = {
            scales: {
                ticks: {
                    max: 100,
                    min: 0,
                    stepSize: 25
                }
            }
        };
        var data = {
            labels: ["炭水化物", "たんぱく質", "脂肪", "食物繊維", "灰分"],
            datasets: [{
                data: [
                    Math.round(nutrition.carb * 100 / $scope.config.targetCarb),
                    Math.round(nutrition.protein * 100 / $scope.config.targetProtein),
                    Math.round(nutrition.fat * 100 / $scope.config.targetFat),
                    Math.round(nutrition.fiber * 100 / $scope.config.targetFiber),
                    Math.round(nutrition.ash * 100 / $scope.config.targetAsh)
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

    function drawTodayCalorie(todayCaloriePercentage){
        var ctx = document.getElementById("today_calorie");
        var options = {
            responsive: false
        };
        var data = {
            labels: [
                "摂取済み",
                "残り"
            ],
            datasets: [
                {
                    data: [todayCaloriePercentage, 100 - todayCaloriePercentage],
                    backgroundColor: [
                        "#FF6384",
                        "#DDDDDD"
                    ],
                    hoverBackgroundColor: [
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
            $scope.ui.dietListByType[diet.diet_type].push(diet);
            $scope.ui.todayCalorie += diet.calorie || 0;
            $scope.ui.todayNutrition.carb += diet.carb || 0;
            $scope.ui.todayNutrition.protein += diet.protein || 0;
            $scope.ui.todayNutrition.fat += diet.fat || 0;
            $scope.ui.todayNutrition.fiber += diet.fiber || 0;
            $scope.ui.todayNutrition.ash += diet.ash || 0;
        });
        $scope.refreshTodayCalorieChart();
        $scope.refreshTodayNutritionChart();
    }

    $scope.$watch("ui.refreshTodayCalorieChart", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        $scope.ui.todayCaloriePercentage = Math.round(100 * $scope.ui.todayCalorie / $scope.config.targetCalorie);
        $scope.ui.todayCalorieToGo = $scope.config.targetCalorie - $scope.ui.todayCalorie;
        drawTodayCalorie($scope.ui.todayCaloriePercentage);
    });

    $scope.$watch("ui.refreshTodayCalorieChart", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        drawTodayNutrition($scope.ui.todayNutrition);
    });

    personalHistoryDb.getTodayHistory()
    .then(
        function(response){
            var dietList = response.data;

            // Diet Type別（breakfast | lunch | dinner）にDietを整理。同時に今日の摂取カロリーを積算。
            processDietList(dietList);
        },
        function(error){
            $log.error(error);
        }
    )

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
});
