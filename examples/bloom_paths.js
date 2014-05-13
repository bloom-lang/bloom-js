var Bloom = require('bloom-runtime');

var Paths = function() {
  this._collections = {};
  this._anonCollections = {};
  this._collectionKeys = {};
  this._bootstrapOps = [];
  this._bootstrapOpStrata = [];
  this._bootstrapRun = false;
  this._bloomOps = [];
  this._bloomOpStrata = [];
  this.initState();
  this.initBloomOps();
};

Paths.prototype = new Bloom();

Paths.prototype.initState = function() {
  this.addCollection('links', 'table', ['from', 'to', 'cost'], []);
  this.addCollection('paths', 'table', ['from', 'to', 'nxt', 'cost'], []);
  this.addCollection('shortest', 'scratch', ['from', 'to'], ['nxt', 'cost']);
};

Paths.prototype.initBloomOps = function() {
  this.op('<=', this._collections.paths,
          this._collections.links.select(function(link) {
    return {
      from: link.from,
      to: link.to,
      nxt: link.to,
      cost: link.cost
    };
  }),
  {
    target: 'paths',
    monotonicDeps: ['links'],
    nonMonotonicDeps: []
  });

 this.op('<=', this._collections['links'],
    [{from: 'a', to: 'b', cost: 1},
      {from: 'a', to: 'b', cost: 4},
      {from: 'b', to: 'c', cost: 1},
      {from: 'c', to: 'd', cost: 1},
      {from: 'd', to: 'e', cost: 1}],
  {
    target: 'links',
    monotonicDeps: [],
    nonMonotonicDeps: []
  });

  this.op('<=', this._collections.paths, this._collections.links.join(
    this._collections.paths,
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
  ),
  {
    target: 'paths',
    monotonicDeps: ['links', 'paths'],
    nonMonotonicDeps: []
  });

  this.op('<=', this._collections.shortest, this._collections.paths.groupBy(
    function(path) { return JSON.stringify([path.from, path.to]); },
    function(path) { return path; },
    function(k, ps) {
      var res;
      var min = Number.POSITIVE_INFINITY;
      ps.forEach(function(p) {
        if (p.cost < min) {
          min = p.cost;
          res = p;
        }
      });
      return res;
    }
  ),
  {
    target: 'shortest',
    monotonicDeps: [],
    nonMonotonicDeps: ['paths']
  });
};

var p = new Paths();

p.tick();
console.log(p._collections.paths._data.toArray());

console.log('-----');

p.op('<=', p._collections.links, [{from: 'e', to: 'f', cost: 1}],
  {
    target: 'links',
    monotonicDeps: [],
    nonMonotonicDeps: []
  });

p.tick();
console.log(p._collections.paths._data.toArray());

console.log('-----');

var q = new Paths();

q.tick();
console.log(q._collections.paths._data.toArray());
