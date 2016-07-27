var express = require('express');
var router = express.Router();

// ログイン画面
router.get('/login', function(req, res, next) {
  res.render('user/login', { title: 'ログイン' });
});
// 登録画面
router.get('/registration', function(req, res, next) {
  res.render('user/registration', { title: 'ユーザ登録' });
});

module.exports = router;
