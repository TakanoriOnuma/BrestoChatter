angular.module('myForm', [])
  .directive('myUnique', ['$http', '$q', function($http, $q) {
    return {
      restrict: 'A',
      require: '?ngModel',
      scope: {},
      link: function(scope, elm, attr, ctrl) {
        // ng-model属性が無い場合はスキップ
        if(!ctrl) return;

        // 非同期検証を登録
        ctrl.$asyncValidators.unique = function(modelValue, viewValue) {
          var value = modelValue || viewValue;
          // Promiseオブジェクトを返す
          console.log(attr.myUnique + value);
          return $http.get(attr.myUnique + value)
            .success(function(data, status, headers, config) {
              console.log(data);
              // 何も情報がなければ未登録なのでtrueを返す
              return (data === '');
            });
        };

        // my-unique属性に変更があったら再検証する
        attr.$observe('myUnique', function(value) {
          ctrl.$validate();
        });
      }
    }
  }]);