# Socket.io iOS module

This is the iOS part of the ti.socketio module. It is a Swift module and wraps the [socket.io-client-swift](https://github.com/socketio/socket.io-client-swift) library.

## Requirements

The module needs Titanium SDK 13.1.0.GA or later. That version added Swift Package Manager (SPM) support for native modules. An app that uses an older SDK cannot link the module.

## Development guide

The native dependency is a Swift package. There are no frameworks in the `platform` folder and no Carthage step. Xcode resolves the package when you build the module, so the first build needs network access.

The package is declared in two places:

1. `ti.socketio.xcodeproj` contains the package reference, so that the module compiles.
2. `spm.json` next to the `manifest` declares the same package for the Titanium CLI. The CLI stores it in the `metadata.json` of the module zip. The linkage is `embedded`, so the package is compiled into the module framework and the app project is not changed.

To build the module, run this command in the `ios` directory:

```sh
ti build -p ios --build-only
```

The zip file is written to the `dist` folder.

## Update the native library

1. Open `ti.socketio.xcodeproj` in Xcode and change the version rule of the `socket.io-client-swift` package.
2. Set the same version in `spm.json` under `requirementMinimumVersion`.
3. Rebuild the module. The CLI only reads `spm.json` when it packages the module.
