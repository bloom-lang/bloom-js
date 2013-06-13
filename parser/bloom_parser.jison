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
{id}                      return 'ID'
{string}                  return 'STR_LIT'
{number}                  return 'NUM_LIT'
('#'.*)?<<EOF>>           return 'EOF'
'=>'                      return '=>'
'<:'                      return '<:'
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
      { console.log(JSON.stringify(ast.program($2), null, 2));
        return ast.program($2); }
    ;

outer_stmt
    : class_block
    | simple_stmt
    ;

class_block
    : CLASS ID '\n' (class_stmt '\n')* END
      -> ast.classBlock($4)
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
    | SCRATCH
    | INTERFACE
    | LOOPBACK
    | PERIODIC
    ;

field_list
    : '[' (primary ',')* primary? ']'
      -> $3 === undefined ? $2 : $2.concat([$3])
    ;

bloom_block
    : BLOOM ID? DO '\n' (bloom_stmt '\n')* END
      -> ast.bloomBlock($2, $5)
    ;

bloom_stmt
    : expression bloom_op primary
      -> ast.bloomStmt($1, $2, $3)
    ;

bloom_op
    : '<:'
    | '<~'
    | '<+-'
    | '<+'
    | '<-'
    ;

/* SIMPLE STATEMENT */

simple_stmt
    : expression
    | assignment_stmt
    | bloom_stmt
    | puts_stmt
    ;

assignment_stmt
    : ID '=' expression
    ;

puts_stmt
    : PUTS expression_list
    ;

/* EXPRESSION */

expression
    : or_test
    | or_test '?' expression ':' expression
    | or_test 'if' or_test 'else' expression
    ;

or_test
    : and_test
    | or_test ('||'|'or') and_test
    ;

and_test
    : not_test
    | and_test ('&&'|'and') not_test
    ;

not_test
    : comparison
    | ('!'|'not') not_test
    ;

comparison
    : a_expr
    | a_expr ('<'|'>'|'=='|'<='|'>='|'!=') comparison
    ;

a_expr
    : m_expr
    | a_expr ('+'|'-') m_expr
    ;

m_expr
    : u_expr
    | m_expr ('*'|'/'|'%') u_expr
    ;

u_expr
    : power
    | ('-'|'+') u_expr
    ;

power
    : primary
    | primary '**' u_expr
    ;

primary
    : ID
    | STR_LIT
    | NUM_LIT
    | parenth_form
    | arr_display
    | hash_display
    | attribute_ref
    | subscription
    | call
    | primary_block
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
    : primary '=>' primary
      -> [$1, $3]
    ;

attribute_ref
    : primary '.' ID
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

primary_block
    : primary '{' '|' id_list '|' simple_stmt '}'
    | primary DO '|' id_list '|' '\n' (simple_stmt '\n')* END
    ;

id_list
    : (ID ',')* ID?
      -> $2 === undefined ? $1 : $1.concat([$2])
    ;

%%

var ast = require('./bloom_ast');

