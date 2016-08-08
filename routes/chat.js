var express = require('express');
var router = express.Router();

var sessionCheck = require('../validation/sessionCheck');

router.get('/', sessionCheck.loginCheck, sessionCheck.enterCheck, function(req, res, next) {
  res.send('Chat page');
});

module.exports = router;
