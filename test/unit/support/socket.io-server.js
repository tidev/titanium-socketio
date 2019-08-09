const io = require('socket.io');
const { expect } = require('chai');

let createSocketIOServer = (config, loggerFactory) => {
	const logger = loggerFactory.create('socket.io-server');

	const port = 3210;
	let server = io(port, { pingInterval: 2000 });
	logger.info('Socket.IO server started on port', port);

	server.of('/foo').on('connection', function () {
		// register namespace
	});

	server.of('/timeout_socket').on('connection', function () {
		// register namespace
	});

	server.of('/valid').on('connection', function () {
		// register namespace
	});

	server.of('/asd').on('connection', function () {
		// register namespace
	});

	server.of('/abc').on('connection', function (socket) {
		socket.emit('handshake', socket.handshake);
	});

	server.use(function (socket, next) {
		if (socket.request._query.fail) {
			return next(new Error('Auth failed (main namespace)'));
		}
		next();
	});

	server.of('/no').use(function (socket, next) {
		next(new Error('Auth failed (custom namespace)'));
	});

	server.on('connection', function (socket) {
		// simple test
		socket.on('hi', function () {
			socket.emit('hi');
		});

		// ack tests
		socket.on('ack', function () {
			socket.emit('ack', function (a, b) {
				if (a === 5 && b.test) {
					socket.emit('got it');
				}
			});
		});

		socket.on('getAckDate', function (data, cb) {
			cb(new Date());
		});

		socket.on('getDate', function () {
			socket.emit('takeDate', new Date());
		});

		socket.on('getDateObj', function () {
			socket.emit('takeDateObj', { date: new Date() });
		});

		socket.on('getUtf8', function () {
			socket.emit('takeUtf8', 'てすと');
			socket.emit('takeUtf8', 'Я Б Г Д Ж Й');
			socket.emit('takeUtf8', 'Ä ä Ü ü ß');
			socket.emit('takeUtf8', 'utf8 — string');
			socket.emit('takeUtf8', 'utf8 — string');
		});

		// false test
		socket.on('false', function () {
			socket.emit('false', false);
		});

		// binary test
		socket.on('doge', function () {
			var buf = Buffer.from('asdfasdf', 'utf8');
			socket.emit('doge', buf);
		});

		// expect receiving binary to be buffer
		socket.on('buffa', function (a) {
			if (Buffer.isBuffer(a)) {
				socket.emit('buffack');
			}
		});

		// expect receiving binary with mixed JSON
		socket.on('jsonbuff', function (a) {
			expect(a.hello).to.eql('lol');
			expect(Buffer.isBuffer(a.message)).to.eql(true);
			expect(a.goodbye).to.eql('gotcha');
			socket.emit('jsonbuff-ack');
		});

		// expect receiving buffers in order
		var receivedAbuff1 = false;
		socket.on('abuff1', function (a) {
			expect(Buffer.isBuffer(a)).to.eql(true);
			receivedAbuff1 = true;
		});
		socket.on('abuff2', function (a) {
			expect(receivedAbuff1).to.eql(true);
			socket.emit('abuff2-ack');
		});

		// expect sent blob to be buffer
		socket.on('blob', function (a) {
			if (Buffer.isBuffer(a)) {
				socket.emit('back');
			}
		});

		// expect sent blob mixed with json to be buffer
		socket.on('jsonblob', function (a) {
			expect(a.hello).to.eql('lol');
			expect(Buffer.isBuffer(a.message)).to.eql(true);
			expect(a.goodbye).to.eql('gotcha');
			socket.emit('jsonblob-ack');
		});

		// expect blobs sent in order to arrive in correct order
		var receivedblob1 = false;
		var receivedblob2 = false;
		socket.on('blob1', function (a) {
			expect(Buffer.isBuffer(a)).to.eql(true);
			receivedblob1 = true;
		});
		socket.on('blob2', function (a) {
			expect(receivedblob1).to.eql(true);
			expect(a).to.eql('second');
			receivedblob2 = true;
		});
		socket.on('blob3', function (a) {
			expect(Buffer.isBuffer(a)).to.eql(true);
			expect(receivedblob1).to.eql(true);
			expect(receivedblob2).to.eql(true);
			socket.emit('blob3-ack');
		});

		// emit buffer to base64 receiving browsers
		socket.on('getbin', function () {
			var buf = Buffer.from('asdfasdf', 'utf8');
			socket.emit('takebin', buf);
		});

		socket.on('getHandshake', function (cb) {
			cb(socket.handshake);
		});
	});
};

createSocketIOServer.$inject = [ 'config', 'logger' ];

// PUBLISH DI MODULE
module.exports = {
	'framework:socket.io-server': [ 'factory', createSocketIOServer ]
};
