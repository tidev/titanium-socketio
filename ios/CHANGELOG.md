# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Rewrote the module in Swift.
- Updated the native client to socket.io-client-swift 16.1.1. The module now speaks the socket.io v3 and v4 protocol. Servers that run socket.io v2 are no longer supported.
- The native client is resolved with Swift Package Manager through `spm.json`. The module needs Titanium SDK 13.1.0.GA or later.
- The `path` option is passed to the native client instead of being ignored.

### Fixed

- Sockets connect automatically again unless `autoConnect: false` is set.
- The connect timeout defaults to 20 seconds, same as the web client.
- `emit()` sends each argument as a separate argument and calls the ack callback.
- `once()` is available again.
- `connect_timeout` fires to the handlers that were registered with `on()`.
- Query parameters of the connect URL are passed as `connectParams`.

## [2.0.0] - 2019-02-06

### Added

- Partial support for the [Manager](https://socket.io/docs/client-api/#Manager) API

### Changed

- Event emitter methods now follow their web pendants and return `this` to allow chaining.

### Fixed

- Properly store event handlers to prevent GC related crashes when accessing them.

## [1.1.2] - 2018-01-11

### Fixed

- Compiled for Swift 4.2 compatibility.

## [1.1.1] - 2018-11-05

### Fixed

- Only iterate 2nd+ arguements on `emit`.
- Make `off` method available for variable arguments.
- Properly return boolean values from methods.

## [1.1.0] - 2018-10-06

### Fixed

- Compile with Xcode 10 and Swift 4.

## [1.0.1] - 2018-07-05

### Fixed

- Add missing hook to enable Swift support required by the native socket.io client.

## 1.0.0 - 2018-05-25

Initial release.

[Unreleased]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-2.0.0...HEAD
[2.0.0]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.1.2...ios-2.0.0
[1.1.2]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.1.1...ios-1.1.2
[1.1.1]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.1.0...ios-1.1.1
[1.1.0]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.0.1...ios-1.1.0
[1.0.1]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.0.0...ios-1.0.1