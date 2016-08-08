var express = require('express');
var router = express.Router();

// 部屋一覧を取得
router.get('/list', function(req, res, next) {
  res.send([]);
});
// 部屋作成画面
router.get('/registration', function(req, res, next) {
  res.render('room/registration', { title: '部屋の作成' })
});

module.exports = router;