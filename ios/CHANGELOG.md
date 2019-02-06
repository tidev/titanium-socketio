# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.1.2...HEAD
[1.1.2]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.1.1...ios-1.1.2
[1.1.1]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.1.0...ios-1.1.1
[1.1.0]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.0.1...ios-1.1.0
[1.0.1]: https://github.com/appcelerator-modules/titanium-socketio/compare/ios-1.0.0...ios-1.0.1