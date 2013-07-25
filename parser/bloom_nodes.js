var getClass = Object.prototype.toString;
var isFunction = function(x) {
  return getClass.call(x) === '[object Function]';
};
var isArray = function(x) {
  return getClass.call(x) === '[object Array]';
};

var Base = function() {};
Base.prototype.kind = 'Base';
Base.prototype.children = [];
Base.prototype.traverse = function(fn, opt) {
  var nextOpt, children, self = this;
  nextOpt = fn(this, opt)
  if (nextOpt) {
    if (isFunction(this.children)) {
      children = this.children();
    } else if (isArray(this.children)) {
      children = this.children.map(function(childName) {
        return self[childName];
      });
    }
    children.forEach(function(child) {
      if (isArray(child)) {
        child.forEach(function(el) {
          el.traverse(fn, nextOpt);
        });
      } else {
        child.traverse(fn, nextOpt);
      }
    });
  }
};
Base.prototype.genJSCode = function() {
  return '(' + this.type + ' UNIMPLEMENTED)';
};
Base.prototype.genSQLCode = function() {
  return '(' + this.type + ' UNIMPLEMENTED)';
};

var Program = function(statements) {
  this.statements = statements;
};
Program.prototype = new Base();
Program.prototype.type = 'Program';
Program.prototype.children = ['statements'];
Program.prototype.genJSCode = function() {
  var res = "var Bloom = require('./Bloom');\n";
  this.statements.forEach(function(statement) {
    res += statement.genJSCode();
  });
  return res;
};
Program.prototype.genSQLCode = function() {
  var res = '';
  this.statements.forEach(function(statement) {
    res += statement.genSQLCode();
  });
  return res;
};
exports.Program = Program;

var ClassBlock = function(name, statements) {
  this.name = name;
  this.statements = statements;
  this.stateInfo = null;
};
ClassBlock.prototype = new Base();
ClassBlock.prototype.type = 'ClassBlock';
ClassBlock.prototype.children = ['statements'];
ClassBlock.prototype.genJSCode = function() {
  var res =
    'var ' + this.name + ' = function() {\n' +
    'this._collections = {};\n' +
    'this._anonCollections = {};\n' +
    'this._collectionNodes = {};\n' +
    'this._connectedComponents = {};\n' +
    'this._ops = [];\n' +
    'this._opStrata = null;\n' +
    'this.initializeState();\n' +
    'this.initializeOps();\n' +
    '};\n' +
    this.name + '.prototype = new Bloom();\n';
  this.statements.forEach(function(statement) {
    res += statement.genJSCode();
  });
  return res;
};
ClassBlock.prototype.genSQLCode = function() {
  var res = '';
  this.statements.forEach(function(statement) {
    res += statement.genSQLCode();
  });
  return res;
};
exports.ClassBlock = ClassBlock;

var StateBlock = function(stateDecls) {
  this.stateDecls = stateDecls;
};
StateBlock.prototype = new Base();
StateBlock.prototype.type = 'StateBlock';
StateBlock.prototype.children = ['stateDecls'];
StateBlock.prototype.genJSCode = function() {
  var res = this.className + '.prototype.initializeState = function() {\n';
  this.stateDecls.forEach(function(stateDecl) {
    res += stateDecl.genJSCode();
  });
  res += '};\n';
  return res;
};
StateBlock.prototype.genSQLCode = function() {
  var res = '';
  this.stateDecls.forEach(function(stateDecl) {
    res += stateDecl.genSQLCode();
  });
  return res;
};
exports.StateBlock = StateBlock;

