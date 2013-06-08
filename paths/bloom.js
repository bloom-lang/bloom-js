var Ix = require('ix');

var Bloom = function() {
  this._collections = {};
  this._ops = [];
};

var prototype = Bloom.prototype;

prototype.addCollection = function(type, name, keys, vals, data) {
  if (keys === undefined) {
    keys = type === 'channel' ? ['@address', 'val'] : ['key'];
  }
  if (vals === undefined) {
    vals = type === 'channel' ? [] : ['val'];
  }
  this._collections[name] = {
    type: type,
    keys: keys,
    vals: vals,
    data: data === undefined ?
      Ix.Enumerable.empty() :
      Ix.Enumerable.fromArray(data)
  };
};

prototype.op = function(type, lhs, rhs) {
  this._ops.push({
    type: type,
    lhs: lhs,
    rhs: rhs
  });
};

prototype.join = function(outerRef, innerRef, outerFn, innerFn, joinFn) {
  var self = this;
  return function() {
    var outerCol = typeof outerRef === 'string' ?
      self._collections[outerRef].data :
      outerRef();
    var innerCol = typeof innerRef === 'string' ?
      self._collections[innerRef].data :
      innerRef();
    return outerCol.join(innerCol, outerFn, innerFn, joinFn);
  };
};

prototype.select = function(colRef, fn) {
  var self = this;
  return function() {
    var collection = typeof colRef === 'string' ?
      self._collections[colRef].data :
      colRef();
    return collection.select(fn);
  };
};

var cmpJSON = function(x, y) {
  return JSON.stringify(x) === JSON.stringify(y);
};

prototype.tick = function() {
  var self = this;
  do {
    for (var name in this._collections) {
      this._collections[name].newData = this._collections[name].data;
    }
    this._ops.forEach(function(op) {
      if (op.type === '<=') {
        self._collections[op.lhs].newData = op.rhs().
          concat(self._collections[op.lhs].newData).
          distinct(cmpJSON);
      }
    });
    var allSame = true;
    for (var name in this._collections) {
      if (this._collections[name].newData.count() !==
          this._collections[name].data.count()) {
        allSame = false;
      }
    }
    for (var name in this._collections) {
      this._collections[name].data = this._collections[name].newData;
    }
  } while (!allSame);

  for (var name in this._collections) {
    console.log(name, this._collections[name].data.toArray());
  }
};

module.exports = Bloom;
