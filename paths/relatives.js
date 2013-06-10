var Rx = require('rx');
var util = require('./oldutil');

var evalFunc = function(tables, newTables) {
  var forever = function() {
    return Rx.Observable.never();
  };

  var parent = tables['parent'];
  var sibling = tables['sibling'];
  var cousin = tables['cousin'];
  var related = tables['related'];
  var newParent = newTables['parent'];
  var newSibling = newTables['sibling'];
  var newCousin = newTables['cousin'];
  var newRelated = newTables['related'];

  // sibling(X,Y) :- parent(X,Z), parent(Y,Z), X <> Y.
  newSibling = parent.join(parent, forever, forever, function(p0, p1) {
    if (p0.person2 === p1.person2 && p0.person1 !== p1.person1) {
      return {
        person1: p0.person1,
        person2: p1.person1
      };
    }
    return null;
  }).where(function(s) {
    return s !== null;
  }).concat(newSibling).distinct(JSON.stringify);

  // cousin(X,Y) :- parent(X,Xp), parent(Y,Yp), sibling(Xp,Yp).
  newCousin = parent.join(parent, forever, forever, function(p0, p1){
    return [p0, p1];
  }).join(sibling, forever, forever, function(ps, s) {
    if (ps[0].person2 === s.person1 && ps[1].person2 === s.person2){
      return {
        person1: ps[0].person1,
        person2: ps[1].person1
      };
    }
    return null;
  }).where(function(c) {
    return c !== null;
  }).concat(newCousin).distinct(JSON.stringify);

  // cousin(X,Y) :- parent(X,Xp), parent(Y,Yp), cousin(Xp,Yp).
  newCousin = parent.join(parent, forever, forever, function(p0, p1){
    return [p0, p1];
  }).join(cousin, forever, forever, function(ps, c) {
    if (ps[0].person2 === c.person1 && ps[1].person2 === c.person2){
      return {
        person1: ps[0].person1,
        person2: ps[1].person1
      };
    }
    return null;
  }).where(function(c) {
    return c !== null;
  }).concat(newCousin).distinct(JSON.stringify);

  // related(X,Y) :- sibling(X,Y).
  newRelated = sibling.concat(newRelated).distinct(JSON.stringify);

  // related(X,Y) :- related(X,Z), parent(Y,Z).
  newRelated = related.join(parent, forever, forever, function(r, p) {
    if (r.person2 === p.person2) {
      return {
        person1: r.person1,
        person2: p.person1
      };
    }
    return null;
  }).where(function(r) {
    return r !== null;
  }).concat(newRelated).distinct(JSON.stringify);

  // related(X,Y) :- related(Z,Y), parent(X,Z).
  newRelated = related.join(parent, forever, forever, function(r, p) {
    if (r.person1 === p.person2) {
      return {
        person1: p.person1,
        person2: r.person2
      };
    }
    return null;
  }).where(function(r) {
    return r !== null;
  }).concat(newRelated).distinct(JSON.stringify);

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

var finalTables = util.naiveEval(tables, evalFunc);
console.log('parent');
finalTables['parent'].subscribe(console.log);
console.log('sibling');
finalTables['sibling'].subscribe(console.log);
console.log('cousin');
finalTables['cousin'].subscribe(console.log);
console.log('related');
finalTables['related'].subscribe(console.log);
