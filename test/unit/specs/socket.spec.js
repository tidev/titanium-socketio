import io from '../../../src/index';

describe('socket', function () {
	this.timeout(7000);

	it('should have an accessible socket id equal to the server-side socket id (default namespace)', function (done) {
		var socket = io({ forceNew: true });
		socket.on('connect', function () {
			expect(socket.id).to.be.a('string').and.to.equal(socket.io.engine.id);
			socket.disconnect();
			done();
		});
	});

	it('should have an accessible socket id equal to the server-side socket id (custom namespace)', function (done) {
		var socket = io('/foo', { forceNew: true });
		socket.on('connect', function () {
			expect(socket.id).to.be.a('string').and.to.equal('/foo#' + socket.io.engine.id);
			socket.disconnect();
			done();
		});
	});

	it('clears socket.id upon disconnection', function (done) {
		var socket = io({ forceNew: true });
		socket.on('connect', function () {
			socket.on('disconnect', function () {
				expect(socket.id).to.not.be.a('string');
				done();
			});

			socket.disconnect();
		});
	});

	it('doesn\'t fire a connect_error if we force disconnect in opening state', function (done) {
		var socket = io({ forceNew: true, timeout: 100 });
		socket.disconnect();
		socket.on('connect_error', function () {
			throw new Error('Unexpected');
		});
		setTimeout(function () {
			done();
		}, 300);
	});

	it('should ping and pong with latency', function (done) {
		var socket = io({ forceNew: true });
		socket.on('connect', function () {
			var pinged;
			socket.once('ping', function () {
				pinged = true;
			});
			socket.once('pong', function (ms) {
				expect(pinged).to.equal(true);
				expect(ms).to.be.a('number');
				socket.disconnect();
				done();
			});
		});
	});

	it('should change socket.id upon reconnection', function (done) {
		var socket = io({ forceNew: true });
		socket.on('connect', function () {
			var id = socket.id;

			socket.on('reconnect_attempt', function () {
				expect(socket.id).to.not.be.a('string');
			});

			socket.on('reconnect', function () {
				expect(socket.id).to.not.equal(id);
				socket.disconnect();
				done();
			});

			socket.io.engine.close();
		});
	});

	it('should enable compression by default', function (done) {
		var socket = io({ forceNew: true });
		socket.on('connect', function () {
			socket.io.engine.once('packetCreate', function (packet) {
				expect(packet.options.compress).to.equal(true);
				socket.disconnect();
				done();
			});
			socket.emit('hi');
		});
	});

	it('should disable compression', function (done) {
		var socket = io({ forceNew: true });
		socket.on('connect', function () {
			socket.io.engine.once('packetCreate', function (packet) {
				expect(packet.options.compress).to.equal(false);
				socket.disconnect();
				done();
			});
			socket.compress(false).emit('hi');
		});
	});

	describe('query option', function () {
		it('should accept an object (default namespace)', function (done) {
			var socket = io('/', { forceNew: true, query: { e: 'f' } });

			socket.emit('getHandshake', function (handshake) {
				expect(handshake.query.e).to.equal('f');
				socket.disconnect();
				done();
			});
		});

		it('should accept a query string (default namespace)', function (done) {
			var socket = io('/?c=d', { forceNew: true });

			socket.emit('getHandshake', function (handshake) {
				expect(handshake.query.c).to.equal('d');
				socket.disconnect();
				done();
			});
		});

		it('should accept an object', function (done) {
			var socket = io('/abc', { query: { a: 'b' } });

			socket.on('handshake', function (handshake) {
				expect(handshake.query.a).to.equal('b');
				socket.disconnect();
				done();
			});
		});

		it('should accept a query string', function (done) {
			var socket = io('/abc?b=c&d=e');

			socket.on('handshake', function (handshake) {
				expect(handshake.query.b).to.equal('c');
				expect(handshake.query.d).to.equal('e');
				socket.disconnect();
				done();
			});
		});

		it('should properly encode the parameters', function (done) {
			var socket = io('/abc', { query: { '&a': '&=?a' } });

			socket.on('handshake', function (handshake) {
				expect(handshake.query['&a']).to.equal('&=?a');
				socket.disconnect();
				done();
			});
		});
	});

	it('should fire an error event on middleware failure from main namespace', function (done) {
		var socket = io('/foo', { forceNew: true, query: { fail: true } });
		socket.on('error', function (err) {
			expect(err).to.equal('Auth failed (main namespace)');
			socket.disconnect();
			done();
		});
	});

	it('should fire an error event on middleware failure from custom namespace', function (done) {
		var socket = io('/no', { forceNew: true });
		socket.on('error', function (err) {
			expect(err).to.equal('Auth failed (custom namespace)');
			socket.disconnect();
			done();
		});
	});
});
