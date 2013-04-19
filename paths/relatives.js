var Rx = require('rx');
var util = require('./util');

var evalFunc = function(tables, newTables) {
  var parent = tables['parent'];
  var sibling = tables['sibling'];
  var cousin = tables['cousin'];
  var related = tables['related'];
  var newParent = newTables['parent'];
  var newSibling = newTables['sibling'];
  var newCousin = newTables['cousin'];
  var newRelated = newTables['related'];

  return {
    parent: newParent,
    sibling: newSibling,
    cousin: newCousin,
    related: newRelated
  };
};

var initParent = [
  {person1: 'c', person2: 'a'},
  {person1: 'd', person2: 'a'},
  {person1: 'd', person2: 'b'},
  {person1: 'e', person2: 'b'},
  {person1: 'f', person2: 'c'},
  {person1: 'g', person2: 'c'},
  {person1: 'h', person2: 'd'},
  {person1: 'i', person2: 'd'},
  {person1: 'f', person2: 'e'},
  {person1: 'i', person2: 'e'},
  {person1: 'j', person2: 'f'},
  {person1: 'j', person2: 'h'},
  {person1: 'k', person2: 'g'},
  {person1: 'k', person2: 'i'}
];

var tables = {};
tables['parent'] = Rx.Observable.fromArray(initParent);
tables['sibling'] = Rx.Observable.empty();
tables['cousin'] = Rx.Observable.empty();
tables['related'] = Rx.Observable.empty();

var finalTables = util.seminaiveEval(tables, evalFunc);
console.log('parent');
finalTables['parent'].subscribe(console.log);
console.log('sibling');
finalTables['sibling'].subscribe(console.log);
console.log('cousin');
finalTables['cousin'].subscribe(console.log);
console.log('related');
finalTables['related'].subscribe(console.log);
