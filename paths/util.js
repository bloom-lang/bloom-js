exports.cmpJSON = function(x, y) {
  return JSON.stringify(x) === JSON.stringify(y);
};

exports.cmpObj = function(x, y) {
  if (x === undefined || x === null || y === undefined || y === null) {
    return x === y;
  }
  if (Object.keys(x).length !== Object.keys(y).length) {
    return false;
  }
  for (var k in x) {
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
  return true;
};

