import {
	CHAR_SPACE,
	CHAR_TAB,
	CHAR_CARRIAGE_RETURN,
	CHAR_LINE_FEED,
	CHAR_FORM_FEED,
	CHAR_NO_BREAK_SPACE,
	CHAR_ZERO_WIDTH_NOBREAK_SPACE,
	CHAR_HASH,
	CHAR_FORWARD_SLASH,
	CHAR_LEFT_SQUARE_BRACKET,
	CHAR_RIGHT_SQUARE_BRACKET,
	CHAR_LEFT_ANGLE_BRACKET,
	CHAR_RIGHT_ANGLE_BRACKET,
	CHAR_LEFT_CURLY_BRACKET,
	CHAR_RIGHT_CURLY_BRACKET,
	CHAR_QUESTION_MARK,
	CHAR_LOWERCASE_A,
	CHAR_LOWERCASE_Z,
	CHAR_UPPERCASE_A,
	CHAR_UPPERCASE_Z,
	CHAR_DOT,
	CHAR_0,
	CHAR_9,
	CHAR_HYPHEN_MINUS,
	CHAR_PLUS,
	CHAR_UNDERSCORE,
	CHAR_DOUBLE_QUOTE,
	CHAR_SINGLE_QUOTE,
	CHAR_PERCENT,
	CHAR_SEMICOLON,
	CHAR_BACKWARD_SLASH,
	CHAR_CIRCUMFLEX_ACCENT,
	CHAR_GRAVE_ACCENT,
	CHAR_VERTICAL_LINE,
	CHAR_AT,
} from './internal/constants';
import { encodeStr, hexTable } from './internal/querystring';

/*
// WHATWG URL implementation provided by internal/url
const {
  URL,
  URLSearchParams,
  domainToASCII,
  domainToUnicode,
  formatSymbol,
  pathToFileURL,
  fileURLToPath
} = require('internal/url');
*/

// Original url.parse() APIs

function Url() {
	this.protocol = null;
	this.slashes = null;
	this.auth = null;
	this.host = null;
	this.port = null;
	this.hostname = null;
	this.hash = null;
	this.search = null;
	this.query = null;
	this.pathname = null;
	this.path = null;
	this.href = null;
}

// define these here so at least they only have to be
// compiled once on the first module load.
const protocolPattern = /^[a-z0-9.+-]+:/i;
const portPattern = /:[0-9]*$/;
const hostPattern = /^\/\/[^@/]+@[^@/]+/;

// Special case for a simple path URL
const simplePathPattern = /^(\/\/?(?!\/)[^?\s]*)(\?[^\s]*)?$/;

const hostnameMaxLen = 255;

// Protocols that can allow "unsafe" and "unwise" chars.
const unsafeProtocol = new Set([
	'javascript',
	// eslint-disable-next-line no-script-url
	'javascript:'
]);
// Protocols that never have a hostname.
const hostlessProtocol = new Set([
	'javascript',
	// eslint-disable-next-line no-script-url
	'javascript:'
]);
// Protocols that always contain a // bit.
const slashedProtocol = new Set([
	'http',
	'http:',
	'https',
	'https:',
	'ftp',
	'ftp:',
	'gopher',
	'gopher:',
	'file',
	'file:',
	'ws',
	'ws:',
	'wss',
	'wss:'
]);

// Lazy loaded for startup performance.
let querystring;

function urlParse(url, parseQueryString, slashesDenoteHost) {
	if (url instanceof Url) {
		return url;
	}

	const urlObject = new Url();
	urlObject.parse(url, parseQueryString, slashesDenoteHost);
	return urlObject;
}

