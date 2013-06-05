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
','                       return ','
'['                       return '['
']'                       return ']'
'=>'                      return '=>'
'<='                      return '<='
'<~'                      return '<~'
'<+-'                     return '<+-'
'<+'                      return '<+'
'<-'                      return '<-'

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
    : state_block bloom_block EOF
      { console.log($2); }
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
    : '[' id_list ']'
      -> $2
    ;

id_list
    : ID comma_id
      -> ast.cons($1, $2)
    ;

comma_id
    : /* empty */
    | ',' ID comma_id
      -> ast.cons($2, $3)
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

primary
    // TODO
    : ID
    ;

%%

var ast = require('./bloom_ast');

