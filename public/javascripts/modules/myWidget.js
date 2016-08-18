angular.module('myWidget', [])
  // タブの外枠
  .directive('myTabPanel', function() {
    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: {
        active: '@'
      },
      template:
        '<div class="container">' +
        '  <ul>' +
        '    <li ng-repeat="tab in tabs" ng-class="{selected: tab.selected}" ng-click="onselect(tab)">' +
        '      {{tab.title}}' +
        '    </li>' +
        '  </ul>' +
        '  <div class="panel" ng-transclude></div>' +
        '</div>',
      controller: ['$scope', function($scope) {
        // activeがセットされていなければ0を初期値とする
        if(!$scope.active) $scope.active = 0;

        // 配下のタブ（群）を格納するための配列
        $scope.tabs = [];

        // 個々のタブをタブパネルに登録（<my-tab>要素で利用）
        this.addTab = function(tab) {
          $scope.tabs.push(tab);
          if($scope.tabs.length - 1 === Number($scope.active)) {
            $scope.onselect(tab);
          }
        };

        // タブを選択した時に呼び出されるイベントリスナー
        $scope.onselect = function(tab) {
          angular.forEach($scope.tabs, function(t) {
            t.show = false;
            t.selected = false;
          });
          tab.show = true;
          tab.selected = true;
        }
      }]
    }
  })
  // タブ
  .directive('myTab', function() {
    return {
      require: '^^myTabPanel',
      restrict: 'E',
      replace: true,
      transclude: true,
      template: '<div ng-show="show" ng-transclude></div>',
      scope: {
        title: '@'
      },
      link: function(scope, element, attrs, panelController) {
        // 現在のタブ情報を追加
        panelController.addTab(scope);
      }
    };
  });