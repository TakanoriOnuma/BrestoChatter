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
  .controller('MyController', ['$scope', '$timeout', 'RoomService',
  function($scope, $timeout, RoomService) {
    // ルームリストを取得する
    $scope.rooms = RoomService.getRoomList();
  }]);
  
  