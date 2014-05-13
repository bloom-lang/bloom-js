var net = require('net');
var triutil = require('./triutil');

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
  triutil.sendMessage(['connect', destAddr, addr, nick]);
});

process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function(d) {
  dsplit = d.slice(0, -1).split(' ');
  if (dsplit.length === 3) {
    dsplit[2] = parseInt(dsplit[2]);
    if (!isNaN(dsplit[2])) {
      triutil.sendMessage(['mcast', destAddr, [addr, nick, triutil.currentTimeStr(), dsplit]]);
    }
  }
});

process.stdin.on('end', function() {
  triutil.sendMessage(['close', destAddr, addr, nick]);
  s.close();
});

