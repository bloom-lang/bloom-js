%lex /* lexical grammar */

string                    (\"([^"\\]|\\.)*\"|\'([^'\\]|\\.)*\')
number                    (\+|-)?([0-9]+(\.[0-9]*)?|\.[0-9]+)
id                        [_A-Za-z][_A-Za-z0-9]*

%%

[ \t\r]*'require'.*\n+    { /* ignore require statements */ }
[ \t\r]*'include'.*\n+    { /* ignore include statements */ }
'\\'[ \t\r]*('#'.*)?(\n)  { /* backslash concatenates lines, skip comments */ }
([ \t\r]*('#'.*)?\n)+     return '\n' // skip comments and blank lines
\s+                       { /* skip whitespace other than newline */ }
'class'                   return 'CLASS'
'state'                   return 'STATE'
'bloom'                   return 'BLOOM'
'table'                   return 'TABLE'
'scratch'                 return 'SCRATCH'
'interface'               return 'INTERFACE'
'channel'                 return 'CHANNEL'
'loopback'                return 'LOOPBACK'
'periodic'                return 'PERIODIC'
'do'                      return 'DO'
'end'                     return 'END'
'puts'                    return 'PUTS'
'new'                     return 'NEW'
{id}                      return 'ID'
{string}                  return 'STR_LITERAL'
{number}                  return 'NUM_LITERAL'
('#'.*)?<<EOF>>           return 'EOF'
'=>'                      return '=>'
':='                      return ':='
'<~'                      return '<~'
'<+-'                     return '<+-'
'<+'                      return '<+'
'<-'                      return '<-'
'=='                      return '=='
'!='                      return '!='
'<='                      return '<='
'>='                      return '>='
'<'                       return '<'
'>'                       return '>'
'='                       return '='
'**'                      return '**'
'%'                       return '%'
'*'                       return '*'
'/'                       return '/'
'+'                       return '+'
'-'                       return '-'
'.'                       return '.'
','                       return ','
':'                       return ':'
'|'                       return '|'
'('                       return '('
')'                       return ')'
'['                       return '['
']'                       return ']'
'{'                       return '{'
'}'                       return '}'
.                         return 'INVALID'

/lex


%start program
%ebnf
%% /* language grammar */

program
    : '\n'* (outer_stmt ('\n'|EOF))* EOF?
      { return ast.program($2); }
    ;

outer_stmt
    : class_block
    | simple_stmt
    ;

class_block
    : CLASS ID '\n' (class_stmt '\n')* END
      -> ast.classBlock($2, $4)
    ;

class_stmt
    : state_block
    | bloom_block
    | simple_stmt
    ;

state_block
    : STATE DO '\n' (state_decl '\n')* END
      -> ast.stateBlock($4)
    ;

state_decl
    : CHANNEL primary
      -> ast.stateDecl($1, $2, ['@address', 'val'], [])
    | CHANNEL primary ',' field_list
      -> ast.stateDecl($1, $2, $4, [])
    | CHANNEL primary ',' field_list '=>' field_list
      -> ast.stateDecl($1, $2, $4, $6)
    | collection_type primary
      -> ast.stateDecl($1, $2, ['key'], ['val'])
    | collection_type primary ',' field_list
      -> ast.stateDecl($1, $2, $4, [])
    | collection_type primary ',' field_list '=>' field_list
      -> ast.stateDecl($1, $2, $4, $6)
    ;

collection_type
    : TABLE
      -> "'table'"
    | SCRATCH
      -> "'scratch'"
    | INTERFACE
      -> "'interface'"
    | LOOPBACK
      -> "'loopback'"
    | PERIODIC
      -> "'periodic'"
    ;

field_list
    : '[' (primary ',')* primary? ']'
      -> $3 === undefined ? $2 : $2.concat([$3])
    ;

bloom_block
    : BLOOM var_name? DO '\n' (bloom_stmt '\n')* END
      -> ast.bloomBlock($2, $5)
    ;

