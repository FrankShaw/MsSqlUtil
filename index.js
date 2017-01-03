const mssql = require('mssql');

//Set mssql promises to utilize bluebird promises for this library
mssql.Promise = require('bluebird');

module.exports = require('./src/main');