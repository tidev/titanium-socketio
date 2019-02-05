const io = require('socket.io');

let createSocketIOServer = (config, loggerFactory) => {
	const logger = loggerFactory.create('socket.io-server');

	const port = 3210;
	let server = io(port, { pingInterval: 2000 });
	logger.info('Socket.IO server started on port', port);

	server.of('/foo').on('connection', socket => {
		socket.on('socketid', cb => {
			cb(socket.id);
		});
	});

	server.of('/asd').on('connection', socket => {
		// register namespace
	});

	server.of('/timeout_socket').on('connection', () => {
		// register namespace
	});

	server.of('/valid').on('connection', () => {
		// register namespace
	});

	// query tests
	server.of('/abc').on('connection', socket => {
		socket.emit('handshake', socket.handshake);
	});

	// middleware test
	server.use((socket, next) => {
		if (socket.request._query.fail) {
			return next(new Error('Auth failed (main namespace)'));
		}
		next();
	});
	server.of('/no').use(function (socket, next) {
		next(new Error('Auth failed (custom namespace)'));
	});

	server.on('connection', socket => {
		socket.on('hi', () => {
			socket.emit('hi');
		});

		// ack tests
		socket.on('ack', () => {
			socket.emit('ack', (a, b) => {
				if (a === 5 && b.test) {
					socket.emit('got it');
				}
			});
		});

		socket.on('getAckDate', (data, cb) => {
			cb(new Date());
		});

		socket.on('getDate', () => {
			socket.emit('takeDate', new Date());
		});

		socket.on('getDateObj', () => {
			socket.emit('takeDateObj', { date: new Date() });
		});

		// false test
		socket.on('false', function () {
			socket.emit('false', false);
		});

		socket.on('getUtf8', function () {
			socket.emit('takeUtf8', 'てすと');
			socket.emit('takeUtf8', 'Я Б Г Д Ж Й');
			socket.emit('takeUtf8', 'Ä ä Ü ü ß');
			socket.emit('takeUtf8', 'utf8 — string');
			socket.emit('takeUtf8', 'utf8 — string');
		});

		socket.on('getHandshake', cb => {
			cb(socket.handshake);
		});

		socket.on('socketid', cb => {
			cb(socket.id);
		});
	});
};

createSocketIOServer.$inject = [ 'config', 'logger' ];

// PUBLISH DI MODULE
module.exports = {
	'framework:socket.io-server': [ 'factory', createSocketIOServer ]
};