bloom_stmt
    : expression bloom_op primary
      -> ast.bloomStmt($1, $2, $3)
    ;

bloom_op
    : ':='
      -> "':='"
    | '<~'
      -> "':='"
    | '<+-'
      -> "'<+-'"
    | '<+'
      -> "'<+'"
    | '<-'
      -> "'<-'"
    ;

/* SIMPLE STATEMENT */

simple_stmt
    : expression
      -> ast.exprStmt($1)
    | assignment_stmt
    | bloom_stmt
    | puts_stmt
    ;

assignment_stmt
    : var_name '=' expression
      -> ast.assignmentStmt($1, $3)
    ;

puts_stmt
    : PUTS expression_list
      -> ast.putsStmt($2)
    ;

/* EXPRESSION */

expression
    : or_test
    | or_test '?' expression ':' expression
      -> ast.ternaryExpr($1, $3, $5)
    | or_test 'if' or_test 'else' expression
      -> ast.ternaryExpr($3, $1, $5)
    ;

or_test
    : and_test
    | or_test ('||'|'or') and_test
      -> ast.binop($1, $2, $3)
    ;

and_test
    : not_test
    | and_test ('&&'|'and') not_test
      -> ast.binop($1, $2, $3)
    ;

not_test
    : comparison
    | ('!'|'not') not_test
      -> ast.unop($1, $2, $3)
    ;

comparison
    : a_expr
    | a_expr ('<'|'>'|'=='|'<='|'>='|'!=') comparison
      -> ast.binop($1, $2, $3)
    ;

a_expr
    : m_expr
    | a_expr ('+'|'-') m_expr
      -> ast.binop($1, $2, $3)
    ;

m_expr
    : u_expr
    | m_expr ('*'|'/'|'%') u_expr
      -> ast.binop($1, $2, $3)
    ;

u_expr
    : power
    | ('-'|'+') u_expr
      -> ast.unop($1, $2, $3)
    ;

power
    : primary
    | primary '**' u_expr
      -> ast.binop($1, $2, $3)
    ;

primary
    : var_name
    | STR_LITERAL
      -> ast.strLiteral($1)
    | NUM_LITERAL
      -> ast.numLiteral($1)
    | parenth_form
    | arr_display
    | hash_display
    | attribute_ref
    | subscription
    | call
    | new_expr
    | primary_block
    ;

var_name
    : ID
      -> ast.varName($1);
    ;

parenth_form
    : '(' expression ')'
      -> $2
    ;

arr_display
    : '[' expression_list ']'
      -> ast.arrDisplay($2)
    ;

expression_list
    : (expression ',')* expression?
      -> $2 === undefined ? $1 : $1.concat([$2])
    ;

hash_display
    : '{' (kv_pair ',')* (kv_pair)? '}'
      -> ast.hashDisplay($3 === undefined ? $2 : $2.concat([$3]))
    ;

kv_pair
    : primary ':' expression
      -> [$1, $3]
    ;

attribute_ref
    : primary '.' var_name
      -> ast.attributeRef($1, $3)
    ;

subscription
    : primary '[' expression ']'
      -> ast.subscription($1, $3)
    ;

call
    : primary '(' expression_list ')'
      -> ast.call($1, $3)
    ;

new_expr
    : NEW ID '(' expression_list ')'
      -> ast.newExpr($2, $4)
    ;

primary_block
    : primary func_expr
      -> ast.primaryBlock($1, $2);
    ;

func_expr
    : '{' '|' id_list '|' simple_stmt '}'
      -> ast.funcExpr($3, [$5]);
    | DO '|' id_list '|' '\n' (simple_stmt '\n')* END
      -> ast.funcExpr($3, $6);
    ;

id_list
    : (var_name ',')* var_name?
      -> $2 === undefined ? $1 : $1.concat([$2])
    ;

%%

var ast = require('./bloom_ast');

