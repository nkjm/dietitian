angular.module("dietitianConsole", [])
.service("dietitian", function($log, $http, $q){
    this.dbPrefix = location.protocol + '//' + location.host + '/dietitianConsole/api';

    this.askDiet = function(lineId, dietType){
        var url = this.dbPrefix + "/askDiet?line_id=" + lineId + "&diet_type=" + dietType;
        return $http({
            url: url,
            method: "get"
        });
    }
});
