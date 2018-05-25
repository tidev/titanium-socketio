# Socket.io client for Titanium

[Socket.IO](https://socket.io) module for Titanium using native Android and iOS clients.

## Getting started

Install the module to you project or globally by copying it into the modules folder. After that enable it in your tiapp.xml.

```xml
<modules>
    <module platform="android">ti.socketio</module>
    <module platform="ios">ti.socketio</module>
</module>
```

## Usage

This module aims to be as compatible with the web client as possible. Please refer to the [Client API](https://socket.io/docs/client-api/) for a full API documentation of all supported methods.

```js
const io = require('ti.socketio');
const socket = io.connect('http://localhost:8080');
socket.on('connect', function() {
    Ti.API.debug('socket connected');

    socket.emit('hello', 'world');
});
```

Currently supported methods are:

* `io([url][, options])` (exposed as `connect`)
* `socket.open()`
* `socket.connect()`
* `socket.emit(eventName[, ...args][, ack])`
* `socket.on(eventName, callback)` (Note: Using acknowledgement callbacks not supported yet)
* `socket.off([eventName], [fn])`
* `socket.close()`
* `socket.disconnect()`

You can pass the option keys from both JS and native when creating a new socket. But only options that are actually supported on the native side will be converted to the matching configuration option. For example the JS [`query`](https://socket.io/docs/client-api/#new-manager-url-options) option will be converted to the [`connectionParams`](https://nuclearace.github.io/Socket.IO-Client-Swift/Enums/SocketIOClientOption.html#/s:8SocketIO0A14IOClientOptionO13connectParamsACs10DictionaryVySSypGcACmF) option in the native iOS framework.

## Useful links

Based on the [socket.io-client-java](https://github.com/socketio/socket.io-client-java) on Android and [socket.io-client.swift](https://github.com/socketio/socket.io-client-swift) on iOS.

## Contributions

Open source contributions are greatly appreciated! If you have a bugfix, improvement or new feature, please create
[an issue](https://github.com/appcelerator-modules/ti.socketio/issues/new) first and submit a [pull request](https://github.com/appcelerator-modules/ti.socketio/pulls/new) against master.

## Getting Help

If you have questions about the Socket.IO module for Titanium, feel free to reach out on Stackoverflow or the
`#helpme` channel on [TiSlack](http://tislack.org). In case you find a bug, create a [new issue](/issues/new)
or open a [new JIRA ticket](https://jira.appcelerator.org).

## License

Apache License, Version 2.0