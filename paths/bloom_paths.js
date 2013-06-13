var Bloom = require('./Bloom');

var Paths = function() {
  this._collections = {};
  this._ops = [];
  this.initializeState();
  this.initializeOps();
};

Paths.prototype = new Bloom();

Paths.prototype.initializeState = function() {
  this.addCollection('links', 'table', ['from', 'to', 'cost'], []);
  this.addCollection('paths', 'table', ['from', 'to', 'nxt', 'cost'], []);
  this.addCollection('anon0', 'init', ['from', 'to', 'cost'], [],
    [{from: 'a', to: 'b', cost: 1},
      {from: 'a', to: 'b', cost: 4},
      {from: 'b', to: 'c', cost: 1},
      {from: 'c', to: 'd', cost: 1},
      {from: 'd', to: 'e', cost: 1}]);
};

Paths.prototype.initializeOps = function() {
  this.op('<=', this._collections['paths'],
          this._collections['links'].select(function(link) {
    return {
      from: link.from,
      to: link.to,
      nxt: link.to,
      cost: link.cost
    };
  }));

 this.op('<=', this._collections['links'], this._collections['anon0']);

  this.op('<=', this._collections['paths'], this._collections['links'].join(
    this._collections['paths'],
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
  ));
};

var p = new Paths();

p.tick();

console.log('-----');

p.addCollection('anon1', 'init', ['from', 'to', 'cost'], [],
                [{from: 'e', to: 'f', cost: 1}]);
p.op('<=', p._collections['links'], p._collections['anon1']);

p.tick();

console.log('-----');

var q = new Paths();

q.tick();
