# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2019-02-06

### Added

- Partial support for the [Manager](https://socket.io/docs/client-api/#Manager) API

### Changed

- Event emitter methods now follow their web pendants and return `this` to allow chaining.

### Fixed

- Properly store event handlers to prevent GC related crashes when accessing them.
- Fixed missing internal conversion of `transports` option so it will no longer be ignored.

## [1.0.2] - 2018-10-28

### Fixed

- Update okhttp library to 3.11.0 to prevent clashes with other modules.

## [1.0.1] - 2018-06-04

### Fixed

- Properly set Android client options.

## 1.0.0 - 2018-05-29

Initial release.

[Unreleased]: https://github.com/appcelerator-modules/titanium-socketio/compare/android-2.0.0...HEAD
[2.0.0]: https://github.com/appcelerator-modules/titanium-socketio/compare/android-1.0.2...android-2.0.0
[1.0.2]: https://github.com/appcelerator-modules/titanium-socketio/compare/android-1.0.1...android-1.0.2
[1.0.1]: https://github.com/appcelerator-modules/titanium-socketio/compare/android-1.0.0...android-1.0.1