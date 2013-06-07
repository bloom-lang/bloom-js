var Ix = require('ix');
var util = require('./util');

var evalFunc = function(tables, newTables) {
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
  }).concat(newPaths).distinct(util.cmpJSON);

  newPaths = links.join(
    paths,
    function(link) { return link.to; },
    function(path) { return path.from; },
    function(link, path) {
      return {
        from: link.from,
        to: path.to,
        nxt: link.to,
        cost: link.cost + path.cost
      };
    }
  ).concat(newPaths).distinct(util.cmpJSON);

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
];

/*
   var initLinks = [
   {from: 'a', to: 'b', cost: 1},
   {from: 'a', to: 'c', cost: 1},
   {from: 'c', to: 'b', cost: 2},
   {from: 'b', to: 'd', cost: 1}
   ];
   */

var tables = {};
tables['links'] = Ix.Enumerable.fromArray(initLinks);
tables['paths'] = Ix.Enumerable.empty();

console.log(util.seminaiveEval(tables, evalFunc)['paths'].toArray());

