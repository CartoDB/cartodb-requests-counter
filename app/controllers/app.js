// CartoDB Requests Counter
//
// all requests expect the following URL args:
// - `username` {String} Name of the user whose requests we want to know
// - `date` {String} Date of the requests we want to know. Format %Y-%m-%d
//
// eg. /?username=wsj&date=2012-10-15
//
// * Base code & structure copied from CartoDB SQL API (author Simon Tokumine <simon@vizzuality.com>)
//
var express = require('express')
    , app      = express.createServer(
    express.logger({
        buffer: true,
        format: '[:date] :req[X-Real-IP] \033[90m:method\033[0m \033[36m:req[Host]:url\033[0m \033[90m:status :response-time ms -> :res[Content-Type]\033[0m'
    }))
    , Step            = require('step')
    , RequestsCounter = require(global.settings.app_root + '/app/models/requests_counter')
    , _               = require('underscore');

app.use(express.bodyParser());
app.enable('jsonp callback');

// basic routing
app.all('/', function(req, res) { byDate(req, res) } );
app.all('/requests-last-month', function(req, res) { lastMonth(req, res) } );

function byDate(req, res) {

    // extract input
    var username = req.query.username; // HTTP GET and POST store in different vars
    var date     = req.query.date;

    try {
        if (_.isEmpty(username) || _.isEmpty(date)) throw new Error("You must indicate a valid username & date");

        Step(
            function getRequestsCount(){
                RequestsCounter.by(username, date, this);
            },
            function createResult(err, requests_count){
                var json_result = {
                    'count': parseInt(requests_count || '0')
                };

                return json_result;
            },
            function sendResults(err, out){
                if (err) throw err;

                // return to browser
                res.send(out);
            },
            function errorHandle(err, result){
                console.log('[ERROR]\n' + err);
                handleException(err, res);
            }
        );
    } catch (err) {
        console.log('[ERROR]\n' + err);
        handleException(err, res);
    }
}

function lastMonth(req, res) {

    // extract input
    var username = req.query.username; // HTTP GET and POST store in different vars

    try {
        if (_.isEmpty(username)) throw new Error("You must indicate a valid username");

        Step(
            function createResult(err, requests_count){
                RequestsCounter.inLastMonth(username, this);
            },
            function sendResults(err, out){
                if (err) throw err;

                // return to browser
                res.send(out);
            },
            function errorHandle(err, result){
                console.log('[ERROR]\n' + err);
                handleException(err, res);
            }
        );
    } catch (err) {
        console.log('[ERROR]\n' + err);
        handleException(err, res);
    }
}

function setCrossDomain(res){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
}

function handleException(err, res){
    var msg = (global.settings.environment == 'development') ? {error:[err.message], stack: err.stack} : {error:[err.message]}
    if (global.settings.environment !== 'test'){
        // TODO: email this Exception report
        console.log("EXCEPTION REPORT")
        console.log(err.message);
        console.log(err.stack);
    }

    // allow cross site post
    setCrossDomain(res);

    // if the exception defines a http status code, use that, else a 400
    if (!_.isUndefined(err.http_status)){
        res.send(msg, err.http_status);
    } else {
        res.send(msg, 400);
    }
}

module.exports = app;
