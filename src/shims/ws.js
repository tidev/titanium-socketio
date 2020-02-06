/**
 * Minimal WebSocket implementation using Ti.Network.Socket.TCP.
 *
 * Heavily inspired by Starscream (https://github.com/daltoniam/Starscream/)
 * and ws (https://github.com/websockets/ws)
 */

import EventEmiter from 'eventemitter3';
import url from './url';

const Url = url.Url;

const OpcodeContinueFrame = 0x0;
const OpcodeTextFrame = 0x1;
const OpcodeBinaryFrame = 0x2;
const OpcodeConnectionClose = 0x8;
const OpcodePing = 0x9;
const OpcodePong = 0xA;

const FinMask = 0x80;
const OpcodeMask = 0x0F;
const MaskMask = 0x80;
const PayloadLengthMask = 0x7F;

const protocolVersions = [ 8, 13 ];
const closeTimeout = 30 * 1000;
const CloseCode = {
	protocolError: 1002,
	noStatus: 1005,
	abnormal: 1006
};
const mask = Buffer.alloc(4);
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function randomBytes(length) {
	if (Ti.Utils.randomBytes) {
		return Buffer.from(Ti.Utils.randomBytes(length));
	} else {
		const randomBytes = Buffer.alloc(length);
		for (let i = 0; i < length; i++) {
			randomBytes[i] = Math.floor(Math.random() * Math.floor(255));
		}
		return randomBytes;
	}
}

function randomFillSync(target, offset, length) {
	const bytes = randomBytes(length);
	bytes.copy(target, offset, 0, length);
}

function applyMask(source, mask, output, offset, length) {
	for (let i = 0; i < length; i++) {
		output[offset + i] = source[i] ^ mask[i & 3];
	}
}

class WebSocketResponse {
	constructor() {
		this.isFin = false;
		this.opcode = OpcodeContinueFrame;
		this.bytesLeft = 0;
		this.frameCount = 0;
		this.buffer = null;
	}
}

class ResponseStack {
	constructor() {
		this.stack = [];
	}

	get length() {
		return this.stack.length;
	}

	get last() {
		if (this.length > 0) {
			return this.stack[this.length - 1];
		}

		return null;
	}

	push(response) {
		this.stack.push(response);
	}

	pop() {
		return this.stack.pop();
	}
}

class Sender {
	constructor(socket) {
		this.socket = socket;
		this.firstFragment = true;
	}

	send(data, options, cb) {
		const buffer = Buffer.from(data);
		const perMessageDeflate = false;
		let opcode = options.binary ? OpcodeBinaryFrame : OpcodeTextFrame;
		let rsv1 = options.compress;

		if (this.firstFragment) {
			this.firstFragment = false;
			// @todo support perMessageDeflate
		} else {
			rsv1 = false;
			opcode = OpcodeContinueFrame;
		}

		if (options.fin) {
			this.firstFragment = true;
		}

		this.sendFrame(this.createFrameBuffer({
			data: buffer,
			opcode,
			fin: options.fin,
			rsv1
		}), cb);
	}

	pong(data, cb) {
		const buffer = Buffer.from(data);
		this.sendFrame(this.createFrameBuffer({
			data: buffer,
			opcode: OpcodePong,
			fin: true,
			rsv1: false
		}), cb);
	}

	close(code, reason, cb) {
		let data;
		if (code === undefined) {
			data = Buffer.allocUnsafe(0);
		} else if (typeof code !== 'number') {
			throw new TypeError('Closing code must be a valid error code number');
		} else if (reason === undefined || reason === '') {
			data = Buffer.allocUnsafe(2);
			data.writeUInt16BE(code, 0);
		} else {
			data = Buffer.allocUnsafe(2 + Buffer.byteLength(reason));
			data.writeUInt16BE(code, 0);
			data.write(reason, 2);
		}

		this.sendFrame(this.createFrameBuffer({
			data,
			opcode: OpcodeConnectionClose,
			fin: true,
			rsv1: false
		}), cb);
	}

	sendFrame(frame, cb) {
		this.socket.write(frame._tiBuffer, 0, frame.length, () => {
			if (cb) {
				cb();
			}
		});
	}

