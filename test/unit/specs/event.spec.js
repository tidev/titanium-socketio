const io = require('ti.socketio');
const host = Ti.Platform.osname === 'android' ? '10.0.2.2' : 'localhost';
const port = '3210';
const url = `http://${host}:${port}`;

describe('event', () => {
	let socket;
	afterEach(() => {
		if (socket && socket.connected) {
			socket.disconnect();
		}
	});

	it('should emit and receive simple events', done => {
		socket = io.connect(url, { forceNew: true });
		socket.on('hi', () => done());
		socket.on('connect', () => socket.emit('hi'));
	});

	it('should remove all event handlers', done => {
		socket = io.connect(url, { forceNew: true });
		socket.on('hi', () => {
			done.fail('Unexpected event');
		});
		socket.on('hi', () => {
			done.fail('Unexpected event');
		});
		socket.on('connect', () => {
			socket.off();
			socket.emit('hi');
			setTimeout(done, 500);
		});
	});

	it('should remove all handlers of the specified event', done => {
		socket = io.connect(url, { forceNew: true });
		const echoSpy = jasmine.createSpy('echo');
		socket.on('hi', () => {
			done.fail('Unexpected event');
		});
		socket.on('echo', echoSpy);
		socket.on('connect', () => {
			socket.off('hi');
			socket.emit('hi');
			socket.emit('echo', 'test');
			setTimeout(() => {
				expect(echoSpy).toHaveBeenCalled();
				done();
			}, 500);
		});
	});

	it('should remove single event handler', done => {
		socket = io.connect(url, { forceNew: true });
		const firstSpy = jasmine.createSpy('first');
		const secondSpy = jasmine.createSpy('second');
		socket.on('hi', firstSpy);
		socket.on('hi', secondSpy);
		socket.on('connect', () => {
			socket.off('hi', secondSpy);
			socket.emit('hi');
			setTimeout(() => {
				expect(firstSpy).toHaveBeenCalled();
				expect(secondSpy).not.toHaveBeenCalled();
				done();
			}, 500);
		});
	});
});
