var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var sessionCheck = require('../validation/sessionCheck');

router.get('/chat', sessionCheck.loginCheck, sessionCheck.enterCheck, function(req, res, next) {
  res.render('room/chat/chat.jade', { title: 'Chat' })
});

// /chatsにGETアクセスした時、Chat一覧を取得するAPI
router.get('/chats', function(req, res) {
  // 全てのchatを取得して送る
  mongoose.model('Chat')
    .find({})
    .sort('-createdDate')
    .exec(function(err, chats) {
      res.send(chats);
    });
});

module.exports = router;
