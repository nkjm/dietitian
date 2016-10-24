angular.module("dietitian")
.controller("rootCtl", function($scope, $log, person, socket){
    $scope.ui = {};
    $scope.ui.person = person;
    $scope.setCurrentTab = function(event, tab){
        event.preventDefault();
        $scope.ui.currentTab = tab;
    }

    // Connect to My Channel.
    socket.connect(person.line_id);
});
