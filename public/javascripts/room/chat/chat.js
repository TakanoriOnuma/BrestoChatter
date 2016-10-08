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
      template: '<div class="my-chat-list" ng-cloak>' +
                '  <my-chat ng-repeat="chat in chats track by $index" chat="chat"></my-chat>' +
                '</div>',
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
      template: '<table chat-id="{{chat._id}}" style="margin-left: 10px; width: 95%">' +
                '  <tr>' +
                '    <td class="my-chat">' +
                '      {{chat.userName}} ({{chat.createdDate | date: "yyyy/MM/dd HH:mm:ss"}})<br>' +
                '      <span class="message">{{chat.message}}</span>' +
                '    </td>' +
                '    <td rowspan="2" style="width: 70px; text-align: right">' +
                '      <input type="button" value="削除" ng-click="delete()">' +
                '    </td>' +
                '  </tr>' +
                '</table>',
      controller: ['$scope', 'WebSocket', function($scope, WebSocket) {
        $scope.WebSocket = WebSocket;
      }],
      link: function(scope, element, attrs) {
        $('.my-chat', element).draggable({helper: 'clone'});

        // 削除ボタン押下時のイベント処理
        scope.delete = function() {
          if(window.confirm('削除してもよろしいですか？')) {
            scope.WebSocket.emit('chat-delete', scope.chat._id);
          }
        }
      }
    };
  })
  // 個人用メモ一覧を表示するディレクティブ
  .directive('myMemoList', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        memos: '='
      },
      template: '<div class="my-chat-list" ng-cloak>' +
                '  <my-memo ng-repeat="memo in memos track by $index" memo="memo"></my-memo>' +
                '</div>',
      link: function(scope, element, attrs) {
        // chats配列を監視して、変化があればスクロールを最下部に移動する
        scope.$watchCollection('memos', function(newValue, oldValue, scope) {
          element[0].scrollTop = element[0].scrollHeight;
        });
      }
    };
  })
  // 個人用メモディレクティブ
  .directive('myMemo', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        memo: '='
      },
      template: '<table style="margin-left: 10px; width: 95%">' +
                '  <tr>' +
                '    <td class="my-chat">' +
                '      <span class="message">{{memo.message}}</span>' +
                '    </td>' +
                '    <td rowspan="2" style="width: 70px; text-align: right">' +
                '      <input type="button" value="削除" ng-click="delete()">' +
                '    </td>' +
                '  </tr>' +
                '</table>',
      controller: ['$scope', '$http', function($scope, $http) {
        // 削除ボタン押下時の処理
        $scope.delete = function() {
          if(window.confirm('削除してもよろしいですか？')) {
            $http.post('./memo-delete', { memoId: $scope.memo._id })
              .success(function(data, status, headers, config) {
                if(data) {
                  // 応急処置で親スコープからメモリストを取ってくる
                  var memos = $scope.$parent.$parent.memos;
                  for(var i = 0; i < memos.length; i++) {
                    if(memos[i]._id === $scope.memo._id) {
                      memos.splice(i, 1);
                      break;
                    }
                  }
                }
              });
          }
        };
      }],
      link: function(scope, element, attrs) {
        $('.my-chat', element).draggable({helper: 'clone'});
      }
    };
  })
  // ホワイトボードディレクティブ
  .directive('myWhiteboard', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        room    : '=',
        postIts : '=',
        members : '=',
        user    : '='
      },
      template: '<div class="my-whiteboard">' +
                '  <span class="my-board-title">{{room.title}}</span>' +
                '  <my-post-it ng-repeat="postIt in postIts" post-it="postIt">' +
                '  </my-post-it>' +
                '  <my-cursor ng-repeat="member in members | filter: myFilter" pos="member.position" color-name="member.cursorColorName"></my-cursor>' +
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
        // 基準座標
        var rootPos = { top: 0, left: 0 };
        // マウスが入った時とスクロール時に基準座標を変更する
        element
          .mouseenter(function() {
            rootPos.top  = element.position().top  - element.scrollTop();
            rootPos.left = element.position().left - element.scrollLeft();
          })
          .scroll(function() {
            rootPos.top  = element.position().top  - element.scrollTop();
            rootPos.left = element.position().left - element.scrollLeft();
          });

        // 選択されている付箋をIDリストで返す
        var getSelectedPostItIds = function(postIts) {
          var postItIds = []
          for(var i = 0; i < postIts.length; i++) {
            if(postIts[i].selected) {
              postItIds.push(postIts[i]._id);
            }
          }
          return postItIds;
        };

        // 付箋で設定できる色
        var colorNames = [
          { en: 'yellow', jp: '黄色' },
          { en: 'blue',   jp: '青色' },
          { en: 'green',  jp: '緑色' },
          { en: 'pink',   jp: 'ピンク' },
          { en: 'orange', jp: 'オレンジ' }
        ];
        // 1つの付箋作成メニューを返す関数を用いてループ変数を介在させないようにする
        var createPostItCreationMenu = function(colorName) {
          return {
            name : colorName.jp,
            img  : '/images/postItColor/{0}.png'.replace('{0}', colorName.en),
            fun  : function(ui) {
              var pos = ui.menu.position();
              // 付箋作成イベントをサーバーに送る
              scope.WebSocket.emit('post-it-create', {
                message   : '',
                position  : { x: pos.left - rootPos.left, y: pos.top - rootPos.top },
                colorName : colorName.en
              });
            }
          }
        }
        // 付箋作成メニューをループを使って指定する
        var postItCreationMenu = [];
        for(var i = 0; i < colorNames.length; i++) {
          postItCreationMenu.push(createPostItCreationMenu(colorNames[i]));
        }

        // 1つの色選択メニューを返す関数を用いてループ変数を介在させないようにする
        var createColorSelectMenu = function(colorName) {
          return {
            name : colorName.jp,
            img  : '/images/postItColor/{0}.png'.replace('{0}', colorName.en),
            fun  : function() {
              var postItIds = getSelectedPostItIds(scope.postIts);
              // 色変更イベントをサーバーに送る
              scope.WebSocket.emit('post-its-color-change', postItIds, colorName.en);
            }
          }
        }
        // 色選択メニューをループを使って指定する
        var colorSelectMenu = [];
        for(var i = 0; i < colorNames.length; i++) {
          colorSelectMenu.push(createColorSelectMenu(colorNames[i]));
        }
        // コンテキストメニューを作成する
        var menu = [
          {
            name    : '作成',
            title   : '付箋を新しく作ります。',
            subMenu : postItCreationMenu
          },
          {
            name    : '色の変更',
            title   : '選択した付箋の色を変更します。',
            subMenu : colorSelectMenu
          },
          {
            name  : '削除',
            title : '選択した付箋を削除します。',
            fun   : function() {
              if(window.confirm('選択した付箋を削除してもよろしいですか？')) {
                var delPostItIds = getSelectedPostItIds(scope.postIts);
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
          // user情報がまだ読み込めてない時はスキップ
          if(typeof scope.user === 'undefined') {
            return;
          }
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
          var movedPos = { x: event.pageX,         y: event.pageY };
          var vec      = { x: movedPos.x - _pos.x, y: movedPos.y - _pos.y };
          // 変化量がある時だけ動かす
          if(vec.x !== 0 && vec.y !== 0) {
            _dragProcess(vec.x, vec.y);
            _pos = movedPos;
            _isDragged = true;
          }
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
      template: '<div class="my-post-it my-post-it-{{postIt.colorName}}" ng-class="{ \'my-post-it-selected\': postIt.selected }">' +
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
        pos       : '=',
        colorName : '='
      },
      template: '<img class="my-cursor" ng-src="/cursor/{{colorName}}.png">',
      link: function(scope, element, attrs) {
        if(!scope.colorName) scope.colorName = 'red';

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

        // 基準座標
        var rootPos = { top: 0, left: 0 };
        // マウスが入った時とスクロール時に基準座標を変更する
        element.parent()
          .mouseenter(function() {
            rootPos.top  = element.parent().position().top  - element.parent().scrollTop();
            rootPos.left = element.parent().position().left - element.parent().scrollLeft();
          })
          .scroll(function() {
            rootPos.top  = element.parent().position().top  - element.parent().scrollTop();
            rootPos.left = element.parent().position().left - element.parent().scrollLeft();
          });

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
        color  : '@',
        text   : '@',
        width  : '@'
      },
      template: '<svg>' +
                '  <path ng-class="\'svg-\' + color" stroke-width="1" />' +
                '  <g font-family="sans-serif" font-size="16">' +
                '    <text y="17" fill="white" text-anchor="middle" dominant-baseline="middle">{{text}}</text>' +
                '  </g>' +
                '</svg>',
      link: function(scope, element, attrs) {
        // angularで上手く設定できないものは、jQueryで強制的に設定する
        element.attr('viewBox', '0 0 {0} 40'.replace('{0}', scope.width));
        var path = 'M 1 1 ' +
                   'L {0} 1 '.replace('{0}', scope.width - 20) +
                   'L {0} 15 '.replace('{0}', scope.width - 1) +
                   'L {0} 29 '.replace('{0}', scope.width - 20) +
                   'L 1 29 ' +
                   'L 19 15 ' +
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
      template: '<div style="position: relative; height: 50px">' +
                '  <my-time-line cursor="cursor" sections="schedule" width="{{fieldWidth}}" height="20" style="position: absolute; top: 0px; left: 10px"></my-time-line>' +
                '  <my-arrow ng-repeat="section in schedule track by $index"' +
                '            text="{{section.name}}" color="{{section.color}}" width="{{section.width}}" style="position: absolute; left: {{section.left + 10}}px; top: 20px">' +
                '  </my-arrow>' +
                '</div>',
      controller: ['$scope', '$element', 'WebSocket', function($scope, $element, WebSocket) {
        var getColorName = function(state) {
          if(state === 'active')        return 'orange';
          else if(state === 'wait')     return 'green';
          else if(state === 'finished') return 'gray';
          else                          return '';
        };
        // scope変数の初期化
        $scope.cursor = 0;

        $scope.$watchCollection('schedule', function(newValue, oldValue, scope) {
          // データが取得できていない時は何もしない
          if(newValue.length === 0) {
            return;
          }

          for(var i = 0; i < $scope.schedule.length; i++) {
            $scope.schedule[i].color = getColorName($scope.schedule[i].state);
          }
          $scope.totalTime = $scope.schedule[$scope.schedule.length - 1].totalTime;
          // 幅の設定
          $scope.fieldWidth = $element.width() - 20;
          var width = $scope.fieldWidth + 15 * ($scope.schedule.length - 1);
          for(var i = 0; i < $scope.schedule.length; i++) {
            $scope.schedule[i].width = Math.round(width * $scope.schedule[i].time / $scope.totalTime);
            $scope.schedule[i].left  = (i === 0) ? 0 : $scope.schedule[i - 1].left + $scope.schedule[i - 1].width - 15;
          }

          // 経過時間通知イベントを受信した時
          WebSocket.on('meeting-count', function(time) {
            $scope.$apply(function() {
              $scope.cursor = Math.round($scope.fieldWidth * time / $scope.totalTime);
            });
          });
        });

        WebSocket.on('meeting-active-section', function(activeNum) {
          $scope.$apply(function() {
            // activeNumより前のセクションは灰色にする
            var i = 0;
            for( ; i < activeNum; i++) {
              $scope.schedule[i].state = 'finished';
            }
            // i(=activeNum)がスケジュール配列を示しているならそこをアクティブにする
            if(i < $scope.schedule.length) {
              $scope.schedule[i].state = 'active';
            }
            // それより先のスケジュールは待機にする
            for(i = i + 1; i < $scope.schedule.length; i++) {
              $scope.schedule[i].state = 'wait';
            }

            // 色をセットする
            for(i = 0; i < $scope.schedule.length; i++) {
              $scope.schedule[i].color = getColorName($scope.schedule[i].state);
            }
          });
        });
      }]
    }
  })
  // タイムラインを表示するディレクティブ
  .directive('myTimeLine', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        width    : '@',
        height   : '@',
        sections : '=',
        cursor   : '='
      },
      template: '<div style="width: {{width}}px; height: {{height}}px; border-bottom: solid 1px black">' +
                '  <div ng-repeat="section in sections track by $index" style="position: absolute; left: {{section.left + section.width - 30}}px; white-space: nowrap">{{section.totalTime}}分</div>' +
                '  <my-time-cursor cursor="cursor"></my-time-cursor>' +
                '</div>'
    }
  })
  // 時間を指し示すカーソル
  .directive('myTimeCursor', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        cursor : '='
      },
      template: '<div class="triangle" style="position: absolute; left: {{cursor - 10}}px; top: 5px"></div>'
    }
  })
  // スケジュール管理を操作するディレクティブ
  .directive('myScheduleConfigure', function() {
    return {
      restrict: 'E',
      replace: true,
      scope: {
      },
      template: '<div>' +
                '  <input type="button" value="{{finFlag ? \'リセット\' : (timerFlag ? \'停止\' : \'開始\')}}" ng-click="toggle()" style="width: 55px"></input><br>' +
                '  <span>残り{{last}}分</span>' +
                '</div>',
      controller: ['$scope', 'WebSocket', function($scope, WebSocket) {
        // スコープ変数の初期化
        $scope.last      = 0;
        $scope.endTime   = 0;
        $scope.timerFlag = false;
        $scope.finFlag   = false;
        $scope.toggle    = function() {
          // 既に終了している場合はリセットを送信する
          if($scope.finFlag) {
            WebSocket.emit('meeting-reset');
            return;
          }

          WebSocket.emit('meeting-toggle');
          // 他の場所で反映させているようなので省略
          //$scope.$apply(function() {
            $scope.timerFlag = !$scope.timerFlag;
          //});
        };
        // 時間開始イベントを受信した時
        WebSocket.on('meeting-start', function(time) {
          $scope.$apply(function() {
            $scope.timerFlag = true;
            $scope.last = $scope.endTime - time;
          });
        });
        // 時間停止イベントを受信した時
        WebSocket.on('meeting-stop', function() {
          $scope.$apply(function() {
            $scope.timerFlag = false;
          });
        });
        // 経過時間通知イベントを受信した時
        WebSocket.on('meeting-count', function(time) {
          $scope.$apply(function() {
            $scope.last = $scope.endTime - time;
          });
        });
        // アクティブセクションの通知を受信した時
        WebSocket.on('meeting-active-section', function(activeNum) {
          var schedule = $scope.$parent.schedule;
          // アクティブセクション番号がスケジュール配列の範囲内の時
          if(activeNum < schedule.length) {
            $scope.endTime = schedule[activeNum].totalTime;
            $scope.finFlag = false;
          }
          // 範囲を超えた場合
          else {
            $scope.endTime = schedule[schedule.length - 1].totalTime;
            $scope.finFlag = true;
          }

          // 通知メッセージを作成して、alertする
          var finSection  = '';
          var nextSection = '';
          if(activeNum === 0) {
            nextSection = '始めに' + schedule[activeNum].name + 'を行います。\n';
          }
          else if($scope.finFlag) {
            finSection  = schedule[activeNum - 1].name + 'が終了しました。\n';
            finSection += 'これでミーティングは終了です。\n';
          }
          else {
            finSection  = schedule[activeNum - 1].name + 'が終了しました。\n';
            nextSection = '次は' + schedule[activeNum].name + 'に移ります。\n';
          }
          window.alert(finSection + nextSection);
        });
      }]
    }
  })
  .service('ChatService', ['$http', function($http) {
    // データリストを取得する
    this.getDataList = function(url) {
      var dataList = [];
      $http({
        method : 'GET',
        url    : url
      })
      .success(function(data, status, headers, config) {
        angular.extend(dataList, data);
      });
      return dataList;
    }
    // データオブジェクトを取得する
    this.getDataObject = function(url) {
      var dataObject = {};
      $http({
        method : 'GET',
        url    : url
      })
      .success(function(data, status, headers, config) {
        angular.extend(dataObject, data);
      });
      return dataObject;
    }
  }])
  // socket.ioのシングルトンラッパー
  .factory('WebSocket', function() {
    return io();
  })
  // 単語帳取得サービス
  // 単語リストは（https://ja.wiktionary.org/wiki/Wiktionary:日本語の基本語彙1000）から抜粋
  .service('WordList', function() {
    // 形容詞リスト
    this.adjectives = [
      '良い',   '悪い',   '高い',     '低い',     '安い',
      '大きい', '小さい', '細い',     '太い',     '古い',
      '新しい', '若い',   '軽い',     '重い',     '易しい',
      '優しい', '難しい', '柔らかい', '固い',     '熱い',
      '冷たい', '寒い',   '薄い',     '美味しい', '上手い',
      'マズい', '甘い',   '辛い',     '苦い',     '忙しい'
    ];
    // 形容動詞リスト
    this.adjectiveVerbs = [
      '綺麗で',   '静かで', '上手で', '丁寧で', '下手で',
      '可能で',   '好きで', '重要で', '非常に', '様々で',
      '特別で',   '確かに', '簡単で', '大切で', '十分に',
      '明らかに', '嫌いで', '同じで', '大変で'
    ];
    // 副詞リスト
    this.adverbs = [
      'もうすぐ', 'まだ',   'ずっと', 'とても', 'どう',
      'きっと',   'よく',   '少し',   'やはり', 'ちょっと',
      'また',     'まず',   'すぐ',   '特に',   '例えば',
      'なぜ',     '全く',   '一番',   '勿論',   '既に',
      '更に',     '初めて', '必ず',   'かなり', 'はっきり'
    ];

    // 各単語をランダムで取得
    this.getRandomAdjective = function() {
      var idx = Math.floor(Math.random() * this.adjectives.length);
      return this.adjectives[idx];
    };
    this.getRandomAdjectiveVerb = function() {
      var idx = Math.floor(Math.random() * this.adjectiveVerbs.length);
      return this.adjectiveVerbs[idx];
    };
    this.getRandomAdverb = function() {
      var idx = Math.floor(Math.random() * this.adverbs.length);
      return this.adverbs[idx];
    };
  })
  // メインコントローラー
  .controller('MyController', ['$scope', '$http', '$timeout', '$filter', 'ChatService', 'WordList', 'WebSocket',
  function($scope, $http, $timeout, $filter, ChatService, WordList, WebSocket) {
    // スケジュールを取得
    $scope.schedule = [];
    WebSocket.on('schedule', function(schedule) {
      $scope.$apply(function() {
        $scope.schedule = schedule;
      });
    });

    // 部屋情報を取得
    $scope.room = ChatService.getDataObject('/room/roominfo');

    // 参照できるようにあらかじめ初期化する
    $scope.chat = {
      message:  ''
    };
    $scope.memo = {
      message: ''
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
      for(var i = 0; i < members.length; i++) {
        // カーソルの色に指定がない時
        if(!members[i].cursorColorName) {
          members[i].cursorColorName = 'red';
        }
        // 自分のカーソルは白に設定する
        if(members[i]._id === user._id) {
          members[i].cursorColorName = 'white';
        }
      }
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

    // チャットに関する処理
    $scope.chats = ChatService.getDataList('./chats');
    // chatというイベントを受信した時
    WebSocket.on('chat', function(chat) {
      $timeout(function() {
        $scope.chats.push(chat);
      });
    });
    // チャット削除イベントを受信した時
    WebSocket.on('chat-delete', function(chatId) {
      $timeout(function() {
        for(var i = 0; i < $scope.chats.length; i++) {
          if($scope.chats[i]._id === chatId) {
            $scope.chats.splice(i, 1);
            break;
          }
        }
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

    // 個人用メモに関する処理
    $scope.memos = ChatService.getDataList('./memos');
    $scope.sendMemo = function() {
      if($scope.memo.message === '') {
        return;
      }
      // memoイベントを送信する
      $scope.registerMemo($scope.memo.message);
      $scope.memo.message = '';
    };

    // 付箋に一括登録
    $scope.registerPostIts = function(dats) {
      // 登録確認で拒否したら処理を飛ばす
      if(!window.confirm('メモ情報を全て付箋として登録してもよろしいですか？')) {
        return;
      }

      // データ1個1個を登録していく
      for(var i = 0; i < dats.length; i++) {
        // 付箋情報に成型
        var postIt = {
          message  : dats[i].message,
          position : { x: 0, y: 0 }
        };
        // 付箋の作成イベントをサーバーに送る
        WebSocket.emit('post-it-create', postIt);
      }
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

    // 付箋の色変更イベントを受信した時
    WebSocket.on('post-its-color-change', function(postItIds, colorName) {
      $timeout(function() {
        for(var i = 0; i < postItIds.length; i++) {
          var postIt = $filter('filter')($scope.postIts, { _id : postItIds[i] });
          if(postIt.length === 1) {
            postIt[0].colorName = colorName;
          }
        }
      })
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

    // アイデア促進に使う単語リストサービスをセットする
    $scope.WordList = WordList;
    // 生成した言葉を個人メモに登録する
    $scope.registerMemo = function(word) {
      // memoイベントを送信する
      $http.post('./memo', { message: word })
        .success(function(data, status, headers, config) {
          if(data) {
            $scope.memos.push(data);
          }
        });
    }
  }]);
