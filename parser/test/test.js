var assert = require('assert');

describe('parser', function() {
  var parser = require('../bloom_parser');

  it('parse an empty class block', function() {
    var res = parser.parse('class Animal\n end');
    var expected = {
      type: 'program',
      statements: [{
        type: 'class_block',
        statements: []
      }]
    };
    assert.equal(JSON.stringify(res), JSON.stringify(expected))
  });

  it('parse a state block with some tables', function() {
    var res = parser.parse(
      'class Bear\n' +
      '  state do\n' +
      "    table panda\n" +
      "    table koala, [name]\n" +
      "    table polar, [name] => [kills]\n" +
      "    table grizzly, [name, age] => [kills, garbage]\n" +
      '  end\n' +
      'end'
    );
    var expected = {
      type: 'program',
      statements: [{
        type: 'class_block',
        statements: [{
          type: 'state_block',
          stateDecls: [{
            type: 'state_decl',
            collectionType: 'table',
            name: 'panda',
            keys: ['key'],
            vals: ['val']
          },{
            type: 'state_decl',
            collectionType: 'table',
            name: 'koala',
            keys: ['name'],
            vals: []
          },{
            type: 'state_decl',
            collectionType: 'table',
            name: 'polar',
            keys: ['name'],
            vals: ['kills']
          },{
            type: 'state_decl',
            collectionType: 'table',
            name: 'grizzly',
            keys: ['name', 'age'],
            vals: ['kills', 'garbage']
          }]
        }]
      }]
    };
    assert.equal(JSON.stringify(res), JSON.stringify(expected))
  });
});
