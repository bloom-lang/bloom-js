var triflow = require('triflow');

var TableElement = function(attr) {
  this.__super__(attr);
  this._data = [];
  this._dataDict = new triflow.MultiKeyDictionary();
};

TableElement.prototype.go = function() {
  for (var i = 0; i < this._data.length; i++) {
    this.produce(this._data[i]);
  }
  if (this._seenEOS) {
    this.produceEOS();
  }
};

TableElement.prototype.count = function() {
  return this._data.length;
};

TableElement.prototype.consume = function(data) {
  if (!this._dataDict.get(data)) {
    this._dataDict.set(data, true);
    this._data.push(data);
  }
};

TableElement.prototype.consumeEOS = function(source) {
  this._seenEOS = true;
};

module.exports = triflow.extend(TableElement, triflow.element.Element);

