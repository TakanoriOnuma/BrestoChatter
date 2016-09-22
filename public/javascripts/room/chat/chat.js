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
      template: '<div class="my-whiteboard">' +
                '  <span>ホワイトボード</span>' +
                '  <my-post-it ng-repeat="postIt in postIts" post-it="postIt">' +
                '  </my-post-it>' +
                '  <my-cursor ng-repeat="member in members | filter: myFilter" pos="member.position"></my-cursor>' +
                '  <my-select-field select-field="selField"></my-select-field>' +
                '</div>',
      controller: ['$scope', '$filter', 'WebSocket', 'DragManager', function($scope, $filter, WebSocket, DragManager) {
        // linkで使えるようにスコープに代入
        $scope.WebSocket = WebSocket;
        // スコープ変数の初期化
        $scope.selField = {};

        // 自分の情報を取り外すフィルター
        $scope.myFilter = function(value, index) {
          return !(value._id === $scope.user._id);
        };

        // 選択されている付箋全てを移動する
        this.moveSelectedPostIts = function(dx, dy) {
          var selectedPostIts = $filter('filter')($scope.postIts, { selected: true });

          // 最小座標の取得
          var minX = 10000;
          var minY = 10000;
          for(var i = 0; i < selectedPostIts.length; i++) {
            if(selectedPostIts[i].position.x < minX) minX = selectedPostIts[i].position.x;
            if(selectedPostIts[i].position.y < minY) minY = selectedPostIts[i].position.y;
          }

          // 移動できないときは移動できる分だけ移動し、余剰分は保存しておく
          var offset = { x: 0, y: 0 };
          if(minX + dx < 0) { offset.x = minX + dx; dx = -minX; }
          if(minY + dy < 0) { offset.y = minY + dy; dy = -minY; }

          // 移動量がないなら余剰分を返して終了する
          if(dx === 0 && dy === 0) {
            return offset;
          }

          // 移動処理を行う
          $scope.$apply(function() {
            var movedPostItIds = [];
            var positions      = [];
            for(var i = 0; i < selectedPostIts.length; i++) {
              selectedPostIts[i].position.x += dx;
              selectedPostIts[i].position.y += dy;
              movedPostItIds.push(selectedPostIts[i]._id);
              positions.push(selectedPostIts[i].position);
            }
            // 座標の変化をサーバーに送る
            WebSocket.emit('post-its-move', movedPostItIds, positions);
          });
          // 余剰分を返す
          return offset;
        };

        // 選択領域の監視を行う
        $scope.$watch('selField', function(newValue, oldValue, scope) {
          // よく分かんないけど他の場所で$applyをやっているためここでする必要はない
          //$scope.$apply(function() {
            for(var i = 0; i < $scope.postIts.length; i++) {
              var postIt = $scope.postIts[i];
              // selFieldの内部かチェック
              if(postIt.position.x >= $scope.selField.x &&
                 postIt.position.y >= $scope.selField.y &&
                 postIt.position.x + postIt.width  <= $scope.selField.x + $scope.selField.width &&
                 postIt.position.y + postIt.height <= $scope.selField.y + $scope.selField.height)
              {
                postIt.selected = true;
              }
              else {
                postIt.selected = false;
              }
            }
          //});
        }, true);
      }],
      link: function(scope, element, attrs, ctrl) {
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
            postIt.editable = false;
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
  // ドラッグ移動を管理するファクトリー
  .factory('DragManager', function() {
    // 状態変数
    var _pos        = null;           // クリックした座標
    var _isDragged  = false;          // マウスを押下した後動かしたかのフラグ
    var _dragObjs   = new WeakMap();  // 登録オブジェクト（エレメントをキーにするためWeakMap）
    var _doHandlers = [];             // 実行関数
    var _offsets    = [];             // 移動しきれなかったオフセット
    var _dragProcess = function(dx, dy) {
      // 1つ1つハンドラーを実行していく
      for(var i = 0; i < _doHandlers.length; i++) {
        // offsetが存在しない時は初期化する
        if(!_offsets[i]) _offsets[i] = { x: 0, y: 0 };

        // offsetがあるかチェックする
        if(_offsets[i].x !== 0 || _offsets[i].y !== 0) {
          // 同符号の時はoffset量を加えて変化量を0にする
          if(_offsets[i].x * dx > 0) { _offsets[i].x += dx; dx = 0; }
          if(_offsets[i].y * dy > 0) { _offsets[i].y += dy; dy = 0; }
          // 異符号の時はoffsetの絶対値を減らす
          _offsets[i].x += dx;
          _offsets[i].y += dy;
          // 異符号のままなら変化量を0にし、
          // 符号が変わったらその量を記録する
          dx = (_offsets[i].x * dx < 0) ? 0 : _offsets[i].x;
          dy = (_offsets[i].y * dy < 0) ? 0 : _offsets[i].y;
        }

        // 移動量がある場合は関数を実行し、余剰分を_offsetに保存する
        if(dx !== 0 || dy !== 0) {
          var offset = _doHandlers[i](dx, dy);
          // 変化量があるものに対してのみ余剰分を更新
          if(dx !== 0) { _offsets[i].x = offset.x; }
          if(dy !== 0) { _offsets[i].y = offset.y; }
        }
      }
    };
    $(window)
      .mousedown(function(event) {
        _isDragged = false;
      })
      .mousemove(function(event) {
        if(_pos) {
          var movedPos = { x: event.pageX, y: event.pageY };
          _dragProcess(movedPos.x - _pos.x, movedPos.y - _pos.y);
          _pos = movedPos;
          _isDragged = true;
        }
      })
      .mouseup(function(event) {
        _pos        = null;
        _offsets    = [];
        _doHandlers = [];
      });
    return {
      // 渡したエレメントのドラッグを検知するよう登録する
      // handlerはfunc(dx, dy)->offset({x, y})の処理を行う関数
      // ※同じエレメントに何回も登録できると見せかけて
      //   $elem.mousedownで複数登録してしまうためやってはいけない。
      setDragMode: function($elem, handler) {
        // エレメント1つ1つにハンドラーが実行できるようにする
        for(var i = 0; i < $elem.length; i++) {
          var $e = $elem[i];

          if(!_dragObjs.has($e)) {
            _dragObjs.set($e, {
              handlers : []
            });
          }
          _dragObjs.get($e).handlers.push(handler);
          // $elemにイベントを追加
          $elem.mousedown(function(event) {
            // イベントが自分自身からの時
            if($e === event.target) {
              _pos = { x: event.pageX, y: event.pageY };
              _doHandlers = _dragObjs.get($e).handlers;
            }
          });
        }
      },
      // ドラッグが行われたかチェック
      isDragged: function() {
        return _isDragged;
      }
    };
  })
  // ホワイトボード上で使う付箋
  .directive('myPostIt', function() {
    return {
      restrict: 'E',
      require: '^^myWhiteboard',
      replace: true,
      scope: {
        postIt : '='
      },
      template: '<div class="my-post-it" ng-class="{ \'my-post-it-selected\': postIt.selected }">' +
                '  <span ng-bind-html="postIt.message | nl2br"></span>' +
                '</div>',
      controller: ['$scope', 'WebSocket', 'DragManager', function($scope, WebSocket, DragManager) {
        // linkで使えるようにスコープに代入
        $scope.WebSocket   = WebSocket;
        $scope.DragManager = DragManager;
      }],
      link: function(scope, element, attrs, ctrl) {
        // モデル値を初期化する
        scope.postIt.selected = false;
        scope.postIt.editable = false;
        // 応急処置（本来はDBに持っておくべき）
        scope.postIt.width  = 100;
        scope.postIt.height = 100;
        // このタグをドラッグ移動できるようマネージャーに登録する
        scope.DragManager.setDragMode(element, ctrl.moveSelectedPostIts);

        // 座標の変化を検知した時、付箋の位置を変更する
        scope.$watch('postIt.position', function(newValue, oldValue, scope) {
          element.css({
            top:  scope.postIt.position.y,
            left: scope.postIt.position.x
          })
        }, true);

        // 元々のタグを保持しておく
        var $span = $('span', element);
        // クリック時の処理
        element.click(function(event) {
          event.stopPropagation();
          // 編集状態でない場合は編集可能にして、次のクリックで編集出来るようにする
          if(!scope.postIt.editable) {
            scope.postIt.editable = true;
            return;
          }
          // ドラッグをしていたら処理をスキップする
          if(scope.DragManager.isDragged()) {
            return;
          }

          // spanタグをtextareaタグに置き換える
          var $elem  = $('span', element);
          var $input = $('<textarea>').val(scope.postIt.message);
          $input.css({
            width: '100%',
            height: '100%'
          });
          $elem.replaceWith($input);
          $input.focus();

          // フォーカスが外れたときはモデルに入力内容を反映させて元に戻す
          $input.blur(function(event) {
            scope.$parent.$parent.isEditing = false;
            scope.$apply(function() {
              scope.postIt.message = $input.val();
            });
            $input.replaceWith($span);
            // メッセージの変更をサーバーに送る
            scope.WebSocket.emit('post-it-contents-change', scope.postIt._id, scope.postIt.message);
          });
        });

        // 付箋を押下した時
        element.mousedown(function(event) {
          // 既に選択されていたらこれ以上処理をしない
          if(scope.postIt.selected) {
            return;
          }

          scope.$apply(function() {
            // Ctrlキーが入力されていなければ親スコープを借りて選択状態を全てリセットする
            if(!event.ctrlKey) scope.$parent.$parent.reset();
            scope.postIt.selected = true;
          });
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
  // ホワイトボード上で範囲選択を表示するディレクティブ
  .directive('mySelectField', function() {
    return {
      restrict: 'E',
      require: '^^myWhiteboard',
      replace: true,
      scope: {
        selectField : '='
      },
      template: '<div class="my-select-field" ng-show="show"></div>',
      controller: ['$scope', function($scope) {
        // スコープ変数の初期化
        $scope.show = false;
        // 未定義変数の初期化
        if($scope.selectField        === undefined) $scope.selectField        = {};
        if($scope.selectField.x      === undefined) $scope.selectField.x      = 0;
        if($scope.selectField.y      === undefined) $scope.selectField.y      = 0;
        if($scope.selectField.width  === undefined) $scope.selectField.width  = 0;
        if($scope.selectField.height === undefined) $scope.selectField.height = 0;
      }],
      link: function(scope, element, attrs) {
        // スコープ変数の初期化
        scope.show = false;

        // 親の起点を保存しておく
        var rootPos = element.parent().position();

        var startPos = null;
        // 親（ホワイトボード上）でマウスを押下したときの処理
        element.parent().mousedown(function(event) {
          // 親のイベントから始まった時
          if(element.parent()[0] === event.target) {
            startPos = { x: event.pageX - rootPos.left, y: event.pageY - rootPos.top };
            scope.$apply(function() {
              scope.show               = true;
              scope.selectField.x      = event.pageX - rootPos.left;
              scope.selectField.y      = event.pageY - rootPos.top;
              scope.selectField.width  = 0;
              scope.selectField.height = 0;
            });
          }
        });
        $(window).mousemove(function(event) {
          // 開始座標が無いときはスキップ
          if(!startPos) return;

          var pos = { x: event.pageX - rootPos.left, y: event.pageY - rootPos.top };
          scope.$apply(function() {
            scope.selectField.x      = (startPos.x <= pos.x) ? startPos.x : pos.x;
            scope.selectField.y      = (startPos.y <= pos.y) ? startPos.y : pos.y;
            scope.selectField.width  = Math.abs(startPos.x - pos.x);
            scope.selectField.height = Math.abs(startPos.y - pos.y);
          })
        });
        $(window).mouseup(function(event) {
          startPos = null;
          scope.$apply(function() {
            scope.show = false;
          });
        });

        // 変数が変化した時、CSSを変更する
        scope.$watch('selectField', function(newValue, oldValue, scope) {
          element.css({
            left:   scope.selectField.x,
            top:    scope.selectField.y,
            width:  scope.selectField.width,
            height: scope.selectField.height
          });
        }, true);
      }
    }
  })
  // オリジナルの矢印図形を表示するディレクティブ
  .directive('myArrow', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        number : '=',
        flag   : '=',
        text   : '@',
        width  : '='
      },
      template: '<svg style="position: absolute; left: {{185 * number}}px">' +
                '  <path ng-class="{\'svg-orange\': flag, \'svg-green\': !flag}" stroke-width="1" />' +
                '  <g font-family="sans-serif" font-size="20">' +
                '    <text y="22" fill="white" text-anchor="middle" dominant-baseline="middle">{{text}}</text>' +
                '  </g>' +
                '</svg>',
      link: function(scope, element, attrs) {
        // angularで上手く設定できないものは、jQueryで強制的に設定する
        element.attr('viewBox', '0 0 {0} 40'.replace('{0}', scope.width));
        var path = 'M 1 1 ' +
                   'L {0} 1 '.replace('{0}', scope.width - 25) +
                   'L {0} 20 '.replace('{0}', scope.width - 1) +
                   'L {0} 39 '.replace('{0}', scope.width - 25) +
                   'L 1 39 ' +
                   'L 24 20 ' +
                   'z';
        element.find('path').attr('d', path);
        element.find('text').attr('x', scope.width / 2);
      }
    }
  })
  // スケジュール管理ディレクティブ
  .directive('mySchedule', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        schedule: '='
      },
      template: '<div style="position: relative; border: solid 1px black; height: 40px">' +
                '  <my-arrow ng-repeat="section in schedule track by $index" number="$index" text="{{section.name}}" flag="section.selected" width="200"></my-section>' +
                '</div>',
      link: function(scope, element, attrs) {

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
    // スケジュールを取りあえず初期化
    $scope.schedule = [
      { name : 'アイデア出し', time : 10, selected : true },
      { name : 'アイデア発散', time : 10, selected : false },
      { name : 'グルーピング', time : 10, selected : false },
      { name : '議論', time : 10, selected : false }
    ];

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
    WebSocket.on('post-its-move', function(postItIds, positions) {
      $timeout(function() {
        for(var i = 0; i < postItIds.length; i++) {
          var postIt = $filter('filter')($scope.postIts, { _id: postItIds[i] });
          if(postIt.length === 1) {
            postIt[0].position.x = positions[i].x;
            postIt[0].position.y = positions[i].y;
          }
        }
      });
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