	/**
	 * Creates a buffer containing the framed data
	 *
	 * @param {Object} options Options for the frame
	 * @param {Buffer} options.data The data to frame
	 * @param {Number} options.opcode Frame opcode
	 * @param {Boolean} options.fin Specifies whether or not to set the FIN bit
	 * @param {Boolean} options.rsv1 Specifies whether or not to set the RSV1 bit
	 * @return {Buffer}
	 */
	createFrameBuffer(options) {
		const data = options.data;
		let offset = 6;
		let payloadLength = data.length;

		if (data.length >= 65536) {
			offset += 8;
			payloadLength = 127;
		} else if (data.length > 125) {
			offset += 2;
			payloadLength = 126;
		}

		const target = Buffer.allocUnsafe(offset);

		target[0] = options.fin ? options.opcode | 0x80 : options.opcode;
		if (options.rsv1) {
			target[0] |= 0x40;
		}

		target[1] = payloadLength;

		if (payloadLength === 126) {
			target.writeUInt16BE(data.length, 2);
		} else if (payloadLength === 127) {
			target.writeUInt32BE(0, 2);
			target.writeUInt32BE(data.length, 6);
		}

		randomFillSync(mask, 0, 4);

		target[1] |= 0x80;
		target[offset - 4] = mask[0];
		target[offset - 3] = mask[1];
		target[offset - 2] = mask[2];
		target[offset - 1] = mask[3];

		applyMask(data, mask, data, 0, data.length);

		return Buffer.concat([ target, data ]);
	}
}

class WebSocket extends EventEmiter {
	/**
	 * Creates a new WebSocket
	 *
	 * @param {String} address The URL to which to connect
	 * @param {String|String[]} protocols The subprotocols
	 * @param {Object} options Connection options
	 */
	constructor(address, protocols, options) {
		super();

		this.connected = false;
		this.responseStack = new ResponseStack();
		this.readyState = WebSocket.CONNECTING;
		this.socket = null;
		this.closeFrameSent = false;
		this.closeFrameReceived = false;

		if (Array.isArray(protocols)) {
			protocols = protocols.join(', ');
		} else if (typeof protocols === 'object' && protocols !== null) {
			options = protocols;
			protocols = undefined;
		}
		this.connect(address, protocols, options);
	}

	static get CONNECTING() {
		return 0;
	}

	static get OPEN() {
		return 1;
	}

	static get CLOSING() {
		return 2;
	}

	static get CLOSED() {
		return 3;
	}

	connect(address, protocols, options) {
		const opts = {
			protocolVersion: protocolVersions[1],
			maxPayload: 100 * 1024 * 1024,
			perMessageDeflate: true,
			followRedirects: false,
			maxRedirects: 10,
			...options,
			createConnection: undefined,
			socketPath: undefined,
			hostname: undefined,
			protocol: undefined,
			timeout: undefined,
			method: undefined,
			auth: undefined,
			host: undefined,
			path: undefined,
			port: undefined
		};

		let parsedUrl;

		if (address instanceof Url) {
			parsedUrl = address;
			this.url = address.href;
		} else {
			parsedUrl = url.parse(address);
			this.url = address;
		}

		const isUnixSocket = parsedUrl.protocol === 'ws+unix:';
		if ((!parsedUrl.host && !parsedUrl.pathname) || isUnixSocket) {
			throw new Error(`Invalid URL: ${this.url}`);
		}

		const isSecure = parsedUrl.protocol === 'wss:' || parsedUrl.protocol === 'https:';
		const defaultPort = isSecure ? 443 : 80;
		this.secWebSocketKey = this.generateSecWebSocketKey();

		opts.defaultPort = opts.defaultPort || defaultPort;
		opts.port = parsedUrl.port || defaultPort;
		opts.host = parsedUrl.hostname.startsWith('[')
			? parsedUrl.hostname.slice(1, -1)
			: parsedUrl.hostname;
		opts.headers = {
			'Sec-WebSocket-Version': opts.protocolVersion,
			'Sec-WebSocket-Key': this.secWebSocketKey,
			Connection: 'Upgrade',
			Upgrade: 'websocket',
			...opts.headers
		};
		opts.path = parsedUrl.pathname + parsedUrl.search;
		opts.timeout = opts.handshakeTimeout;

		if (opts.perMessageDeflate) {
			Ti.API.warn('WebSocket option "perMessageDeflate" is currently not supported in Titanium.');
			/*
			@todo support PerMessageDeflate
			perMessageDeflate = new PerMessageDeflate(
				opts.perMessageDeflate !== true ? opts.perMessageDeflate : {},
				false,
				opts.maxPayload
			);
			opts.headers['Sec-WebSocket-Extensions'] = format({
				[PerMessageDeflate.extensionName]: perMessageDeflate.offer()
			});
			*/
		}

		if (protocols) {
			opts.headers['Sec-WebSocket-Protocol'] = protocols;
		}
		if (opts.origin) {
			if (opts.protocolVersion < 13) {
				opts.headers['Sec-WebSocket-Origin'] = opts.origin;
			} else {
				opts.headers.Origin = opts.origin;
			}
		}
		if (parsedUrl.username || parsedUrl.password) {
			opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
		}
		this.options = opts;

		const self = this;
		this.socket = Ti.Network.Socket.createTCP({
			host: opts.host,
			port: opts.port,
			timeout: opts.timeout,
			connected: e => {
				this.sender = new Sender(this.socket);
				this.performWsHandshake();
				Ti.Stream.pump(self.socket, self.processInputStream.bind(self), 64 * 1024, true);
			},
			error: e => {
				this.readyState = WebSocket.CLOSING;
				this.emit('error', e.error);
				this.emitClose();
			}
		});
		this.socket.connect();
	}

