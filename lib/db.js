'use strict';

var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');
var dbPath = process.env.DB || __dirname + '/../db/db.json';
var adapter = new FileSync(dbPath);
var db = low(adapter);

// Only the most recent articles per source are needed to detect new ones,
// so the list is capped instead of growing forever (unbounded growth was
// the main driver of the process' rising memory/disk usage over time).
var MAX_ARTICLES_PER_SOURCE = 100;

db.defaults({
  articles: []
}).write();

exports.db = db;

exports.hasSeen = function (source, articleId) {
  return db.get('articles')
    .some({ source: source, articleId: articleId })
    .value();
};

exports.markSeen = function (source, articleId, uuid) {
  var articles = db.get('articles');
  articles.push({ uuid: uuid, articleId: articleId, source: source }).write();

  var forSource = articles.filter({ source: source }).value();
  if (forSource.length > MAX_ARTICLES_PER_SOURCE) {
    var toDrop = forSource.length - MAX_ARTICLES_PER_SOURCE;
    var dropUuids = forSource.slice(0, toDrop).map(function (a) { return a.uuid; });
    db.set('articles', articles.value().filter(function (a) {
      return dropUuids.indexOf(a.uuid) === -1;
    })).write();
  }
};
