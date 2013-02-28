#!/usr/bin/env node

/*
* SQL API loader
* ===============
*
* node app [environment] 
*
* environments: [development, test, production]
*
*/
var _ = require('underscore');

// sanity check arguments
var ENV = process.argv[2];
if (ENV != 'development' && ENV != 'production') {
  console.error("\n./app [environment]");
  console.error("environments: [development, test, production]");
  process.exit(1);
}

// set Node.js app settings and boot
global.settings  = require(__dirname + '/config/settings');
var env          = require(__dirname + '/config/environments/' + ENV);
_.extend(global.settings, env);
 
// kick off controller
var app = require(global.settings.app_root + '/app/controllers/app');
app.listen(global.settings.node_port, global.settings.node_host);
console.log("CartoDB SQL API listening on " + global.settings.node_host + ':' + global.settings.node_port); 
