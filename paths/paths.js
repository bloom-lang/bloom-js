var Rx = require('rx');
var util = require('./oldutil');

var evalFunc = function(tables, newTables) {
  var forever = function() {
    return Rx.Observable.never();
  };

  var links = tables['links'];
  var paths = tables['paths'];
  var newLinks = newTables['links'];
  var newPaths = newTables['paths'];

  newPaths = links.select(function(link) {
    return {
      from: link.from,
      to: link.to,
      nxt: link.to,
      cost: link.cost
    };
  }).concat(newPaths).distinct(JSON.stringify);

  newPaths = links.join(paths, forever, forever, function(link, path) {
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
  }).concat(newPaths).distinct(JSON.stringify);

  return {
    links: newLinks,
    paths: newPaths
  };
};

var initLinks = [
  {from: 'a', to: 'b', cost: 1},
  {from: 'a', to: 'b', cost: 4},
  {from: 'b', to: 'c', cost: 1},
  {from: 'c', to: 'd', cost: 1},
  {from: 'd', to: 'e', cost: 1}
]

/*
var initLinks = [
  {from: 'a', to: 'b', cost: 1},
  {from: 'a', to: 'c', cost: 1},
  {from: 'c', to: 'b', cost: 2},
  {from: 'b', to: 'd', cost: 1}
];
*/

var tables = {};
tables['links'] = Rx.Observable.fromArray(initLinks);
tables['paths'] = Rx.Observable.empty();

util.seminaiveEval(tables, evalFunc)['paths'].subscribe(console.log);