Url.prototype.parse = function parse(url, parseQueryString, slashesDenoteHost) {
	// Copy chrome, IE, opera backslash-handling behavior.
	// Back slashes before the query string get converted to forward slashes
	// See: https://code.google.com/p/chromium/issues/detail?id=25916
	var hasHash = false;
	var start = -1;
	var end = -1;
	var rest = '';
	var lastPos = 0;
	var i = 0;
	for (var inWs = false, split = false; i < url.length; ++i) {
		const code = url.charCodeAt(i);

		// Find first and last non-whitespace characters for trimming
		const isWs = code === CHAR_SPACE
			|| code === CHAR_TAB
			|| code === CHAR_CARRIAGE_RETURN
			|| code === CHAR_LINE_FEED
			|| code === CHAR_FORM_FEED
			|| code === CHAR_NO_BREAK_SPACE
			|| code === CHAR_ZERO_WIDTH_NOBREAK_SPACE;
		if (start === -1) {
			if (isWs) {
				continue;
			}
			lastPos = start = i;
		} else if (inWs) {
			if (!isWs) {
				end = -1;
				inWs = false;
			}
		} else if (isWs) {
			end = i;
			inWs = true;
		}

		// Only convert backslashes while we haven't seen a split character
		if (!split) {
			switch (code) {
				case CHAR_HASH:
					hasHash = true;
					// Fall through
				case CHAR_QUESTION_MARK:
					split = true;
					break;
				case CHAR_BACKWARD_SLASH:
					if (i - lastPos > 0) {
						rest += url.slice(lastPos, i);
					}
					rest += '/';
					lastPos = i + 1;
					break;
			}
		} else if (!hasHash && code === CHAR_HASH) {
			hasHash = true;
		}
	}

	// Check if string was non-empty (including strings with only whitespace)
	if (start !== -1) {
		if (lastPos === start) {
			// We didn't convert any backslashes

			if (end === -1) {
				if (start === 0) {
					rest = url;
				} else {
					rest = url.slice(start);
				}
			} else {
				rest = url.slice(start, end);
			}
		} else if (end === -1 && lastPos < url.length) {
			// We converted some backslashes and have only part of the entire string
			rest += url.slice(lastPos);
		} else if (end !== -1 && lastPos < end) {
			// We converted some backslashes and have only part of the entire string
			rest += url.slice(lastPos, end);
		}
	}

	if (!slashesDenoteHost && !hasHash) {
		// Try fast path regexp
		const simplePath = simplePathPattern.exec(rest);
		if (simplePath) {
			this.path = rest;
			this.href = rest;
			this.pathname = simplePath[1];
			if (simplePath[2]) {
				this.search = simplePath[2];
				if (parseQueryString) {
					if (querystring === undefined) {
						querystring = require('./querystring');
					}
					this.query = querystring.parse(this.search.slice(1));
				} else {
					this.query = this.search.slice(1);
				}
			} else if (parseQueryString) {
				this.search = null;
				this.query = Object.create(null);
			}
			return this;
		}
	}

	let proto = protocolPattern.exec(rest);
	let lowerProto;
	if (proto) {
		proto = proto[0];
		lowerProto = proto.toLowerCase();
		this.protocol = lowerProto;
		rest = rest.slice(proto.length);
	}

	// Figure out if it's got a host
	// user@server is *always* interpreted as a hostname, and url
	// resolution will treat //foo/bar as host=foo,path=bar because that's
	// how the browser resolves relative URLs.
	let slashes;
	if (slashesDenoteHost || proto || hostPattern.test(rest)) {
		slashes = rest.charCodeAt(0) === CHAR_FORWARD_SLASH
			&& rest.charCodeAt(1) === CHAR_FORWARD_SLASH;
		if (slashes && !(proto && hostlessProtocol.has(lowerProto))) {
			rest = rest.slice(2);
			this.slashes = true;
		}
	}

	if (!hostlessProtocol.has(lowerProto)
		&& (slashes || (proto && !slashedProtocol.has(proto)))) {

		// there's a hostname.
		// the first instance of /, ?, ;, or # ends the host.
		//
		// If there is an @ in the hostname, then non-host chars *are* allowed
		// to the left of the last @ sign, unless some host-ending character
		// comes *before* the @-sign.
		// URLs are obnoxious.
		//
		// ex:
		// http://a@b@c/ => user:a@b host:c
		// http://a@b?@c => user:a host:b path:/?@c

		var hostEnd = -1;
		var atSign = -1;
		var nonHost = -1;
		for (i = 0; i < rest.length; ++i) {
			switch (rest.charCodeAt(i)) {
				case CHAR_TAB:
				case CHAR_LINE_FEED:
				case CHAR_CARRIAGE_RETURN:
				case CHAR_SPACE:
				case CHAR_DOUBLE_QUOTE:
				case CHAR_PERCENT:
				case CHAR_SINGLE_QUOTE:
				case CHAR_SEMICOLON:
				case CHAR_LEFT_ANGLE_BRACKET:
				case CHAR_RIGHT_ANGLE_BRACKET:
				case CHAR_BACKWARD_SLASH:
				case CHAR_CIRCUMFLEX_ACCENT:
				case CHAR_GRAVE_ACCENT:
				case CHAR_LEFT_CURLY_BRACKET:
				case CHAR_VERTICAL_LINE:
				case CHAR_RIGHT_CURLY_BRACKET:
					// Characters that are never ever allowed in a hostname from RFC 2396
					if (nonHost === -1) {
						nonHost = i;
					}
					break;
				case CHAR_HASH:
				case CHAR_FORWARD_SLASH:
				case CHAR_QUESTION_MARK:
					// Find the first instance of any host-ending characters
					if (nonHost === -1) {
						nonHost = i;
					}
					hostEnd = i;
					break;
				case CHAR_AT:
					// At this point, either we have an explicit point where the
					// auth portion cannot go past, or the last @ char is the decider.
					atSign = i;
					nonHost = -1;
					break;
			}
			if (hostEnd !== -1) {
				break;
			}
		}
		start = 0;
		if (atSign !== -1) {
			this.auth = decodeURIComponent(rest.slice(0, atSign));
			start = atSign + 1;
		}
		if (nonHost === -1) {
			this.host = rest.slice(start);
			rest = '';
		} else {
			this.host = rest.slice(start, nonHost);
			rest = rest.slice(nonHost);
		}

		// pull out port.
		this.parseHost();

		// We've indicated that there is a hostname,
		// so even if it's empty, it has to be present.
		if (typeof this.hostname !== 'string') {
			this.hostname = '';
		}

		var hostname = this.hostname;

		// If hostname begins with [ and ends with ]
		// assume that it's an IPv6 address.
		var ipv6Hostname = hostname.charCodeAt(0) === CHAR_LEFT_SQUARE_BRACKET
			&& hostname.charCodeAt(hostname.length - 1) === CHAR_RIGHT_SQUARE_BRACKET;

		// validate a little.
		if (!ipv6Hostname) {
			rest = getHostname(this, rest, hostname);
		}

		if (this.hostname.length > hostnameMaxLen) {
			this.hostname = '';
		} else {
			// Hostnames are always lower case.
			this.hostname = this.hostname.toLowerCase();
		}

		var p = this.port ? ':' + this.port : '';
		var h = this.hostname || '';
		this.host = h + p;

		// strip [ and ] from the hostname
		// the host field still retains them, though
		if (ipv6Hostname) {
			this.hostname = this.hostname.slice(1, -1);
			if (rest[0] !== '/') {
				rest = '/' + rest;
			}
		}
	}

	// Now rest is set to the post-host stuff.
	// Chop off any delim chars.
	if (!unsafeProtocol.has(lowerProto)) {
		// First, make 100% sure that any "autoEscape" chars get
		// escaped, even if encodeURIComponent doesn't think they
		// need to be.
		rest = autoEscapeStr(rest);
	}

	var questionIdx = -1;
	var hashIdx = -1;
	for (i = 0; i < rest.length; ++i) {
		const code = rest.charCodeAt(i);
		if (code === CHAR_HASH) {
			this.hash = rest.slice(i);
			hashIdx = i;
			break;
		} else if (code === CHAR_QUESTION_MARK && questionIdx === -1) {
			questionIdx = i;
		}
	}

	if (questionIdx !== -1) {
		if (hashIdx === -1) {
			this.search = rest.slice(questionIdx);
			this.query = rest.slice(questionIdx + 1);
		} else {
			this.search = rest.slice(questionIdx, hashIdx);
			this.query = rest.slice(questionIdx + 1, hashIdx);
		}
		if (parseQueryString) {
			if (querystring === undefined) {
				querystring = require('./querystring');
			}
			this.query = querystring.parse(this.query);
		}
	} else if (parseQueryString) {
		// No query string, but parseQueryString still requested
		this.search = null;
		this.query = Object.create(null);
	}

	const useQuestionIdx
		= questionIdx !== -1 && (hashIdx === -1 || questionIdx < hashIdx);
	const firstIdx = useQuestionIdx ? questionIdx : hashIdx;
	if (firstIdx === -1) {
		if (rest.length > 0) {
			this.pathname = rest;
		}
	} else if (firstIdx > 0) {
		this.pathname = rest.slice(0, firstIdx);
	}
	if (slashedProtocol.has(lowerProto)
		&& this.hostname && !this.pathname) {
		this.pathname = '/';
	}

	// To support http.request
	if (this.pathname || this.search) {
		const p = this.pathname || '';
		const s = this.search || '';
		this.path = p + s;
	}

	// Finally, reconstruct the href based on what has been validated.
	this.href = this.format();
	return this;
};

