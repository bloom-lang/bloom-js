var Ix = require('ix');
var cmpObj = require('./util').cmpObj;

var BloomCollection = function(name, type, initArr) {
  // name is undefined for the temporary collections that we create with
  // genTempCollection to encapsulate transformations
  if (name !== undefined) {
    this._name = name;
    this._type = type;
    this._data = Ix.Enumerable.empty();
    this._newData = Ix.Enumerable.empty();
    this._delta = initArr === undefined ?
      Ix.Enumerable.empty() :
      Ix.Enumerable.fromArray(initArr);
  }
}

var prototype = BloomCollection.prototype;

var genTempCollection = function(dataFn, deltaFn) {
  var res = new BloomCollection();
  res.getData = dataFn;
  res.getDelta = deltaFn;
  return res;
}

prototype.getData = function() {
  return this._data;
};

prototype.getDelta = function() {
  return this._delta;
};

prototype.select = function(fn) {
  var self = this;
  return genTempCollection(function() {
    return self.getData().select(fn);
  }, function() {
    return self.getDelta().select(fn);
  });
};

prototype.join = function(innerCollection, outerFn, innerFn, joinFn) {
  var self = this;
  return genTempCollection(function() {
    return self.getData().join(innerCollection.getData(), outerFn,
                                    innerFn, joinFn);
  }, function() {
    var a = self.getDelta().join(innerCollection.getDelta(), outerFn,
                                 innerFn, joinFn);
    var b = self.getDelta().join(innerCollection.getData(), outerFn,
                                 innerFn, joinFn);
    var c = self.getData().join(innerCollection.getDelta(), outerFn,
                                innerFn, joinFn);
    return a.union(b, cmpObj).union(c, cmpObj);
  });
};

module.exports = BloomCollection;
