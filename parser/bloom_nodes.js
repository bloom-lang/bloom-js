var getClass = Object.prototype.toString;
var isFunction = function(x) {
  return getClass.call(x) === '[object Function]';
};
var isArray = function(x) {
  return getClass.call(x) === '[object Array]';
};

var Base = function() {};
Base.prototype.kind = 'Base';
Base.prototype.datavars = [];
Base.prototype.children = [];
Base.prototype.traverse = function(fn, opt) {
  var nextOpt, self = this;
  nextOpt = fn(this, opt);
  this.children.forEach(function(childName) {
    var child = self[childName];
    if (isArray(child)) {
      child.forEach(function(el) {
        el.traverse(fn, nextOpt);
      });
    } else {
      child.traverse(fn, nextOpt);
    }
  });
};
Base.prototype.traverseReplace = function(fn) {
  var self = this;
  this.children.forEach(function(childName) {
    var i, child = self[childName];
    if (isArray(child)) {
      for (i = 0; i < child.length; i++) {
        child[i] = child[i].traverseReplace(fn);
      }
    } else {
      self[childName] = child.traverseReplace(fn);
    }
  });
  return fn(this);
};
Base.prototype.clone = function() {
  var self = this, res = new exports[this.type]();
  this.datavars.forEach(function(datavar) {
    res[datavar] = JSON.parse(JSON.stringify(self[datavar]));
  });
  this.children.forEach(function(childName) {
    var child = self[childName];
    if (isArray(child)) {
      res[childName] = [];
      child.forEach(function(el) {
        res[childName].push(el.clone());
      });
    } else {
      res[childName] = child.clone();
    }
  });
  return res;
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
    if (statement.type === 'ClassBlock') {
      res += statement.genSQLCode();
    }
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
ClassBlock.prototype.datavars = ['name', 'stateInfo'];
ClassBlock.prototype.children = ['statements'];
ClassBlock.prototype.genJSCode = function() {
  var self = this, res =
    'var ' + this.name + ' = function() {\n' +
    'this._collections = {};\n' +
    'this._anonCollections = {};\n' +
    'this._collectionKeys = {};\n' +
    'this._bootstrapOps = [];\n' +
    'this._bootstrapOpStrata = [];\n' +
    'this._bootstrapRun = false;\n' +
    'this._bloomOps = [];\n' +
    'this._bloomOpStrata = [];\n' +
    'this.initState();\n' +
    'this.initBootstrapOps();\n' +
    'this.initBloomOps();\n' +
    '};\n' +
    this.name + '.prototype = new Bloom();\n';
  this.statements.forEach(function(statement) {
    res += statement.genJSCode(self.name, self.stateInfo);
  });
  return res;
};
ClassBlock.prototype.genSQLCode = function() {
  var res = '', self = this;
  this.statements.forEach(function(statement) {
    res += statement.genSQLCode(self.stateInfo);
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
StateBlock.prototype.genJSCode = function(className) {
  var res = className + '.prototype.initState = function() {\n';
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

var BloomBlock = function(name, statements) {
  this.name = name === undefined ? '' : name.value;
  this.statements = statements;
  this.bootstrap = name === 'bootstrap';
  this.opStrata = null;
};
BloomBlock.prototype = new Base();
BloomBlock.prototype.type = 'BloomBlock';
BloomBlock.prototype.datavars = ['name', 'bootstrap', 'opStrata'];
BloomBlock.prototype.children = ['statements'];
BloomBlock.prototype.genJSCode = function(className, stateInfo) {
  var i, stratum, res, blockType, self = this;
  blockType = this.bootstrap ? 'Bootstrap' : 'Bloom';
  res = className + '.prototype.init' + blockType +  'Ops = function() {\n';
  for (i = 0; i < this.opStrata.length; i++) {
    stratum = this.opStrata[i];
    if (stratum !== undefined) {
      stratum.nonMonotonicOps.forEach(function(stmtIdx) {
        res += self.statements[stmtIdx].genJSCode(2*i, blockType, stateInfo);
      });
      stratum.monotonicOps.forEach(function(stmtIdx) {
        res += self.statements[stmtIdx].genJSCode(2*i+1, blockType, stateInfo);
      });
    }
  }
  res += '};\n';
  return res;
};
BloomBlock.prototype.genSQLCode = function(stateInfo) {
  var allTargets = {}, collection, res, fnName, self = this;
  fnName = this.bootstrap ? 'bootstrap' : 'bloom';
  res = 'CREATE OR REPLACE FUNCTION ' + fnName + ' (\n) RETURNS VOID AS $$\n' +
    'DECLARE\nall_same BOOL;\nrow_count INT;\nnew_row_count INT;\nBEGIN\n';
  for (collection in allTargets) {
    if (allTargets.hasOwnProperty(collection)) {
      res += 'DROP TABLE IF EXISTS new_' + collection + ';\n';
      res += 'CREATE TABLE new_' + collection + ' AS SELECT * FROM ' +
        collection + ';\n';
    }
  }
  this.opStrata.forEach(function(stratum) {
    for (collection in stratum.nonMonotonicTargets) {
      if (stratum.nonMonotonicTargets.hasOwnProperty(collection)) {
        res += 'CREATE TABLE new_' + collection + ' AS SELECT * FROM ' +
          collection + ';\n';
      }
    }
    stratum.nonMonotonicOps.forEach(function(stmtIdx) {
      res += self.statements[stmtIdx].genSQLCode(stateInfo);
    });
    for (collection in stratum.nonMonotonicTargets) {
      if (stratum.nonMonotonicTargets.hasOwnProperty(collection)) {
        res += 'DROP TABLE ' + collection + ';\n';
        res += 'ALTER TABLE new_' + collection + ' RENAME TO ' + collection +
          ';\n';
      }
    }
    if (stratum.monotonicOps.length > 0) {
      res += 'all_same := FALSE;\nWHILE NOT all_same LOOP\n';
      for (collection in stratum.monotonicTargets) {
        if (stratum.monotonicTargets.hasOwnProperty(collection)) {
          res += 'CREATE TABLE new_' + collection + ' AS SELECT * FROM ' +
            collection + ';\n';
        }
      }
      stratum.monotonicOps.forEach(function(stmtIdx) {
        res += self.statements[stmtIdx].genSQLCode(stateInfo);
      });
      res += 'all_same := TRUE;\n';
      for (target in stratum.monotonicTargets) {
        if (stratum.monotonicTargets.hasOwnProperty(target)) {
          res += 'SELECT INTO row_count COUNT(*) FROM ' + target + ';\n';
          res += 'SELECT INTO new_row_count COUNT(*) FROM new_' + target +
            ';\n';
          res += 'all_same := all_same AND row_count = new_row_count;\n';
          res += 'DROP TABLE ' + target + ';\n';
          res += 'ALTER TABLE new_' + target + ' RENAME TO ' + target + ';\n';
        }
      }
      res += 'END LOOP;\n';
    }
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
StateDecl.prototype.datavars = ['collectionType'];
StateDecl.prototype.children = ['name', 'keys', 'vals'];
StateDecl.prototype.genJSCode = function() {
  var res = 'this.addCollection("' + this.name.genJSCode() + '", "' +
    this.collectionType + '", [';
  this.keys.forEach(function(key) {
    res += '"' + key.genJSCode() + '", ';
  });
  if (this.keys.length > 0) {
    res = res.slice(0, -2);
  }
  res += '], [';
  this.vals.forEach(function(val) {
    res += '"' + val.genJSCode() + '", ';
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
    res += key.genSQLCode() + ',\n';
  });
  this.vals.forEach(function(val) {
    res += val.genSQLCode() + ',\n';
  });
  res += 'PRIMARY KEY (';
  this.keys.forEach(function(key) {
    res += key.symLit.value + ', ';
  });
  if (this.keys.length > 0) {
    res = res.slice(0, -2);
  }
  res += ')\n);\n';
  return res;
};
exports.StateDecl = StateDecl;

var BloomStmt = function(targetCollection, bloomOp, queryExpr) {
  this.bloomOp = bloomOp;
  this.targetCollection = targetCollection;
  this.queryExpr = queryExpr;
  this.dependencyInfo = null;
};
BloomStmt.prototype = new Base();
BloomStmt.prototype.type = 'BloomStmt';
BloomStmt.prototype.datavars = ['bloomOp', 'dependencyInfo'];
BloomStmt.prototype.children = ['targetCollection', 'queryExpr'];
BloomStmt.prototype.genJSCode = function(opStratum, blockType, stateInfo) {
  return 'this.op("' + this.bloomOp + '", "' +
    this.targetCollection.genJSCode() + '", ' +
    this.queryExpr.genJSCode(stateInfo) + ', ' + opStratum + ', "' + blockType +
    '");\n';
};
BloomStmt.prototype.genSQLCode = function(stateInfo) {
  var res, target, targetKeys, targetKeyStr = '';
  target = this.targetCollection.genSQLCode();
  targetKeys = stateInfo[target].keys;
  targetKeys.forEach(function(key) {
    targetKeyStr += key + ', ';
  });
  if (targetKeys.length > 0) {
    targetKeyStr = targetKeyStr.slice(0, -2);
  }
  res = 'DROP TABLE IF EXISTS tmp;\nCREATE TABLE tmp AS SELECT * FROM ' +
    target + ' WHERE 1=0;\n' + this.queryExpr.genSQLCode(stateInfo) +
    'INSERT INTO new_' + target + '\nSELECT DISTINCT ON (' + targetKeyStr +
    ') * from tmp\nWHERE (' + targetKeyStr + ') NOT IN (SELECT ' +
    targetKeyStr + ' FROM new_' + target + ');\n';
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
ExprStmt.prototype.genSQLCode = function() {
  return this.expr.genSQLCode() + ';\n';
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
AssignmentStmtCompound.prototype.datavars = ['op'];
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
Binop.prototype.datavars = ['op'];
Binop.prototype.children = ['left', 'right'];
Binop.prototype.genJSCode = function() {
  return '(' + this.left.genJSCode() + ' ' + this.op + ' ' +
    this.right.genJSCode() + ')';
};
Binop.prototype.genSQLCode = function() {
  return '(' + this.left.genSQLCode() + ' ' + this.op + ' ' +
    this.right.genSQLCode() + ')';
};
exports.Binop = Binop;

var Unop = function(op, value) {
  this.op = op;
  this.value = value;
};
Unop.prototype = new Base();
Unop.prototype.type = 'Unop';
Unop.prototype.datavars = ['op'];
Unop.prototype.children = ['value'];
Unop.prototype.genJSCode = function() {
  return this.op + ' ' + this.value.genJSCode();
};
Unop.prototype.genSQLCode = function() {
  return this.op + ' ' + this.value.genSQLCode();
};
exports.Unop = Unop;

var VarName = function(name) {
  this.name = name;
};
VarName.prototype = new Base();
VarName.prototype.type = 'VarName';
VarName.prototype.datavars = ['name'];
VarName.prototype.genJSCode = function() {
  return this.name;
};
VarName.prototype.genSQLCode = function() {
  return this.name;
};
exports.VarName = VarName;

var StrLiteral = function(raw) {
  this.raw = raw;
  this.value = raw === undefined ? raw : raw.slice(1, -1);
};
StrLiteral.prototype = new Base();
StrLiteral.prototype.type = 'StrLiteral';
StrLiteral.prototype.datavars = ['raw', 'value'];
StrLiteral.prototype.genJSCode = function() {
  return this.raw;
};
StrLiteral.prototype.genSQLCode = function() {
  return this.raw;
};
exports.StrLiteral = StrLiteral;

var SymLiteral = function(value) {
  this.value = value;
};
SymLiteral.prototype = new Base();
SymLiteral.prototype.type = 'SymLiteral';
SymLiteral.prototype.datavars = ['value'];
SymLiteral.prototype.genJSCode = function() {
  return this.value;
};
SymLiteral.prototype.genSQLCode = function() {
  return this.value;
};
exports.SymLiteral = SymLiteral;

var TypedSymLiteral = function(symType, symLit) {
  this.symType = symType;
  this.symLit = symLit;
};
TypedSymLiteral.prototype = new Base();
TypedSymLiteral.prototype.type = 'TypedSymLiteral';
TypedSymLiteral.prototype.datavars = ['symType'];
TypedSymLiteral.prototype.children = ['symLit'];
TypedSymLiteral.prototype.genJSCode = function() {
  return this.symLit.genJSCode();
};
TypedSymLiteral.prototype.genSQLCode = function() {
  return this.symLit.genSQLCode() + ' ' + this.symType;
};
exports.TypedSymLiteral = TypedSymLiteral;

var NumLiteral = function(value) {
  this.value = value;
};
NumLiteral.prototype = new Base();
NumLiteral.prototype.type = 'NumLiteral';
NumLiteral.prototype.datavars = ['value'];
NumLiteral.prototype.genJSCode = function() {
  return this.value;
};
NumLiteral.prototype.genSQLCode = function() {
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
ArrDisplay.prototype.genSQLCode = function() {
  res = '';
  this.arr.forEach(function(val) {
    res += val.genSQLCode() + ', ';
  });
  if (this.arr.length > 0) {
    res = res.slice(0, -2);
  }
  return res;
};
exports.ArrDisplay = ArrDisplay;

var HashDisplay = function(kvPairs) {
  this.keys = kvPairs.map(function(x) { return x[0]; });
  this.vals = kvPairs.map(function(x) { return x[1]; });
};
HashDisplay.prototype = new Base();
HashDisplay.prototype.type = 'HashDisplay';
HashDisplay.prototype.children = ['keys', 'vals'];
HashDisplay.prototype.genJSCode = function() {
  var i, res = '{';
  for (i = 0; i < this.keys.length; i++) {
    res += this.keys[i].genJSCode() + ': ' + this.vals[i].genJSCode() + ', ';
  }
  if (this.keys.length > 0) {
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
AttributeRef.prototype.genSQLCode = function() {
  return this.obj.genSQLCode() + '.' + this.attribute.genSQLCode();
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
Call.prototype.genSQLCode = function() {
  var res, fnStr = JSON.stringify(this.func);
  if (this.SQLMap.hasOwnProperty(fnStr)) {
    return this.SQLMap[fnStr](this.args).genSQLCode();
  }
  res = this.func.genSQLCode() + '(';
  this.args.forEach(function(arg) {
    res += arg.genSQLCode() + ', ';
  });
  if (this.args.length > 0) {
    res = res.slice(0, -2);
  }
  res += ')';
  return res;
};
Call.prototype.SQLMap = {
  '{"obj":{"name":"Math"},"attribute":{"name":"log"}}': function(args) {
    return new exports.Call(new exports.VarName('LN'), args);
  }
}
exports.Call = Call;

var NewExpr = function(name, args) {
  this.name = name;
  this.args = args;
};
NewExpr.prototype = new Base();
NewExpr.prototype.type = 'NewExpr';
NewExpr.prototype.datavars = ['name'];
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
  var i, res = 'function(';
  this.args.forEach(function(arg) {
    res += arg.genJSCode() + ', ';
  });
  if (this.args.length > 0) {
    res = res.slice(0, -2);
  }
  res += ') {\n';
  for (i = 0; i < this.statements.length; i++) {
    if (i === this.statements.length - 1) {
      res += 'return ';
    }
    res += this.statements[i].genJSCode();
  }
  res += '}';
  return res;
};
FuncExpr.prototype.genSQLCode = function() {
  var i, res = '';
  for (i = 0; i < this.statements.length; i++) {
    if (i === this.statements.length - 1) {
      res += 'INSERT INTO tmp ';
    }
    res += this.statements[i].genSQLCode();
  }
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
ElseClause.prototype.children = ['statements'];
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
  var res = '[';
  this.values.forEach(function(value) {
    res += value.genJSCode() + ', ';
  });
  if (this.values.length > 0) {
    res = res.slice(0, -2);
  }
  res += ']';
  return res;
};
ValuesExpr.prototype.genSQLCode = function() {
  var res = 'INSERT INTO tmp\nVALUES\n';
  this.values.forEach(function(value) {
    res += '(' + value.genSQLCode() + '),\n';
  });
  if (this.values.length > 0) {
    res = res.slice(0, -2);
  }
  res += ';\n';
  return res;
};
exports.ValuesExpr = ValuesExpr;

var SelectExpr = function(collectionName, varName, selectCols) {
  this.collectionName = collectionName;
  this.varName = varName;
  this.selectCols = selectCols;
};
SelectExpr.prototype = new QueryExpr();
SelectExpr.prototype.type = 'SelectExpr';
SelectExpr.prototype.collections = function() { return [this.collectionName]; };
SelectExpr.prototype.datavars = ['collectionName', 'varName'];
SelectExpr.prototype.children = ['selectCols'];
SelectExpr.prototype.genJSCode = function(stateInfo) {
  var sCols, self = this, res;
  sCols = this.selectCols.clone();
  sCols.traverseReplace(function(node) {
    var idx;
    if (node.type === 'AttributeRef' && node.obj.type === 'VarName' &&
        node.attribute.type === 'VarName' && node.obj.name === self.varName) {
      idx = stateInfo[self.collectionName].cols.indexOf(node.attribute.name);
      return new exports.Subscription(node.obj, new exports.NumLiteral(idx));
    }
    return node;
  });
  res = 'this._collections.' + this.collectionName + '.select(\nfunction(' +
    this.varName + ') { return ' + sCols.genJSCode() + '; }\n)';
  return res;
};
SelectExpr.prototype.genSQLCode = function(stateInfo) {
  return 'INSERT INTO tmp\nSELECT ' + this.selectCols.genSQLCode() + ' FROM ' +
    this.collectionName + ' ' + this.varName + ';\n';
};
exports.SelectExpr = SelectExpr;

var JoinExpr = function(leftCol, rightCol, leftKeys, rightKeys, leftVar,
                        rightVar, joinCols) {
  this.leftCollectionName = leftCol;
  this.rightCollectionName = rightCol;
  this.leftJoinKeys = leftKeys;
  this.rightJoinKeys = rightKeys;
  this.leftVarName = leftVar;
  this.rightVarName = rightVar;
  this.joinCols = joinCols;
};
JoinExpr.prototype = new QueryExpr();
JoinExpr.prototype.type = 'JoinExpr';
JoinExpr.prototype.collections = function() {
  return [this.leftCollectionName, this.rightCollectionName];
};
JoinExpr.prototype.datavars = ['leftCollectionName', 'rightCollectionName',
  'leftVarName', 'rightVarName'];
JoinExpr.prototype.children = ['leftJoinKeys', 'rightJoinKeys', 'joinCols'];
JoinExpr.prototype.genJSCode = function(stateInfo) {
  var jCols, self = this, res = 'this._collections.' + this.leftCollectionName +
    '.join(\nthis._collections.' + this.rightCollectionName +
    ',\nfunction(x) { return JSON.stringify([';
  this.leftJoinKeys.arr.forEach(function(key) {
    var idx = stateInfo[self.leftCollectionName].cols.indexOf(key.value);
    res += 'x[' + idx + '], ';
  });
  if (this.leftJoinKeys.arr.length > 0) {
    res = res.slice(0, -2);
  }
  res += ']); },\nfunction(y) { return JSON.stringify([';
  this.rightJoinKeys.arr.forEach(function(key) {
    var idx = stateInfo[self.rightCollectionName].cols.indexOf(key.value);
    res += 'y[' + idx + '], ';
  });
  if (this.rightJoinKeys.arr.length > 0) {
    res = res.slice(0, -2);
  }
  jCols = this.joinCols.clone();
  jCols.traverseReplace(function(node) {
    var idx;
    if (node.type === 'AttributeRef' && node.obj.type === 'VarName' &&
        node.attribute.type === 'VarName') {
      if (node.obj.name === self.leftVarName) {
        idx = stateInfo[self.leftCollectionName].cols.
          indexOf(node.attribute.name);
        return new exports.Subscription(node.obj, new exports.NumLiteral(idx));
      } else if (node.obj.name === self.rightVarName) {
        idx = stateInfo[self.rightCollectionName].cols.
          indexOf(node.attribute.name);
        return new exports.Subscription(node.obj, new exports.NumLiteral(idx));
      }
    }
    return node;
  });
  res += ']); },\nfunction(' + this.leftVarName + ', ' + this.rightVarName +
    ') { return ' + jCols.genJSCode() + '; }\n)';
  return res;
}
JoinExpr.prototype.genSQLCode = function(stateInfo) {
  var i, res, ljk = this.leftJoinKeys.arr, rjk = this.rightJoinKeys.arr;
  res = 'INSERT INTO tmp\nSELECT ' + this.joinCols.genSQLCode() + ' FROM ' +
    this.leftCollectionName + ' ' + this.leftVarName + ' INNER JOIN '+
    this.rightCollectionName + ' ' + this.rightVarName;
  if (ljk.length > 0) {
    res += ' ON ';
  }
  for (i = 0; i < ljk.length; i++) {
    res += this.leftVarName + '.' + ljk[i].value + ' = ' + this.rightVarName +
      '.' + rjk[i].value + ', ';
  }
  if (ljk.length > 0) {
    res = res.slice(0, -2);
  }
  res += ';\n';
  return res;
};
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
ReduceExpr.prototype.datavars = ['collectionName'];
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
GroupExpr.prototype.datavars = ['collectionName'];
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
ArgminExpr.prototype.datavars = ['collectionName'];
ArgminExpr.prototype.children = ['groupKeys', 'minKey'];
ArgminExpr.prototype.genJSCode = function(stateInfo) {
  var minIdx, self = this, res = 'this._collections.' + this.collectionName +
    '.groupBy(\nfunction(x) { return JSON.stringify([';
  this.groupKeys.arr.forEach(function(key) {
    var idx = stateInfo[self.collectionName].cols.indexOf(key.value);
    res += 'x[' + idx + '], ';
  });
  if (this.groupKeys.arr.length > 0) {
    res = res.slice(0, -2);
  }
  minIdx = stateInfo[self.collectionName].cols.indexOf(this.minKey.value);
  res += ']); },\nfunction (x) { return x; },\nfunction(k, xs) {\nvar res;\n' +
    'var min = Number.POSITIVE_INFINITY;\nxs.forEach(function(x) {\n' +
    'if (x[' + minIdx + '] < min) {\nmin = x[' + minIdx +
    '];\nres = x;\n}\n});\nreturn res;\n}\n)';
  return res;
};
ArgminExpr.prototype.genSQLCode = function(stateInfo) {
  return 'INSERT INTO tmp\nSELECT * FROM ' + this.collectionName + '\nWHERE (' +
    this.groupKeys.genSQLCode() + ', ' + this.minKey.genSQLCode() +
    ') IN (SELECT ' + this.groupKeys.genSQLCode() + ', MIN(' +
    this.minKey.genSQLCode() + ') FROM ' + this.collectionName + ' GROUP BY ' +
    this.groupKeys.genSQLCode() + ');\n';
};
exports.ArgminExpr = ArgminExpr;
