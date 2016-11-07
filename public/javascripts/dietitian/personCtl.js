angular.module("dietitian")
.controller("personCtl", function($scope, $log, $uibModal, person, personDb, state, remoting){
    $scope.ui = {
        person: person,
        remoting: angular.copy(remoting)
    }
    $scope.state = state;

    $scope.openPersonForm = function(person){
        var m = $uibModal.open({
            controller: "personFormCtl",
			templateUrl: "personForm",
            resolve: {
                person: angular.copy(person)
            }
        });

        m.result.then(
            function(){
                state.reloadPerson();
            }
        )
    }

    function getPerson(lineId){
        $scope.ui.remoting.setIsRemoting(true);
        $scope.ui.remoting.setStatus("プロフィールをロードしています");
        personDb.getPerson(person.line_id)
        .then(
            function(response){
                $scope.ui.remoting.setIsRemoting(false);
                $log.log(response.data);
                $scope.ui.person = response.data;
            },
            function(error){
                $scope.ui.remoting.setIsRemoting(false);
                $log.error(error);
            }
        )
    }

    $scope.$watch("state.requestReloadPerson", function(newVal, oldVal){
        if (newVal == oldVal){
            return;
        }
        getPerson(state.currentLineId);
    })
})
.controller("personFormCtl", function($scope, $uibModalInstance, $log, person, personDb, remoting){
    person.birthday = new Date(person.birthday * 1000)
    $scope.ui = {
        person: person,
        birthdayPickerOpen: false,
        alertList: [],
        remoting: angular.copy(remoting)
    }

    function clearAlert(){
        $scope.ui.alertList = [];
    }

    function pushAlert(alert){
        $scope.ui.alertList.push(alert);
    }

    $scope.toggleBirthdayPicker = function(){
        $scope.ui.birthdayPickerOpen = !$scope.ui.birthdayPickerOpen;
    }

    $scope.updatePerson = function(person){
        clearAlert();

        var personForUpdate = angular.copy(person);
        try {
            personForUpdate.birthday = personForUpdate.birthday.getTime() / 1000;
        } catch (e){
            pushAlert("誕生日が正しく入力されていません。");
            return;
        }

        $scope.ui.remoting.setIsRemoting(true);
        $scope.ui.remoting.setStatus("プロフィールを更新しています")
        personDb.updatePerson(personForUpdate)
        .then(
            function(){
                $scope.ui.remoting.setIsRemoting(false);
                $log.log("Person updated.");
                $uibModalInstance.close();
            },
            function(error){
                $scope.ui.remoting.setIsRemoting(false);
                $log.error("Failed to update person.");
                $log.error(error);
            }
        )
    }
});
