if (!global.Buffer) {
	const { Buffer } = require('./shims/buffer');
	global.Buffer = Buffer;
}
const io = require('socket.io-client');
export default io;
