var Rx = require('rx');

var a = Rx.Observable.fromArray([{a: 1, b: 2}, {a: 1, b: 3}]);
var b = Rx.Observable.fromArray([{a: 1, b: 3}, {c: 3, d: 4}]);

/*
var res = a.where(function(obj) {
  var contains = false;
  b.contains(obj, function(x, y) {
    return JSON.stringify(x) === JSON.stringify(y);
  }).subscribe(function(c) {
    contains = c;
  });
  console.log(contains);
  return !contains;
})*/

var forever = function() {
  return Rx.Observable.never();
};

var res = a.join(b, forever, forever, function(x, y) {
  if (JSON.stringify(x) === JSON.stringify(y)) {
    return [x, 0];
  }
  return [x, 1];
}).groupBy(//FIGURE OUT SYNTAX
res.subscribe(console.log);
