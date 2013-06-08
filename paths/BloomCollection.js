var Ix = require('ix');

var BloomCollection = function(name, type, initArr) {
  // name is undefined for the temporary collections that we create with
  // genTempCollection to encapsulate transformations
  if (name !== undefined) {
    this._name = name;
    this._type = type;
    this._data = initArr === undefined ?
      Ix.Enumerable.empty() :
      Ix.Enumerable.fromArray(initArr);
    this._newData = Ix.Enumerable.empty();
  }
}

var prototype = BloomCollection.prototype;

var genTempCollection = function(fn) {
  var res = new BloomCollection();
  res.getData = fn;
  return res;
}

prototype.getData = function() {
  return this._data;
};

prototype.select = function(fn) {
  var self = this;
  return genTempCollection(function() {
    return self.getData().select(fn);
  });
};

prototype.join = function(innerCollection, outerFn, innerFn, joinFn) {
  var self = this;
  return genTempCollection(function() {
    return self.getData().join(innerCollection.getData(), outerFn, innerFn,
                               joinFn);
  });
};

module.exports = BloomCollection;
