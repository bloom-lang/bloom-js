var net = require('net');
var util = require('./util');

var port = 0;
var addr = 'localhost:0';
var nick = process.argv[2] ? process.argv[2] : 'anonymous';
var destAddr = process.argv[3] ? process.argv[3] : 'localhost:8000';

var prettyprint = function(val) {
  res = val[1] + '(' + val[2] + '): ' + val[3] + '\n';
  return res;
};

var s = net.createServer(function(socket) {
  socket.on('data', function(d) {
    var m = JSON.parse(d);
    if (m[0] === 'mcast') {
      process.stdout.write(prettyprint(m[2]));
    }
  });
}).listen(0, function() {
  port = s.address().port;
  addr = 'localhost:' + port
  util.sendMessage(['connect', destAddr, addr, nick]);
});

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function(d) {
  util.sendMessage(['mcast', destAddr, [addr, nick, util.currentTimeStr(), d.slice(0, -1)]]);
});

process.stdin.on('end', function() {
  util.sendMessage(['close', destAddr, addr, nick]);
  s.close();
});
