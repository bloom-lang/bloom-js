var fs = require('fs');
var parser = require('./bloom_parser');

var inpFile = process.argv[2];
var bloomStr;

if (inpFile !== undefined) {
  bloomStr = fs.readFileSync(inpFile).toString();
} else {
  bloomStr = fs.readFileSync('/dev/stdin').toString();
}

var bloomAst = parser.parse(bloomStr);

var jsCode = bloomAst.genCode();

console.log(jsCode);
