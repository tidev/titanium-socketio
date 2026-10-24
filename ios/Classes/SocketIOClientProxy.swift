//
//  SocketIOClientProxy.swift
//  ti.socketio
//
//  Created by Hans Knöchel
//  Copyright (c) 2022-present TiDev. All rights reserved.
//

import UIKit
import TitaniumKit
import SocketIO

@objc(SocketIOClientProxy)
class SocketIOClientProxy: TiProxy {

  @objc private(set) var io: SocketManagerProxy!

  private var socket: SocketIOClient!

  /// Native handler ids by JS callback. Kroll creates a new callback object for each call,
  /// so callbacks are compared with isEqual() and not used as dictionary keys.
  private var handlerIdentifiers: [(callback: KrollCallback, id: UUID)] = []

  private var eventHandlers: [String: [KrollCallback]] = [:]

  private let eventRenamingMap: [String: String] = [
    "connect_error": "error",
    "reconnect_attempt": "reconnectAttempt",
    "reconnecting": "reconnectAttempt"
  ]

  func _init(withPageContext context: TiEvaluator!, socket: SocketIOClient, manager: SocketManagerProxy) -> Self? {
    super._init(withPageContext: context)

    self.io = manager
    self.socket = socket

    return self
  }

  // MARK: Public JS properties

  @objc var id: String? {
    return socket.status == .connected ? socket.sid : nil
  }

  @objc var connected: Bool {
    return socket.status == .connected
  }

  @objc var disconnected: Bool {
    return socket.status == .disconnected
  }

  // MARK: Public JS methods

  @objc(open:)
  func open(args: [Any]?) {
    connect(args: args)
  }

  @objc(connect:)
  func connect(args: [Any]?) {
    socket.connect()
  }

  @objc(close:)
  func close(args: [Any]?) {
    disconnect(args: args)
  }

  @objc(disconnect:)
  func disconnect(args: [Any]?) {
    socket.disconnect()
  }

  @objc(on:)
  func on(args: [Any]) -> SocketIOClientProxy {
    guard args.count >= 2, let name = args[0] as? String, let callback = args[1] as? KrollCallback else {
      throwException("Invalid arguments", subreason: "on() expects an event name and a callback function", location: "\(#file):\(#line)")
      return self
    }

    let eventName = nativeEventName(name)
    let handlerId = socket.on(eventName) { data, _ in
      // TODO: Handle ack callback
      callback.call(data, thisObject: nil)
    }

    handlerIdentifiers.append((callback: callback, id: handlerId))
    storeEventHandler(callback, for: eventName)

    return self
  }

  @objc(once:)
  func once(args: [Any]) -> SocketIOClientProxy {
    guard args.count >= 2, let name = args[0] as? String, let callback = args[1] as? KrollCallback else {
      throwException("Invalid arguments", subreason: "once() expects an event name and a callback function", location: "\(#file):\(#line)")
      return self
    }

    let eventName = nativeEventName(name)
    let handlerId = socket.once(eventName) { [weak self] data, _ in
      // TODO: Handle ack callback
      callback.call(data, thisObject: nil)
      self?.removeEventHandler(callback, for: eventName)
    }

    handlerIdentifiers.append((callback: callback, id: handlerId))
    storeEventHandler(callback, for: eventName)

    return self
  }

  @objc(off:)
  func off(args: [Any]?) -> SocketIOClientProxy {
    guard let args = args, !args.isEmpty else {
      socket.removeAllHandlers()
      removeAllEventHandlers()
      return self
    }

    guard let name = args[0] as? String else {
      throwException("Invalid arguments", subreason: "off() expects an event name as first argument", location: "\(#file):\(#line)")
      return self
    }
    let eventName = nativeEventName(name)

    if args.count == 1 {
      socket.off(eventName)
      removeAllEventHandlersForEvent(eventName)
    } else if let handler = args[1] as? KrollCallback, let handlerId = findHandlerId(handler) {
      socket.off(id: handlerId)
      removeEventHandler(handler, for: eventName)
    }

    return self
  }

