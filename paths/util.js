var Rx = require('rx');

exports.naiveEval = function(tables, evalFunc) {
  do {
    newTables = evalFunc(tables);
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

