angular.module('myApp', ['ngMessages', 'myForm'])
  .controller('MyController', ['$scope', '$http', function($scope, $http) {
    // カーソルの色名
    $scope.cursorColorNames = ['red', 'orange', 'yellow', 'green', 'skyblue', 'blue', 'purple'];
    // デフォルト値を設定
    $scope.user = { cursorColorName: 'red' };

    $scope.onsubmit = function() {
      var data = angular.copy($scope.user);
      var hash = CryptoJS.SHA3(data.password);
      data.password = hash.toString(CryptoJS.enc.Base64);
      $http.post('./registration', data)
        .success(function(data, status, headers, config) {
          console.log(data);
          if(data) {
            window.location.href = './login';
          }
        });
    };
  }]);