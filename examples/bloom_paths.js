var Bloom = require('bloom-runtime');
var ShortestPaths = function() {
  this._collections = {};
  this._anonCollections = {};
  this._collectionKeys = {};
  this._bootstrapOps = [];
  this._bootstrapOpStrata = [];
  this._bootstrapRun = false;
  this._bloomOps = [];
  this._bloomOpStrata = [];
  this.initState();
  this.initBootstrapOps();
  this.initBloomOps();
};
ShortestPaths.prototype = new Bloom();
ShortestPaths.prototype.initState = function() {
  this.addCollection("link", "table", ["src", "dest", "cost"], []);
  this.addCollection("path", "table", ["src", "dest", "nxt", "cost"], []);
  this.addCollection("shortest", "scratch", ["src", "dest"], ["nxt", "cost"]);
};
ShortestPaths.prototype.initBootstrapOps = function() {
  this.op("<=", "link", [['a', 'b', 1], ['a', 'b', 4], ['b', 'c', 1], ['c', 'd', 1], ['d', 'e', 1]], 1, "Bootstrap");
};
ShortestPaths.prototype.initBloomOps = function() {
  this.op("<=", "path", this._collections.link.select(
    function(l) { return [l[0], l[1], l[1], l[2]]; }
  ), 1, "Bloom");
  this.op("<=", "path", this._collections.link.join(
    this._collections.path,
    function(x) { return JSON.stringify([x[1]]); },
    function(y) { return JSON.stringify([y[0]]); },
    function(l, p) {
      return [l[0], p[1], l[1], (l[2] + p[3])];
    }
  ), 1, "Bloom");
  this.op("<=", "shortest", this._collections.path.groupBy(
    function(x) { return JSON.stringify([x[0], x[1]]); },
    function (x) { return x; },
    function(k, xs) {
      var res;
      var min = Number.POSITIVE_INFINITY;
      xs.forEach(function(x) {
        if (x[3] < min) {
          min = x[3];
          res = x;
        }
      });
      return res;
    }
  ), 2, "Bloom");
};
var program = new ShortestPaths();
program.tick();
console.log("links:");
console.log(program._collections.link._data.toArray());
console.log("----");
program.tick();
console.log("links:");
console.log(program._collections.link._data.toArray());
console.log("paths:");
console.log(program._collections.path._data.toArray());
console.log("shortest:");
console.log(program._collections.shortest._data.toArray());
console.log("----");
program.tick();
console.log(program._collections.shortest._data.toArray());

