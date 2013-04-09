var Rx = require('rx');
var net = require('net');

var channel = function(name) {
  this.name = name;
  this.data = [];
  this.subject = new Rx.Subject();
};

exports.channel = channel;

exports.sendMessage = function(m) {
  var dest = m[1]
  var destIp = dest.split(':')[0];
  var destPort = parseInt(dest.split(':')[1]);
  var c = net.createConnection({port: destPort, host: destIp}, function() {
    c.write(JSON.stringify(m), function() {
      c.end();
    });
  });
  c.on('error', console.log);
};

exports.currentTimeStr = function() {
  var time = new Date();
  var hours = time.getHours();
  var minutes = time.getMinutes();
  var seconds = time.getSeconds();

  if (hours   < 10) {hours   = "0"+hours;}
  if (minutes < 10) {minutes = "0"+minutes;}
  if (seconds < 10) {seconds = "0"+seconds;}
  var res = hours+':'+minutes+':'+seconds;
  return res;
};
