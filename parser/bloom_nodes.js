var Base = function() {
};

var Program = function(statements) {
  this.type = 'Program';
  this.statements = statements;
};
Program.prototype = new Base();
Program.prototype.children = ['statements'];
Program.prototype.genJSCode = function() {
  var res = "var Bloom = require('./Bloom');\n";
  this.statements.forEach(function(statement) {
    res += statement.genJSCode();
  });
  return res;
};
exports.Program = Program;

var ClassBlock = function(name, statements) {
  this.type = 'ClassBlock';
  this.name = name;
  this.statements = statements;
};
ClassBlock.prototype = new Base();
ClassBlock.prototype.children = ['name', 'statements'];
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
exports.ClassBlock = ClassBlock;

var StateBlock = function(stateDecls) {
  this.type = 'StateBlock';
  this.stateDecls = stateDecls;
}
StateBlock.prototype = new Base();
StateBlock.prototype.children = ['stateDecls'];
StateBlock.prototype.genJSCode = function() {
  var res = this.className + '.prototype.initializeState = function() {\n';
  this.stateDecls.forEach(function(stateDecl) {
    res += stateDecl.genJSCode();
  });
  res += '};\n';
  return res;
};
exports.StateBlock = StateBlock;

var BloomBlock = function(name, statements) {
  this.type = 'BloomBlock';
  this.className = '';
  this.name = name === undefined ? '' : name;
  this.statements = statements;
}
BloomBlock.prototype = new Base();
BloomBlock.prototype.children = ['name', 'statements'];
BloomBlock.prototype.genJSCode = function() {
  var res = this.className + '.prototype.initializeOps = function() {\n';
  this.statements.forEach(function(statement) {
    res += statement.genJSCode();
  });
  res += '};\n';
  return res;
};
exports.BloomBlock = BloomBlock;

var StateDecl = function(type, name, keys, vals) {
  this.type = 'StateDecl';
  this.name = name;
  this.type = type;
  this.keys = keys;
  this.vals = vals;
};
StateDecl.prototype = new Base();
StateDecl.prototype.children = ['name', 'type', 'keys', 'vals'];
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
exports.StateDecl = StateDecl;

var BloomStmt = function(destCollection, bloomOp, srcCollection) {
  this.type = 'BloomStmt';
  this.opPrefix = 'this';
  this.bloomOp = bloomOp;
  this.destCollection = destCollection;
  this.srcCollection = srcCollection;
  this.target = null;
  this.monotonicDeps = [];
  this.nonMonotonicDeps = [];
};
BloomStmt.prototype = new Base();
BloomStmt.prototype.children = ['destCollection', 'bloomOp', 'srcCollection'];
BloomStmt.prototype.genJSCode = function() {
  var res = this.opPrefix + '.op(' + this.bloomOp + ',' +
    this.destCollection.genJSCode() + ',' + this.srcCollection.genJSCode()
  + ', { target: ' + this.target + ', monotonicDeps: [';
  this.monotonicDeps.forEach(function(dep) {
    res += dep + ', ';
  });
  if (this.monotonicDeps.length > 0) {
    res = res.slice(0, -2);
  }
  res += '], nonMonotonicDeps: ['
  this.nonMonotonicDeps.forEach(function(dep) {
    res += dep + ', ';
  });
  if (this.nonMonotonicDeps.length > 0) {
    res = res.slice(0, -2);
  }
  res += '] });\n';
  return res;
};
exports.BloomStmt = BloomStmt;

var ExprStmt = function(expr) {
  this.type = 'ExprStmt';
  this.expr = expr;
};
ExprStmt.prototype = new Base();
ExprStmt.prototype.children = ['expr'];
ExprStmt.prototype.genJSCode = function() {
  return this.expr.genJSCode() + ';\n';
};
exports.ExprStmt = ExprStmt;

var AssignmentStmt = function(target, value) {
  this.type = 'AssignmentStmt';
  this.target = target;
  this.value = value;
};
AssignmentStmt.prototype = new Base();
AssignmentStmt.prototype.children = ['target', 'value'];
AssignmentStmt.prototype.genJSCode = function() {
  return 'var ' + this.target.genJSCode() + ' = ' + this.value.genJSCode() +
    ';\n';
};
exports.AssignmentStmt = AssignmentStmt;

var AssignmentStmtNoDecl = function(target, value) {
  this.type = 'AssignmentStmtNoDecl';
  this.target = target;
  this.value = value;
};
AssignmentStmtNoDecl.prototype = new Base();
AssignmentStmtNoDecl.prototype.children = ['target', 'value'];
AssignmentStmtNoDecl.prototype.genJSCode = function() {
  return this.target.genJSCode() + ' = ' + this.value.genJSCode() + ';\n';
};
exports.AssignmentStmtNoDecl = AssignmentStmtNoDecl;

