var Rx = require('rx');
var util = require('./util');

var forever = function() {
  return Rx.Observable.never();
};


var evalFunc = function(tables) {
  var links = tables['links'];
  var paths = tables['paths'];

  var oldPaths = paths;
  paths = links.select(function(link) {
    return {
      from: link.from,
      to: link.to,
      nxt: link.to,
      cost: link.cost
    };
  }).concat(paths).distinct(JSON.stringify);

  paths = links.join(oldPaths, forever, forever, function(link, path) {
    if (link.to !== path.from) {
      return null;
    }
    return {
      from: link.from,
      to: path.to,
      nxt: link.to,
      cost: link.cost + path.cost
    };
  }).where(function(path) {
    return path !== null;
  }).concat(paths).distinct(JSON.stringify);

  var stop = false;
  paths.count().zip(oldPaths.count(), function(c0, c1) {
    return c0 === c1;
  }).subscribe(function(x) {
    stop = x;
  });

  tables['links'] = links;
  tables['paths'] = paths;
  return stop;
};

initLinks = [
  {from: 'a', to: 'b', cost: 1},
  {from: 'a', to: 'b', cost: 4},
  {from: 'b', to: 'c', cost: 1},
  {from: 'c', to: 'd', cost: 1},
  {from: 'd', to: 'e', cost: 1}
]

tables = {}
tables['paths'] = Rx.Observable.empty();
tables['links'] = Rx.Observable.fromArray(initLinks);

util.naiveEval(tables, evalFunc)['paths'].subscribe(console.log);