var BootstrapBlock = function(statements) {
  this.className = '';
  this.statements = statements;
  this.opStrata = null;
};
BootstrapBlock.prototype = new Base();
BootstrapBlock.prototype.type = 'BootstrapBlock';
BootstrapBlock.prototype.children = ['statements'];
BootstrapBlock.prototype.genJSCode = function() {
  var res = this.className + '.prototype.initializeOps = function() {\n';
  this.statements.forEach(function(statement) {
    res += statement.genJSCode();
  });
  res += '};\n';
  return res;
};
BootstrapBlock.prototype.genSQLCode = function() {
  var res = 'CREATE OR REPLACE FUNCTION iter (\n) RETURNS BOOL AS $$\n' +
    'DECLARE\nall_same BOOL := TRUE;\nrow_count INT;\nnew_row_count INT;\n' +
    'BEGIN\n';
  this.statements.forEach(function(statement) {
    res += statement.genSQLCode();
  });
  res += 'END;\n$$ LANGUAGE plpgsql;\n';
  return res;
};
exports.BootstrapBlock = BootstrapBlock;

var BloomBlock = function(name, statements) {
  this.className = '';
  this.name = name === undefined ? '' : name.value;
  this.statements = statements;
  this.opStrata = null;
};
BloomBlock.prototype = new Base();
BloomBlock.prototype.type = 'BloomBlock';
BloomBlock.prototype.children = ['statements'];
BloomBlock.prototype.genJSCode = function() {
  var res = this.className + '.prototype.initializeOps = function() {\n';
  this.statements.forEach(function(statement) {
    res += statement.genJSCode();
  });
  res += '};\n';
  return res;
};
BloomBlock.prototype.genSQLCode = function() {
  var res = 'CREATE OR REPLACE FUNCTION iter (\n) RETURNS BOOL AS $$\n' +
    'DECLARE\nall_same BOOL := TRUE;\nrow_count INT;\nnew_row_count INT;\n' +
    'BEGIN\n';
  this.statements.forEach(function(statement) {
    res += statement.genSQLCode();
  });
  res += 'END;\n$$ LANGUAGE plpgsql;\n';
  return res;
};
exports.BloomBlock = BloomBlock;

var StateDecl = function(collectionType, name, keys, vals) {
  this.name = name;
  this.collectionType = collectionType;
  this.keys = keys;
  this.vals = vals;
};
StateDecl.prototype = new Base();
StateDecl.prototype.type = 'StateDecl';
StateDecl.prototype.children = ['name', 'keys', 'vals'];
StateDecl.prototype.genJSCode = function() {
  var res = 'this.addCollection(' + this.name.genJSCode() + ', ' + this.type +
    ', [';
  this.keys.forEach(function(key) {
    res += key.genJSCode() + ', ';
  });
  if (this.keys.length > 0) {
    res = res.slice(0, -2);
  }
  res += '], [';
  this.vals.forEach(function(val) {
    res += val.genJSCode() + ', ';
  });
  if (this.vals.length > 0) {
    res = res.slice(0, -2);
  }
  res += ']);\n';
  return res;
};
StateDecl.prototype.genSQLCode = function() {
  var res = 'DROP TABLE IF EXISTS ' + this.name.genJSCode() + ';\n';
  res += 'CREATE TABLE ' + this.name.genJSCode() + ' (\n';
  this.keys.forEach(function(key) {
    res += key.genJSCode() + ',\n';
  });
  this.vals.forEach(function(val) {
    res += val.genJSCode() + ',\n';
  });
  res += 'PRIMARY KEY (';
  this.keys.forEach(function(key) {
    res += key.genJSCode() + ', ';
  });
  if (this.keys.length > 0) {
    res = res.slice(0, -2);
  }
  res += ')\n);\n';
  return res;
};
exports.StateDecl = StateDecl;

var BloomStmt = function(targetCollection, bloomOp, queryExpr) {
  this.opPrefix = 'this';
  this.bloomOp = bloomOp;
  this.targetCollection = targetCollection;
  this.queryExpr = queryExpr;
  this.dependencyInfo = null;
};
BloomStmt.prototype = new Base();
BloomStmt.prototype.type = 'BloomStmt';
BloomStmt.prototype.children = ['targetCollection', 'queryExpr'];
BloomStmt.prototype.genJSCode = function() {
  var res = this.opPrefix + '.op(' + this.bloomOp + ',' +
    this.targetCollection.genJSCode() + ',' + this.queryExpr.genJSCode()
  + ', { target: ' + this.dependencyInfo.target + ', monotonicDeps: [';
  this.dependencyInfo.monotonicDeps.forEach(function(dep) {
    res += dep + ', ';
  });
  if (this.dependencyInfo.monotonicDeps.length > 0) {
    res = res.slice(0, -2);
  }
  res += '], nonMonotonicDeps: ['
  this.dependencyInfo.nonMonotonicDeps.forEach(function(dep) {
    res += dep + ', ';
  });
  if (this.dependencyInfo.nonMonotonicDeps.length > 0) {
    res = res.slice(0, -2);
  }
  res += '] });\n';
  return res;
};
BloomStmt.prototype.genSQLCode = function() {
  var res = 'CREATE TABLE tmp (TODO) AS\n';
  return res;
};
exports.BloomStmt = BloomStmt;

