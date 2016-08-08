var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var user = require('./routes/user');
var room = require('./routes/room');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// セッションの準備
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
app.use(session({
  secret: 'secret',
  store: new MongoStore({
    db: 'session',
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/chat'
  }),
  cookie: {
    httpOnly: false
  }
}));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ルーティングの設定
app.use('/', routes);
app.use('/user', user);
app.use('/room', room);

// mongooseを使用してDB設計・操作
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat');

// Chatモデルの登録
mongoose.model('Chat', new mongoose.Schema({
  name        : String,
  message     : String,
  createdDate : {type: Date, default: Date.now}
}));

// Userモデルの登録
mongoose.model('User', new mongoose.Schema({
  email    : {type: String, unique: true},
  userName : String,
  password : String
}));

// /chatsにGETアクセスした時、Chat一覧を取得するAPI
app.get('/chats', function(req, res) {
  // 全てのchatを取得して送る
  mongoose.model('Chat')
    .find({})
    .sort('-createdDate')
    .exec(function(err, chats) {
      res.send(chats);
    });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
