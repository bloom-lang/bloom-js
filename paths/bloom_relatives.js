var Bloom = require('./Bloom');

var Relatives = new Bloom();

var parent = Relatives.addCollection(
  'parent', 'table', ['person1', 'person2'], [],
  [
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
  ]
);

var sibling = Relatives.addCollection('sibling', 'table',
                                      ['person1', 'person2'], []);

var cousin = Relatives.addCollection('cousin', 'table',
                                      ['person1', 'person2'], []);

var related = Relatives.addCollection('related', 'table',
                                      ['person1', 'person2'], []);

// sibling(X,Y) :- parent(X,Z), parent(Y,Z), X <> Y.
Relatives.op('<=', sibling, parent.join(
  parent,
  function(p) { return p.person2; },
  function(p) { return p.person2; },
  function(p0, p1) {
    return {
      person1: p0.person1,
      person2: p1.person1
    };
  }
).where(function(p) {
  return p.person1 !== p.person2;
}));

// cousin(X,Y) :- parent(X,Xp), parent(Y,Yp), sibling(Xp,Yp).
Relatives.op('<=', cousin, parent.join(
  sibling,
  function(p) { return p.person2; },
  function(s) { return s.person1; },
  function(p, s) {
    return {
      person1: p.person1,
      person2: s.person2
    };
  }
).join(
  parent,
  function(x) { return x.person2; },
  function(p) { return p.person2; },
  function(x, p) {
    return {
      person1: x.person1,
      person2: p.person1
    };
  }
));

// cousin(X,Y) :- parent(X,Xp), parent(Y,Yp), cousin(Xp,Yp).
Relatives.op('<=', cousin, parent.join(
  cousin,
  function(p) { return p.person2; },
  function(c) { return c.person1; },
  function(p, c) {
    return {
      person1: p.person1,
      person2: c.person2
    };
  }
).join(
  parent,
  function(x) { return x.person2; },
  function(p) { return p.person2; },
  function(x, p) {
    return {
      person1: x.person1,
      person2: p.person1
    };
  }
));


// related(X,Y) :- sibling(X,Y).
Relatives.op('<=', related, sibling);

// related(X,Y) :- related(X,Z), parent(Y,Z).
Relatives.op('<=', related, related.join(
  parent,
  function(r) { return r.person2; },
  function(p) { return p.person2; },
  function(r, p) {
    return {
      person1: r.person1,
      person2: p.person1
    };
  }
));

// related(X,Y) :- related(Z,Y), parent(X,Z).
Relatives.op('<=', related, related.join(
  parent,
  function(r) { return r.person1; },
  function(p) { return p.person2; },
  function(r, p) {
    return {
      person1: p.person1,
      person2: r.person2
    };
  }
));

Relatives.tick();

