var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

app.get('/',      function(req, res) { res.sendFile(__dirname + '/index.html'); });
app.get('/admin', function(req, res) { res.sendFile(__dirname + '/admin.html'); });

app.get('/assign_user_to_channel', function(req, res) {
  var client_id  = req.param('client');
  var channel_id = req.param('channel');
  
  clients_table[client_id].channel = channel_id;

  console.log('>> assign_user_to_channel: ' + client_id + ' -> ' + clients_table[client_id].channel);
  res.json('okay');
});


app.get('/clients', function(req, res) {
  var clients = io.sockets.adapter.rooms['sync_sounds'];
  var ret = [];

  for (var clientId in clients) {
    var cur = io.sockets.connected[clientId];
    if (cur == null || clients_table[cur.id] == null) continue;
    var client_id = cur.id;
    var client_obj = clients_table[cur.id];

    ret.push([
      cur.id,
      client_obj.player_name,
      client_obj.start_time,
      cur.client.conn.remoteAddress,
      client_obj.channel,
      channels_table[client_obj.channel]
    ]);
  }

  res.json({ "data": ret });
});


function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min)) + min; }

var channels_table = [];
var clients_table = [];
var num_channels = 4;
var num_patterns = 5;

for (var i = 0; i < num_channels; i++) {
  channels_table[i] = [];
  for (var j = 0; j < num_patterns; j++) {
    var rand_pattern = getRandomInt(50, 70);
    channels_table[i].push(rand_pattern);
  }
  console.log(channels_table[i]);
}

app.get('/get_patterns', function(req, res) {
  var channel_id = req.param('channel');
  console.log('>> get_patterns - channel' + channel_id);
  res.json(channels_table[channel_id]);
});

app.get('/generate_patterns', function(req, res) {
  var channel_id = req.param('channel');

  channels_table[channel_id] = [];
  for (var j = 0; j < num_patterns; j++) {
    var rand_pattern = getRandomInt(50, 70);
    channels_table[channel_id].push(rand_pattern);
  }

  console.log('>> generate_patterns - channel ' + channel_id);
  res.json('okay');
});

app.get('/update_player_name', function(req, res) {
  var client_id = req.param('client');
  var new_name = req.param('name');

  clients_table[client_id].player_name = new_name;

  console.log('>> update_player_name - client_id' + client_id + ', name: ' + new_name);
  res.json('okay');
});

io.on('connection', function(socket){
  socket.join('sync_sounds');
  socket.on('sound_key', function(msg) {
    var args = msg.split('/');
    var device_id = args[0];
    var key_id = args[1];

    if (clients_table[device_id] == null) {
      clients_table[device_id] = {
        player_name: 'hello', 
        channel: 0,
        start_time: new Date().getTime()
      }

      console.log('New connection: ' + device_id);
    }

    var channel_id = clients_table[device_id].channel
    io.emit('sound_key', device_id + '/' + channel_id + '/' + channels_table[channel_id][key_id]);

    console.log('>> Receive sound ' + key_id + ' -> ' + channels_table[channel_id][key_id]);
  });
});

http.listen(3000, function(){
  console.log('listening on port 3000');
});
