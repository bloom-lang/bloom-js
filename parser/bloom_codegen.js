var fs = require('fs');
var parser = require('./bloom_parser');
var ast = require('./bloom_ast');

var genJSONStringify = function(node) {
  console.log(node);
  return ast.call(
    ast.attributeRef(
      ast.varName('JSON'),
      ast.varName('stringify')
    ),
    [node]
  );
};

var genCollectionRef = function(name) {
  return ast.attributeRef(
    ast.varName('this'),
    ast.attributeRef(
      ast.varName('_collections'),
      ast.varName(name)
    )
  );
};

var rewriteSrcCollection = function(bloomStmt) {
  var primary = bloomStmt.srcCollection.primary;
  if (primary.type === 'var_name') {
    bloomStmt.srcCollection.primary = ast.attributeRef(
      genCollectionRef(primary.name),
      ast.varName('select')
    );
  } else if (primary.type === 'call') {
    var funcName = primary.func.attribute.name;
    if (funcName === 'pairs') {
      var leftJoinKeys = [];
      var rightJoinKeys = [];
      primary.args[0].kvPairs.forEach(function(kvPair) {
        leftJoinKeys.push(ast.subscription(
          ast.varName('x'),
          ast.varName(kvPair[0].value)
        ));
        rightJoinKeys.push(ast.subscription(
          ast.varName('y'),
          ast.varName(kvPair[1].value)
        ));
      });
      var leftJoinAst, rightJoinAst;
      if (leftJoinKeys.length > 1 || rightJoinKeys.length > 1) {
        leftJoinAst = genJSONStringify(ast.arrDisplay(leftJoinKeys));
        rightJoinAst = genJSONStringify(ast.arrDisplay(rightJoinKeys));
      } else {
        leftJoinAst = leftJoinKeys[0];
        rightJoinAst = rightJoinKeys[0];
      }
      bloomStmt.srcCollection = ast.call(
        ast.attributeRef(
          genCollectionRef(primary.func.obj.left.name),
          ast.varName('join')
        ),
        [
          genCollectionRef(primary.func.obj.right.name),
          ast.funcExpr(
            [ast.varName('x')],
            [leftJoinAst]
          ),
          ast.funcExpr(
            [ast.varName('y')],
            [rightJoinAst]
          ),
          bloomStmt.srcCollection.funcExpr
        ]
      );
    }
  }
};

var rewriteAst = function(node) {
  if (node.type === 'program') {
    node.statements.forEach(function(statement) {
      rewriteAst(statement);
    });
  } else if (node.type === 'class_block') {
    var tableNames = [];
    node.statements.forEach(function(statement) {
      if (statement.type === 'state_block') {
        statement.stateDecls.forEach(function(stateDecl) {
          tableNames.push(stateDecl.name.value.slice(1, -1));
        });
      }
    });
    node.statements.forEach(function(statement) {
      if (statement.type === 'bloom_block') {
        statement.statements.forEach(function(bloomStmt) {
          bloomStmt.destCollection =
            genCollectionRef(bloomStmt.destCollection.name);
          if (bloomStmt.srcCollection.type === 'primary_block') {
            rewriteSrcCollection(bloomStmt);
          }
        });
      }
    });
  }
};

var inpFile = process.argv[2];
var bloomStr;

if (inpFile !== undefined) {
  bloomStr = fs.readFileSync(inpFile).toString();
} else {
  bloomStr = fs.readFileSync('/dev/stdin').toString();
}

var bloomAst = parser.parse(bloomStr);

rewriteAst(bloomAst);

var jsCode = bloomAst.genCode();

console.log(jsCode);
