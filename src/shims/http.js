import { Readable, Writable } from 'readable-stream';

import url from './url';
import { assertArgumentType } from './_errors';

const tokenRegExp = /^[\^_`a-zA-Z\-0-9!#$%&'*+.|~]+$/;
/**
 * Verifies that the given val is a valid HTTP token
 * per the rules defined in RFC 7230
 * See https://tools.ietf.org/html/rfc7230#section-3.2.6
 *
 * @param {String} val Token string to validate
 * @return {Boolean} True if the token is falid, false if not.
 */
function checkIsHttpToken(val) {
	return tokenRegExp.test(val);
}

class OutgoingMessage extends Writable {
	constructor() {
		super({
			decodeStrings: false,
			write(chunk, encoding, callback) {
				if (typeof chunk === 'string') {
					chunk = Buffer.from(chunk, encoding);
				} else {
					this._hasBinaryContent = true;
				}

				if (!this._stream) {
					this._buffer.length = chunk.length;
					this._stream = Ti.Stream.createStream({
						mode: Ti.Stream.MODE_WRITE,
						source: this._buffer
					});
				}

				this._stream.write(chunk._tiBuffer, result => {
					if (result.success) {
						return callback();
					}

					callback(new Error(`Could not write outgoing message data. ${result.error}`));
				});
			},
			finish() {
				this._stream.close();
			}
		});

		this._hasBinaryContent = false;
		this._buffer = Ti.createBuffer();
	}
}

class IncomingMessage extends Readable {
	constructor() {
		super({
			read() {
				// noop for now, we manually push data into the stream in the ClientRequest
			}
		});

		this.aborted = false;
		this.complete = false;
		this.headers = {};
	}
}

class ClientRequest extends OutgoingMessage {
	/**
	 *
	 * @param {*} input
	 * @param {*} options
	 * @param {*} cb
	 */
	constructor(input, options, cb) {
		super();

		if (typeof input === 'string') {
			const urlStr = input;
			input = urlToOptions(url.parse(urlStr));
			if (!input.hostname) {
				throw Error(`Invalid URL ${urlStr}`);
			}
		} else {
			cb = options;
			options = input;
			input = null;
		}

		if (typeof options === 'function') {
			cb = options;
			options = input || {};
		} else {
			options = Object.assign(input || {}, options);
		}

		const response = new IncomingMessage();
		const client = this.client = Ti.Network.createHTTPClient();
		const headers = this._headers = options.headers || {};

		if (typeof options.timeout === 'number') {
			client.timeout = options.timeout;
		}

		var method = options.method;
		const methodIsString = (typeof method === 'string');
		if (method !== null && method !== undefined && !methodIsString) {
			assertArgumentType(method, 'method', 'string');
		}

		if (methodIsString && method) {
			if (!checkIsHttpToken(method)) {
				throw new Error(`Method must be a valid HTTP token ["${method}"]`, method);
			}
			method = this.method = method.toUpperCase();
		} else {
			method = this.method = 'GET';
		}

		this.path = options.path || '/';
		if (cb) {
			this.once('response', cb);
		}

		if (options.auth) {
			headers.Authorization = `Basic ${Titanium.Utils.base64encode(options.auth)}`;
		}

		// @todo validate other options
		if (options.createConnection) {
			console.warn('The "createConnection" option is ignored in Titanium.');
		}

		client.onreadystatechange = e => {
			switch (e.readyState) {
				case client.HEADERS_RECEIVED: {
					response.statusCode = client.status;
					response.statusMessage = client.statusText;
					response.headers = normalizeHeaders(client.responseHeaders);
					response.httpVersion = '1.1';
					response.rawHeaders = Object.keys(client.responseHeaders).reduce((result, headerName) => {
						result.push(headerName, client.responseHeaders[headerName]);
						return result;
					}, []);
					this.emit('response', response);
				}
			}
		};
		client.ondatastream = e => {
			// @todo Could we modify the event to provide a stream?
		};
		client.onload = () => {
			if (client.responseData && client.responseData.length > 0) {
				// @todo handle encoding and either pass as string or blob / buffer?
				const blobStream = Ti.Stream.createStream({
					source: client.responseData,
					mode: Ti.Stream.MODE_READ
				});
				var dataChunk = Ti.createBuffer({ length: client.responseData.length });
				blobStream.read(dataChunk);
				response.push(Buffer.from(dataChunk));
			}

			response.complete = true;
			response.push(null);
		};
		client.onerror = e => {
			this.emit('error', e);
		};

		const urlString = url.format(options);
		client.open(method, urlString);

		if (headers) {
			Object.keys(headers).forEach(headerName => {
				const headerValue = headers[headerName];
				this.setHeader(headerName, headerValue);
			});
		}
	}

	getHeader(name) {
		return this._headers[name];
	}

	setHeader(name, value) {
		this.client.setRequestHeader(name, value);
		this._headers[name] = value;
	}

	removeHeader(name) {
		this.client.setRequestHeader(name, null);
		delete this._headers[name];
	}

	end(chunk, encoding, callback) {
		return super.end(chunk, encoding, () => {
			let data;
			if (this._hasBinaryContent) {
				data = this._buffer.toBlob();
			} else {
				data = this._buffer.toString();
			}
			this.client.send(data);
			callback && callback();
		});
	}
}

function normalizeHeaders(headers) {
	const normalizedHeaders = {};
	Object.keys(headers).forEach(headerName => {
		normalizedHeaders[headerName.toLowerCase()] = headers[headerName];
	});
	return normalizedHeaders;
}

// Utility function that converts a legacy Url object into an ordinary
// options object as expected by the http.request and https.request
// APIs.
function urlToOptions(url) {
	const options = {
		protocol: url.protocol,
		hostname: typeof url.hostname === 'string' && url.hostname.startsWith('[')
			? url.hostname.slice(1, -1)
			: url.hostname,
		hash: url.hash,
		search: url.search,
		pathname: url.pathname,
		path: `${url.pathname || ''}${url.search || ''}`,
		href: url.href
	};
	if (url.port !== '') {
		options.port = Number(url.port);
	}
	if (url.username || url.password) {
		options.auth = `${url.username}:${url.password}`;
	}
	return options;
}

function request(url, options, cb) {
	return new ClientRequest(url, options, cb);
}

function get(url, options, cb) {
	const req = request(url, options, cb);
	req.end();
	return req;
}

export default {
	get,
	request
};