function getHostname(self, rest, hostname) {
	for (var i = 0; i < hostname.length; ++i) {
		const code = hostname.charCodeAt(i);
		const isValid = (code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z)
										|| code === CHAR_DOT
										|| (code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z)
										|| (code >= CHAR_0 && code <= CHAR_9)
										|| code === CHAR_HYPHEN_MINUS
										|| code === CHAR_PLUS
										|| code === CHAR_UNDERSCORE
										|| code > 127;

		// Invalid host character
		if (!isValid) {
			self.hostname = hostname.slice(0, i);
			return `/${hostname.slice(i)}${rest}`;
		}
	}
	return rest;
}

// Escaped characters. Use empty strings to fill up unused entries.
// Using Array is faster than Object/Map
const escapedCodes = [
	/* 0 - 9 */ '', '', '', '', '', '', '', '', '', '%09',
	/* 10 - 19 */ '%0A', '', '', '%0D', '', '', '', '', '', '',
	/* 20 - 29 */ '', '', '', '', '', '', '', '', '', '',
	/* 30 - 39 */ '', '', '%20', '', '%22', '', '', '', '', '%27',
	/* 40 - 49 */ '', '', '', '', '', '', '', '', '', '',
	/* 50 - 59 */ '', '', '', '', '', '', '', '', '', '',
	/* 60 - 69 */ '%3C', '', '%3E', '', '', '', '', '', '', '',
	/* 70 - 79 */ '', '', '', '', '', '', '', '', '', '',
	/* 80 - 89 */ '', '', '', '', '', '', '', '', '', '',
	/* 90 - 99 */ '', '', '%5C', '', '%5E', '', '%60', '', '', '',
	/* 100 - 109 */ '', '', '', '', '', '', '', '', '', '',
	/* 110 - 119 */ '', '', '', '', '', '', '', '', '', '',
	/* 120 - 125 */ '', '', '', '%7B', '%7C', '%7D'
];

