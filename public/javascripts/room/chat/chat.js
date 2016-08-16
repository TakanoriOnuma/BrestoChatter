angular.module('myApp', ['ngSanitize'])
  .filter('nl2br', function() {
    return function(value) {
      if(!angular.isString(value)) {
        return value;
      }
      return value.replace(/\r?\n/g, '<br>');
    }
  })
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
                '  <my-post-it ng-repeat="postIt in postIts track by $index" post-it="postIt">' +
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
      scope: {
        postIt : '='
      },
      template: '<div class="my-post-it">' +
                '  <span ng-bind-html="postIt.message | nl2br"></span>' +
                '</div>',
      link: function(scope, element, attrs, ngModelController) {
        // 付箋をドラッグ可能にする
        element.draggable({
          containment: 'parent',
          drag: function(event, ui) {
            scope.postIt.position.x = ui.position.left;
            scope.postIt.position.y = ui.position.top;
            // 親スコープに付箋が移動したと通知する
            scope.$emit('movePostIt', scope.postIt._id, scope.postIt.position);
          }
        });
        // 座標の変化を検知した時、付箋の位置を変更する
        scope.$watch('postIt.position', function(newValue, oldValue, scope) {
          element.css({
            top:  scope.postIt.position.y,
            left: scope.postIt.position.x
          })
        }, true);

        // 元々のタグを保持しておく
        var $span = $('span', element);
        // クリック時内容を変更できるようにする
        // (一度ドラッグするとマウスを上げてもクリック扱いにはならない)
        element.click(function(event) {
          // spanタグをtextareaタグに置き換える
          var elem = $('span', element);
          var $input = $('<textarea>').val(scope.postIt.message);
          $input.css({
            width: '100%',
            height: '100%'
          });
          elem.replaceWith($input);
          $input.focus();

          // フォーカスが外れたときはモデルに入力内容を反映させて元に戻す
          $input.blur(function(event) {
            scope.$apply(function() {
              scope.postIt.message = $input.val();
            });
            $input.replaceWith($span);
            // 親スコープにメッセージが変わったことを通知する
            scope.$emit('changePostItContents', scope.postIt._id, scope.postIt.message);
          });
        });
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
    });

    // 付箋の内容が変わった時（下からのイベントをそのままsocketに送る）
    $scope.$on('changePostItContents', function(event, postItId, message) {
      // 付箋内容変更イベントを送信
      socket.emit('post-it-contents-change', postItId, message);
    });
    // 付箋内容変更イベントを受信した時
    socket.on('post-it-contents-change', function(postItId, message) {
      var postIt = $filter('filter')($scope.postIts, { _id: postItId });
      if(postIt.length === 1) {
        $timeout(function() {
          postIt[0].message = message;
        });
      }
    });
  }]);
