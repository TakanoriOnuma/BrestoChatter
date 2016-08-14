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
                '  <my-post-it ng-repeat="postIt in postIts track by $index" pos="postIt.position" post-it-id="postIt._id">' +
                '    {{postIt.message}}' +
                '  </my-post-it>' +
                '</div>',
      link: function(scope, element, attrs) {
        element.droppable({
          accept: '.my-chat',
          drop: function(event, ui) {
            var message = $('.message', ui.draggable).text();
            var rootPos   = element.position();
            rootPos.top  -= element.scrollTop();
            rootPos.left -= element.scrollLeft();
            var pos = ui.helper.position();
            var postIt = {
              message  : message,
              position : { x: pos.left - rootPos.left, y: pos.top - rootPos.top }
            };
            scope.$parent.createPostIt(postIt);
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
        postItId : '=',
        pos      : '='
      },
      template: '<div class="my-post-it" ng-transclude></div>',
      link: function(scope, element, attrs, ngModelController) {
        element.draggable({
          containment: 'parent',
          drag: function(event, ui) {
            scope.pos.x = ui.position.left;
            scope.pos.y = ui.position.top;
            scope.$emit('movePostIt', scope.postItId, scope.pos);
          }
        });

        scope.$watch('pos', function(newValue, oldValue, scope) {
          element.css({
            top:  scope.pos.y,
            left: scope.pos.x
          })
        }, true);
      }
    }
  })
  .service('ChatService', ['$http', function($http) {
    // データリストを取得する
    this.getDataList = function(url) {
      var dataList = [];
      $http({
        method: 'GET',
        url:    url
      })
      .success(function(data, status, headers, config) {
        angular.extend(dataList, data);
      });
      return dataList;
    }
  }])
  .controller('MyController', ['$scope', '$timeout', '$filter', 'ChatService',
  function($scope, $timeout, $filter, ChatService) {
    // Socketの作成
    var socket = io();

    // チャットリストを取得する
    $scope.chats = ChatService.getDataList('./chats');

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
    $scope.postIts = ChatService.getDataList('./post-its');
    // 付箋の作成
    $scope.createPostIt = function(postIt) {
      postIt.roomId = $scope.chat.roomId;
      // post-it-createイベントを送信する
      socket.emit('post-it-create', postIt);
    };

    // post-it-createというイベントを受信した時
    socket.on('post-it-create', function(postIt) {
      console.log('recieve:', postIt);
      // 同じroomIdなら反映させる
      if(postIt.roomId === $scope.chat.roomId) {
        $timeout(function() {
          $scope.postIts.push(postIt);
        });
      }
    });

    // 付箋の移動（下からのイベントをそのままsocketに送る）
    $scope.$on('movePostIt', function(event, postItId, position) {
      // post-it-moveイベントを送信する
      socket.emit('post-it-move', postItId, position);
    });
    // 付箋移動イベントを受信した時
    socket.on('post-it-move', function(postItId, position) {
      var postIt = $filter('filter')($scope.postIts, { _id: postItId });
      if(postIt.length === 1) {
        $timeout(function() {
          postIt[0].position.x = position.x;
          postIt[0].position.y = position.y;
        });
      }
    })
  }]);
