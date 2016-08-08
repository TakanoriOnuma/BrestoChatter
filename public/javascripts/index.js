angular.module('myApp', [])
  .service('RoomService', ['$http', function($http) {
    // ルームリストを取得する
    this.getRoomList = function() {
      var rooms = [];
      $http({
        method: 'GET',
        url:    '/room/list'
      })
      .success(function(data, status, headers, config) {
        angular.extend(rooms, data);
      });
      return rooms;
    }
  }])
  .controller('MyController', ['$scope', '$http', '$timeout', 'RoomService',
  function($scope, $http, $timeout, RoomService) {
    // ルームリストを取得する
    $scope.rooms = RoomService.getRoomList();
    $scope.data = { pass: {}, error: {} };

    $scope.login = function(roomId) {
      $scope.data.error[roomId] = '';
      var pass = $scope.data.pass[roomId];
      console.log($scope.data.pass[roomId]);
      if(pass) {
        var hash = CryptoJS.SHA3(pass);
        var data = {
          roomId : roomId,
          pass   : hash.toString(CryptoJS.enc.Base64)
        };
        $http.post('./room/login', data)
          .success(function(data, status, headers, config) {
            console.log(data);
            if(data) {
              window.location.href = '/room/chat';
            }
            else {
              $scope.data.error[roomId] = 'パスワードが違います。';
            }
          });
      }
      else {
        $scope.data.error[roomId] = 'パスワードを入力してください。';
      }
    }
  }]);
  
  