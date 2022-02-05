'use strict';

var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');
var dbPath = process.env.DB || __dirname + '/../db/db.json';
var adapter = new FileSync(__dirname + '/../db/db.json');
exports.db = low(adapter);
exports.db.defaults({
  articles: []
}).write();
