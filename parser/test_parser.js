var fs = require('fs');
var parser = require('./bloom_parser');
var rewriter = require('./bloom_rewriter');
parser.yy = require('./bloom_nodes');

var bloomStr, bloomAst, inpFile = process.argv[2];

if (inpFile !== undefined) {
  bloomStr = fs.readFileSync(inpFile).toString();
} else {
  bloomStr = fs.readFileSync('/dev/stdin').toString();
}

bloomAst = parser.parse(bloomStr);
bloomAst = rewriter.rewrite(bloomAst);

console.log(bloomAst.genJSCode());
//console.log(bloomAst.genSQLCode());
