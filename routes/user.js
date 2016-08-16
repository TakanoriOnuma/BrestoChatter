var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');

// ログイン画面
router.get('/login', function(req, res, next) {
  res.render('user/login', { title: 'ログイン' });
});
// ログイン
router.post('/login', function(req, res, next) {
  mongoose.model('User').findOne({email: req.body.email}, function(err, user) {
    if(user) {
      if(user.password === req.body.password) {
        req.session.user = user;
        res.send(true);
      }
      else {
        res.send(false);
      }
    }
    else {
      res.send('');
    }
  });
});
// 登録画面
router.get('/registration', function(req, res, next) {
  res.render('user/registration', { title: 'ユーザ登録' });
});
// ユーザ登録
router.post('/registration', function(req, res, next) {
  var newUser = new (mongoose.model('User'))();
  // 送信されたデータを1つ1つコピーする
  for(var key in req.body) {
    newUser[key] = req.body[key];
  }
  console.log(newUser);
  newUser.save(function(err) {
    if(err) {
      console.log(err);
      res.send(false);
    }
    else {
      res.send(true);
    }
  });
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
