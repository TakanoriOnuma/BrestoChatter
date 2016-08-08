angular.module('myApp', [])
  .controller('MyController', ['$scope', '$http', function($scope, $http) {
    $scope.errors = [];
    $scope.user = {
      'email' : '',
      'password' : ''
    };
    $scope.login = function() {
      $scope.errors.length = 0;
      if(!$scope.user.email) $scope.errors.push('メールアドレスを入力してください。');
      if(!$scope.user.password) $scope.errors.push('パスワードを入力してください。');
      
      if($scope.errors.length === 0) {
        var data = angular.copy($scope.user)
        var hash = CryptoJS.SHA3(data.password);
        data.password = hash.toString(CryptoJS.enc.Base64);
        $http.post('./login', data)
          .success(function(data, status, headers, config) {
            if(data) {
              window.location.href = '/';
            }
            else {
              $scope.errors.push('メールアドレスかパスワードを間違えています。');
            }
          });
      }
    }
  }]);