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

// /memosにGETアクセスした時、Memo一覧を取得するAPI
router.get('/memos', sessionCheck.enterCheck, function(req, res) {
  // roomIdとuserIdに紐づかれたmemoを取得して送る
  mongoose.model('Memo')
    .find({ roomId: req.session.room._id, userId: req.session.user._id })
    .sort('createdDate')
    .exec(function(err, memos) {
      res.send(memos);
    });
});
// /memoにPOSTアクセスした時、memoを登録する
router.post('/memo', sessionCheck.enterCheck, function(req, res) {
  var newMemo = new (mongoose.model('Memo'))();
  newMemo.message = req.body.message;
  newMemo.roomId  = req.session.room._id;
  newMemo.userId  = req.session.user._id;
  newMemo.save(function(err) {
    if(err) {
      console.log(err);
    }
  });
  res.send(newMemo);
});
// /memo-deleteにPOSTアクセスした時、memoIdを持つmemoを削除する
router.post('/memo-delete', sessionCheck.enterCheck, function(req, res) {
  mongoose.model('Memo').remove({ _id: req.body.memoId }, function(err) {
    if(err) {
      console.log(err);
      res.send(false);
    }
    else {
      res.send(true);
    }
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
