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

exports.seminaiveEval = function(tables, evalFunc) {
  var dtables = tables;
  do {
    var newTables = tables;
    for (var tname in tables) {
      var evalTables = tables;
      evalTables[tname] = dtables[tname];
      newTables = evalFunc(evalTables, newTables);
    }
    var allEmpty = true;
    for (var tname in tables) {
      dtables[tname] = null;// newTables[tname] `minus` tables[tname];
      // if count is not empty, set allEmpty to false
    }
    tables = newTables;
  } while (!allEmpty);

  return tables;
};
