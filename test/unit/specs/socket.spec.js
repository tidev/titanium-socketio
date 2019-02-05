const io = require('ti.socketio');
const host = Ti.Platform.osname === 'android' ? '10.0.2.2' : 'localhost';
const port = '3210';
const url = `http://${host}:${port}`;

describe('socket', () => {
	it('should have an accessible socket id equal to the server-side socket id (default namespace)', done => {
		const socket = io.connect(url, { forceNew: true });
		socket.on('connect', () => {
			expect(socket.id).toBeDefined();
			socket.emit('socketid', serverSocketId => {
				expect(socket.id).toBe(serverSocketId);
				socket.disconnect();
				done();
			});
		});
	});

	it('should have an accessible socket id equal to the server-side socket id (custom namespace)', done => {
		const socket = io.connect(url + '/foo', { forceNew: true });
		socket.on('connect', () => {
			expect(socket.id).toBeDefined();
			socket.emit('socketid', serverSocketId => {
				expect(socket.id).toBe(serverSocketId);
				socket.disconnect();
				done();
			});
		});
	});

	it('clears socket.id upon disconnection', done => {
		const socket = io.connect(url, { forceNew: true });
		socket.on('connect', () => {
			socket.on('disconnect', () => {
				expect(socket.id).toBeFalsy();
				done();
			});

			socket.disconnect();
		});
	});

	it('doesn\'t fire an error if we force disconnect in opening state', done => {
		const socket = io.connect(url, { forceNew: true, timeout: 100, reconnection: false });
		socket.disconnect();
		socket.on('error', e => {
			throw new Error(`Unexpected Error: ${e}`);
		});
		setTimeout(done, 300);
	});

	it('should ping and pong with latency', done => {
		if (Ti.Platform.osname !== 'android') {
			pending('unexpected behavior on iOS');
		}

		const socket = io.connect(url, { forceNew: true });
		socket.on('connect', () => {
			let pinged;
			socket.once('ping', () => {
				pinged = true;
			});
			socket.once('pong', ms => {
				expect(pinged).toBeTruthy();
				expect(ms).toEqual(jasmine.any(Number));
				socket.disconnect();
				done();
			});
		});
	});

	describe('query option', () => {
		it('should accept an object (default namespace)', done => {
			const socket = io.connect(url, { forceNew: true, query: { e: 'f' } });
			socket.on('connect', () => {
				socket.emit('getHandshake', handshake => {
					expect(handshake.query.e).toBe('f');
					socket.disconnect();
					done();
				});
			});
		});

		it('should accept a query string (default namespace)', done => {
			const socket = io.connect(url + '/?c=d', { forceNew: true });
			socket.on('connect', () => {
				socket.emit('getHandshake', handshake => {
					expect(handshake.query.c).toBe('d');
					socket.disconnect();
					done();
				});
			});
		});

		it('should accept an object', done => {
			const socket = io.connect(url + '/abc', { forceNew: true, query: { a: 'b' } });
			socket.on('handshake', handshake => {
				expect(handshake.query.a).toBe('b');
				socket.disconnect();
				done();
			});
		});

		it('should accept a query string', done => {
			const socket = io.connect(url + '/abc?b=c&d=e', { forceNew: true });
			socket.on('handshake', handshake => {
				expect(handshake.query.b).toBe('c');
				expect(handshake.query.d).toBe('e');
				socket.disconnect();
				done();
			});
		});

		it('should properly encode the parameters', done => {
			const socket = io.connect(url + '/abc', { forceNew: true, query: { '&a': '&=?a' } });
			socket.on('handshake', handshake => {
				expect(handshake.query['&a']).toBe('&=?a');
				socket.disconnect();
				done();
			});
		});
	});

	xit('should fire an error event on middleware failure from main namespace', done => {
		const socket = io.connect(url + '/foo', { forceNew: true, query: { fail: true } });
		socket.on('error', err => {
			expect(err).toBe('Auth failed (main namespace)');
			socket.disconnect();
			done();
		});
	});

	it('should fire an error event on middleware failure from custom namespace', done => {
		const socket = io.connect(url + '/no', { forceNew: true });
		socket.on('error', err => {
			expect(err).toBe('Auth failed (custom namespace)');
			socket.disconnect();
			done();
		});
	});
});
