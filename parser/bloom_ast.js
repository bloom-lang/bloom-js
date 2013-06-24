exports.program = function(statements) {
  return {
    type: 'program',
    statements: statements,
    genCode: function() {
      var res = "var Bloom = require('./Bloom');\n";
      this.statements.forEach(function(statement) {
        res += statement.genCode();
      });
      return res;
    }
  };
};

exports.classBlock = function(name, statements) {
  return {
    type: 'class_block',
    name: name,
    statements: statements,
    genCode: function() {
      var res =
        'var ' + this.name + ' = function() {\n' +
          'this._collections = {};\n' +
          'this._anonCollections = {};\n' +
          'this._collectionNodes = {};\n' +
          'this._connectedComponents = {};\n' +
          'this._ops = [];\n' +
          'this.initializeState();\n' +
          'this.initializeOps();\n' +
        '};\n' +
        this.name + '.prototype = new Bloom();\n';
      this.statements.forEach(function(statement) {
        res += statement.genCode();
      });
      return res;
    }
  };
};

exports.stateBlock = function(stateDecls) {
  return {
    type: 'state_block',
    className: '',
    stateDecls: stateDecls,
    genCode: function() {
      var res = this.className + '.prototype.initializeState = function() {\n';
      this.stateDecls.forEach(function(stateDecl) {
        res += stateDecl.genCode();
      });
      res += '};\n';
      return res;
    }
  };
};

exports.bloomBlock = function(name, statements) {
  return {
    type: 'bloom_block',
    className: '',
    name: name === undefined ? '' : name,
    statements: statements,
    genCode: function() {
      var res = this.className + '.prototype.initializeOps = function() {\n';
      this.statements.forEach(function(statement) {
        res += statement.genCode();
      });
      res += '};\n';
      return res;
    }
  };
};

exports.stateDecl = function(type, name, keys, vals) {
  return {
    type: 'state_decl',
    name: name,
    type: type,
    keys: keys,
    vals: vals,
    genCode: function() {
      var res = 'this.addCollection(' + this.name.genCode() + ', ' + this.type +
        ', [';
      this.keys.forEach(function(key) {
        res += key.genCode() + ', ';
      });
      if (this.keys.length > 0) {
        res = res.slice(0, -2);
      }
      res += '], [';
      this.vals.forEach(function(val) {
        res += val.genCode() + ', ';
      });
      if (this.vals.length > 0) {
        res = res.slice(0, -2);
      }
      res += ']);\n';
      return res;
    }
  };
};

exports.bloomStmt = function(destCollection, bloomOp, srcCollection) {
  return {
    type: 'bloom_stmt',
    opPrefix: 'this',
    bloomOp: bloomOp,
    destCollection: destCollection,
    srcCollection: srcCollection,
    target: null,
    monotonicDeps: [],
    nonMonotonicDeps: [],
    genCode: function() {
      var res = this.opPrefix + '.op(' + this.bloomOp + ',' +
        this.destCollection.genCode() + ',' + this.srcCollection.genCode()
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
    }
  };
};

exports.exprStmt = function(expr) {
  return {
    type: 'expr_stmt',
    expr: expr,
    genCode: function() {
      return this.expr.genCode() + ';\n';
    }
  };
};

exports.assignmentStmt = function(target, value) {
  return {
    type: 'assignment_stmt',
    target: target,
    value: value,
    genCode: function() {
      return 'var ' + this.target.genCode() + ' = ' + this.value.genCode() +
        ';\n';
    }
  };
};

exports.assignmentStmtNoDecl = function(target, value) {
  return {
    type: 'assignment_stmt_no_decl',
    target: target,
    value: value,
    genCode: function() {
      return this.target.genCode() + ' = ' + this.value.genCode() + ';\n';
    }
  };
};

exports.putsStmt = function(values) {
  return {
    type: 'puts_stmt',
    values: values,
    genCode: function() {
      var res = 'console.log(';
      this.values.forEach(function(value) {
        res += value.genCode() + ', ';
      });
      if (this.values.length > 0) {
        res = res.slice(0, -2);
      }
      res += ');\n';
      return res;
    }
  };
};

exports.ternaryExpr = function(cond, thenExpr, elseExpr) {
  return {
    type: 'ternary_expr',
    cond: cond,
    thenExpr: thenExpr,
    elseExpr: elseExpr,
    genCode: function() {
      return this.cond.genCode() + ' ? ' + this.thenExpr + ' : ' +
        this.elseExpr;
    }
  };
};

