const path = require('path');

module.exports = {
	name: 'titanium-socketio',
	entry: './src/index.js',
	output: {
		libraryTarget: 'commonjs2',
		filename: 'titanium-socketio.js'
	},
	node: {
		global: false,
		__filename: false,
		__dirname: false,
		Buffer: false
	},
	module: {
		rules: [{
			test: /\.js/, use: 'babel-loader'
		}]
	},
	resolve: {
		alias: {
			buffer: path.resolve(__dirname, 'src/shims/buffer.js'),
			'engine.io-parser': 'engine.io-parser/lib/index.js',
			'readable-stream': 'readable-stream/readable-browser.js',
			ws: path.resolve(__dirname, 'src/shims/ws.js'),
			'xmlhttprequest-ssl': path.resolve(__dirname, 'src/shims/XMLHttpRequest.js'),
			'./internal/streams/stream': './internal/streams/stream-browser'
		}
	}
};
