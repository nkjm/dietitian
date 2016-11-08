angular.module("dietitian")
.controller("rootCtl", function($scope, $log, person, personDb, socket, state){
    $scope.ui = {};
    state.person = person;

    $scope.setCurrentTab = function(event, tab){
        event.preventDefault();
        $scope.ui.currentTab = tab;
    }

    // Connect to My Channel.
    socket.connect(person.line_id);
});
