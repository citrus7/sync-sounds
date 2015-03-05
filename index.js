
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


// Pages
// ------------------------------------------------------------------------------------------------------

app.use(express.static(__dirname + '/public'));
app.get('/',      function(req, res) { res.sendFile(__dirname + '/index.html'); });
app.get('/admin', function(req, res) { res.sendFile(__dirname + '/admin.html'); });


// Init
// ------------------------------------------------------------------------------------------------------

function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min)) + min; }

var channels_table = [];
var clients_table = [];
var num_channels = 4;
var num_patterns = 16;

for (var i = 0; i < num_channels; i++) {
  channels_table[i] = [];
  for (var j = 0; j < num_patterns; j++) {
    //generate pitch
	var rand_pitch = getRandomInt(50, 70);
	//generate volume
	var rand_vol = getRandomInt(0, 100);
	//generate duration
    var rand_dur = getRandomInt(400, 1000);
	var note = [rand_pitch,rand_vol,rand_dur];
    channels_table[i].push(note);
  }
  console.log(channels_table[i]);
}

// APIs
// ------------------------------------------------------------------------------------------------------

app.get('/get_clients', function(req, res) {
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

app.get('/get_patterns', function(req, res) {
  var channel_id = req.param('channel');
  console.log('>> get_patterns - channel' + channel_id);
  res.json(channels_table[channel_id]);
});


app.get('/send_message_to_client', function(req, res) {
  var client_id = req.param('client');
  var message = req.param('msg');

  var pack = {
    'type': 'admin_msg',
    'client': client_id,
    'message': message
  };
  io.emit('sync_sounds_station', pack);

  console.log('>> send_message_to_client - client ' + client_id);
  res.json('okay');
});


app.get('/generate_patterns', function(req, res) {
  var channel_id = req.param('channel');

  channels_table[channel_id] = [];
  for (var j = 0; j < num_patterns; j++) {
	//generate pitch
	var rand_pitch = getRandomInt(50, 70);
	//generate volume
	var rand_vol = getRandomInt(0, 100);
	//generate duration
    var rand_dur = getRandomInt(400, 1000);
	var note = [rand_pitch,rand_vol,rand_dur];
    channels_table[channel_id].push(note);
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

app.get('/assign_user_to_channel', function(req, res) {
  var client_id  = req.param('client');
  var channel_id = req.param('channel');
  
  clients_table[client_id].channel = channel_id;

  var pack = {
    'type': 'update_channel',
    'client': client_id,
    'channel': channel_id
  };
  io.emit('sync_sounds_station', pack);

  console.log('>> assign_user_to_channel: ' + client_id + ' -> ' + clients_table[client_id].channel);
  res.json('okay');
});
//send music packets at interval
var bpm = 12;
var noteIterator = 0;
var interval = setInterval(function() {  
								noteIterator++;
								if (noteIterator==num_patterns){
									noteIterator = 0;
								}
								console.log("play note");
								for (channel_id in channels_table){
										var pack = {'type': 'play_note',
										'note': channels_table[channel_id][noteIterator],
										'bpm':bpm,
										'channel': channel_id
										}
										io.emit('sync_sounds_station', pack);
									};
										
	}, (bpm*100));

// Socket.io server
// ------------------------------------------------------------------------------------------------------

io.on('connection', function(socket){
  socket.join('sync_sounds');
  socket.on('sync_sounds_station', function(msg) {
    var device_id = msg.client;
    var note_id = msg.note_id;

    if (clients_table[device_id] == null) {
      clients_table[device_id] = {
        player_name: 'Guest', 
        channel: 0,
        start_time: new Date().getTime()
      }

      console.log('New connection: ' + device_id);
    }

    var channel_id = clients_table[device_id].channel
    var pack = {
      'type': 'sound',
      'client': device_id,
      'freq': channels_table[channel_id][note_id],
      'channel': channel_id
    };
    io.emit('sync_sounds_station', pack);

    console.log('>> Receive sound ' + note_id + ' -> ' + channels_table[channel_id][note_id]);
  });
});


// ------------------------------------------------------------------------------------------------------

http.listen(3000, function() { 
  console.log('listening on port 3000');
});
