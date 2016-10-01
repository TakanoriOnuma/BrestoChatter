var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var sessionCheck = require('../validation/sessionCheck');

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

// ユーザ情報の編集画面
router.get('/edit', sessionCheck.loginCheck, function(req, res, next) {
  res.render('user/edit', { title: 'ユーザ情報編集' });
});
// ユーザ情報の編集
router.post('/edit', function(req, res, next) {
  mongoose.model('User').findById(req.body._id, function(err, user) {
    // コピーしちゃマズいキーは消しておく
    delete req.body._id;
    for(var key in req.body) {
      user[key] = req.body[key];
    }
    console.log(user);
    user.save(function(err) {
      if(err) {
        console.log(err);
        res.send(false);
      }
      else {
        // 変更情報をセッションにも保存する
        req.session.user = user;
        res.send(true);
      }
    });
  });
});
// ユーザ情報取得
router.get('/userinfo', sessionCheck.loginCheck, function(req, res, next) {
  res.send(req.session.user);
});

module.exports = router;