	send(data) {
		if (this.readyState === WebSocket.CONNECTING) {
			throw new Error('WebSocket is not open: current readyState CONNECTING');
		}

		if (typeof data === 'number') {
			data = data.toString();
		}

		const options = {
			binary: typeof data !== 'string',
			compress: false,
			fin: true
		};

		this.sender.send(data, options);
	}

	close(code, reason) {
		if (this.readyState === WebSocket.CLOSED) {
			return;
		}
		if (this.readyState === WebSocket.CONNECTING) {
			const msg = 'WebSocket was closed before the connection was established';
			return abortHandshake(this, msg);
		}

		const closeSocket = () => {
			this.socket.close();
			this.emitEvent('close', {
				code,
				reason
			});
		};

		if (this.readyState = WebSocket.CLOSING) {
			if (this.closeFrameSent && this.closeFrameReceived) {
				closeSocket();
			}
		}

		this.readyState = WebSocket.CLOSING;
		this.sender.close(code, reason, err => {
			this.closeFrameSent = true;
			if (this.closeFrameReceived) {
				closeSocket();
			}
		});
	}

	generateSecWebSocketKey() {
		return randomBytes(16).toString('base64');
	}

	emitClose(code = 1006, message = '') {
		this.readyState = WebSocket.CLOSED;

		this.emit('close', code, message);
	}

	disconnectAndEmitError(error, closeCode) {
		this.emitEvent('error', error);
		this.close(closeCode || CloseCode.abnormal, error.message);
	}

	performWsHandshake() {
		let httpHeader = `GET ${this.options.path} HTTP/1.1\r\n`;
		httpHeader += `Host: ${this.options.host}\r\n`;
		Object.keys(this.options.headers).forEach(headerName => {
			const headerValue = this.options.headers[headerName];
			httpHeader += `${headerName}: ${headerValue}\r\n`;
		});
		httpHeader += '\r\n';
		const data = Ti.createBuffer({
			value: httpHeader
		});
		this.socket.write(data, () => {});
	}

	processHandshake(buffer) {
		Ti.API.debug('[WebSocket] Processing WebSocket handshake');
		const response = buffer.toString();
		if (response.indexOf('HTTP/1.1 101') === -1) {
			abortHandshake(this, 'Invalid HTTP status code received during WebSocket hanshake.');
			return;
		}

		const headers = {};
		const headerPattern = /([\w-]+): (.*)/g;
		let match;
		while (match = headerPattern.exec(response)) {
			headers[match[1].toLowerCase()] = match[2];
		}
		const secWebSocketAccept = headers['sec-websocket-accept'];
		const hash = Buffer.from(Ti.Utils.sha1(this.secWebSocketKey + GUID), 'hex').toString('base64');
		if (hash !== secWebSocketAccept) {
			abortHandshake(this, 'Invalid Sec-WebSocket-Accept header');
			return;
		}

		this.connected = true;
		this.readyState = WebSocket.OPEN;

		this.emitEvent('open');
	}

	processInputStream(e) {
		if (e.bytesProcessed === -1 && this.connected) {
			this.readyState = WebSocket.CLOSED;
			return this.disconnectAndEmitError(new Error('Unexpected error or EOF on socket during input stream processing.'));
		}

		try {
			if (e.buffer) {
				Ti.API.debug(`[WebSocket] Received ${e.buffer.length} bytes`);
				if (this.connected) {
					this.processDataFramesInBuffer(e.buffer);
				} else {
					this.processHandshake(e.buffer);
				}
			} else {
				Ti.API.error('Error: read callback called with no buffer!');
			}
		} catch (ex) {
			Ti.API.error(ex);
		}
	}

