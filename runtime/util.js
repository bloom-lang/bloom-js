exports.cmpJSON = function(x, y) {
  return JSON.stringify(x) === JSON.stringify(y);
};

exports.cmpObj = function(x, y) {
  var k;
  if (x === undefined || x === null || y === undefined || y === null) {
    return x === y;
  }
  if (Object.keys(x).length !== Object.keys(y).length) {
    return false;
  }
  for (k in x) {
    if (x.hasOwnProperty(k)) {
      if (typeof x[k] === 'object') {
        if (typeof y[k] !== 'object' || !exports.cmpObj(x[k], y[k])) {
          return false;
        }
      } else if (typeof x[k] === 'function') {
        if (typeof y[k] !== 'function' || x[k].toString() !== y[k].toString()) {
          return false;
        }
      } else if (x[k] !== y[k]) {
        return false;
      }
    }
  }
  return true;
};

exports.genCmpArrKeys = function(lenKeys) {
  return function(x, y) {
    var i;
    if (x === undefined || x === null || y === undefined || y === null) {
      return x === y;
    }
    if (x.length !== y.length) {
      return false;
    }
    for (i = 0; i < lenKeys; i++) {
      if (typeof x[i] === 'object') {
        if (typeof y[i] !== 'object' || !exports.cmpObj(x[i], y[i])) {
          return false;
        }
      } else if (typeof x[i] === 'function') {
        if (typeof y[i] !== 'function' || x[i].toString() !== y[i].toString()) {
          return false;
        }
      } else if (x[i] !== y[i]) {
        return false;
      }
    }
    return true;
  };
};
