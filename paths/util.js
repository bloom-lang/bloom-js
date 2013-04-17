var Rx = require('rx');

exports.naiveEval = function(tables, evalFunc) {
  while (!evalFunc(tables));
  return tables;
};
