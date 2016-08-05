angular.module('myApp', ['ngMessages', 'myForm'])
  .controller('MyController', ['$scope', '$http', function($scope, $http) {
    $scope.onsubmit = function() {
      console.log($scope.user);
      $http.post('./registration', $scope.user)
        .success(function(data, status, headers, config) {
          console.log(data);
        });
    };
  }]);