// Automatically escape all delimiters and unwise characters from RFC 2396.
// Also escape single quotes in case of an XSS attack.
// Return the escaped string.
function autoEscapeStr(rest) {
	var escaped = '';
	var lastEscapedPos = 0;
	for (var i = 0; i < rest.length; ++i) {
		// `escaped` contains substring up to the last escaped character.
		var escapedChar = escapedCodes[rest.charCodeAt(i)];
		if (escapedChar) {
			// Concat if there are ordinary characters in the middle.
			if (i > lastEscapedPos) {
				escaped += rest.slice(lastEscapedPos, i);
			}
			escaped += escapedChar;
			lastEscapedPos = i + 1;
		}
	}
	if (lastEscapedPos === 0) { // Nothing has been escaped.
		return rest;
	}

	// There are ordinary characters at the end.
	if (lastEscapedPos < rest.length) {
		escaped += rest.slice(lastEscapedPos);
	}

	return escaped;
}

// Format a parsed object into a url string
function urlFormat(urlObject, options) {
	// Ensure it's an object, and not a string url.
	// If it's an object, this is a no-op.
	// this way, you can call urlParse() on strings
	// to clean up potentially wonky urls.
	if (typeof urlObject === 'string') {
		urlObject = urlParse(urlObject);
	} else if (typeof urlObject !== 'object' || urlObject === null) {
		throw new Error(`urlObject must be of type ${[ 'Object', 'string' ].join(', ')} but was ${typeof urlObject}`);
	} else if (!(urlObject instanceof Url)) {
		return Url.prototype.format.call(urlObject);
	}
	return urlObject.format();
}

