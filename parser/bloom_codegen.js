var fs = require('fs');
var parser = require('./bloom_parser');
var ast = require('./bloom_ast');

var genJSONStringify = function(node) {
  return ast.call(
    ast.attributeRef(
      ast.varName('JSON'),
      ast.varName('stringify')
    ),
    [node]
  );
};

var genCollectionRef = function(className, name) {
  return ast.attributeRef(
    ast.varName(className),
    ast.attributeRef(
      ast.varName('_collections'),
      ast.varName(name)
    )
  );
};

var getCollectionName = function(node) {
  if (node.type === 'var_name') {
    return node.name;
  } else if (node.type === 'attribute_ref') {
    return node.attribute.name;
  }
  return null;
};

var genIndexedColumnRefs = function(node, stateSpecs) {
  var i, k, attrIndex;
  if (node.type === 'attribute_ref' && node.obj.type === 'var_name' &&
      node.attribute.type === 'var_name' &&
      stateSpecs.hasOwnProperty(node.obj.name)) {
    attrIndex = stateSpecs[node.obj.name].indexOf(node.attribute.name);
    if (attrIndex !== -1) {
      return ast.subscription(
        ast.varName(node.obj.name),
        ast.numLiteral(''+attrIndex)
      );
    }
  }
  for (k in node) {
    if (node[k].type !== undefined) {
      node[k] = genIndexedColumnRefs(node[k], stateSpecs);
    } else if (Object.prototype.toString.call(node[k]) === '[object Array]') {
      for (i = 0; i < node[k].length; i++) {
        node[k][i] = genIndexedColumnRefs(node[k][i], stateSpecs);
      }
    }
  }
  return node;
};

var rewriteFuncExpr = function(collectionNames, funcExpr, stateSpecs) {
  var i, newStateSpecs = {};
  for (i = 0; i < funcExpr.args.length; i++) {
    newStateSpecs[funcExpr.args[i].name] = stateSpecs[collectionNames[i]];
  }
  for (i = 0; i < funcExpr.statements.length; i++) {
    funcExpr.statements[i] = genIndexedColumnRefs(funcExpr.statements[i],
                                                  newStateSpecs);
  }
};

var rewriteBloomStmt = function(bloomStmt, stateSpecs) {
  var target = getCollectionName(bloomStmt.destCollection);
  bloomStmt.destCollection = genCollectionRef(bloomStmt.opPrefix, target);
  bloomStmt.target = JSON.stringify(target);
  if (bloomStmt.srcCollection.type === 'var_name') {
    bloomStmt.srcCollection = genCollectionRef(bloomStmt.opPrefix,
                                               bloomStmt.srcCollection.name);
    bloomStmt.monotonicDeps.push(JSON.stringify(bloomStmt.srcCollection.name));
  } else if (bloomStmt.srcCollection.type === 'call') {
    var func = bloomStmt.srcCollection.func;
    var args = bloomStmt.srcCollection.args;
    if (func.type === 'attribute_ref') {
      var funcName = func.attribute.name;
      if (funcName === 'argmin') {
        var collectionName = getCollectionName(func.obj);
        bloomStmt.nonMonotonicDeps.push(JSON.stringify(collectionName));
        var keyRefs = [];
        args[0].arr.forEach(function(attrRef) {
          keyRefs.push(ast.attributeRef(
            ast.varName(collectionName),
            ast.varName(attrRef.attribute.name)
          ));
        });
        var keyExpr = genIndexedColumnRefs(ast.arrDisplay(keyRefs), stateSpecs);
        var minExpr = genIndexedColumnRefs(
          ast.attributeRef(
            ast.varName(collectionName),
            ast.varName(args[1].attribute.name)
          ),
          stateSpecs
        );
        bloomStmt.srcCollection = ast.call(
          ast.attributeRef(
            genCollectionRef(bloomStmt.opPrefix, collectionName),
            ast.varName('groupBy')
          ),
          [
            ast.funcExpr(
              [ast.varName(collectionName)],
              [ast.exprStmt(genJSONStringify(keyExpr))]
            ),
            ast.funcExpr(
              [ast.varName('x')],
              [ast.exprStmt(ast.varName('x'))]
            ),
            ast.funcExpr(
              [ast.varName('k'), ast.varName('xs')],
              [
                ast.assignmentStmt(
                  ast.varName('res'),
                  ast.varName('undefined')
                ),
                ast.assignmentStmt(
                  ast.varName('min'),
                  ast.attributeRef(
                    ast.varName('Number'),
                    ast.varName('POSITIVE_INFINITY')
                  )
                ),
                ast.exprStmt(ast.call(
                  ast.attributeRef(
                    ast.varName('xs'),
                    ast.varName('forEach')
                  ),
                  [ast.funcExpr(
                    [ast.varName(collectionName)],
                    [
                      ast.ifStmt(
                        ast.binop(minExpr, '<', ast.varName('min')),
                        [
                          ast.assignmentStmtNoDecl(ast.varName('min'), minExpr),
                          ast.assignmentStmtNoDecl(
                            ast.varName('res'),
                            ast.varName(collectionName)
                          )
                        ]
                      ),
                      ast.exprStmt(ast.varName('null'))
                    ]
                  )]
                )),
                ast.exprStmt(ast.varName('res'))
              ]
            )
          ]
        );
      }
    }
  } else if (bloomStmt.srcCollection.type === 'primary_block') {
    var primary = bloomStmt.srcCollection.primary;
    if (primary.type === 'var_name') {
      bloomStmt.monotonicDeps.push(JSON.stringify(primary.name));
      bloomStmt.srcCollection.primary = ast.attributeRef(
        genCollectionRef(bloomStmt.opPrefix, primary.name),
        ast.varName('select')
      );
      rewriteFuncExpr([primary.name], bloomStmt.srcCollection.funcExpr,
                      stateSpecs);
    } else if (primary.type === 'call') {
      var funcName = primary.func.attribute.name;
      if (funcName === 'pairs') {
        var leftJoinKeys = [];
        var rightJoinKeys = [];
        var leftCollectionName = getCollectionName(primary.func.obj.left);
        var rightCollectionName = getCollectionName(primary.func.obj.right);
        bloomStmt.monotonicDeps.push(JSON.stringify(leftCollectionName));
        bloomStmt.monotonicDeps.push(JSON.stringify(rightCollectionName));
        rewriteFuncExpr([leftCollectionName, rightCollectionName],
                        bloomStmt.srcCollection.funcExpr, stateSpecs);
        primary.args[0].kvPairs.forEach(function(kvPair) {
          var leftAttrIndex = stateSpecs[leftCollectionName].
            indexOf(kvPair[0].value.slice(1, -1));
          var rightAttrIndex = stateSpecs[rightCollectionName].
            indexOf(kvPair[1].value.slice(1, -1));
          leftJoinKeys.push(ast.subscription(
            ast.varName('x'),
            ast.numLiteral(''+leftAttrIndex)
          ));
          rightJoinKeys.push(ast.subscription(
            ast.varName('y'),
            ast.numLiteral(''+rightAttrIndex)
          ));
        });
        var leftJoinExpr, rightJoinExpr;
        if (leftJoinKeys.length > 1 || rightJoinKeys.length > 1) {
          leftJoinExpr = genJSONStringify(ast.arrDisplay(leftJoinKeys));
          rightJoinExpr = genJSONStringify(ast.arrDisplay(rightJoinKeys));
        } else {
          leftJoinExpr = leftJoinKeys[0];
          rightJoinExpr = rightJoinKeys[0];
        }
        bloomStmt.srcCollection = ast.call(
          ast.attributeRef(
            genCollectionRef(bloomStmt.opPrefix, leftCollectionName),
            ast.varName('join')
          ),
          [
            genCollectionRef(bloomStmt.opPrefix, rightCollectionName),
            ast.funcExpr(
              [ast.varName('x')],
              [ast.exprStmt(leftJoinExpr)]
            ),
            ast.funcExpr(
              [ast.varName('y')],
              [ast.exprStmt(rightJoinExpr)]
            ),
            bloomStmt.srcCollection.funcExpr
          ]
        );
      }
    }
  }
};

