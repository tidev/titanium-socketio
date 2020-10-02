const io = require('ti.socketio');
const host = Ti.Platform.osname === 'android' ? '10.0.2.2' : 'localhost';
const port = '3210';
const url = `http://${host}:${port}`;

describe('connection', () => {
	let socket;
	let manager;
	afterEach(() => {
		if (socket) {
			socket.off(); // remove all listeners
			if (socket.connected) {
				socket.disconnect();
			}
		}
		if (manager) {
			manager.disconnect();
		}
	});

	// this test needs to come first so no other existing managers interfere
	it('should use single connection when connecting different namespaces', () => {
		const s1 = io.connect(url);
		const s2 = io.connect(url + '/foo');

		try {
			expect(s1.io).toBe(s2.io);
		} finally {
			s1.disconnect();
			s2.disconnect();
		}
	});

	it('should emit connect event on successful connect', done => {
		socket = io.connect(url, { forceNew: true, autoConnect: false });
		socket.on('connect', () => done());
		socket.connect();
	});

	it('should emit error if host not reachable', done => {
		socket = io.connect('http://localhost:8080/', { forceNew: true });
		socket.on('connect_error', () => done());
	});

	it('should not connect when autoConnect option set to false', () => {
		socket = io.connect(url, { autoConnect: false, forceNew: true });

		expect(socket.connected).toBeFalsy();
	});

	it('should start two connections with same path', () => {
		const s1 = io.connect(url);
		const s2 = io.connect(url);

		try {
			expect(s1.io).not.toBe(s2.io);
		} finally {
			s1.disconnect();
			s2.disconnect();
		}
	});

	it('should start two connections with same path and different querystrings', () => {
		const s1 = io.connect(url + '/?woot');
		const s2 = io.connect(url + '/');

		try {
			expect(s1.io).not.toBe(s2.io);
		} finally {
			s1.disconnect();
			s2.disconnect();
		}
	});

	xit('should work with acks', done => {
		socket = io.connect(url, { forceNew: true });
		socket.on('ack', function (fn) {
			fn(5, { test: true });
		});
		socket.on('got it', () => done());
		socket.on('connect', () => socket.emit('ack'));
	});

	xit('should receive date with ack', done => {
		socket = io.connect(url, { forceNew: true });
		socket.on('connect', () => {
			socket.emit('getAckDate', { test: true }, function (data) {
				expect(data).toBe(jasmine.any(String));
				done();
			});
		});
	});

	it('should work with false', done => {
		socket = io.connect(url, { forceNew: true });
		socket.on('false', f => {
			expect(f).toBe(false);
			done();
		});
		socket.on('connect', () => socket.emit('false'));
	});

	it('should receive utf8 multibyte characters', done => {
		const correct = [
			'てすと',
			'Я Б Г Д Ж Й',
			'Ä ä Ü ü ß',
			'utf8 — string',
			'utf8 — string'
		];

		socket = io.connect(url, { forceNew: true });
		let i = 0;
		socket.on('takeUtf8', data => {
			expect(data).toBe(correct[i]);
			i++;
			if (i === correct.length) {
				done();
			}
		});
		socket.on('connect', () => socket.emit('getUtf8'));
	});

	it('should connect to a namespace after connection established', done => {
		manager = io.Manager(url);
		socket = manager.socket('/');
		socket.once('connect', () => {
			const foo = manager.socket('/foo');
			foo.once('connect', () => {
				foo.close();
				done();
			});
		});
	});

	it('should open a new namespace after connection gets closed', done => {
		manager = io.Manager(url);
		socket = manager.socket('/');
		socket.once('connect', () => {
			socket.disconnect();
		}).once('disconnect', () => {
			const foo = manager.socket('/foo');
			foo.once('connect', () => {
				foo.disconnect();
				done();
			});
		});
	});

	it('should reconnect manually', done => {
		socket = io.connect(url, { forceNew: true });
		socket.once('connect', () => {
			socket.disconnect();
		}).once('disconnect', () => {
			socket.once('connect', () => done());
			socket.connect();
		});
	});

	it('should not reconnect when force closed', done => {
		if (Ti.Platform.osname !== 'android') {
			pending('test requirements not applicable on iOS');
		}

		socket = io.connect(url + '/invalid', { forceNew: true, timeout: 0, reconnectionDelay: 10 });
		socket.on('connect_error', () => {
			function failCase() {
				done.fail('Fired reconnect_attempt on socket while disconnecting');
			}
			socket.on('reconnect_attempt', failCase);
			socket.disconnect();
			// set a timeout to let reconnection possibly fire
			setTimeout(() => {
				socket.off('reconnect_attempt', failCase);
				done();
			}, 500);
		});
	});

	it('should stop reconnecting when force closed', done => {
		if (Ti.Platform.osname !== 'android') {
			pending('test requirements not applicable on iOS');
		}

		socket = io.connect(url + '/invalid', { forceNew: true, timeout: 0, reconnectionDelay: 10 });
		socket.once('reconnect_attempt', () => {
			function failCase () {
				done.fail('Fired reconnect_attempt on socket while disconnecting');
			}
			socket.on('reconnect_attempt', failCase);
			socket.disconnect();
			// set a timeout to let reconnection possibly fire
			setTimeout(() => {
				socket.off('reconnect_attempt', failCase);
				done();
			}, 500);
		});
	});

	it('should reconnect after stopping reconnection', done => {
		if (Ti.Platform.osname !== 'android') {
			pending('test requirements not applicable on iOS');
		}

		socket = io.connect(url + '/invalid', { forceNew: true, timeout: 0, reconnectionDelay: 10 });
		socket.once('reconnect_attempt', () => {
			socket.once('reconnect_attempt', ()  => done());
			socket.disconnect();
			socket.connect();
		});
	});

	xit('should fire reconnect_* events on socket', done => {
		manager = io.Manager(url, { reconnection: true, timeout: 0, reconnectionAttempts: 2, reconnectionDelay: 10 });
		socket = manager.socket('/timeout_socket');

		let reconnects = 0;
		const reconnectCb = attempts => {
			reconnects++;
			expect(attempts).toBe(reconnects);
		};

		socket.on('reconnect_attempt', reconnectCb);
		socket.on('reconnect_failed', function failed () {
			expect(reconnects).toBe(2);
			done();
		});
	});

	xit('should fire reconnecting (on socket) with attempts number when reconnecting twice', done => {
		manager = io.Manager(url, { reconnection: true, timeout: 0, reconnectionAttempts: 2, reconnectionDelay: 10 });
		socket = manager.socket('/timeout_socket');

		let reconnects = 0;
		const reconnectCb = attempts => {
			reconnects++;
			expect(attempts).toBe(reconnects);
		};

		socket.on('reconnecting', reconnectCb);
		socket.on('reconnect_failed', () => {
			expect(reconnects).toBe(2);
			done();
		});
	});

	it('should connect while disconnecting another socket', done => {
		manager = io.Manager(url);
		socket = manager.socket('/foo');
		socket.on('connect', () => {
			const socket2 = manager.socket('/asd');
			socket2.once('connect', () => {
				socket2.disconnect();
				done();
			});
			socket.disconnect();
		});
	});

	it('should emit date as string', done => {
		socket = io.connect(url, { forceNew: true });
		socket.on('takeDate', data => {
			expect(data).toEqual(jasmine.any(String));
			done();
		});
		socket.on('connect', () => socket.emit('getDate'));
	});

	it('should emit date in object', done => {
		socket = io.connect(url, { forceNew: true });
		socket.on('takeDateObj', data => {
			expect(data).toEqual(jasmine.any(Object));
			expect(data.date).toEqual(jasmine.any(String));
			done();
		});
		socket.on('connect', () => socket.emit('getDateObj'));
	});
});
