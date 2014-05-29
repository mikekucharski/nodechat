var express = require('express'),
	app = express(),
	http = require('http'),
	server = http.createServer(app),
	jade = require('jade'),
	io = require('socket.io').listen(server)
	_ = require('underscore')._;

server.listen(3000);

app.set('views', __dirname+'/views'); // path for views
app.set('view engine', 'jade'); // express works with jade!
app.set('view options', {layout:false}); // express comes with a layout for files but this is a SPA
app.use(express.static(__dirname+'/public')); // set the public folder as root

app.get('/', function(req, res){
	res.render('home.jade'); // serve a home.jade file
});

app.get('/login', function(req, res){
	res.render('login.jade'); // serve a home.jade file
});

var people = {};
var rooms = {};
//var sockets = [];

function getUserList(){
	list = [];
	for(key in people){
		list.push(people[key].username);
	}
	return list;
}

// INIT SERVER ROOMS
(function(){
	// ADD static general rooms
	generalRooms = ['Main', 'General 1', 'General 2', 'General 3', 'General 4', 'General 5'];
	for(var i = 0; i < generalRooms.length; i++){
		rooms[i] = {name: generalRooms[i], type: 'general', history: [], people: []};
	}

	// ADD static themed rooms
	themedRooms = ['Traveling', 'Sports', 'Dating', 'Movies', 'Other'];
	for(var i = 0; i < themedRooms.length; i++){
		rooms[i + generalRooms.length] = {name: themedRooms[i], type: 'themed', history: [], people: []};
	}
}());

//handle client connections
// NOTE, no need to handle client disconnections
//socket is the socket that just connected
io.sockets.on('connection', function(socket){


	socket.on('connectToServer', function(data){

		// fake person
		people[socket.id] = {username: 'Mike', gender: 'male', roomId: 1};
		console.log(data);

		// check if the username has already been taken
		for(var key in people) {
			if(people[key].username.toLowerCase() === data.username.toLowerCase()) {
				socket.emit("login response", {success: false, msg: ' That username has already been taken. Please choose another.'});
				return;
			}
		}

		// create person
		people[socket.id] = {username: data.username, gender: data.gender, roomId: null};

		// update user count
		io.sockets.emit('update', {type: 'user_count', count: _.size(people)});
		socket.emit('update', {type: 'room_list', rooms: rooms });
		socket.emit('login response', {success: true});
	
	});

	socket.on('join room', function(roomId) {

		// check if user is already in a room
		if(people[socket.id].roomId !== null) {
			socket.emit('join room response', {success: false, msg: 'You cannot join this room because you are currently in a room. Please leave that room first and try again.'});
			return;
		}

		//update room and person hashs
		rooms[roomId].people.push(socket.id)
		people[socket.id].roomId = roomId;

		// generate people list to send to client
		var peopleInRoom = [];
		var id;
		peopleInRoomById = rooms[roomId].people;
		for(var i = 0; i < peopleInRoomById.length; i++) {
			id = peopleInRoomById[i];
			peopleInRoom.push(people[id]);
		}

		socket.emit('join room response', {success: true, roomId: roomId, people: peopleInRoom});
		socket.emit("message", {type: 'alert', msg: "You have joined the room "+rooms[roomId].name+"."});
		io.sockets.in(roomId).emit("message", {type: 'alert', msg: people[socket.id].username + " has entered the room."});
		socket.join(roomId);

		io.sockets.emit('update', {type: 'room_count', roomId: roomId, roomCount: rooms[roomId].people.length});
		/* UPDATE ROOM HISTORY
		for(var i = 0; i < history.length; i++) {
			socket.emit('message', history[i]);
		}
		*/
	});

	socket.on('message', function(data){
		person = people[socket.id];
		var username = person.username;
		var msgData = {type: 'chat', msg: data, username : username};
		rooms[person.roomId].history.push(msgData);
		socket.broadcast.to(person.roomId).emit('message', msgData);
	});

	socket.on('disconnect', function(){
		if(people[socket.id] !== undefined) {  // only handle diconnects from people logged in
			var username = people[socket.id].username;
			delete people[socket.id];
			io.sockets.emit('update', {type: 'user_count', count: Object.keys(people).length});
			var msgData = {type: 'alert', msg: username+" has left the room."};
			//history.push(msgData);
			io.sockets.emit("message", msgData);
			io.sockets.emit('update', {type: 'user_list',list: getUserList() });
		}
	});
});