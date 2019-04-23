const io = require('ti.socketio');
const host = Ti.Platform.osname === 'android' ? '10.0.2.2' : 'localhost';
const port = '3210';
const url = `http://${host}:${port}`;

describe('connection', () => {
	// this test needs to come first so no other existing managers interfere
	it('should use single connection when connecting different namespaces', () => {
		const s1 = io.connect(url);
		const s2 = io.connect(url + '/foo');

		expect(s1.io).toBe(s2.io);
		s1.disconnect();
		s2.disconnect();
	});

	it('should emit connect event on successful connect', done => {
		const socket = io.connect(url, { forceNew: true, autoConnect: false });
		socket.on('connect', () => {
			socket.disconnect();
			done();
		});
		socket.connect();
	});

	it('should emit and receive simple events', done => {
		const socket = io.connect(url, { forceNew: true });
		socket.on('hi', () => {
			socket.disconnect();
			done();
		});
		socket.on('connect', () => {
			socket.emit('hi');
		});
	});

	it('should emit error if host not reachable', done => {
		const socket = io.connect('http://localhost:8080/', { forceNew: true });
		socket.on('connect_error', () => {
			socket.disconnect();
			done();
		});
	});

	it('should not connect when autoConnect option set to false', () => {
		const socket = io.connect(url, { autoConnect: false, forceNew: true });
		expect(socket.connected).toBeFalsy();
		socket.disconnect();
	});

	it('should start two connections with same path', () => {
		const s1 = io.connect(url);
		const s2 = io.connect(url);

		expect(s1.io).not.toBe(s2.io);
		s1.disconnect();
		s2.disconnect();
	});

	it('should start two connections with same path and different querystrings', () => {
		const s1 = io.connect(url + '/?woot');
		const s2 = io.connect(url + '/');

		expect(s1.io).not.toBe(s2.io);
		s1.disconnect();
		s2.disconnect();
	});

	xit('should work with acks', done => {
		const socket = io.connect(url, { forceNew: true });
		socket.on('ack', function (fn) {
			fn(5, { test: true });
		});
		socket.on('got it', () => {
			socket.disconnect();
			done();
		});
		socket.on('connect', () => {
			socket.emit('ack');
		});
	});

	xit('should receive date with ack', done => {
		const socket = io.connect(url, { forceNew: true });
		socket.on('connect', () => {
			socket.emit('getAckDate', { test: true }, function (data) {
				expect(data).toBe(jasmine.any(String));
				socket.disconnect();
				done();
			});
		});
	});

	it('should work with false', done => {
		const socket = io.connect(url, { forceNew: true });
		socket.on('false', f => {
			expect(f).toBe(false);
			socket.disconnect();
			done();
		});
		socket.on('connect', () => {
			socket.emit('false');
		});
	});

	it('should receive utf8 multibyte characters', done => {
		const correct = [
			'てすと',
			'Я Б Г Д Ж Й',
			'Ä ä Ü ü ß',
			'utf8 — string',
			'utf8 — string'
		];

		const socket = io.connect(url, { forceNew: true });
		let i = 0;
		socket.on('takeUtf8', data => {
			expect(data).toBe(correct[i]);
			i++;
			if (i === correct.length) {
				socket.disconnect();
				done();
			}
		});
		socket.on('connect', () => {
			socket.emit('getUtf8');
		});
	});

	it('should connect to a namespace after connection established', done => {
		const manager = io.Manager(url);
		const socket = manager.socket('/');
		socket.on('connect', () => {
			const foo = manager.socket('/foo');
			foo.on('connect', () => {
				foo.close();
				socket.close();
				manager.close();
				done();
			});
		});
	});

	it('should open a new namespace after connection gets closed', done => {
		const manager = io.Manager(url);
		const socket = manager.socket('/');
		socket.on('connect', () => {
			socket.disconnect();
		}).on('disconnect', () => {
			const foo = manager.socket('/foo');
			foo.on('connect', () => {
				foo.disconnect();
				manager.close();
				done();
			});
		});
	});

	it('should reconnect manually', done => {
		const socket = io.connect(url, { forceNew: true });
		socket.once('connect', () => {
			socket.disconnect();
		}).once('disconnect', () => {
			socket.once('connect', () => {
				socket.disconnect();
				done();
			});
			socket.connect();
		});
	});

	it('should not reconnect when force closed', done => {
		if (Ti.Platform.osname !== 'android') {
			pending('test requirements not applicable on iOS');
		}

		const socket = io.connect(url + '/invalid', { forceNew: true, timeout: 0, reconnectionDelay: 10 });
		socket.on('connect_error', () => {
			socket.on('reconnect_attempt', () =>  {
				fail();
			});
			socket.disconnect();
			// set a timeout to let reconnection possibly fire
			setTimeout(done, 500);
		});
	});

	it('should stop reconnecting when force closed', done => {
		if (Ti.Platform.osname !== 'android') {
			pending('test requirements not applicable on iOS');
		}

		const socket = io.connect(url + '/invalid', { forceNew: true, timeout: 0, reconnectionDelay: 10 });
		socket.once('reconnect_attempt', () => {
			socket.on('reconnect_attempt', () => {
				fail();
			});
			socket.disconnect();
			// set a timeout to let reconnection possibly fire
			done();
		});
	});

	it('should reconnect after stopping reconnection', done => {
		if (Ti.Platform.osname !== 'android') {
			pending('test requirements not applicable on iOS');
		}

    const socket = io.connect(url + '/invalid', { forceNew: true, timeout: 0, reconnectionDelay: 10 });
    socket.once('reconnect_attempt', () => {
      socket.on('reconnect_attempt', () => {
        socket.disconnect();
        done();
      });
      socket.disconnect();
      socket.connect();
		});
	});

	xit('should fire reconnect_* events on socket', done => {
    const manager = io.Manager(url, { reconnection: true, timeout: 0, reconnectionAttempts: 2, reconnectionDelay: 10 });
    const socket = manager.socket('/timeout_socket');

    let reconnects = 0;
    const reconnectCb = function (attempts) {
			reconnects++;
      expect(attempts).toBe(reconnects);
    };

    socket.on('reconnect_attempt', reconnectCb);
    socket.on('reconnect_failed', function failed () {
      expect(reconnects).toBe(2);
      socket.close();
      manager.close();
      done();
		});
  });

  xit('should fire reconnecting (on socket) with attempts number when reconnecting twice', done => {
    const manager = io.Manager(url, { reconnection: true, timeout: 0, reconnectionAttempts: 2, reconnectionDelay: 10 });
    const socket = manager.socket('/timeout_socket');

    let reconnects = 0;
    const reconnectCb =  attempts => {
      reconnects++;
      expect(attempts).toBe(reconnects);
    };

    socket.on('reconnecting', reconnectCb);
    socket.on('reconnect_failed', () => {
      expect(reconnects).toBe(2);
      socket.close();
      manager.close();
      done();
		});
  });

  it('should connect while disconnecting another socket', done => {
    const manager = io.Manager(url);
    const socket1 = manager.socket('/foo');
    socket1.on('connect', () => {
      const socket2 = manager.socket('/asd');
      socket2.on('connect', done);
      socket1.disconnect();
    });
	});

	it('should emit date as string', done => {
    const socket = io.connect(url, { forceNew: true });
    socket.on('takeDate', data => {
      socket.close();
      expect(data).toEqual(jasmine.any(String));
      done();
    });
    socket.on('connect', () => {
			socket.emit('getDate');
		});
  });

  it('should emit date in object', done => {
    const socket = io.connect(url, { forceNew: true });
    socket.on('takeDateObj', data => {
      socket.close();
      expect(data).toEqual(jasmine.any(Object));
      expect(data.date).toEqual(jasmine.any(String));
      done();
    });
		socket.on('connect', () => {
			socket.emit('getDateObj');
		});
  });
});
