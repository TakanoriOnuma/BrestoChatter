var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var user = require('./routes/user');
var room = require('./routes/room');
var chat = require('./routes/chat');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// mongooseを使用してMongoDBにアクセス
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat');

// セッションの準備
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
app.session = session({
  secret: 'secret',
  store: new MongoStore({
    mongooseConnection: mongoose.connection
  }),
  cookie: {
    httpOnly: false
  }
});
app.use(app.session);

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
app.use('/room/chat', chat);

// Chatモデルの登録
mongoose.model('Chat', new mongoose.Schema({
  roomId      : Object,
  userName    : String,
  message     : String,
  createdDate : {type: Date, default: Date.now}
}));

// PostItモデルの登録
mongoose.model('PostIt', new mongoose.Schema({
  roomId   : Object,
  position : Object,
  message  : String
}));

// Userモデルの登録
mongoose.model('User', new mongoose.Schema({
  email    : {type: String, unique: true},
  userName : String,
  password : String
}));

// Roomモデルの登録
mongoose.model('Room', new mongoose.Schema({
  title     : String,
  author    : String,
  password  : String,
  objective : String,
  schedule  : Object
}));

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
