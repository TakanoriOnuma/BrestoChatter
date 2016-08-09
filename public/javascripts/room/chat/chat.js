angular.module('myApp', [])
  .service('ChatService', ['$http', function($http) {
    // チャットリストを取得する
    this.getChatList = function() {
      var chats = [];
      $http({
        method: 'GET',
        url:    './chats'
      })
      .success(function(data, status, headers, config) {
        angular.extend(chats, data);
      });
      return chats;
    }
  }])
  .controller('MyController', ['$scope', '$timeout', 'ChatService',
  function($scope, $timeout, ChatService) {
    // Socketの作成
    var socket = io();

    // チャットリストを取得する
    $scope.chats = ChatService.getChatList();

    // chatというイベントを受信した時
    socket.on('chat', function(chat) {
      console.log('recieve:', chat);
      // 同じroomIdなら反映させる
      if(chat.roomId === $scope.chat.roomId) {
        $timeout(function() {
          $scope.chats.unshift(chat);
        });
      }
    });

    // submitイベント時の処理
    $scope.sendMessage = function() {
      if($scope.chat.message === '') {
        return;
      }

      console.log($scope.chat);
      // chatイベントを送信する
      socket.emit('chat', $scope.chat);
      $scope.chat.message = '';
    };
  }]);
