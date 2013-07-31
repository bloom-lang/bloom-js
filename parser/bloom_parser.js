var Parser = require('jison').Parser;

var grammar = {
  "lex": {
    "macros": {
      "id": "[_A-Za-z][_A-Za-z0-9]*",
      "number": "(\\+|)?([0-9]+(\\.[0-9]*)?|\\.[0-9]+)",
      "string": "(\"([^\"\\\\]|\\\\.)*\"|'([^'\\\\]|\\\\.)*')"
    },
    "rules": [
      ["[ \\t\\r]*require.*\\n+", " /* ignore require statements */ "],
      ["[ \\t\\r]*include.*\\n+", " /* ignore include statements */ "],
      ["\\\\[ \\t\\r]*(#.*)?(\\n)", " /* backslash concatenates lines, skip comments */ "],
      ["([ \\t\\r]*(#.*)?\\n)+", "return '\\n' // skip comments and blank lines"],
      ["\\s+", " /* skip whitespace other than newline */ "],
      ["class\\b", "return 'CLASS'"],
      ["module\\b", "return 'MODULE'"],
      ["state\\b", "return 'STATE'"],
      ["bootstrap\\b", "return 'BOOTSTRAP'"],
      ["bloom\\b", "return 'BLOOM'"],
      ["table\\b", "return 'TABLE'"],
      ["scratch\\b", "return 'SCRATCH'"],
      ["interface\\b", "return 'INTERFACE'"],
      ["channel\\b", "return 'CHANNEL'"],
      ["loopback\\b", "return 'LOOPBACK'"],
      ["periodic\\b", "return 'PERIODIC'"],
      ["do\\b", "return 'DO'"],
      ["end\\b", "return 'END'"],
      ["puts\\b", "return 'PUTS'"],
      ["if\\b", "return 'IF'"],
      ["elsif\\b", "return 'ELSIF'"],
      ["else\\b", "return 'ELSE'"],
      ["new\\b", "return 'NEW'"],
      ["{id}", "return 'ID'"],
      ["{string}", "return 'STR_LITERAL'"],
      ["{number}", "return 'NUM_LITERAL'"],
      ["(#.*)?$", "return 'EOF'"],
      ["=>", "return '=>'"],
      ["<~", "return '<~'"],
      ["<\\+-", "return '<+-'"],
      ["<\\+", "return '<+'"],
      ["<-", "return '<-'"],
      ["==", "return '=='"],
      ["!=", "return '!='"],
      ["<=", "return '<='"],
      [">=", "return '>='"],
      ["&&=", "return '&&='"],
      ["\\|\\|=", "return '||='"],
      ["\\*\\*=", "return '**='"],
      ["%=", "return '%='"],
      ["\\*=", "return '*='"],
      ["\\/=", "return '/='"],
      ["\\+=", "return '+='"],
      ["-=", "return '-='"],
      ["<", "return '<'"],
      [">", "return '>'"],
      ["=", "return '='"],
      ["&&", "return '&&'"],
      ["\\|\\|", "return '||'"],
      ["\\*\\*", "return '**'"],
      ["%", "return '%'"],
      ["\\*", "return '*'"],
      ["\\/", "return '/'"],
      ["\\+", "return '+'"],
      ["-", "return '-'"],
      ["\\.", "return '.'"],
      [",", "return ','"],
      [":", "return ':'"],
      ["\\|", "return '|'"],
      ["\\(", "return '('"],
      ["\\)", "return ')'"],
      ["\\[", "return '['"],
      ["\\]", "return ']'"],
      ["\\{", "return '{'"],
      ["\\}", "return '}'"],
      [".", "return 'INVALID'"]
    ]
  },
  "start": "program",
  "bnf": {
    "program": [
      ["newlines outer_body maybe_eof", "return new yy.Program($2);"]
    ],
    "outer_body": [
      ["", "$$ = [];"],
      ["outer_body outer_stmt newline_or_eof", "$1.push($2);"]
    ],
    "maybe_eof": [
      "",
      "EOF"
    ],
    "outer_stmt": [
      "class_block",
      "module_block",
      "statement"
    ],
    "class_body": [
      ["", "$$ = [];"],
      ["class_body class_stmt \\n", "$1.push($2);"]
    ],
    "module_body": [
      ["", "$$ = [];"],
      ["module_body class_stmt \\n", "$1.push($2);"]
    ],
    "state_body": [
      ["", "$$ = [];"],
      ["state_body state_decl \\n", "$1.push($2);"]
    ],
    "primary_list": [
      ["", "$$ = [];"],
      ["primary_list primary ,", "$1.push($2);"]
    ],
    "maybe_primary": [
      "",
      "primary"
    ],
    "maybe_symbol": [
      "",
      "sym_literal"
    ],
    "statement": [
      "compound_stmt",
      "simple_stmt"
    ],
    "class_block": [
      ["CLASS ID \\n class_body END", "$$ = new yy.ClassBlock($2, $4);"]
    ],
    "module_block": [
      ["MODULE ID \\n module_body END", "$$ = new yy.ClassBlock($2, $4);"]
    ],
    "class_stmt": [
      "state_block",
      "bootstrap_block",
      "bloom_block",
      "statement"
    ],
    "state_block": [
      ["STATE DO \\n state_body END", "$$ = new yy.StateBlock($4);"]
    ],
    "state_decl": [
      ["CHANNEL primary", "$$ = new yy.StateDecl($1, $2, ['@address', 'val'], []);"],
      ["CHANNEL primary , field_list", "$$ = new yy.StateDecl($1, $2, $4, []);"],
      ["CHANNEL primary , field_list => field_list", "$$ = new yy.StateDecl($1, $2, $4, $6);"],
      ["collection_type primary", "$$ = new yy.StateDecl($1, $2, [new yy.StrLiteral(\"'key'\")], [new yy.StrLiteral(\"'val'\")]);"],
      ["collection_type primary , field_list", "$$ = new yy.StateDecl($1, $2, $4, []);"],
      ["collection_type primary , field_list => field_list", "$$ = new yy.StateDecl($1, $2, $4, $6);"]
    ],
    "collection_type": [
      ["TABLE", "$$ = $1;"],
      ["SCRATCH", "$$ = $1;"],
      ["INTERFACE", "$$ = $1;"],
      ["LOOPBACK", "$$ = $1;"],
      ["PERIODIC", "$$ = $1;"]
    ],
    "field_list": [
      ["[ primary_list maybe_primary ]", "$$ = $3 === undefined ? $2 : $2.concat([$3]);"]
    ],
    "bootstrap_block": [
      ["BOOTSTRAP DO \\n body END", "$$ = new yy.BloomBlock('bootstrap', $4);"]
    ],
    "bloom_block": [
      ["BLOOM maybe_symbol DO \\n bloom_body END", "$$ = new yy.BloomBlock($2, $5);"]
    ],
    "bloom_body": [
      ["", "$$ = [];"],
      ["bloom_body bloom_stmt \\n", "$1.push($2);"]
    ],
    "bloom_stmt": [
      ["var_name bloom_op primary", "$$ = new yy.BloomStmt($1, $2, $3);"]
    ],
    "bloom_op": [
      ["<=", "$$ = $1;"],
      ["<~", "$$ = $1;"],
      ["<+-", "$$ = $1;"],
      ["<+", "$$ = $1;"],
      ["<-", "$$ = $1;"]
    ],
    "compound_stmt": [
      "if_stmt"
    ],
    "if_stmt": [
      ["IF expression \\n body else_clause", "$$ = new yy.IfStmt($2, $4, $5);"]
    ],
    "else_clause": [
      ["END", "$$ = new yy.ElseClause(null);"],
      ["ELSIF expression \\n body else_stmt", "$$ = new yy.ElseIfClause($2, $4, $5);"],
      ["ELSE \\n body END", "$$ = new yy.ElseClause($3)"]
    ],
    "simple_stmt": [
      ["primary", "$$ = new yy.ExprStmt($1);"],
      "assignment_stmt",
      "bloom_stmt",
      "puts_stmt"
    ],
    "assignment_stmt": [
      ["assignable = expression", "$$ = new yy.AssignmentStmt($1, $3);"],
      ["assignable &&= expression", "$$ = new yy.AssignmentStmtCompound($1, $3, $2);"],
      ["assignable ||= expression", "$$ = new yy.AssignmentStmtCompound($1, $3, $2);"],
      ["assignable **= expression", "$$ = new yy.AssignmentStmtCompound($1, $3, $2);"],
      ["assignable %= expression", "$$ = new yy.AssignmentStmtCompound($1, $3, $2);"],
      ["assignable *= expression", "$$ = new yy.AssignmentStmtCompound($1, $3, $2);"],
      ["assignable /= expression", "$$ = new yy.AssignmentStmtCompound($1, $3, $2);"],
      ["assignable += expression", "$$ = new yy.AssignmentStmtCompound($1, $3, $2);"],
      ["assignable -= expression", "$$ = new yy.AssignmentStmtCompound($1, $3, $2);"]
    ],
    "puts_stmt": [
      [
        "PUTS expression_list",
        "$$ = new yy.PutsStmt($2);"
      ]
    ],
    "expression": [
      "or_test",
      [
        "or_test ? expression : expression",
        "$$ = new yy.TernaryExpr($1, $3, $5);"
      ],
      [
        "or_test if or_test else expression",
        "$$ = new yy.TernaryExpr($3, $1, $5);"
      ]
    ],
    "or_test": [
      "and_test",
      [
        "or_test or_test_group0 and_test",
        "$$ = new yy.Binop($1, $2, $3);"
      ]
    ],
    "and_test": [
      "not_test",
      [
        "and_test and_test_group0 not_test",
        "$$ = new yy.Binop($1, $2, $3);"
      ]
    ],
    "not_test": [
      "comparison",
      [
        "not_test_group0 not_test",
        "$$ = new yy.Unop($1, $2);"
      ]
    ],
    "comparison": [
      "a_expr",
      [
        "a_expr comparison_group0 comparison",
        "$$ = new yy.Binop($1, $2, $3);"
      ]
    ],
    "a_expr": [
      "m_expr",
      [
        "a_expr a_expr_group0 m_expr",
        "$$ = new yy.Binop($1, $2, $3);"
      ]
    ],
    "m_expr": [
      "u_expr",
      [
        "m_expr m_expr_group0 u_expr",
        "$$ = new yy.Binop($1, $2, $3);"
      ]
    ],
    "u_expr": [
      "power",
      [
        "u_expr_group0 u_expr",
        "$$ = new yy.Unop($1, $2);"
      ]
    ],
    "power": [
      "primary",
      [
        "primary ** u_expr",
        "$$ = new yy.Binop($1, $2, $3);"
      ]
    ],
    "primary": [
      "assignable",
      "sym_literal",
      [
        "STR_LITERAL",
        "$$ = new yy.StrLiteral($1);"
      ],
      [
        "NUM_LITERAL",
        "$$ = new yy.NumLiteral($1);"
      ],
      "parenth_form",
      "arr_display",
      "hash_display",
      "call",
      "new_expr",
      "primary_block"
    ],
    "assignable": [
      "var_name",
      "attribute_ref",
      "subscription"
    ],
    "var_name": [
      [
        "ID",
        "$$ = new yy.VarName($1);;"
      ]
    ],
    "sym_literal": [
      [
        ": ID",
        "$$ = new yy.SymLiteral($2);"
      ]
    ],
    "parenth_form": [
      [
        "( expression )",
        "$$ = $2;"
      ]
    ],
    "arr_display": [
      [
        "[ expression_list ]",
        "$$ = new yy.ArrDisplay($2);"
      ]
    ],
    "expression_list": [
      [
        "expression_list_repetition0 expression_list_option0",
        "$$ = $2 === undefined ? $1 : $1.concat([$2]);"
      ]
    ],
    "hash_display": [
      [
        "{ hash_display_repetition0 hash_display_option0 }",
        "$$ = new yy.HashDisplay($3 === undefined ? $2 : $2.concat([$3]));"
      ]
    ],
    "kv_pair": [
      [
        "primary => expression",
        "$$ = [$1, $3];"
      ]
    ],
    "attribute_ref": [
      [
        "primary . var_name",
        "$$ = new yy.AttributeRef($1, $3);"
      ]
    ],
    "subscription": [
      [
        "primary [ expression ]",
        "$$ = new yy.Subscription($1, $3);"
      ]
    ],
    "call": [
      [
        "primary ( expression_list )",
        "$$ = new yy.Call($1, $3);"
      ]
    ],
    "new_expr": [
      [
        "NEW ID ( expression_list )",
        "$$ = new yy.NewExpr($2, $4);"
      ]
    ],
    "primary_block": [
      [
        "primary func_expr",
        "$$ = new yy.PrimaryBlock($1, $2);;"
      ]
    ],
    "func_expr": [
      [
        "{ | id_list | statement }",
        "$$ = new yy.FuncExpr($3, [$5]);;"
      ],
      [
        "DO | id_list | \\n func_expr_repetition0 END",
        "$$ = new yy.FuncExpr($3, $6);;"
      ]
    ],
    "id_list": [
      [
        "id_list_repetition0 id_list_option0",
        "$$ = $2 === undefined ? $1 : $1.concat([$2]);"
      ]
    ],
    "newlines": [
      [
        "",
        "$$ = [];"
      ],
      [
        "newlines \\n",
        "$1.push($2);"
      ]
    ],
    "newline_or_eof": [
      "\\n",
      "EOF"
    ],
    "body": [
      ["", "$$ = [];"],
      ["body statement \\n", "$1.push($2);"]
    ],
    "or_test_group0": [
      "||",
      "or"
    ],
    "and_test_group0": [
      "&&",
      "and"
    ],
    "not_test_group0": [
      "!",
      "not"
    ],
    "comparison_group0": [
      "<",
      ">",
      "==",
      "<=",
      ">=",
      "!="
    ],
    "a_expr_group0": [
      "+",
      "-"
    ],
    "m_expr_group0": [
      "*",
      "/",
      "%"
    ],
    "u_expr_group0": [
      "-",
      "+"
    ],
    "expression_list_repetition0": [
      ["", "$$ = [];"],
      ["expression_list_repetition0 expression ,", "$1.push($2);"]
    ],
    "expression_list_option0": [
      "",
      "expression"
    ],
    "hash_display_repetition0": [
      [
        "",
        "$$ = [];"
      ],
      [
        "hash_display_repetition0 kv_pair ,",
        "$1.push($2);"
      ]
    ],
    "hash_display_option0": [
      "",
      "kv_pair"
    ],
    "func_expr_repetition0": [
      [
        "",
        "$$ = [];"
      ],
      [
        "func_expr_repetition0 statement \\n",
        "$1.push($2);"
      ]
    ],
    "id_list_repetition0": [
      [
        "",
        "$$ = [];"
      ],
      [
        "id_list_repetition0 var_name ,",
        "$1.push($2);"
      ]
    ],
    "id_list_option0": [
      "",
      "var_name"
    ]
  }
};

module.exports = new Parser(grammar);