var ExprStmt = function(expr) {
  this.expr = expr;
};
ExprStmt.prototype = new Base();
ExprStmt.prototype.type = 'ExprStmt';
ExprStmt.prototype.children = ['expr'];
ExprStmt.prototype.genJSCode = function() {
  return this.expr.genJSCode() + ';\n';
};
exports.ExprStmt = ExprStmt;

var AssignmentStmt = function(target, value) {
  this.target = target;
  this.value = value;
};
AssignmentStmt.prototype = new Base();
AssignmentStmt.prototype.type = 'AssignmentStmt';
AssignmentStmt.prototype.children = ['target', 'value'];
AssignmentStmt.prototype.genJSCode = function() {
  return 'var ' + this.target.genJSCode() + ' = ' + this.value.genJSCode() +
    ';\n';
};
AssignmentStmt.prototype.genSQLCode = function() {
  return '';
};
exports.AssignmentStmt = AssignmentStmt;

var AssignmentStmtCompound = function(target, value, op) {
  this.target = target;
  this.value = value;
  this.op = op;
};
AssignmentStmtCompound.prototype = new Base();
AssignmentStmtCompound.prototype.type = 'AssignmentStmtCompound';
AssignmentStmtCompound.prototype.children = ['target', 'value'];
AssignmentStmtCompound.prototype.genJSCode = function() {
  return this.target.genJSCode() + ' ' + this.op + ' ' +
    this.value.genJSCode() + ';\n';
};
AssignmentStmtCompound.prototype.genSQLCode = function() {
  return '';
};
exports.AssignmentStmtCompound = AssignmentStmtCompound;

var AssignmentStmtNoDecl = function(target, value) {
  this.target = target;
  this.value = value;
};
AssignmentStmtNoDecl.prototype = new Base();
AssignmentStmtNoDecl.prototype.type = 'AssignmentStmtNoDecl';
AssignmentStmtNoDecl.prototype.children = ['target', 'value'];
AssignmentStmtNoDecl.prototype.genJSCode = function() {
  return this.target.genJSCode() + ' = ' + this.value.genJSCode() + ';\n';
};
exports.AssignmentStmtNoDecl = AssignmentStmtNoDecl;

var PutsStmt = function(values) {
  this.values = values;
};
PutsStmt.prototype = new Base();
PutsStmt.prototype.type = 'PutsStmt';
PutsStmt.prototype.children = ['values'];
PutsStmt.prototype.genJSCode = function() {
  var res = 'console.log(';
  this.values.forEach(function(value) {
    res += value.genJSCode() + ', ';
  });
  if (this.values.length > 0) {
    res = res.slice(0, -2);
  }
  res += ');\n';
  return res;
};
exports.PutsStmt = PutsStmt;

var TernaryExpr = function(cond, thenExpr, elseExpr) {
  this.cond = cond;
  this.thenExpr = thenExpr;
  this.elseExpr = elseExpr;
};
TernaryExpr.prototype = new Base();
TernaryExpr.prototype.type = 'TernaryExpr';
TernaryExpr.prototype.children = ['cond', 'thenExpr', 'elseExpr'];
TernaryExpr.prototype.genJSCode = function() {
  return this.cond.genJSCode() + ' ? ' + this.thenExpr.genJSCode() + ' : ' +
    this.elseExpr.genJSCode();
};
exports.TernaryExpr = TernaryExpr;