// These characters do not need escaping:
// ! - . _ ~
// ' ( ) * :
// digits
// alpha (uppercase)
// alpha (lowercase)
const noEscapeAuth = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0x00 - 0x0F
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // 0x10 - 0x1F
	0, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, // 0x20 - 0x2F
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, // 0x30 - 0x3F
	0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 0x40 - 0x4F
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, // 0x50 - 0x5F
	0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, // 0x60 - 0x6F
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0  // 0x70 - 0x7F
];

Url.prototype.format = function format() {
	var auth = this.auth || '';
	if (auth) {
		auth = encodeStr(auth, noEscapeAuth, hexTable);
		auth += '@';
	}

	var protocol = this.protocol || '';
	var pathname = this.pathname || '';
	var hash = this.hash || '';
	var host = '';
	var query = '';

	if (this.host) {
		host = auth + this.host;
	} else if (this.hostname) {
		host = auth + (
			this.hostname.includes(':')
				? '[' + this.hostname + ']'
				: this.hostname
		);
		if (this.port) {
			host += ':' + this.port;
		}
	}

	if (this.query !== null && typeof this.query === 'object') {
		if (querystring === undefined) {
			querystring = require('./querystring');
		}
		query = querystring.stringify(this.query);
	}

	var search = this.search || (query && ('?' + query)) || '';

	if (protocol && protocol.charCodeAt(protocol.length - 1) !== 58/* : */) {
		protocol += ':';
	}

	var newPathname = '';
	var lastPos = 0;
	for (var i = 0; i < pathname.length; ++i) {
		switch (pathname.charCodeAt(i)) {
			case CHAR_HASH:
				if (i - lastPos > 0) {
					newPathname += pathname.slice(lastPos, i);
				}
				newPathname += '%23';
				lastPos = i + 1;
				break;
			case CHAR_QUESTION_MARK:
				if (i - lastPos > 0) {
					newPathname += pathname.slice(lastPos, i);
				}
				newPathname += '%3F';
				lastPos = i + 1;
				break;
		}
	}
	if (lastPos > 0) {
		if (lastPos !== pathname.length) {
			pathname = newPathname + pathname.slice(lastPos);
		} else {
			pathname = newPathname;
		}
	}

	// Only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
	// unless they had them to begin with.
	if (this.slashes || slashedProtocol.has(protocol)) {
		if (this.slashes || host) {
			if (pathname && pathname.charCodeAt(0) !== CHAR_FORWARD_SLASH) {
				pathname = '/' + pathname;
			}
			host = '//' + host;
		} else if (protocol.length >= 4
				&& protocol.charCodeAt(0) === 102
				&&/* f */ protocol.charCodeAt(1) === 105
				&&/* i */ protocol.charCodeAt(2) === 108
				&&/* l */ protocol.charCodeAt(3) === 101/* e */) {
			host = '//';
		}
	}

	search = search.replace(/#/g, '%23');

	if (hash && hash.charCodeAt(0) !== CHAR_HASH) {
		hash = '#' + hash;
	}
	if (search && search.charCodeAt(0) !== CHAR_QUESTION_MARK) {
		search = '?' + search;
	}

	return protocol + host + pathname + search + hash;
};

Url.prototype.parseHost = function parseHost() {
	var host = this.host;
	var port = portPattern.exec(host);
	if (port) {
		port = port[0];
		if (port !== ':') {
			this.port = port.slice(1);
		}
		host = host.slice(0, host.length - port.length);
	}
	if (host) {
		this.hostname = host;
	}
};

export default {
	// Original API
	Url,
	parse: urlParse,
	format: urlFormat

	// WHATWG API
	/*
  URL,
  URLSearchParams,
  domainToASCII,
	domainToUnicode,
	*/
};
