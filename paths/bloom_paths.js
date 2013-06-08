var Bloom = require('./Bloom');

var Paths = new Bloom();

Paths.addCollection(
  'table', 'links', ['from', 'to', 'cost'], [],
  [
    {from: 'a', to: 'b', cost: 1},
    {from: 'a', to: 'b', cost: 4},
    {from: 'b', to: 'c', cost: 1},
    {from: 'c', to: 'd', cost: 1},
    {from: 'd', to: 'e', cost: 1}
  ]
);
Paths.addCollection('table', 'paths', ['from', 'to', 'nxt', 'cost'], []);

Paths.op('<=', 'paths', Paths.select('links', function(link) {
  return {
    from: link.from,
    to: link.to,
    nxt: link.to,
    cost: link.cost
  };
}));

Paths.op('<=', 'paths', Paths.join(
  'links',
  'paths',
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

Paths.tick();