var Binop = function(left, op, right) {
  this.op = op;
  this.left = left;
  this.right = right;
};
Binop.prototype = new Base();
Binop.prototype.type = 'Binop';
Binop.prototype.children = ['left', 'right'];
Binop.prototype.genJSCode = function() {
  return this.left.genJSCode() + ' ' + this.op + ' ' + this.right.genJSCode();
};
exports.Binop = Binop;

var Unop = function(op, value) {
  this.op = op;
  this.value = value;
};
Unop.prototype = new Base();
Unop.prototype.type = 'Unop';
Unop.prototype.children = ['op', 'value'];
Unop.prototype.genJSCode = function() {
  return this.op + ' ' + this.right;
};
exports.Unop = Unop;

var VarName = function(name) {
  this.name = name;
};
VarName.prototype = new Base();
VarName.prototype.type = 'VarName';
VarName.prototype.children = [];
VarName.prototype.genJSCode = function() {
  return this.name;
};
exports.VarName = VarName;

var StrLiteral = function(raw) {
  this.raw = raw;
  this.value = raw.slice(1, -1);
};
StrLiteral.prototype = new Base();
StrLiteral.prototype.type = 'StrLiteral';
StrLiteral.prototype.genJSCode = function() {
  return this.raw;
};
exports.StrLiteral = StrLiteral;

var NumLiteral = function(value) {
  this.value = value;
};
NumLiteral.prototype = new Base();
NumLiteral.prototype.type = 'NumLiteral';
NumLiteral.prototype.children = [];
NumLiteral.prototype.genJSCode = function() {
  return this.value;
};
exports.NumLiteral = NumLiteral;

var ArrDisplay = function(arr) {
  this.arr = arr;
};
ArrDisplay.prototype = new Base();
ArrDisplay.prototype.type = 'ArrDisplay';
ArrDisplay.prototype.children = ['arr'];
ArrDisplay.prototype.genJSCode = function() {
  res = '[';
  this.arr.forEach(function(val) {
    res += val.genJSCode() + ', ';
  });
  if (this.arr.length > 0) {
    res = res.slice(0, -2);
  }
  res += ']';
  return res;
};
exports.ArrDisplay = ArrDisplay;

var HashDisplay = function(kvPairs) {
  this.kvPairs = kvPairs;
};
HashDisplay.prototype = new Base();
HashDisplay.prototype.type = 'HashDisplay';
HashDisplay.prototype.children = function() {
  return [].concat.apply([], this.kvPairs);
};
HashDisplay.prototype.genJSCode = function() {
  res = '{';
  this.kvPairs.forEach(function(kvPair) {
    res += kvPair[0].genJSCode() + ': ' + kvPair[1].genJSCode() + ', ';
  });
  if (this.kvPairs.length > 0) {
    res = res.slice(0, -2);
  }
  res += '}';
  return res;
};
exports.HashDisplay = HashDisplay;

var AttributeRef = function(obj, attribute) {
  this.obj = obj;
  this.attribute = attribute;
};
AttributeRef.prototype = new Base();
AttributeRef.prototype.type = 'AttributeRef';
AttributeRef.prototype.children = ['obj', 'attribute'];
AttributeRef.prototype.genJSCode = function() {
  return this.obj.genJSCode() + '.' + this.attribute.genJSCode();
};
exports.AttributeRef = AttributeRef;

var Subscription = function(obj, subscription) {
  this.obj = obj;
  this.subscription = subscription;
};
Subscription.prototype = new Base();
Subscription.prototype.type = 'Subscription';
Subscription.prototype.children = ['obj', 'subscription'];
Subscription.prototype.genJSCode = function() {
  return this.obj.genJSCode() + '[' + this.subscription.genJSCode() + ']';
};
exports.Subscription = Subscription;

var Call = function(func, args) {
  this.func = func;
  this.args = args;
};
Call.prototype = new Base();
Call.prototype.type = 'Call';
Call.prototype.children = ['func', 'args'];
Call.prototype.genJSCode = function() {
  var res = this.func.genJSCode() + '(';
  this.args.forEach(function(arg) {
    res += arg.genJSCode() + ', ';
  });
  if (this.args.length > 0) {
    res = res.slice(0, -2);
  }
  res += ')';
  return res;
};
exports.Call = Call;

