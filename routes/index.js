var express = require('express');
var router = express.Router();
var slackServe = require('../lib/slackService');
/* GET home page. */



module.exports = router;
router.get('/', function(req, res) {
    res.render('location');
});


router.get('/debug', function(req, res) {
    res.render('location');

});