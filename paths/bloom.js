var BloomCollection = require('./BloomCollection');

var Bloom = function() {
  this._collections = {};
  this._ops = [];
};

var prototype = Bloom.prototype;

prototype.addCollection = function(type, name, keys, vals, initArr) {
  if (keys === undefined) {
    keys = type === 'channel' ? ['@address', 'val'] : ['key'];
  }
  if (vals === undefined) {
    vals = type === 'channel' ? [] : ['val'];
  }
  this._collections[name] = new BloomCollection(name, type, initArr);
  return this._collections[name];
};

prototype.op = function(type, lhs, rhs) {
  this._ops.push({
    type: type,
    lhs: lhs,
    rhs: rhs
  });
};

var cmpJSON = function(x, y) {
  return JSON.stringify(x) === JSON.stringify(y);
};

prototype.tick = function() {
  var self = this;
  do {
    for (var name in this._collections) {
      this._collections[name]._newData = this._collections[name]._data;
    }
    this._ops.forEach(function(op) {
      if (op.type === '<=') {
        op.lhs._newData = op.rhs.getData().
          concat(op.lhs._newData).
          distinct(cmpJSON);
      }
    });
    var allSame = true;
    for (var name in this._collections) {
      if (this._collections[name]._newData.count() !==
          this._collections[name]._data.count()) {
        allSame = false;
      }
    }
    for (var name in this._collections) {
      this._collections[name]._data = this._collections[name]._newData;
    }
  } while (!allSame);

  for (var name in this._collections) {
    console.log(name, this._collections[name]._data.toArray());
  }
};

module.exports = Bloom;
