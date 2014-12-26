/**
 * Created by Derek Rada on 12/18/2014.
 */

var express = require('express');
var router = express.Router();
var httpHelper = require('../lib/httpHelper');
var userAuth = require('../middleware/userAuthentication');


// match the id first
router.use(userAuth);
router.get('/:id', groupHandler); // /group/id
router.get('/', groupsHandler); // /groups

function groupsHandler(req, res) {

    res.json({ success: true, locations: req.session.groups || []});

};

function groupHandler(req, res) {

    var location = req.params.id;
    var startDate = parseInt(req.query.start) || 0;
    var endDate = parseInt(req.query.end) || 4389369600000;
    var userId = req.session.userId;
    var page = parseInt(req.query.page) || 1;

    var options = {

        userId: userId,
        locationId: location,
        startDate: startDate,
        endDate: endDate,
        page: page
    };

    httpHelper.locationHistory(options, function (results) {

        var ret = JSON.parse(JSON.stringify(options));
        if (results && results.length) {

            var pageStart = (page - 1) * 50;
            var pageEnd = (page) * 50;
            if (pageEnd > results.length) {
                pageEnd = results.length;
            }
            if (pageStart > results.length) {
                pageStart = 0;
            }
            ret.success = true;
            ret.total = results.length;
            ret.data = results.slice(pageStart, pageEnd);
            res.json(ret);

        } else {
            ret.success = false;
            ret.data = [];
            res.json(ret);
        }
    });

};

module.exports = router;

