var Ix = require('ix');
var BloomCollection = require('./BloomCollection');
var cmpObj = require('./util').cmpObj;

var Bloom = function() { };

var prototype = Bloom.prototype;

prototype.addCollection = function(name, type, keys, vals) {
  if (keys === undefined) {
    keys = type === 'channel' ? ['@address', 'val'] : ['key'];
  }
  if (vals === undefined) {
    vals = type === 'channel' ? [] : ['val'];
  }
  this._collections[name] = new BloomCollection(name, type);
  return this._collections[name];
};

prototype.genCollectionName = function() {
  var count = 0;
  while ('anon' + count in this._collections) {
    count++;
  }
  return 'anon' + count;
};

prototype.addCollectionFromArray = function(arr) {
  var name = this.genCollectionName();
  this._collections[name] = new BloomCollection(name, 'init', arr);
  return this._collections[name];
};

prototype.op = function(type, lhs, rhs) {
  if (rhs instanceof Array) {
    rhs = this.addCollectionFromArray(rhs);
  }
  this._ops.push({
    type: type,
    lhs: lhs,
    rhs: rhs
  });
};

/*
// Naive Evaluation
prototype.tick = function() {
  var self = this;
  do {
    for (var name in this._collections) {
      this._collections[name]._newData = this._collections[name]._data;
    }
    this._ops.forEach(function(op) {
      if (op.type === '<=') {
        op.lhs._newData = Ix.Enumerable.fromArray(
          op.rhs.getData().union(op.lhs._newData, cmpObj).toArray()
        );
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
};*/

// Seminaive Evaluation
prototype.tick = function() {
  var self = this;
  do {
    this._ops.forEach(function(op) {
      if (op.type === '<=') {
        op.lhs._newData = Ix.Enumerable.fromArray(
          op.rhs.getDelta().union(op.lhs._newData, cmpObj).toArray()
        );
      }
    });
    var allEmpty = true;
    for (var name in this._collections) {
      var collection = this._collections[name];
      collection._data = Ix.Enumerable.fromArray(
        collection._data.concat(collection._delta).toArray()
      );
      collection._delta = Ix.Enumerable.fromArray(
        collection._newData.except(collection._data, cmpObj).toArray()
      );
      if (collection._delta.count() !== 0) {
        allEmpty = false;
      }
    }
  } while (!allEmpty);

  for (var name in this._collections) {
    console.log(name, this._collections[name]._data.toArray());
  }
};

module.exports = Bloom;

