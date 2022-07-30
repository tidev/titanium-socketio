# Socket.io client for Titanium

[Socket.IO](https://socket.io) module for Titanium using native Android and iOS clients.

## Requirements

- [x] Android: Titanium SDK 9.0.0+
- [x] iOS: Titanium SDK 7.4.0+ / Xcode 10.2 / Swift 5.0+

> 💡 The iOS module is built with Swift 5.0 and you need to have the same Swift version installed to be able to use this module. You can check your current Swift version by using swift -v from the terminal.

> 💡 The Android module version 4.x will support Socket.io Server 3.x/4.x

## Getting started

Install the module to your project or globally by copying it into the modules folder. After that enable it in your tiapp.xml.

```xml
<modules>
  <module platform="android">ti.socketio</module>
  <module platform="iphone">ti.socketio</module>
</modules>
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

Currently supported methods and properties are:

### IO

- `io(url[, options])` (exposed as `connect`, note that `url` is not optional)
- `socket.id`
- `socket.connected`
- `socket.disconnected`
- `socket.io`
- `socket.open()`
- `socket.connect()`
- `socket.emit(eventName[, ...args][, ack])`
- `socket.on(eventName, callback)` (Note: Using acknowledgement callbacks not supported yet)
- `socket.off([eventName], [fn])`
- `socket.close()`
- `socket.disconnect()`

### Manager

- `Manager(url[, options])` (note that url is not optional)
- `manager.socket(nsp)` (options are not supportedl)
- `manager.open()` (callback is not supported)
- `manager.connect()`
- `manager.close()` (noop on Android, all sockets need to be closed individually)
- `manager.dsconnect()`

You can pass the option keys from both JS and native when creating a new socket. But only options that are actually supported on the native side will be converted to the matching configuration option. For example the JS [`query`](https://socket.io/docs/client-api/#new-manager-url-options) option will be converted to the [`connectionParams`](https://nuclearace.github.io/Socket.IO-Client-Swift/Enums/SocketIOClientOption.html#/s:8SocketIO0A14IOClientOptionO13connectParamsACs10DictionaryVySSypGcACmF) option in the native iOS framework.

## Limitations

Due to different architecture of the native frameworks and the web client there are a few things you need to be aware of when using this module.

### Events on iOS

The native clients don't have the concept of auto connect (which is the default for the web client). We emulate this by automatically connecting the socket for you if you don't explicitly specify `autoConnect: false` in the options.

However, this impacts emitting events on iOS where you need to explicity wait for a socket to be connected before you can start emitting events.

```js
import io from 'ti.socketio';

const socket = io.connect('http://localhost');
socket.on('connect', () => {
  socket.emit('myevent');
});
```

This is due to a limitation in the iOS native client which discards any events before a socket is connected. The Android client will store events in a buffer and send them automatically once connected.

#### Missing events

- `reconnect` (use `connect` instead)
- `reconnect_error` (use `error` instead)
- `reconnect_failed` (use `error` instead)

#### Other event notes

- `connect_error` is the same as `error`. You need to check the error message to see what kind of error happened.
- `reconnect_attempt` does not report the number of reconnect attempts.
- `pong` does not report the number ms elapsed since `ping`.

## Useful links

Based on the [socket.io-client-java](https://github.com/socketio/socket.io-client-java) on Android and [socket.io-client.swift](https://github.com/socketio/socket.io-client-swift) on iOS.

## Contributions

Open source contributions are greatly appreciated! If you have a bugfix, improvement or new feature, please create
[an issue](https://github.com/tidev/titanium-socketio/issues/new) first and submit a [pull request](https://github.com/tidev/titanium-socketio/pulls/new) against master.

## Getting Help

If you have questions about the Socket.IO module for Titanium, feel free to reach out on Stackoverflow or the
`#helpme` channel on [TiSlack](http://tislack.org). In case you find a bug, create a [new issue](/issues/new).

## Legal

Titanium is a registered trademark of TiDev Inc. All Titanium trademark and patent rights were transferred and assigned to TiDev Inc. on 04/07/2022. Please see the LEGAL information about using our trademarks, privacy policy, terms of usage and other legal information at https://tidev.io/legal.

## License

Titanium is licensed under the OSI approved Apache Public License (Version 2). All trademark rights were assigned to TiDev, Inc. on 04/07/2022 from Axway, Inc. Please see the LICENSE file for more details.
