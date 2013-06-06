var assert = require('assert');

describe('parser', function() {
  var parser = require('../bloom_parser');
  it('parse an empty state block', function() {
    var res = parser.parse('state do end');
    var expected = {
      type: 'program',
      blocks: [{
        type: 'state_block',
        stateDecls: []
      }]
    };
    assert.equal(JSON.stringify(res), JSON.stringify(expected))
  });
});
