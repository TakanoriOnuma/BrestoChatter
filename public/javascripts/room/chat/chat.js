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
      template: '<div class="my-chat" chat-id="{{chat._id}}">' +
                '  {{chat.userName}} ({{chat.createdDate | date: "yyyy/MM/dd HH:mm:ss"}})<br>' +
                '  <span class="message">{{chat.message}}</span>' +
                '</div>',
      link: function(scope, element, attrs) {
        element.draggable({helper: 'clone'});
      }
    };
  })
  // ホワイトボードディレクティブ
  .directive('myWhiteboard', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        postIts: '='
      },
      template: '<div class="my-whiteboard">' +
                '  <span>ホワイトボード</span>' +
                '  <my-post-it ng-repeat="postIt in postIts track by $index" pos="postIt.position">' +
                '    {{postIt.message}}' +
                '  </my-post-it>' +
                '</div>',
      link: function(scope, element, attrs) {
        element.droppable({
          accept: '.my-chat',
          drop: function(event, ui) {
            console.log(element.scrollTop());
            var message = $('.message', ui.draggable).text();
            var rootPos   = element.position();
            rootPos.top  -= element.scrollTop();
            rootPos.left -= element.scrollLeft();
            var pos = ui.helper.position();
            var postIt = {
              message  : message,
              position : { x: pos.left - rootPos.left, y: pos.top - rootPos.top }
            };
            scope.$parent.addPostIt(postIt);
          }
        });
      }
    };
  })
  // ホワイトボード上で使う付箋
  .directive('myPostIt', function() {
    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      scope: {
        pos: '='
      },
      template: '<div class="my-post-it" ng-transclude></div>',
      link: function(scope, element, attrs, ngModelController) {
        element.draggable({
          containment: 'parent',
          drag: function(event, ui) {
            scope.pos.x = ui.position.left;
            scope.pos.y = ui.position.top;
          }
        });

        scope.$watch('pos', function(newValue, oldValue, scope) {
          console.log(newValue, oldValue);
          element.css({
            top:  scope.pos.y,
            left: scope.pos.x
          })
        }, true);
      }
    }
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

    // 付箋リストをセットする
    $scope.postIts = [
      { message: 'post-it', position: {x: 10, y: 20} }
    ];
    $scope.addPostIt = function(postIt) {
      $timeout(function() {
        $scope.postIts.push(postIt);
      });
    };
  }]);
