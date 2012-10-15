var redis = require('redis')
  , Pool  = require('generic-pool').Pool;

var RedisPool = {
    // Acquire resource.
    //
    // - `database` {String} redis database name
    // - `callback` {Function} callback to call once acquired. Takes the form
    //   `callback(err, resource)`
    acquire: function(database, callback) {
        if (!this.pools[database]) {
          this.pools[database] = this.makePool(database);            
        }
        this.pools[database].acquire(function(resource) {
          callback(resource);
        });
    },
    
    // Release resource.
    //
    // - `database` {String} redis database name
    // - `resource` {Object} resource object to release
    release: function(database, resource) {
        this.pools[database] && this.pools[database].release(resource);
    },
    
    // Cache of pools by database name.
    pools: {},
    
    // Factory for pool objects.
    makePool: function(database) {
      return Pool({
        name: database,
        create: function(callback){
          var client = redis.createClient(global.settings.redis_port, global.settings.redis_host);          
          client.on('connect', function () {
            client.send_anyway = true;
            client.select(database);  
            client.send_anyway = false;
          });    
          return callback(client);
        },
        destroy: function(client) { 
          return client.quit(); 
        },
        max: global.settings.redisPool, 
        idleTimeoutMillis: global.settings.redisIdleTimeoutMillis,
        reapIntervalMillis: global.settings.redisReapIntervalMillis,
        log: global.settings.redisLog
    });
  }
}


module.exports = RedisPool;