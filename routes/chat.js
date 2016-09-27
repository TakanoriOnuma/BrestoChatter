var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var sessionCheck = require('../validation/sessionCheck');

router.get('/chat', sessionCheck.loginCheck, sessionCheck.enterCheck, function(req, res, next) {
  res.render('room/chat/chat.jade', {
    title      : 'Chat',
    jQueryFlag : true,
    roomId     : req.session.room._id,
    userName   : req.session.user.userName
  });
});

// /chatsにGETアクセスした時、Chat一覧を取得するAPI
router.get('/chats', sessionCheck.enterCheck, function(req, res) {
  // roomIdに紐づかれたchatを取得して送る
  mongoose.model('Chat')
    .find({ roomId: req.session.room._id })
    .sort('createdDate')
    .exec(function(err, chats) {
      res.send(chats);
    });
});

// /post-itsにGETアクセスした時、PostIt一覧を取得するAPI
router.get('/post-its', sessionCheck.enterCheck, function(req, res) {
  // roomIdに紐づかれたpostItを取得して送る
  mongoose.model('PostIt')
    .find({ roomId: req.session.room._id })
    .exec(function(err, postIts) {
      res.send(postIts);
    });
});

// /scheduleにGETアクセスした時、scheduleを取得するAPI
router.get('/schedule', sessionCheck.enterCheck, function(req, res) {
  // セッションに記録されているscheduleを送信する
  res.send(req.session.room.schedule);
})

module.exports = router;
