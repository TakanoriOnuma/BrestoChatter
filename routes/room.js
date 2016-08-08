var express = require('express');
var router = express.Router();

// 部屋一覧を取得
router.get('/list', function(req, res, next) {
  res.send([]);
});

module.exports = router;