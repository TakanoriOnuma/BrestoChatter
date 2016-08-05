angular.module('myApp', ['ngMessages', 'myForm'])
  .controller('MyController', ['$scope', function($scope) {
    $scope.onsubmit = function() {
      console.log($scope.userName, $scope.email, $scope.password);
    };
  }]);