var NewExpr = function(name, args) {
  this.name = name;
  this.args = args;
};
NewExpr.prototype = new Base();
NewExpr.prototype.type = 'NewExpr';
NewExpr.prototype.children = ['args'];
NewExpr.prototype.genJSCode = function() {
  res = 'new ' + this.name + '(';
  this.args.forEach(function(arg) {
    res += arg.genJSCode() + ', ';
  });
  if (this.args.length > 0) {
    res = res.slice(0, -2);
  }
  res += ')';
  return res;
};
exports.NewExpr = NewExpr;

var PrimaryBlock = function(primary, funcExpr) {
  this.primary = primary;
  this.funcExpr = funcExpr;
};
PrimaryBlock.prototype = new Base();
PrimaryBlock.prototype.type = 'PrimaryBlock';
PrimaryBlock.prototype.children = ['primary', 'funcExpr'];
PrimaryBlock.prototype.genJSCode = function() {
  return this.primary.genJSCode() + '(' + this.funcExpr.genJSCode() + ')';
};
exports.PrimaryBlock = PrimaryBlock;

var FuncExpr = function(args, statements) {
    this.args = args;
    this.statements = statements;
};
FuncExpr.prototype = new Base();
FuncExpr.prototype.type = 'FuncExpr';
FuncExpr.prototype.children = ['args', 'statements'];
FuncExpr.prototype.genJSCode = function() {
  res = 'function(';
  this.args.forEach(function(arg) {
    res += arg.genJSCode() + ', ';
  });
  if (this.args.length > 0) {
    res = res.slice(0, -2);
  }
  res += ') {\n';
  for (var i = 0; i < this.statements.length; i++) {
    if (i === this.statements.length - 1) {
      res += 'return ';
    }
    res += this.statements[i].genJSCode();
  }
  res += '}';
  return res;
};
exports.FuncExpr = FuncExpr;

var IfStmt = function(cond, thenStmts, elseClause) {
  this.cond = cond;
  this.thenStmts = thenStmts;
  this.elseClause = elseClause;
};
IfStmt.prototype = new Base();
IfStmt.prototype.type = 'IfStmt';
IfStmt.prototype.children = ['cond', 'thenStmts', 'elseClause'];
IfStmt.prototype.genJSCode = function() {
  res = 'if (' + this.cond.genJSCode() + ') {\n';
  this.thenStmts.forEach(function(statement) {
    res += statement.genJSCode();
  });
  res += '}' + this.elseClause.genJSCode();
  return res;
};
exports.IfStmt = IfStmt;

var ElseIfClause = function(cond, thenStmts, elseClause) {
  this.cond = cond;
  this.thenStmts = thenStmts;
  this.elseClause = elseClause;
};
ElseIfClause.prototype = new Base();
ElseIfClause.prototype.type = 'ElseIfClause';
ElseIfClause.prototype.children = ['cond', 'thenStmts', 'elseClause'];
ElseIfClause.prototype.genJSCode = function() {
  res = ' else if (' + this.cond.genJSCode() + ') {\n';
  this.thenStmts.forEach(function(statement) {
    res += statement.genJSCode();
  });
  res += '}' + this.elseClause.genJSCode();
  return res;
};
exports.ElseIfClause = ElseIfClause;

var ElseClause = function(statements) {
  this.statements = statements;
};
ElseClause.prototype = new Base();
ElseClause.prototype.type = 'ElseClause';
ElseClause.prototype.children = ['cond', 'statements'];
ElseClause.prototype.genJSCode = function() {
  if (this.statements === null) {
    return '\n';
  }
  res = ' else {\n';
  this.statements.forEach(function(statement) {
    res += statement.genJSCode();
  });
  return res;
};
exports.ElseClause = ElseClause;

var QueryExpr = function() {};
QueryExpr.prototype = new Base();
QueryExpr.prototype.kind = 'QueryExpr';
QueryExpr.prototype.monotonic = true;
QueryExpr.prototype.collections = function() { return []; };

