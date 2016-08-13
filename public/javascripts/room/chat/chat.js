angular.module('myApp', [])
  // チャット一覧を表示するディレクティブ
  .directive('myChatList', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        chats: '='
      },
      template: '<ul class="my-chat-list" ng-cloak>' +
                '  <li ng-repeat="chat in chats track by $index">' +
                '    <my-chat chat="chat"></my-chat>' +
                '  </li>' +
                '</ul>',
      link: function(scope, element, attrs) {
        // chats配列を監視して、変化があればスクロールを最下部に移動する
        scope.$watchCollection('chats', function(newValue, oldValue, scope) {
          element[0].scrollTop = element[0].scrollHeight;
        });
      }
    };
  })
  // チャットディレクティブ
  .directive('myChat', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        chat: '='
      },
      template: '<div class="my-chat">' +
                '    {{chat.userName}} ({{chat.createdDate | date: "yyyy/MM/dd HH:mm:ss"}})<br>' +
                '    {{chat.message}}' +
                '</div>'
    };
  })
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
          $scope.chats.push(chat);
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
