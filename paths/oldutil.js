var Rx = require('rx');

exports.naiveEval = function(tables, evalFunc) {
  do {
    var newTables = evalFunc(tables, tables);
    var allSame = true;
    for (var tname in tables) {
      newTables[tname].count().zip(tables[tname].count(), function(c0, c1) {
        return c0 === c1;
      }).subscribe(function(x) {
        allSame = allSame && x;
      });
    }
    tables = newTables;
  } while (!allSame);

  return tables;
};

var copyObj = function(obj) {
  var res = {};
  for (var k in obj) {
    res[k] = obj[k];
  }
  return res;
};

var setDifference = function(a, b) {
  var forever = function() {
    return Rx.Observable.never();
  };

  var bEmpty = false;
  b.isEmpty().subscribe(function(be) {
    bEmpty = be;
  });
  if (bEmpty) {
    return a;
  }

  return a.join(b, forever, forever, function(x, y) {
    if (JSON.stringify(x) === JSON.stringify(y)) {
      return [x, 0];
    }
    return [x, 1];
  }).groupBy(function(x) {
    return JSON.stringify(x[0]);
  }).selectMany(function(grp) {
    return grp.min();
  }).where(function(x) {
    return x[1] == 1;
  }).select(function(x) {
    return x[0];
  });
};

exports.seminaiveEval = function(tables, evalFunc) {
  var dtables = copyObj(tables);
  var newTables = copyObj(tables);
  do {
    for (var tname in tables) {
      var evalTables = copyObj(tables);
      evalTables[tname] = dtables[tname];
      newTables = evalFunc(evalTables, newTables);
    }
    var allEmpty = true;
    for (var tname in tables) {
      dtables[tname] = setDifference(newTables[tname], tables[tname]);
      dtables[tname].count().subscribe(function(c) {
        if (c !== 0) {
          allEmpty = false;
        }
      })
    }
    tables = copyObj(newTables);
  } while (!allEmpty);

  return tables;
};

