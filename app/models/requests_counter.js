/**
 * this module allows to auth user using an pregenerated api key
 */

var RedisPool = require("./redis_pool")
  , _         = require('underscore')
  , Step      = require('step');

require('date-utils');

module.exports = (function() {

    var me = {
        requests_counter_db: 0
    };

    me.score = function(db, setKey, member, callback) {
        this.redisCmd(db,'ZSCORE', [setKey, member], callback);
    };

    /**
     * Use Redis
     *
     * @param db - redis database number
     * @param redisFunc - the redis function to execute
     * @param redisArgs - the arguments for the redis function in an array
     * @param callback - function to pass results too.
     */
    me.redisCmd = function(db, redisFunc, redisArgs, callback) {

        var redisClient;
        Step(
            function() {
                var step = this;
                RedisPool.acquire(db, function(_redisClient) {
                    redisClient = _redisClient;
                    redisArgs.push(step);
                    redisClient[redisFunc.toUpperCase()].apply(redisClient, redisArgs);
                });
            },
            function releaseRedisClient(err, data) {
                if (err) throw err;
                RedisPool.release(db, redisClient);
                callback(err, data);
            }
        );
    };


    /**
     * Get the requests count for this user/date
     *
     * @param username - Name of the user whose requests count we want to know
     * @param date - Date for which we want to know the requests count
     */
    me.by = function(username, date, callback) {
        return this.score(this.requests_counter_db, "cartodb:requests-count:"+username, date, callback);
    };

    /**
     * Get the requests count in the last 30 days for the specified user
     *
     * @param username - Name of the user whose requests count we want to know
     */
    me.inLastMonth = function(username, callback) {
        var today       = Date.today();
        var start_date  = today.addDays(-30);
        var day         = 0;
        var days_array  = [];
        var total_count = 0;
        var that        = this;

        var getStatsForOneDay = function(){
          if (day >= 30) {
            return callback(null, {'per_day': days_array, 'total': total_count});
          }

          that.score(this.requests_counter_db, "cartodb:requests-count:"+username, start_date.toYMD(), function(err, requests_count){
            requests_count = parseInt(requests_count || '0');
            total_count = total_count + requests_count;
            days_array.push(requests_count);

            start_date.addDays(1);
            day++;

            getStatsForOneDay();
          });
        };
        getStatsForOneDay();

    };

    return me;
})();
