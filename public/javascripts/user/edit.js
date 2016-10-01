angular.module('myApp', ['ngMessages', 'myForm'])
  .controller('MyController', ['$scope', '$http', function($scope, $http) {
    $scope.user = { cursorColorName: 'red' };
    $http.get('./userinfo')
      .success(function(data, status, headers, config) {
        // 要素だけコピー
        for(var key in data) {
          $scope.user[key] = data[key];
        }
      });

    $scope.cursorColorNames = ['red', 'orange', 'yellow', 'green', 'skyblue', 'blue', 'purple'];

    $scope.onsubmit = function() {
      console.log($scope.user);
      $http.post('./edit', $scope.user)
        .success(function(data, status, headers, config) {
          console.log(data);
          if(data) {
            window.location.href = '/';
          }
        });
    };
  }]);