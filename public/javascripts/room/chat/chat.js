angular.module('myApp', ['ui.bootstrap', 'ngSanitize'])
  // 改行を<br>に変換するフィルター
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
        postIts : '=',
        members : '=',
        user    : '='
      },
      template: '<div class="my-whiteboard" ng-click="reset()">' +
                '  <span>ホワイトボード</span>' +
                '  <my-post-it ng-repeat="postIt in postIts track by $index" post-it="postIt">' +
                '  </my-post-it>' +
                '  <my-cursor ng-repeat="member in members | filter : myFilter" pos="member.position"></my-cursor>' +
                '</div>',
      controller: ['$scope', 'WebSocket', function($scope, WebSocket) {
        // linkで使えるようにスコープに代入
        $scope.WebSocket = WebSocket;

        // 自分の情報を取り外すフィルター
        $scope.myFilter = function(value, index) {
          return !(value._id === $scope.user._id);
        };
      }],
      link: function(scope, element, attrs) {
        // ホワイトボードの基準座標を取得する
        var rootPos   = element.position();
        rootPos.top  -= element.scrollTop();
        rootPos.left -= element.scrollLeft();

        // コンテキストメニューを作成する
        var menu = [
          {
            name  : '作成',
            title : '付箋を新しく作ります。',
            fun   : function(ui) {
              var pos = ui.menu.position();
              // 付箋作成イベントをサーバーに送る
              scope.WebSocket.emit('post-it-create', {
                message  : '',
                position : { x: pos.left - rootPos.left, y: pos.top - rootPos.top }
              });
            }
          },
          {
            name  : '削除',
            title : '選択した付箋を削除します。',
            fun   : function() {
              if(window.confirm('選択した付箋を削除してもよろしいですか？')) {
                var delPostItIds = [];
                for(var i = 0; i < scope.postIts.length; i++) {
                  if(scope.postIts[i].selected) {
                    delPostItIds.push(scope.postIts[i]._id);
                  }
                }
                // 付箋削除イベントをサーバーに送る
                scope.WebSocket.emit('post-it-delete', delPostItIds);
              }
            }
          }
        ];
        element.contextMenu(menu, { triggerOn: 'click', mouseClick: 'right' });
        // element内でクリックしたときは閉じる（これがないとelement内では閉じてくれない）
        element.click(function(event) {
          element.contextMenu('close');
        });
        // ul.iw-contextMenuの外に出た時はliの選択を強敵的に外す
        $('ul.iw-contextMenu').mouseleave(function(event) {
          $('li', this).removeClass('iw-mSelected');
        });

        // 全ての付箋を未選択状態にする
        scope.reset = function() {
          angular.forEach(scope.postIts, function(postIt, index, arr) {
            postIt.selected = false;
          });
        }

        // ホワイトボード上にチャットのタグを受け取れるようにする
        element.droppable({
          accept: '.my-chat',
          drop: function(event, ui) {
            var message = $('.message', ui.draggable).text();
            var pos = ui.helper.position();
            var postIt = {
              message  : message,
              position : { x: pos.left - rootPos.left, y: pos.top - rootPos.top }
            };
            // 付箋の作成イベントをサーバーに送る
            scope.WebSocket.emit('post-it-create', postIt);
          }
        });

        // ホワイトボード上で移動している時の処理
        element.mousemove(function(event) {
          // カーソルの移動をサーバーに送る
          var pos = {
            x: event.pageX - rootPos.left,
            y: event.pageY - rootPos.top
          };
          scope.WebSocket.emit('cursor-move', scope.user._id, pos);
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
      template: '<div class="my-post-it" ng-class="{ \'my-post-it-selected\': postIt.selected }">' +
                '  <span ng-bind-html="postIt.message | nl2br"></span>' +
                '</div>',
      controller: ['$scope', 'WebSocket', function($scope, WebSocket) {
        // linkで使えるようにスコープに代入
        $scope.WebSocket = WebSocket;
      }],
      link: function(scope, element, attrs) {
        // モデル値を初期化する
        scope.postIt.selected = false;

        // 付箋をドラッグ可能にする
        element.draggable({
          containment: 'parent',
          drag: function(event, ui) {
            scope.postIt.position.x = ui.position.left;
            scope.postIt.position.y = ui.position.top;
            // 座標の変化をサーバーに送る
            scope.WebSocket.emit('post-it-move', scope.postIt._id, scope.postIt.position);
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
        // クリック時の処理（一度ドラッグするとマウスを上げてもクリック扱いにはならない）
        element.click(function(event) {
          event.stopPropagation();
          // 既に選択されている時、内容を変更できるようにする
          if(scope.postIt.selected) {
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
              // メッセージの変更をサーバーに送る
              scope.WebSocket.emit('post-it-contents-change', scope.postIt._id, scope.postIt.message);
            });
          }
          // 未選択状態なら、選択状態にする
          else {
            scope.$apply(function() {
              // Ctrlキーが入力されていなければ親スコープを借りて選択状態を全てリセットする
              if(!event.ctrlKey) scope.$parent.reset();
              scope.postIt.selected = true;
            });
          }
        });
      }
    }
  })
  // ホワイトボード上で動くカーソル
  .directive('myCursor', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        pos    : '=',
        cursor : '='
      },
      template: '<img class="my-cursor" ng-src="{{cursor}}">',
      link: function(scope, element, attrs) {
        if(!scope.cursor) scope.cursor = '/cursor/arrow.cur';

        // 座標の変化を検知したら、反映させる
        scope.$watch('pos', function(newValue, oldValue, scope) {
          element.css({
            top  : scope.pos.y,
            left : scope.pos.x
          });
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
  // socket.ioのシングルトンラッパー
  .factory('WebSocket', function() {
    return io();
  })
  // メインコントローラー
  .controller('MyController', ['$scope', '$timeout', '$filter', 'ChatService', 'WebSocket',
  function($scope, $timeout, $filter, ChatService, WebSocket) {
    // 参照できるようにあらかじめ初期化する
    $scope.chat = {
      message:  ''
    };

    // メンバーリスト
    $scope.members = [];
    // 参加イベントを受信した時
    WebSocket.on('join', function(member) {
      console.log(member.userName + ' entered.');
      $timeout(function() {
        $scope.members.push(member);
      });
    });
    // メンバーリストを受信した時
    WebSocket.on('members', function(members, user) {
      $timeout(function() {
        angular.extend($scope.members, members);
        $scope.user = user;
      });
    });
    // 退出イベントを受信した時
    WebSocket.on('leave', function(userName) {
      console.log(userName + ' left.');
      $timeout(function() {
        for(var i = 0; i < $scope.members.length; i++) {
          if($scope.members[i].userName === userName) {
            $scope.members.splice(i, 1);
            break;
          }
        }
      });
    });
    // 通信が切断された時
    WebSocket.on('disconnect', function() {
      console.log('disconnected.');
      $timeout(function() {
        $scope.members.splice(0, $scope.members.length);
      });
    });

    // チャットリストを取得する
    $scope.chats = ChatService.getDataList('./chats');
    // chatというイベントを受信した時
    WebSocket.on('chat', function(chat) {
      $timeout(function() {
        $scope.chats.push(chat);
      });
    });

    // submitイベント時の処理
    $scope.sendMessage = function() {
      if($scope.chat.message === '') {
        return;
      }
      // chatイベントを送信する
      WebSocket.emit('chat', $scope.chat.message);
      $scope.chat.message = '';
    };

    // 付箋リストをセットする
    $scope.postIts = ChatService.getDataList('./post-its');
    // post-it-createというイベントを受信した時
    WebSocket.on('post-it-create', function(postIt) {
      console.log('recieve:', postIt);
      $timeout(function() {
        $scope.postIts.push(postIt);
      });
    });

    // 付箋移動イベントを受信した時
    WebSocket.on('post-it-move', function(postItId, position) {
      var postIt = $filter('filter')($scope.postIts, { _id: postItId });
      if(postIt.length === 1) {
        $timeout(function() {
          postIt[0].position.x = position.x;
          postIt[0].position.y = position.y;
        });
      }
    });

    // 付箋内容変更イベントを受信した時
    WebSocket.on('post-it-contents-change', function(postItId, message) {
      var postIt = $filter('filter')($scope.postIts, { _id: postItId });
      if(postIt.length === 1) {
        $timeout(function() {
          postIt[0].message = message;
        });
      }
    });

    // 付箋削除イベントを受信した時
    WebSocket.on('post-it-delete', function(delPostItIds) {
      $timeout(function() {
        for(var i = 0; i < delPostItIds.length; i++) {
          var id = delPostItIds[i];
          for(var j = 0; j < $scope.postIts.length; j++) {
            if(id === $scope.postIts[j]._id) {
              $scope.postIts.splice(j, 1);
              break;
            }
          }
        }
      });
    });

    // カーソル移動イベントを受信した時
    WebSocket.on('cursor-move', function(userId, pos) {
      var member = $filter('filter')($scope.members, { _id : userId });
      if(member.length === 1) {
        $timeout(function() {
          member[0].position.x = pos.x;
          member[0].position.y = pos.y;
        });
      }
    });
  }]);