var rewriteClassBlock = function(classBlock, stateSpecs) {
  classBlock.statements.forEach(function(classStmt) {
    if (classStmt.type === 'state_block') {
      classStmt.className = classBlock.name;
    } else if (classStmt.type === 'bloom_block') {
      classStmt.className = classBlock.name;
      classStmt.statements.forEach(function(bloomStmt) {
        rewriteBloomStmt(bloomStmt, stateSpecs[classStmt.className]);
      });
    }
  });
};

var getStateSpecs = function(program) {
  var tableName, tableCols, tableSpecs, classSpecs = {};
  program.statements.forEach(function(programStmt) {
    if (programStmt.type === 'class_block') {
      tableSpecs = {};
      programStmt.statements.forEach(function(classStmt) {
        if (classStmt.type === 'state_block') {
          classStmt.stateDecls.forEach(function(stateDecl) {
            tableName = stateDecl.name.value.slice(1, -1);
            tableCols = [];
            stateDecl.keys.forEach(function(key) {
              tableCols.push(key.value.slice(1, -1));
            });
            stateDecl.vals.forEach(function(val) {
              tableCols.push(val.value.slice(1, -1));
            });
            tableSpecs[tableName] = tableCols;
          });
        }
      });
      classSpecs[programStmt.name] = tableSpecs;
    }
  });
  return classSpecs;
};

var getObjClasses = function(program) {
  var objClasses = {};
  program.statements.forEach(function(programStmt) {
    if (programStmt.type === 'assignment_stmt') {
      if (programStmt.value.type === 'new_expr') {
        objClasses[programStmt.target.name] = programStmt.value.name;
      }
    }
  });
  return objClasses;
};

var rewriteProgram = function(program) {
  var objClasses = getObjClasses(program),
      stateSpecs = getStateSpecs(program);
  program.statements.forEach(function(programStmt) {
    if (programStmt.type === 'class_block') {
      rewriteClassBlock(programStmt, stateSpecs);
    } else if (programStmt.type === 'bloom_stmt') {
      programStmt.opPrefix = programStmt.destCollection.obj.name;
      rewriteBloomStmt(programStmt,
                       stateSpecs[objClasses[programStmt.opPrefix]]);
    }
  });
};

var inpFile = process.argv[2];
var bloomStr;

if (inpFile !== undefined) {
  bloomStr = fs.readFileSync(inpFile).toString();
} else {
  bloomStr = fs.readFileSync('/dev/stdin').toString();
}

var bloomAst = parser.parse(bloomStr);

rewriteProgram(bloomAst);

var jsCode = bloomAst.genJSCode();

console.log(jsCode);
