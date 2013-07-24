var nodes = require('./bloom_nodes');

var getStateInfo = function(classBlock) {
  var res = {}, keys, vals;
  classBlock.statements.forEach(function(statement) {
    if (statement.type === 'StateBlock') {
      statement.stateDecls.forEach(function(stateDecl) {
        keys = stateDecl.keys.map(function(key) {
          return key.value;
        });
        vals = stateDecl.vals.map(function(val) {
          return val.value;
        });
        res[stateDecl.name.value] = {
          collectionType: stateDecl.collectionType,
          columns: keys.concat(vals),
          numKeys: keys.length
        };
      });
    }
  });
  return res;
};

var getDependencyInfo = function(bloomStmt) {
  var res = {};
  return res;
};

exports.rewrite = function(ast) {
  ast.traverseWhile(function(node) {
    if (node.type === 'ClassBlock') {
      node.stateInfo = getStateInfo(node);
    } else if (node.type === 'BloomStmt' && node.bloomOp === '<=') {
      node.dependencyInfo = getDependencyInfo(node);
      return false;
    }
    return true;
  });
  return ast;
}
