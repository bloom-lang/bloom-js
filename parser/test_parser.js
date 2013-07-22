var fs = require('fs');
var parser = require('./bloom_parser_json');
parser.yy = require('./bloom_nodes');

var bloomStr, bloomAst, inpFile = process.argv[2];

if (inpFile !== undefined) {
  bloomStr = fs.readFileSync(inpFile).toString();
} else {
  bloomStr = fs.readFileSync('/dev/stdin').toString();
}

var bloomAst = parser.parse(bloomStr);

console.log(bloomAst.genJSCode());
