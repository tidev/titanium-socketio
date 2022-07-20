'use strict';

module.exports = config => {
	config.set({
		basePath: '../..',
		frameworks: [ 'jasmine', 'socket.io-server' ],
		files: [
			'test/unit/specs/**/*spec.js'
		],
		reporters: [ 'mocha', 'junit' ],
		plugins: [
			'karma-*',
			require('./support/socket.io-server')
		],
		titanium: {
			sdkVersion: config.sdkVersion || '11.0.0.GA'
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
		client: {
			jasmine: {
				random: false
			}
		},
		singleRun: true,
		retryLimit: 0,
		concurrency: 1,
		captureTimeout: 400000,
		logLevel: config.LOG_DEBUG
	});
};
