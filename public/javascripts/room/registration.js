// スケジュールの提案リストを定義
var SCHEDULE = {
  'out-ideas' : [
    { name: 'アイデア出し', time: 10 },
    { name: 'アイデア発散', time: 20 },
    { name: 'グルーピング', time: 20 },
    { name: '議論', time: 30 }
  ],
  'persue-ideas' : [
    { name: 'アイデアの確認', time: 10 },
    { name: 'ロジックツリー', time: 20 },
    { name: '議論', time: 30 },
  ],
  'demo' : [
    { name: '実演', time: 90 },
    { name: '質疑応答', time: 300 }
  ]
}

angular.module('myApp', ['ngMessages'])
  .controller('MyController', ['$scope', '$http', function($scope, $http) {
    $scope.onsubmit = function() {
      var data = angular.copy($scope.room);
      var hash = CryptoJS.SHA3(data.password);
      data.password = hash.toString(CryptoJS.enc.Base64);
      // 時間についてはint型に変換しておく
      for(var i = 0; i < data.schedule.length; i++) {
        if(typeof data.schedule[i].time === 'string') {
          data.schedule[i].time = Number(data.schedule[i].time);
        }
      }
      $http.post('./registration', data)
        .success(function(data, status, headers, config) {
          console.log(data);
          if(data) {
            window.location.href = '/';
          }
        });
    };

    // 目的を選択時
    $scope.objectiveChanged = function() {
      console.log($scope.room.objective);
      // 未定義のものを選択した場合はスケジュールを空にして終了
      if(typeof $scope.room.objective === 'undefined') {
        $scope.room.schedule = [];
        return;
      }
      // それぞれ用意されたスケジュールを代入する
      $scope.room.schedule = angular.copy(SCHEDULE[$scope.room.objective]);
    };
  }]);