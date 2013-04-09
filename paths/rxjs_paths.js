var Rx = require('rx');

var forever = function() {
  return Rx.Observable.never();
};

var naiveEval = function(links) {
  var paths = Rx.Observable.empty();
  do {
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
  } while (!stop);

  return paths;
};

initLinks = Rx.Observable.fromArray([
  {from: 'a', to: 'b', cost: 1},
  {from: 'a', to: 'b', cost: 4},
  {from: 'b', to: 'c', cost: 1},
  {from: 'c', to: 'd', cost: 1},
  {from: 'd', to: 'e', cost: 1}
]);

naiveEval(initLinks).subscribe(console.log);
