var triflow = require('triflow');

exports.naiveEval = function(tables, evalFunc) {
  do {
    var newTables = evalFunc(tables);
    var allSame = true;
    for (var tname in tables) {
      if (tables[tname].count() !== newTables[tname].count()) {
        allSame = false;
        break;
      }
    }
    tables = newTables;
  } while (!allSame);

  return tables;
};

