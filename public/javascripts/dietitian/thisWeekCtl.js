angular.module("dietitian")
.controller("thisWeekCtl", function($scope, $log, state){
    $scope.ui = {};

    function drawThisWeekNutrition(){
        var ctx = document.getElementById("this_week_nutrition");
        var options = {};
        var data = {
            labels: ["たんぱく質", "脂肪", "炭水化物", "食物繊維", "灰分"],
            datasets: [{
                data: [
                    90,
                    88,
                    60,
                    70,
                    30
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
        $scope.ui.todayNutritionChart = new Chart(ctx, {
            type: 'polarArea',
            data: data,
            options: options
        });
    }

    function drawThisWeekCalorie(){
        var ctx = document.getElementById("this_week_calorie");
        var options = {
            scales: {
                yAxes: [{
                    ticks: {
                        min: 0
                    }
                }]
            }
        };
        var data = {
            labels: ["日", "月", "火", "水", "木", "金", "土"],
            datasets: [{
                label: "必要カロリー",
                fill: false,
                lineTension: 0.1,
                borderColor: "rgba(128,128,128,0.7)",
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: "rgba(128,128,128,1)",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointRadius: 1,
                pointHitRadius: 10,
                data: [3200, 3200, 3200, 3200, 3200, 3200, 3200],
                spanGaps: false,
            },{
                label: "摂取カロリー",
                fill: true,
                lineTension: 0.1,
                backgroundColor: "rgba(151,187,205,0.2)",
                borderColor: "rgba(151,187,205,1)",
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: "rgba(151,187,205,1)",
                pointBackgroundColor: "#fff",
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: [3400, 3300, 3080, 2800, 3400, null, null],
                spanGaps: false,
            }]
        };
        $scope.ui.thisWeekCalorieChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: options
        });
    }

    drawThisWeekCalorie();
});
