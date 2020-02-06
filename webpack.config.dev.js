const baseConfig = require('./webpack.config.base');

module.exports = Object.assign({}, baseConfig, {
	mode: 'development',
	devtool: 'inline-source-map'
});
