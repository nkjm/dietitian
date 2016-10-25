angular.module("dietitianConsole", [])
.service("dietitian", function($log, $http, $q){
    this.dbPrefix = location.protocol + '//' + location.host + '/dietitianConsole/api';

    this.whatDidYouEat = function(lineId, dietType){
        var url = this.dbPrefix + "/whatDidYouEat?line_id=" + lineId + "&diet_type=" + dietType;
        return $http({
            url: url,
            method: "get"
        });
    }

    this.askDietType = function(lineId){
        var url = this.dbPrefix + "/askDietType?line_id=" + lineId;
        return $http({
            url: url,
            method: "get"
        });
    }
});
