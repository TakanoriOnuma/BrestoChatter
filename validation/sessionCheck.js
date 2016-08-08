// 認証用バリデーター関数を用意
var loginCheck = function(req, res, next) {
  if(req.session.user) {
    next();
  }
  else {
    res.redirect('/user/login');
  }
}

exports.loginCheck = loginCheck;