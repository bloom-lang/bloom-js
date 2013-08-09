var Bloom = require('./Bloom');

var Paths = function() {
  this._collections = {};
  this._collectionNodes = {};
  this._connectedComponents = {};
  this._componentSources = {};
  this._ops = [];
  this.initializeState();
  this.initializeOps();
};

Paths.prototype = new Bloom();

Paths.prototype.initializeState = function() {
  this.addCollection('A', 'table', [], []);
  this.addCollection('B', 'table', [], []);
  this.addCollection('C', 'table', [], []);
  this.addCollection('D', 'table', [], []);
  this.addCollection('E', 'table', [], []);
  this.addCollection('F', 'table', [], []);
  this.addCollection('G', 'table', [], []);
  this.addCollection('H', 'table', [], []);
  this.addCollection('I', 'table', [], []);
  this.addCollection('J', 'table', [], []);
  this.addCollection('K', 'table', [], []);
  this.addCollection('L', 'table', [], []);
  this.addCollection('M', 'table', [], []);
  this.addCollection('N', 'table', [], []);
  this.addCollection('O', 'table', [], []);
  this.addCollection('P', 'table', [], []);
  this.addCollection('Q', 'table', [], []);
  this.addCollection('R', 'table', [], []);
  this.addCollection('S', 'table', [], []);
  this.addCollection('T', 'table', [], []);
  this.addCollection('U', 'table', [], []);
  this.addCollection('V', 'table', [], []);
  this.addCollection('W', 'table', [], []);
};

Paths.prototype.initializeOps = function() {
  this.op(':=', null, null,
          { target: 'A', monotomicDeps: ['A','J'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'B', monotomicDeps: ['A','D'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'C', monotomicDeps: [], nonMonotomicDeps: ['A'] });
  this.op(':=', null, null,
          { target: 'C', monotomicDeps: ['I'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'C', monotomicDeps: ['B'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'D', monotomicDeps: ['C'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'E', monotomicDeps: [], nonMonotomicDeps: ['B'] });
  this.op(':=', null, null,
          { target: 'E', monotomicDeps: ['J'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'F', monotomicDeps: ['B','D'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'G', monotomicDeps: ['F'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'H', monotomicDeps: ['F'], nonMonotomicDeps: ['G'] });
  this.op(':=', null, null,
          { target: 'I', monotomicDeps: ['K'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'I', monotomicDeps: [], nonMonotomicDeps: ['J'] });
  this.op(':=', null, null,
          { target: 'L', monotomicDeps: ['M'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'M', monotomicDeps: ['L'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'N', monotomicDeps: [], nonMonotomicDeps: ['L'] });
  this.op(':=', null, null,
          { target: 'N', monotomicDeps: ['P'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'O', monotomicDeps: ['N'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'P', monotomicDeps: ['M','O'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'Q', monotomicDeps: [], nonMonotomicDeps: ['P'] });
  this.op(':=', null, null,
          { target: 'R', monotomicDeps: ['T'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'S', monotomicDeps: ['R'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'T', monotomicDeps: ['S'], nonMonotomicDeps: [] });
  this.op(':=', null, null,
          { target: 'V', monotomicDeps: [], nonMonotomicDeps: ['U'] });
};

var p = new Paths();

p.tick();