exports.binop = function(left, op, right) {
  return {
    type: 'binop',
    op: op,
    left: left,
    right: right,
    genCode: function() {
      return this.left.genCode() + ' ' + this.op + ' ' + this.right.genCode();
    }
  };
};

exports.unop = function(op, value) {
  return {
    type: 'unop',
    op: op,
    value: value,
    genCode: function() {
      return this.op + ' ' + this.right;
    }
  };
};

exports.varName = function(name) {
  return {
    type: 'var_name',
    name: name,
    genCode: function() {
      return this.name;
    }
  }
}

exports.strLiteral = function(value) {
  return {
    type: 'str_literal',
    value: value,
    genCode: function() {
      return this.value;
    }
  };
};

exports.numLiteral = function(value) {
  return {
    type: 'num_literal',
    value: value,
    genCode: function() {
      return this.value;
    }
  };
};

exports.arrDisplay = function(arr) {
  return {
    type: 'arr_display',
    arr: arr,
    genCode: function() {
      res = '[';
      this.arr.forEach(function(val) {
        res += val.genCode() + ', ';
      });
      if (this.arr.length > 0) {
        res = res.slice(0, -2);
      }
      res += ']';
      return res;
    }
  };
};

exports.hashDisplay = function(kvPairs) {
  return {
    type: 'hash_display',
    kvPairs: kvPairs,
    genCode: function() {
      res = '{';
      this.kvPairs.forEach(function(kvPair) {
        res += kvPair[0].genCode() + ': ' + kvPair[1].genCode() + ', ';
      });
      if (this.kvPairs.length > 0) {
        res = res.slice(0, -2);
      }
      res += '}';
      return res;
    }
  };
};

exports.attributeRef = function(obj, attribute) {
  return {
    type: 'attribute_ref',
    obj: obj,
    attribute: attribute,
    genCode: function() {
      return this.obj.genCode() + '.' + this.attribute.genCode();
    }
  };
};

exports.subscription = function(obj, subscription) {
  return {
    type: 'subscription',
    obj: obj,
    subscription: subscription,
    genCode: function() {
      return this.obj.genCode() + '[' + this.subscription.genCode() + ']';
    }
  };
};

exports.call = function(func, args) {
  return {
    type: 'call',
    func: func,
    args: args,
    genCode: function() {
      var res = this.func.genCode() + '(';
      this.args.forEach(function(arg) {
        res += arg.genCode() + ', ';
      });
      if (this.args.length > 0) {
        res = res.slice(0, -2);
      }
      res += ')';
      return res;
    }
  };
};

exports.newExpr = function(name, args) {
  return {
    type: 'new_expr',
    name: name,
    args: args,
    genCode: function() {
      res = 'new ' + this.name + '(';
      this.args.forEach(function(arg) {
        res += arg.genCode() + ', ';
      });
      if (this.args.length > 0) {
        res = res.slice(0, -2);
      }
      res += ')';
      return res;
    }
  };
};

exports.primaryBlock = function(primary, funcExpr) {
  return {
    type: 'primary_block',
    primary: primary,
    funcExpr: funcExpr,
    genCode: function() {
      return this.primary.genCode() + '(' + this.funcExpr.genCode() + ')';
    }
  };
};

exports.funcExpr = function(args, statements) {
  return {
    type: 'func_expr',
    args: args,
    statements: statements,
    genCode: function() {
      res = 'function(';
      this.args.forEach(function(arg) {
        res += arg.genCode() + ', ';
      });
      if (this.args.length > 0) {
        res = res.slice(0, -2);
      }
      res += ') {\n';
      for (var i = 0; i < this.statements.length; i++) {
        if (i === this.statements.length - 1) {
          res += 'return ';
        }
        res += this.statements[i].genCode();
      }
      res += '}';
      return res;
    }
  };
};

exports.ifStmt = function(cond, statements) {
  return {
    type: 'if_stmt',
    cond: cond,
    statements: statements,
    genCode: function() {
      res = 'if (' + this.cond.genCode() + ') {\n';
      this.statements.forEach(function(statement) {
        res += statement.genCode();
      });
      res += '}\n';
      return res;
    }
  };
};
