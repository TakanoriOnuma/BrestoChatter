// 関数群をセット
var func = {}

// ユーザログインしているかチェック
func.loginCheck = function(req, res, next) {
  if(req.session.user) {
    next();
  }
  else {
    res.redirect('/user/login');
  }
}

// 部屋に入っているかチェック
func.enterCheck = function(req, res, next) {
  if(req.session.room) {
    next();
  }
  else {
    res.redirect('/');
  }
}

module.exports = func;