var ValuesExpr = function(values) {
  this.values = values;
};
ValuesExpr.prototype = new QueryExpr();
ValuesExpr.prototype.type = 'ValuesExpr';
ValuesExpr.prototype.children = ['values'];
ValuesExpr.prototype.genJSCode = function() {
  return 'values(' + this.values.genJSCode() + ')';
};
exports.ValuesExpr = ValuesExpr;

var SelectExpr = function(collectionName, selectFn) {
  this.collectionName = collectionName;
  this.selectFn = selectFn;
};
SelectExpr.prototype = new QueryExpr();
SelectExpr.prototype.type = 'SelectExpr';
SelectExpr.prototype.collections = function() { return [this.collectionName]; };
SelectExpr.prototype.children = ['selectFn'];
SelectExpr.prototype.genJSCode = function() {
  return this.collectionName + '.select(' + this.selectFn.genJSCode() + ')';
};
exports.SelectExpr = SelectExpr;

var JoinExpr = function(leftCol, rightCol, leftKeys, rightKeys, joinFn) {
  this.leftCollectionName = leftCol;
  this.rightCollectionName = rightCol;
  this.leftJoinKeys = leftKeys;
  this.rightJoinKeys = rightKeys;
  this.joinFn = joinFn;
};
JoinExpr.prototype = new QueryExpr();
JoinExpr.prototype.type = 'JoinExpr';
JoinExpr.prototype.collections = function() {
  return [this.leftCollectionName, this.rightCollectionName];
};
JoinExpr.prototype.children = ['leftKeyFn', 'rightKeyFn', 'joinFn'];
JoinExpr.prototype.genJSCode = function() {
  return this.leftCollectionName + '.join(' + this.rightCollectionName + ', ' +
    this.leftJoinKeys.genJSCode() + ', ' + this.rightJoinKeys.genJSCode() +
    ', ' + this.joinFn.genJSCode() + ')';
}
exports.JoinExpr = JoinExpr;

var AggExpr = function() {};
AggExpr.prototype = new QueryExpr();
AggExpr.prototype.monotonic = false;
AggExpr.prototype.collections = function() { return [this.collectionName]; };

var ReduceExpr = function(collectionName, initVal, reduceFn) {
  this.collectionName = collectionName;
  this.initVal = initVal;
  this.reduceFn = reduceFn;
};
ReduceExpr.prototype = new AggExpr();
ReduceExpr.prototype.type = 'ReduceExpr';
ReduceExpr.prototype.children = ['initVal', 'reduceFn'];
ReduceExpr.prototype.genJSCode = function() {
  return this.collectionName + '.reduce(' + this.initVal.genJSCode() + ', ' +
    this.reduceFn.genJSCode() + ')';
};
exports.ReduceExpr = ReduceExpr;

var GroupExpr = function(collectionName, groupKeys, aggCall) {
  this.collectionName = collectionName;
  this.groupKeys = groupKeys;
  this.aggCall = aggCall;
};
GroupExpr.prototype = new AggExpr();
GroupExpr.prototype.type = 'GroupExpr';
GroupExpr.prototype.children = ['groupKeys', 'aggCall'];
GroupExpr.prototype.genJSCode = function() {
  return this.collectionName + '.group(' + this.groupKeys.genJSCode() + ', ' +
    this.aggCall.genJSCode() + ')';
};
exports.GroupExpr = GroupExpr;

var ArgminExpr = function(collectionName, groupKeys, minKey) {
  this.collectionName = collectionName;
  this.groupKeys = groupKeys;
  this.minKey = minKey;
};
ArgminExpr.prototype = new AggExpr();
ArgminExpr.prototype.type = 'ArgminExpr';
ArgminExpr.prototype.children = ['groupKeys', 'minKey'];
ArgminExpr.prototype.genJSCode = function() {
  return this.collectionName + '.argmin(' + this.groupKeys.genJSCode() + ', ' +
    this.minKey.genJSCode() + ')';
};
exports.ArgminExpr = ArgminExpr;
