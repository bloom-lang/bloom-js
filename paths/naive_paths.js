var contains = function(paths, path) {
  for (var i = 0; i < paths.length; i++) {
    var allSame = true;
    for (var key in paths[i]) {
      if (paths[i][key] !== path[key]) {
        allSame = false;
      }
    }
    if (allSame) {
      return true;
    }
  }
  return false;
}

var naiveEval = function(links) {
  var paths = [];
  do {
    var oldPaths = paths.slice(0);
    for (var i = 0; i < links.length; i++) {
      var linkPath = {
        from: links[i].from,
        to: links[i].to,
        nxt: links[i].to,
        cost: links[i].cost
      };
      if (!contains(paths, linkPath)) {
        paths.push(linkPath);
      }
    }
    for (var i = 0; i < links.length; i++) {
      for (var j = 0; j < oldPaths.length; j++) {
        if (links[i].to === oldPaths[j].from) {
          var nextPath = {
            from: links[i].from,
            to: oldPaths[j].to,
            nxt: links[i].to,
            cost: links[i].cost + oldPaths[j].cost
          };
          if (!contains(paths, nextPath)) {
            paths.push(nextPath);
          }
        }
      }
    }
  } while (paths.length !== oldPaths.length);

  return paths;
};

initLinks = [
  {from: 'a', to: 'b', cost: 1},
  {from: 'a', to: 'b', cost: 4},
  {from: 'b', to: 'c', cost: 1},
  {from: 'c', to: 'd', cost: 1},
  {from: 'd', to: 'e', cost: 1}
]

console.log(naiveEval(initLinks));
