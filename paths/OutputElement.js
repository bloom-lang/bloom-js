var triflow = require('triflow');

var OutputElement = function(attr) {
  this.__super__(attr);
};

OutputElement.prototype.consume = function(data) {
  console.log(data);
};

OutputElement.prototype.consumeEOS = function(source) {
  this._seenEOS = true;
  console.log('EOS');
};

module.exports = triflow.extend(OutputElement, triflow.element.Element);

