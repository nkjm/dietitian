angular.module("dietitian", [])
.service("socket", function(){
    this.connect = function(channel){
		this.connection = io(location.protocol + '//' + location.host + '/' + channel);
	}
})
.service("personalHistoryDb", function($log, $http, $q, person){
    this.dbPrefix = location.protocol + '//' + location.host + '/personalHistoryDb';

    this.getTodayHistory = function(){
        var url = this.dbPrefix + "/person/" + person.id + "/diet_history/today";
        return $http({
            url: url,
            method: "get"
        });
    }
});
