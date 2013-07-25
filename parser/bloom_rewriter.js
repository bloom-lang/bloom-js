var nodes = require('./bloom_nodes');

var rewriteQueryExpr = function(qe) {
  var primary, fnName, leftCollectionName, rightCollectionName, leftKeysArr,
    rightKeysArr, res = qe;
  if (qe.type === 'AttributeRef' && qe.attribute.name === 'inspected') {
    res = new nodes.SelectExpr(qe.obj.name, new nodes.FuncExpr([], []));
  } else if (qe.type === 'ArrDisplay') {
    res = new nodes.ValuesExpr(qe);
  } else if (qe.type === 'PrimaryBlock') {
    if (qe.primary.type === 'VarName') {
      res = new nodes.SelectExpr(qe.primary.name, qe.funcExpr);
    } else if (qe.primary.type === 'Call' &&
               qe.primary.func.type === 'AttributeRef') {
      fnName = qe.primary.func.attribute.name;
      if (fnName === 'pairs') {
        leftCollectionName = qe.primary.func.obj.left.name;
        rightCollectionName = qe.primary.func.obj.right.name;
        leftKeysArr = [];
        rightKeysArr = [];
        qe.primary.args[0].kvPairs.forEach(function(kvPair) {
          leftKeysArr.push(kvPair[0]);
          rightKeysArr.push(kvPair[1]);
        });
        res = new nodes.JoinExpr(leftCollectionName, rightCollectionName,
                                 new nodes.ArrDisplay(leftKeysArr),
                                 new nodes.ArrDisplay(rightKeysArr),
                                 qe.funcExpr);
      } else if (fnName === 'reduce') {
        res = new nodes.ReduceExpr(qe.primary.func.obj.name, qe.primary.args[0],
                                   qe.funcExpr);
      }
    }
  } else if (qe.type === 'Call' && qe.func.type === 'AttributeRef') {
    fnName = qe.func.attribute.name;
    if (fnName === 'group') {
      res = new nodes.GroupExpr(qe.func.obj.name, qe.args[0], qe.args[1]);
    } else if (fnName === 'argmin') {
      res = new nodes.ArgminExpr(qe.func.obj.name, qe.args[0], qe.args[1]);
    }
  }
  return res;
};

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
  var res = {
    target: bloomStmt.targetCollection.name,
    monotonicDeps: [],
    nonMonotonicDeps: []
  };
  if (bloomStmt.queryExpr.monotonic) {
    res.monotonicDeps = bloomStmt.queryExpr.collections();
  } else {
    res.nonMonotonicDeps = bloomStmt.queryExpr.collections();
  }
  return res;
};

exports.rewrite = function(ast) {
  ast.traverseWhile(function(node) {
    if (node.type === 'ClassBlock') {
      node.stateInfo = getStateInfo(node);
    } else if (node.type === 'BloomStmt') {
      node.queryExpr = rewriteQueryExpr(node.queryExpr);
      node.dependencyInfo = getDependencyInfo(node);
      return false;
    }
    return true;
  });
  return ast;
}
