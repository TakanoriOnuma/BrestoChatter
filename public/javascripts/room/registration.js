angular.module('myApp', ['ngMessages'])
  .controller('MyController', ['$scope', '$http', function($scope, $http) {
    $scope.onsubmit = function() {
      var data = angular.copy($scope.room);
      var hash = CryptoJS.SHA3(data.password);
      data.password = hash.toString(CryptoJS.enc.Base64);
      $http.post('./registration', data)
        .success(function(data, status, headers, config) {
          console.log(data);
          if(data) {
            window.location.href = '/';
          }
        });
    };
  }]);