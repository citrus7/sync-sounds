var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

app.get('/admin', function(req, res) {
  res.render('index', { title: 'Hey', message: 'Hello there!'});
  //res.sendFile(__dirname + '/index.html');
  //var clients = io.sockets.adapter.rooms['room'];
  //for (var clientId in clients) {
  //  console.log(io.sockets.connected[clientId].id);
  //}
});

app.get('/clients', function(req, res) {
  var clients = io.sockets.adapter.rooms['room'];
  res.json(clients);
});





io.on('connection', function(socket){
  socket.join('room');
  socket.on('sound_key', function(msg){
    io.emit('sound_key', msg);
    //console.log('>> Receive sound ' + msg);
  });
});

http.listen(3000, function(){
  console.log('listening on port 3000');
});
