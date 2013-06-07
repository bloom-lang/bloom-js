var Ix = require('ix');

exports.naiveEval = function(tables, evalFunc) {
  do {
    var newTables = evalFunc(tables, tables);
    var allSame = true;
    for (var tname in tables) {
      if (newTables[tname].count() !== tables[tname].count()) {
        allSame = false;
      }
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

exports.cmpJSON = function(x, y) {
  return JSON.stringify(x) === JSON.stringify(y);
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
      dtables[tname] = newTables[tname].except(tables[tname], exports.cmpJSON);
      if (dtables[tname].count() !== 0) {
        allEmpty = false;
      }
    }
    tables = copyObj(newTables);
  } while (!allEmpty);

  return tables;
};