	processDataFramesInBuffer(buffer) {
		while (buffer.length >= 2) {
			buffer = this.processDataFrame(buffer);
		}
		if (buffer.length > 0) {
			Ti.API.error('still fragmented data in buffer');
		}
	}

	processDataFrame(buffer) {
		let response = this.responseStack.last;
		const bufferLength = buffer.length;
		const isFin = (FinMask & buffer[0]) !== 0;
		const opcode = OpcodeMask & buffer[0];
		const isMasked = (MaskMask & buffer[1]) !== 0;
		const payloadLength = PayloadLengthMask & buffer[1];
		let payloadDataOffset = 2;

		if (isMasked) {
			return this.disconnectAndEmitError(new Error('Received masked data from server'), CloseCode.protocolError);
		}

		const isControlFrame = opcode === OpcodeConnectionClose || opcode === OpcodePing;
		// @todo check for valid opcode

		if (isControlFrame && isFin === false) {
			return this.disconnectAndEmitError(new Error('Control frames can\'t be fragmented.'), CloseCode.protocolError);
		}

		let payloadDataLength = payloadLength;
		if (payloadLength === 126) {
			payloadDataLength = buffer[2] << 8 | buffer[3] & 0xffff;
			payloadDataOffset += 2;
		} else if (payloadLength === 127) {
			// @todo: handle extended payload length of 64 bit unsinged int
			throw new Error('unsupported payload length of 64 bit unsinged int');
		}
		let framePayloadDataLength = payloadDataLength;
		if (framePayloadDataLength > bufferLength) {
			framePayloadDataLength = bufferLength - payloadDataOffset;
		}

		const data = buffer.clone(payloadDataOffset, payloadDataLength);

		let isNewResponse = false;
		if (response === null) {
			isNewResponse = true;
			response = new WebSocketResponse();
			response.opcode = opcode;
			response.bytesLeft = payloadDataLength;
			response.buffer = data;
		} else {
			if (opcode === OpcodeContinueFrame) {
				response.bytesLeft = payloadDataLength;
			} else {
				this.disconnectAndEmitError(new Error('A frame after a fragmeneted message must be a continue frame.'));
			}
			response.buffer.append(data);
		}

		response.bytesLeft -= framePayloadDataLength;
		response.frameCount += 1;
		response.isFin = isFin;
		if (isNewResponse) {
			this.responseStack.push(response);
		}

		this.processResponse(response);

		const nextFrameOffset = payloadDataOffset + framePayloadDataLength;
		return buffer.clone(nextFrameOffset, buffer.length - nextFrameOffset);
	}

	/**
	 * @todo Move this to a class that handles received frames
	 *
	 * @param {WebSocketResponse} response
	 */
	processResponse(response) {
		Ti.API.debug(`[WebSocket] Processing response: ${JSON.stringify(response)}`);
		if (response.isFin && response.bytesLeft <= 0) {
			if (response.opcode === OpcodePing) {
				Ti.API.debug(`[WebSocket] Ping received: ${response.buffer.toString()}`);
			} else if (response.opcode === OpcodeConnectionClose) {
				let closeReason = 'connection closed by server';
				let closeCode;
				const data = response.buffer;
				if (data.length === 0) {
					closeCode = CloseCode.noStatus;
				} else if (data.length === 1) {
					throw new RangeError('Invalid payload length 1');
				} else {
					closeCode = data.readUInt16BE(0);
					// @todo validate status code
					const buf = data.slice(2);
					closeReason = buf.toString();
				}

				this.closeFrameReceived = true;

				if (closeCode === CloseCode.noStatus) {
					this.close();
				} else {
					this.close(closeCode, closeReason);
				}
			} else if (response.opcode === OpcodeTextFrame) {
				const message = response.buffer.toString();
				this.emitEvent('message', {
					data: message
				});
			} else if (response.opcode === OpcodeBinaryFrame) {
				const data = Buffer.from(response.buffer);
				this.emitEvent('message', {
					data
				});
			}

			this.responseStack.pop();
		}
	}

	emitEvent(name, data) {
		const callbackPropertyName = `on${name}`;
		if (this[callbackPropertyName]) {
			this[callbackPropertyName](data);
		}

		this.emit(name, data);
	}
}

function abortHandshake(webSocket, msg) {
	webSocket.readyState = WebSocket.CLOSING;

	if (webSocket.socket.state === Ti.Network.Socket.CONNECTED) {
		webSocket.socket.close();
	}

	webSocket.emitClose(CloseCode.abnormal, msg);
}

module.exports = WebSocket;
