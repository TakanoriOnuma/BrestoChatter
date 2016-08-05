var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');

// ログイン画面
router.get('/login', function(req, res, next) {
  res.render('user/login', { title: 'ログイン' });
});
// 登録画面
router.get('/registration', function(req, res, next) {
  res.render('user/registration', { title: 'ユーザ登録' });
});
// ユーザ登録
router.post('/registration', function(req, res, next) {
  console.log(req.body);
  res.send(true);
})
// emailの重複チェック
router.get('/registration/:email', function(req, res, next) {
  mongoose.model('User').find({email: req.params.email}, function(err, emails) {
    console.log(emails);
    var email = (emails.length === 0) ? '' : emails[0];
    res.send(email);
  });
});

module.exports = router;
