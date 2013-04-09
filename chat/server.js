var Rx = require('rx');
var util = require('./util');
//var http = require('http');
var net = require('net');

var clients = [];
var channels = {};

channels['connect'] = new util.channel('connect');
channels['mcast'] = new util.channel('mcast');
channels['close'] = new util.channel('close');

var s = net.createServer(function(socket) {
  socket.on('data', function(data) {
    var message = JSON.parse(data);
    var channelName = message.shift();
    channels[channelName].subject.onNext(message);
  });
});

var connectObserver = channels['connect'].subject.subscribe(function(m) {
  clients.push([m[1], m[2]]);
});

var mcastObserver = channels['mcast'].subject.subscribe(function(m) {
  for (var i = 0; i < clients.length; i++) {
    util.sendMessage(['mcast', clients[i][0], m[1]]);
  }
});

var closeObserver = channels['close'].subject.subscribe(function(m) {
  for (var i = 0; i < clients.length; i++) {
    if (clients[i][0] === m[1] && clients[i][1] === m[2]) {
      clients.splice(i, 1);
    }
  }
});

s.listen(8000);
