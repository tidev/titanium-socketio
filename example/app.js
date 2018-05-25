// This is a test harness for your module
// You should do something interesting in this harness
// to test out the module and to provide instructions
// to users on how to use it by example.


// open a single window
var win = Ti.UI.createWindow({
	backgroundColor: 'white'
});
var label = Ti.UI.createLabel({text: 'SocketIO'});
win.add(label);
win.open();

var io = require('ti.socketio');
var socket = io.connect("http://localhost:8080/");
label.text = 'Connecting ...';
socket.on('connect', function() {
	label.text = 'Socket connected';

	socket.emit('hello', 'world');
});
