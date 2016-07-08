angular.module('myApp', [])
  .controller('MyController', ['$scope', '$timeout', function($scope, $timeout) {
    // Socketの作成
    var socket = io();
    
    $scope.chats = [];
    // chatというイベントを受信した時
    socket.on('chat', function(chat) {
      $timeout(function() {
        $scope.chats.push(chat);
      });
    });
    
    // submitイベント時の処理
    $scope.sendMessage = function() {
      // chatイベントを送信する
      socket.emit('chat', {
        name:    $scope.name,
        message: $scope.message
      });
      $scope.message = '';
    };
  }]);
  
  