var PutsStmt = function(values) {
  this.type = 'PutsStmt';
  this.values = values;
};
PutsStmt.prototype = new Base();
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
  this.type = 'TernaryExpr';
  this.cond = cond;
  this.thenExpr = thenExpr;
  this.elseExpr = elseExpr;
};
TernaryExpr.prototype = new Base();
TernaryExpr.prototype.children = ['cond', 'thenExpr', 'elseExpr'];
TernaryExpr.prototype.genJSCode = function() {
  return this.cond.genJSCode() + ' ? ' + this.thenExpr.genJSCode() + ' : ' +
    this.elseExpr.genJSCode();
};
exports.TernaryExpr = TernaryExpr;

var Binop = function(left, op, right) {
  this.type = 'Binop';
  this.op = op;
  this.left = left;
  this.right = right;
};
Binop.prototype = new Base();
Binop.prototype.children = ['left', 'op', 'right'];
Binop.prototype.genJSCode = function() {
  return this.left.genJSCode() + ' ' + this.op + ' ' + this.right.genJSCode();
};
exports.Binop = Binop;

var Unop = function(op, value) {
  this.type = 'Unop';
  this.op = op;
  this.value = value;
};
Unop.prototype = new Base();
Unop.prototype.children = ['op', 'value'];
Unop.prototype.genJSCode = function() {
  return this.op + ' ' + this.right;
};
exports.Unop = Unop;

var VarName = function(name) {
  this.type = 'VarName';
  this.name = name;
};
VarName.prototype = new Base();
VarName.prototype.children = ['name'];
VarName.prototype.genJSCode = function() {
  return this.name;
};
exports.VarName = VarName;

var StrLiteral = function(value) {
  this.type = 'StrLiteral';
  this.value = value;
};
StrLiteral.prototype = new Base();
StrLiteral.prototype.children = ['value'];
StrLiteral.prototype.genJSCode = function() {
  return this.value;
};
exports.StrLiteral = StrLiteral;

var NumLiteral = function(value) {
  this.type = 'NumLiteral';
  this.value = value;
};
NumLiteral.prototype = new Base();
NumLiteral.prototype.children = ['value'];
NumLiteral.prototype.genJSCode = function() {
  return this.value;
};
exports.NumLiteral = NumLiteral;

var ArrDisplay = function(arr) {
  this.type = 'ArrDisplay';
  this.arr = arr;
};
ArrDisplay.prototype = new Base();
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
  this.type = 'HashDisplay';
  this.kvPairs = kvPairs;
};
HashDisplay.prototype = new Base();
HashDisplay.prototype.children = ['kvPairs'];
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
  this.type = 'AttributeRef';
  this.obj = obj;
  this.attribute = attribute;
};
AttributeRef.prototype = new Base();
AttributeRef.prototype.children = ['obj', 'attribute'];
AttributeRef.prototype.genJSCode = function() {
  return this.obj.genJSCode() + '.' + this.attribute.genJSCode();
};
exports.AttributeRef = AttributeRef;

var Subscription = function(obj, subscription) {
  this.type = 'Subscription';
  this.obj = obj;
  this.subscription = subscription;
};
Subscription.prototype = new Base();
Subscription.prototype.children = ['obj', 'subscription'];
Subscription.prototype.genJSCode = function() {
  return this.obj.genJSCode() + '[' + this.subscription.genJSCode() + ']';
};
exports.Subscription = Subscription;

var Call = function(func, args) {
  this.type = 'Call';
  this.func = func;
  this.args = args;
};
Call.prototype = new Base();
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
  this.type = 'NewExpr';
  this.name = name;
  this.args = args;
};
NewExpr.prototype = new Base();
NewExpr.prototype.children = ['name', 'args'];
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
  this.type = 'PrimaryBlock';
  this.primary = primary;
  this.funcExpr = funcExpr;
};
PrimaryBlock.prototype = new Base();
PrimaryBlock.prototype.children = ['primary', 'funcExpr'];
PrimaryBlock.prototype.genJSCode = function() {
  return this.primary.genJSCode() + '(' + this.funcExpr.genJSCode() + ')';
};
exports.PrimaryBlock = PrimaryBlock;

var FuncExpr = function(args, statements) {
    this.type = 'FuncExpr';
    this.args = args;
    this.statements = statements;
};
FuncExpr.prototype = new Base();
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
  this.type = 'IfStmt';
  this.cond = cond;
  this.thenStmts = thenStmts;
  this.elseClause = elseClause;
};
IfStmt.prototype = new Base();
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
  this.type = 'ElseIfClause';
  this.cond = cond;
  this.thenStmts = thenStmts;
  this.elseClause = elseClause;
};
ElseIfClause.prototype = new Base();
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
  this.type = 'ElseClause';
  this.statements = statements;
};
ElseClause.prototype = new Base();
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
