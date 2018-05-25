# Socket.io iOS module

This is the iOS part of the ti.socketio module.

## Development guide

This module uses [Carthage](https://github.com/Carthage/Carthage) to manage native dependencies. You might notice that no frameworks are checked in to the `platform` folder of this repository. Before you can build the project run `carthage bootstrap` in this directory to checkout and build the reuired [SocketIO.framework](https://github.com/socketio/socket.io-client-swift) and its dependencies. Now copy all built frameworks from the `Carthage/Build/iOS` folder to `platform`.

You are responsible to manually integrate any dependency changes into the module. After you modified the Cartfile run the `carthage update` command. After that make sure to copy the built frameworks to the platform folder again. **Do not check-in the frameworks from the platform folder**

> ⚠️ Make sure the frameworks in `Carthage/Build/iOS` and `platform` are in sync before you build to avoid unexepcted behavior.

