angular.module("dietitian")
.controller("rootCtl", function($scope, $log, person, socket, state, personDb, personalHistoryDb){
    $scope.ui = {};
    $scope.ui.state = state;
    $scope.ui.period = {};
    $scope.ui.history = {};
    state.person = person;

    $scope.setCurrentTab = function(event, area, tab){
        event.preventDefault();
        $scope.ui[area].currentTab = tab;
    }

    // Connect to My Channel.
    socket.connect(person.line_id);

    personalHistoryDb.getTodayHistory()
    .then(
        function(response){
            state.todayDietList = response.data;

            // Diet Type別（breakfast | lunch | dinner）にDietを整理。同時に今日の摂取カロリーを積算。
            //processDietList(dietList);
        },
        function(error){
            $log.error(error);
        }
    )
});
