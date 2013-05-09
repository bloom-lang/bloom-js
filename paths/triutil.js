var net = require('net');
var triflow = require('triflow');
var TableElement = require('./TableElement');

exports.sendMessage = function(m) {
  var dest = m[1]
  var destIp = dest.split(':')[0];
  var destPort = parseInt(dest.split(':')[1]);
  var c = net.createConnection({port: destPort, host: destIp}, function() {
    c.write(JSON.stringify(m), function() {
      c.end();
    });
  });
  c.on('error', console.log);
};

exports.currentTimeStr = function() {
  var time = new Date();
  var hours = time.getHours();
  var minutes = time.getMinutes();
  var seconds = time.getSeconds();

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  var res = hours+':'+minutes+':'+seconds;
  return res;
};

exports.naiveEval = function(tables, evalFunc) {
  do {
    var newTables = evalFunc(tables);
    var allSame = true;
    for (var tname in tables) {
      tables[tname].wire([newTables[tname]]);
      tables[tname].go();
      if (tables[tname].count() !== newTables[tname].count()) {
        allSame = false;
      }
    }
    tables = newTables;
  } while (!allSame);

  return tables;
};

var copyTables = function(tables) {
  var res = {};
  for (var tname in tables) {
    res[tname] = new TableElement();
    tables[tname].wire([res[tname]]);
    tables[tname].go();
    tables[tname].stopConsumer(res[tname]);
  }
  return res;
};

var setDifference = function(a, b) {
  var res = new TableElement();
  for (var i = 0; i < a._data.length; i++) {
    if (!b._dataDict.get(a._data[i])) {
      res.consume(a._data[i]);
    }
  }
  res.consumeEOS();
  return res;
};

// Set difference method
exports.seminaiveEval = function(tables, evalFunc) {
  var dtables = copyTables(tables);
  do {
    var oldTables = copyTables(tables);
    for (var tname in tables) {
      var evalTables = copyTables(oldTables);
      evalTables[tname] = dtables[tname];
      var incrTables = evalFunc(evalTables);
      for (var iname in incrTables) {
        incrTables[iname].wire([tables[iname]])
        incrTables[iname].go();
      }
    }
    var allEmpty = true;
    for (var tname in tables) {
      dtables[tname] = setDifference(tables[tname], oldTables[tname]);
      if (dtables[tname].count() > 0) {
        allEmpty = false;
      }
    }
  } while (!allEmpty);

  return tables;
}

exports.stratExec = function(tables, evalFuncs) {
  for (var i = 0; i < evalFuncs.length; i++) {
    tables = exports.seminaiveEval(tables, evalFuncs[i]);
  }

  return tables;
}

/*
// O(2^n) delta evaluation method
exports.seminaiveEval = function(tables, evalFunc) {
  var tnames = Object.keys(tables).sort();
  var deltaTables = {};
  var newTables = {};
  for (var i = 0; i < tnames.length; i++) {
    var tname = tnames[i];
    deltaTables[tname] = tables[tname];
    newTables[tname] = new TableElement();
  }

  do {
    var newDeltaTables = {};
    for (var i = 0; i < tnames.length; i++) {
      newDeltaTables[tnames[i]] = new TableElement();
    }

    for (var i = 1; i < Math.pow(2, tnames.length); i++) {
      var evalTables = {};
      var allDeltasFound = true;

      for (var j = 0; j < tnames.length; j++) {
        var tname = tnames[j];
        var thisDelta = (i >> j) & 1;
        if (thisDelta) {
          if (deltaTables[tname].count() > 0) {
            evalTables[tname] = deltaTables[tname];
          } else {
            allDeltasFound = false;
            break;
          }
        } else {
          evalTables[tname] = newTables[tname];
        }
      }

      if (!allDeltasFound) {
        continue;
      }
      var incrTables = evalFunc(evalTables);
      for (var j = 0; j < tnames.length; j++) {
        var tname = tnames[j];
        incrTables[tname].wire([newDeltaTables[tname]]);
        incrTables[tname].go();
      }
    }

    for (var i = 0; i < tnames.length; i++) {
      var tname = tnames[i];
      deltaTables[tname].wire([newTables[tname]]);
      deltaTables[tname].go();
    }
    deltaTables = newDeltaTables;

    var newDeltas = false;
    for (var i = 0; i < tnames.length; i++) {
      if (deltaTables[tnames[i]].count() > 0) {
        newDeltas = true;
        break;
      }
    }
  } while (newDeltas);

  return newTables;
};
*/

