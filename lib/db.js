'use strict';

var low = require('lowdb');
var FileSync = require('lowdb/adapters/FileSync');
var dbPath = process.env.DB || __dirname + '/../db/db.json';
var adapter = new FileSync(dbPath);
var db = low(adapter);

// Only the most recent articles per source are needed to detect new ones,
// so the list is capped instead of growing forever. lowdb loads the whole
// file into memory and rewrites it whole on every write, so an existing
// db.json left over from before this cap existed (which can be tens/hundreds
// of MB after years of unbounded growth) has to be trimmed immediately at
// startup — pruning only on new inserts would take years to catch up.
var MAX_ARTICLES_PER_SOURCE = 100;

db.defaults({
  articles: []
}).write();

function pruneToLimit() {
  var articles = db.get('articles').value();
  var bySource = {};
  articles.forEach(function (a) {
    (bySource[a.source] = bySource[a.source] || []).push(a);
  });
  var kept = [];
  Object.keys(bySource).forEach(function (source) {
    var list = bySource[source];
    kept = kept.concat(list.length > MAX_ARTICLES_PER_SOURCE ? list.slice(-MAX_ARTICLES_PER_SOURCE) : list);
  });
  if (kept.length !== articles.length) {
    db.set('articles', kept).write();
  }
}

pruneToLimit();

exports.db = db;

exports.hasSeen = function (source, articleId) {
  return db.get('articles')
    .some({ source: source, articleId: articleId })
    .value();
};

exports.markSeen = function (source, articleId, uuid) {
  db.get('articles').push({ uuid: uuid, articleId: articleId, source: source }).write();
  pruneToLimit();
};
