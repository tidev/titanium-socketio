//
//  TiSocketioExampleProxy.swift
//  ti.socketio
//
//  Created by Your Name
//  Copyright (c) 2022 Your Company. All rights reserved.
//

import UIKit
import TitaniumKit
import SocketIO

@objc(SocketIOClientProxy)
class SocketIOClientProxy: TiProxy {
  
  @objc var io: SocketManagerProxy!

  var socket: SocketIOClient!
  var handlerIdentifiers: [KrollCallback: UUID] = [:]
  var eventHandlers: [String: [KrollCallback]] = [:]
  var eventRenamingMap: [String: String] = [
    "connect_error" : "error",
    "reconnect_attempt" : "reconnectAttempt",
    "reconnecting" : "reconnectAttempt"
  ]

  func _init(withPageContext context: TiEvaluator!, socket: SocketIOClient, manager: SocketManagerProxy) -> Self? {
    super._init(withPageContext: context)

    self.io = manager
    self.socket = socket
    
    return self
  }
  
  // MARK: Public API's
  
  @objc(id)
  func id() -> String? {
    return socket.status == .connected ? socket.sid : nil
  }
  
  @objc(connected)
  func connected() -> Bool {
    return socket.status == .connected
  }
  
  @objc(disconnected)
  func disconnected() -> Bool {
    return socket.status == .disconnected
  }
  
  @objc(open:)
  func open(args: [Any]) {
    connect(args: args)
  }
  
  @objc(connect:)
  func connect(args: [Any]) {
    socket.connect()
  }
  
  @objc(close:)
  func close(args: [Any]) {
    disconnect(args: args)
  }
  
  @objc(disconnect:)
  func disconnect(args: [Any]) {
    socket.disconnect()
  }
  
  @objc(on:)
  func on(args: [Any]) -> SocketIOClientProxy {
    guard var eventName = args.first as? String, let callback = args[1] as? KrollCallback else {
      fatalError("Missing required parameters")
    }
    
    if eventRenamingMap[eventName] != nil {
      eventName = eventRenamingMap[eventName]!
    }
    
    
    let handlerId = socket.on(eventName) { data, ack in
      callback.call(data, thisObject: self)
    }
    
    handlerIdentifiers[callback] = handlerId
    storeEventHandler(callback, for: eventName)
    
    return self
  }
  
  @objc(off:)
  func off(args: [Any]?) -> SocketIOClientProxy {
    if args == nil {
      socket.removeAllHandlers()
      removeAllEventHandlers()
    } else if args?.count == 1 {
      var eventName = args?.first as! String
      if eventRenamingMap[eventName] != nil {
       eventName = eventRenamingMap[eventName]!
      }
      socket.off(eventName)
      removeAllEventHandlersForEvent(eventName)
    } else if args?.count == 2 {
      var eventName = args?.first as! String
      if eventRenamingMap[eventName] != nil {
       eventName = eventRenamingMap[eventName]!
      }
      let handler = args![1] as! KrollCallback
      if let handlerId = findHandlerId(handler) {
        socket.off(id: handlerId)
        removeEventHandler(handler, for: eventName)
      }
    }
    
    return self
  }
  
  @objc(emit:)
  func emit(args: [Any]) -> SocketIOClientProxy {
    guard let eventName = args.first as? String else { return self }
    
    var data: [Any] = []
    var ackCallback: KrollCallback? = nil
    
    if args.count > 1 {
      var lastArgumentIndex = args.count - 1
      
      if args[lastArgumentIndex] as? KrollCallback != nil {
        ackCallback = args[lastArgumentIndex] as? KrollCallback
        lastArgumentIndex = -1
      }
      
      // Exclude the first argument to only map the data between the second and penultimate index
      let metaArguments = args[1...lastArgumentIndex]
      for obj in metaArguments {
        data.append(obj)
      }

      data = sanitizeValue(data) as! [Any]
    }
    
    if ackCallback != nil {
      let _ = socket.emitWithAck(eventName, data)
    } else {
      socket.emit(eventName, data)
    }
    
    return self
  }
  
  private func findHandlerId(_ handler: KrollCallback) -> UUID? {
    for (key, _) in handlerIdentifiers {
      if key == handler {
        return handlerIdentifiers[key]
      }
    }

    return nil
  }
  
  private func removeEventHandler(_ callback: KrollCallback, for eventName: String) {
    if var handlers = eventHandlers[eventName] {
      handlers.remove(at: handlers.firstIndex(of: callback)!)
    }
    
    removeEventListener([eventName, callback])
    removeHandlerId(callback)
  }
  
  private func removeAllEventHandlersForEvent(_ eventName: String) {
    let handlers = eventHandlers[eventName]
    if handlers == nil {
      return
    }
    
    for callback in handlers! {
      removeEventHandler(callback, for: eventName)
    }
    eventHandlers.removeValue(forKey: eventName)
  }
  
  private func removeAllEventHandlers() {
    for eventName in eventHandlers.keys {
      removeAllEventHandlersForEvent(eventName)
    }
  }
  
  private func removeHandlerId(_ handler: KrollCallback) {
    for (key, _) in handlerIdentifiers {
      if key == handler {
        handlerIdentifiers.removeValue(forKey: key)
        return;
      }
    }
  }
  
  private func sanitizeValue(_ value: Any) -> Any? {
    if !JSONSerialization.isValidJSONObject(value) {
      let stringyfiedValue = TiUtils.jsonStringify(value)
      return TiUtils.jsonParse(stringyfiedValue)
    } else {
      return value
    }
  }
  
  private func fireClientEvent(_ eventName: String, data: [Any]) {
    guard let handlers = eventHandlers[eventName] else { return }

    for callback in handlers {
      callback.call(data, thisObject: nil)
    }
  }
  
  /**
   Stores an event handler for the given event name.

   For compatibility with the web client we expose the method on, once and off.
   This delegates to our internal event handling using addEventListener to take
   care of safely storing the handler function and protecting it against GC.
   */
  private func storeEventHandler(_ callback: KrollCallback, for eventName: String) {
    addEventListener([eventName, callback])
    
    var handlers = eventHandlers[eventName]
    if handlers == nil {
      handlers = []
    }
    handlers!.append(callback)
  }
}
