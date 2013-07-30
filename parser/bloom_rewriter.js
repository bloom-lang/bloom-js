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
          keys: keys,
          vals: vals
        };
      });
    }
  });
  return res;
};

var consolidateBloomBlocks = function(classBlock) {
  var bloomStmts = [], res = [];
  classBlock.statements.forEach(function(statement) {
    if (statement.type === 'BloomBlock' && !statement.bootstrap) {
      bloomStmts = bloomStmts.concat(statement.statements);
    } else {
      res.push(statement);
    }
  });
  res.push(new nodes.BloomBlock('', bloomStmts));
  return res;
};

var getColumnArray = function(funcExpr, collectionNames) {
  var lastStmt = funcExpr.statements[funcExpr.statements.length - 1].clone(),
    resArr = [];
  lastStmt.traverse(function(node) {
    var i, argIdx = -1;
    if (node.type === 'AttributeRef' && node.obj.type === 'VarName') {
      for (i = 0; i < funcExpr.args.length; i++) {
        if (node.obj.name === funcExpr.args[i].name) {
          argIdx = i;
        }
      }
      if (argIdx !== -1) {
        node.obj = new nodes.VarName(collectionNames[argIdx]);
      }
    }
  });
  return lastStmt.expr;
};

var rewriteQueryExpr = function(qe) {
  var i, primary, fnName, leftCollectionName, rightCollectionName, leftKeysArr,
    rightKeysArr, res = qe;
  if (qe.type === 'AttributeRef' && qe.attribute.name === 'inspected') {
    res = new nodes.SelectExpr(qe.obj.name, new nodes.VarName('*'));
  } else if (qe.type === 'ArrDisplay') {
    res = new nodes.ValuesExpr(qe.arr);
  } else if (qe.type === 'PrimaryBlock') {
    if (qe.primary.type === 'VarName') {
      res = new nodes.SelectExpr(
        qe.primary.name,
        getColumnArray(qe.funcExpr, [qe.primary.name])
      );
    } else if (qe.primary.type === 'Call' &&
               qe.primary.func.type === 'AttributeRef') {
      fnName = qe.primary.func.attribute.name;
      if (fnName === 'pairs') {
        leftCollectionName = qe.primary.func.obj.left.name;
        rightCollectionName = qe.primary.func.obj.right.name;
        leftKeysArr = [];
        rightKeysArr = [];
        for (i = 0; i < qe.primary.args[0].keys.length; i++) {
          leftKeysArr.push(qe.primary.args[0].keys[i]);
          rightKeysArr.push(qe.primary.args[0].vals[i]);
        }
        res = new nodes.JoinExpr(
          leftCollectionName,
          rightCollectionName,
          new nodes.ArrDisplay(leftKeysArr),
          new nodes.ArrDisplay(rightKeysArr),
          getColumnArray(qe.funcExpr, [leftCollectionName, rightCollectionName])
        );
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

var stratifyOps = function(bloomBlock, stateInfo) {
  var i, name, node, parentName, childName, childNode, toVisit = [],
    postOrder = [], ccToVisit = [], ccCounter = -1, comp, num, childNum,
    childComp, topoToVisit = [], collectionNodes = {}, connectedComponents = {},
    opStrata = [];
  for (name in stateInfo) {
    if (stateInfo.hasOwnProperty(name)) {
      collectionNodes[name] = {
        children: {},
        parents: {},
        visited: false,
        visitedTwice: false,
        ccNum: -1
      };
      toVisit.push(name);
    }
  }
  // Populate our collectionNodes with parents and children
  bloomBlock.statements.forEach(function(bloomStmt) {
    var targetNode, spec = bloomStmt.dependencyInfo;
    if (bloomStmt.bloomOp === '<=') {
      targetNode = collectionNodes[spec.target];
      spec.monotonicDeps.forEach(function(parentName) {
        if (targetNode.parents[parentName] !== 'non-monotonic') {
          targetNode.parents[parentName] = 'monotonic';
          collectionNodes[parentName].children[spec.target] = 'monotonic';
        }
      });
      spec.nonMonotonicDeps.forEach(function(parentName) {
        targetNode.parents[parentName] = 'non-monotonic';
        collectionNodes[parentName].children[spec.target] = 'non-monotonic';
      });
    }
  });
  // Run a DFS on the reverse of our dependency graph (following parent pointers
  // rather than children), so by the end of the traversal the end of the
  // postOrder array will be a sink in our original graph
  while (toVisit.length > 0) {
    name = toVisit.pop();
    node = collectionNodes[name];
    if (!node.visited) {
      node.visited = true;
      toVisit.push(name);
      for (parentName in node.parents) {
        if (node.parents.hasOwnProperty(parentName)) {
          if (!collectionNodes[parentName].visited) {
            toVisit.push(parentName);
          }
        }
      }
    } else if (!node.visitedTwice) {
      node.visitedTwice = true;
      postOrder.push(name);
    }
  }
  // Find the connected components of our graph by running a DFS from each node,
  // starting from the end of our postOrder array (processing sinks first)
  while (postOrder.length > 0) {
    name = postOrder.pop();
    if (collectionNodes[name].ccNum === -1) {
      ccCounter++;
      connectedComponents[ccCounter] = {
        stratum: -1,
        members: [],
        children: {},
        numParents: 0
      };
      comp = connectedComponents[ccCounter];
      ccToVisit.push(name);
    }
    while (ccToVisit.length > 0) {
      name = ccToVisit.pop();
      node = collectionNodes[name];
      if (node.ccNum === -1) {
        node.ccNum = ccCounter;
        comp.members.push(name);
        for (childName in node.children) {
          if (node.children.hasOwnProperty(childName)) {
            childNode = collectionNodes[childName];
            if (childNode.ccNum === -1 || childNode.ccNum === ccCounter) {
              if (node.children[childName] === 'non-monotonic') {
                console.error('Error: Non-monotonic loop detected in ' +
                              'collection dependency graph, caused by the ' +
                              'non-monotonic op from %s into %s',
                name, childName);
              }
              if (childNode.ccNum === -1) {
                ccToVisit.push(childName);
              }
            } else {
              if (comp.children[childNode.ccNum] !== 'non-monotonic') {
                if (comp.children[childNode.ccNum] === undefined) {
                  connectedComponents[childNode.ccNum].numParents++;
                }
                comp.children[childNode.ccNum] = node.children[childName];
              }
            }
          }
        }
      }
    }
  }
  // Topologically sort the connected components into layers separated by
  // non-monotonic operations
  for (num in connectedComponents) {
    if (connectedComponents.hasOwnProperty(num) &&
        connectedComponents[num].numParents === 0) {
      connectedComponents[num].stratum = 0;
    topoToVisit.push(num);
    }
  }
  while (topoToVisit.length > 0) {
    num = topoToVisit.pop();
    comp = connectedComponents[num];
    for (childNum in comp.children) {
      if (comp.children.hasOwnProperty(childNum)) {
        childComp = connectedComponents[childNum];
        if (comp.children[childNum] === 'monotonic') {
          childComp.stratum = Math.max(childComp.stratum, comp.stratum);
        } else if (comp.children[childNum] === 'non-monotonic') {
          childComp.stratum = Math.max(childComp.stratum, comp.stratum + 1);
        }
        childComp.numParents--;
        if (childComp.numParents === 0) {
          topoToVisit.push(childNum);
        }
      }
    }
  }
  for (i = 0; i < bloomBlock.statements.length; i++) {
    var ccNum, ccStratum, fullyNonMonotonic, bloomStmt, spec;
    bloomStmt = bloomBlock.statements[i];
    spec = bloomStmt.dependencyInfo;
    if (bloomStmt.bloomOp === '<=') {
      num = collectionNodes[spec.target].ccNum;
      ccStratum = connectedComponents[num].stratum;
      fullyNonMonotonic = spec.monotonicDeps.length === 0 &&
        spec.nonMonotonicDeps.length > 0;
      if (opStrata[ccStratum] === undefined) {
        opStrata[ccStratum] = {
          monotonicTargets: {},
          nonMonotonicTargets: {},
          monotonicOps: [],
          nonMonotonicOps: []
        };
      }
      if (fullyNonMonotonic) {
        opStrata[ccStratum].nonMonotonicOps.push(i);
        opStrata[ccStratum].nonMonotonicTargets[spec.target] = true;
      } else {
        opStrata[ccStratum].monotonicOps.push(i);
        opStrata[ccStratum].monotonicTargets[spec.target] = true;
      }
    }
  };
  return opStrata;
};

exports.rewrite = function(ast) {
  ast.traverse(function(node) {
    if (node.type === 'ClassBlock') {
      node.stateInfo = getStateInfo(node);
      node.statements = consolidateBloomBlocks(node);
    } else if (node.type === 'BloomStmt') {
      node.queryExpr = rewriteQueryExpr(node.queryExpr);
      node.dependencyInfo = getDependencyInfo(node);
    }
  });
  ast.traverse(function(node, opt) {
    if (node.type === 'ClassBlock') {
      return node.stateInfo;
    } else if (node.type === 'BloomBlock') {
      node.opStrata = stratifyOps(node, opt);
    }
    return opt;
  }, true);
  return ast;
}