  @objc(emit:)
  func emit(args: [Any]) -> SocketIOClientProxy {
    guard let eventName = args.first as? String else {
      throwException("Invalid arguments", subreason: "emit() expects an event name as first argument", location: "\(#file):\(#line)")
      return self
    }

    // everything between the event name and an optional trailing ack callback is payload
    var payload = Array(args.dropFirst())
    var ackCallback: KrollCallback?
    if let callback = payload.last as? KrollCallback {
      ackCallback = callback
      payload.removeLast()
    }

    let data = toSocketData(sanitizeValue(payload))

    if let ackCallback = ackCallback {
      socket.emitWithAck(eventName, with: data).timingOut(after: 0) { ackData in
        ackCallback.call(ackData, thisObject: nil)
      }
    } else {
      socket.emit(eventName, with: data, completion: nil)
    }

    return self
  }

  // MARK: Public methods

  /// Fires an event to the handlers registered via on() / once(), used for emulated events.
  func fireClientEvent(_ eventName: String, data: [Any]) {
    for callback in eventHandlers[eventName] ?? [] {
      callback.call(data, thisObject: nil)
    }
  }

  // MARK: Private methods

  private func nativeEventName(_ eventName: String) -> String {
    return eventRenamingMap[eventName] ?? eventName
  }

  /// Makes sure that the payload only contains JSON compatible values.
  private func sanitizeValue(_ value: [Any]) -> [Any] {
    if JSONSerialization.isValidJSONObject(value) {
      return value
    }
    // [TiUtils stripInvalidJSONPayload] is private, so invoke it indirectly
    let stringifiedValue = TiUtils.jsonStringify(value)
    return TiUtils.jsonParse(stringifiedValue) as? [Any] ?? []
  }

  /// The native client only accepts values that conform to SocketData. Numbers arrive from
  /// JS as NSNumber, which does not conform, so they are unboxed here.
  private func toSocketData(_ values: [Any]) -> [SocketData] {
    return values.map { value -> SocketData in
      if let number = value as? NSNumber {
        if CFGetTypeID(number) == CFBooleanGetTypeID() {
          return number.boolValue
        }
        let doubleValue = number.doubleValue
        if doubleValue == doubleValue.rounded() && abs(doubleValue) < 9007199254740992 {
          return Int(doubleValue)
        }
        return doubleValue
      }
      if let socketData = value as? SocketData {
        return socketData
      }
      return NSNull()
    }
  }

  private func findHandlerId(_ handler: KrollCallback) -> UUID? {
    return handlerIdentifiers.first { $0.callback.isEqual(handler) }?.id
  }

  private func removeHandlerId(_ handler: KrollCallback) {
    handlerIdentifiers.removeAll { $0.callback.isEqual(handler) }
  }

  /**
   Stores an event handler for the given event name.

   For compatibility with the web client we expose the methods on, once and off.
   This delegates to our internal event handling using addEventListener to take
   care of safely storing the handler function and protecting it against GC.
   */
  private func storeEventHandler(_ callback: KrollCallback, for eventName: String) {
    addEventListener([eventName, callback])
    eventHandlers[eventName, default: []].append(callback)
  }

  private func removeEventHandler(_ callback: KrollCallback, for eventName: String) {
    eventHandlers[eventName]?.removeAll { $0.isEqual(callback) }
    if eventHandlers[eventName]?.isEmpty == true {
      eventHandlers.removeValue(forKey: eventName)
    }

    removeEventListener([eventName, callback])
    removeHandlerId(callback)
  }

  private func removeAllEventHandlersForEvent(_ eventName: String) {
    for callback in eventHandlers[eventName] ?? [] {
      removeEventHandler(callback, for: eventName)
    }
    eventHandlers.removeValue(forKey: eventName)
  }

  private func removeAllEventHandlers() {
    for eventName in Array(eventHandlers.keys) {
      removeAllEventHandlersForEvent(eventName)
    }
  }
}
