%lex /* lexical grammar */

string                    (\"([^"\\]|\\.)*\"|\'([^'\\]|\\.)*\')
number                    (\+|-)?([0-9]+(\.[0-9]*)?|\.[0-9]+)
id                        [_A-Za-z][_A-Za-z0-9]*

%%

\s+                       /* skip whitespace */
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
{string}                  return 'STR_LIT'
{number}                  return 'NUM_LIT'
{id}                      return 'ID'
<<EOF>>                   return 'EOF'
'.'                       return '.'
','                       return ','
':'                       return ':'
'('                       return '('
')'                       return ')'
'['                       return '['
']'                       return ']'
'{'                       return '{'
'}'                       return '}'
'=>'                      return '=>'
'<='                      return '<='
'<~'                      return '<~'
'<+-'                     return '<+-'
'<+'                      return '<+'
'<-'                      return '<-'
.                         return 'INVALID'

/lex

/* operator associations and precedence */

%left '+' '-'
%left '*' '/'
%left '^'
%right '!'
%right '%'
%left UMINUS

%start program
%ebnf
%% /* language grammar */

program
    : state_block? bloom_block? EOF
      { return ast.program($1, $2); }
    ;

state_block
    : STATE DO state_decl* END
      -> ast.stateBlock($3)
    ;

state_decl
    : CHANNEL ID
      -> ast.stateDecl($1, $2, ['@address', 'val'], [])
    | CHANNEL ID ',' field_list
      -> ast.stateDecl($1, $2, $4, [])
    | CHANNEL ID ',' field_list '=>' field_list
      -> ast.stateDecl($1, $2, $4, $6)
    | collection_type ID
      -> ast.stateDecl($1, $2, ['key'], ['val'])
    | collection_type ID ',' field_list
      -> ast.stateDecl($1, $2, $4, ['val'])
    | collection_type ID ',' field_list '=>' field_list
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
    : '[' (ID ',')* ID? ']'
      -> $3 === undefined ? $2 : $2.concat([$3])
    ;

bloom_block
    : BLOOM DO bloom_stmt* END
      -> ast.bloomBlock($3)
    ;

bloom_stmt
    : ID bloom_op primary
      -> ast.bloomStmt($1, $2, $3)
    ;

bloom_op
    : '<='
    | '<~'
    | '<+-'
    | '<+'
    | '<-'
    ;

/* JAVASCRIPT PARSER */

expression
    : or_test
    | or_test '?' expression ':' expression
    ;

or_test
    : and_test
    | or_test '||' and_test
    ;

and_test
    : not_test
    | and_test '&&' not_test
    ;

not_test
    : comparison
    | '!' not_test
    ;

comparison
    // TODO
    : primary
    ;

primary
    : ID
    | STR_LIT
    | NUM_LIT
    | parenth_form
    | arr_display
    | obj_display
    | property_ref
    | subscription
    | call
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

obj_display
    : '{' (kv_pair ',')* (kv_pair)? '}'
      -> ast.objDisplay($3 === undefined ? $2 : $2.concat([$3]))
    ;

kv_pair
    : expression ':' expression
      -> [$1, $3]
    ;

property_ref
    : primary '.' ID
      -> ast.propertyRef($1, $3)
    ;

subscription
    : primary '[' expression ']'
      -> ast.subscription($1, $3)
    ;

call
    : primary '(' expression_list ')'
      -> ast.call($1, $3)
    ;

%%

var ast = require('./bloom_ast');

