'use strict';

const baseConfig = require('../../webpack.config.base');

module.exports = config => {
	config.set({
		frameworks: [ 'mocha', 'chai', 'socket.io-server' ],
		files: [
			{ pattern: 'specs/**/*.spec.js', watch: false }
		],
		preprocessors: {
			'specs/**/*.spec.js': [ 'webpack' ]
		},
		reporters: [ 'mocha', 'junit' ],
		plugins: [
			'karma-*',
			require('./support/socket.io-server')
		],
		webpack: Object.assign({}, baseConfig, {
			mode: 'development'
		}),
		titanium: {
			sdkVersion: '8.0.2.GA'
		},
		customLaunchers: {
			android: {
				base: 'Titanium',
				browserName: 'Android AVD',
				displayName: 'android',
				platform: 'android'
			},
			ios: {
				base: 'Titanium',
				browserName: 'iOS Emulator',
				displayName: 'ios',
				platform: 'ios'
			}
		},
		browsers: [ 'android', 'ios' ],
		singleRun: true,
		retryLimit: 0,
		concurrency: 1,
		captureTimeout: 300000,
		logLevel: config.LOG_DEBUG
	});
};
