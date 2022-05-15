//
//  TiSocketioExampleProxy.swift
//  ti.socketio
//
//  Created by Hans Knöchel
//  Copyright (c) 2022 TiDev. All rights reserved.
//

import UIKit
import TitaniumKit
import SocketIO

@objc(SocketManagerProxy)
class SocketManagerProxy: TiProxy {

  var manager: SocketManager!
  var autoConnect: Bool = false
  var timeout: Double = 2000.0
  
  func _init(withPageContext context: TiEvaluator!, and url: URL, options: [String: Any]) -> Self! {
    super._init(withPageContext: context)
    
    autoConnect = TiUtils.boolValue("autoConnect", properties: options, def: false)
    timeout = TiUtils.doubleValue("timeout", properties: options, def: 2000.0)
    
    let nativeOptions = convertOptions(options)
    manager = SocketManager(socketURL: url, config: nativeOptions)
    
    return self
  }
  
  // MARK: Public API's

  @objc(socket:)
  func socket(_ args: [Any]) -> SocketIOClientProxy {
    guard let path = args.first as? String else {
      fatalError("Missing required parameters")
    }

    let socket: SocketIOClient = {
      if (path == "/") {
        return manager.defaultSocket
      } else {
        return manager.socket(forNamespace: path)
      }
    }()
    
    let socketProxy = SocketIOClientProxy()._init(withPageContext: pageContext, socket: socket, manager: self)!
    if autoConnect {
      if fabs(timeout - 0.0) < Double.ulpOfOne {
        socket.connect()
      } else {
        socket.connect(timeoutAfter: timeout / 1000.0) {
          socketProxy.fireEvent("connect_timeout")
        }
      }
    }
    
    return socketProxy
  }
  
  @objc(open:)
  func `open`(args: [Any]?) {
    self.connect(args: args)
  }
  
  @objc(connect:)
  func connect(args: [Any]?) {
    manager.connect()
  }
  
  @objc(close:)
  func close(args: [Any]?) {
    self.close(args: args)
  }
  
  @objc(disconnect:)
  func disconnect(args: [Any]?) {
    manager.disconnect()
  }
  
  @objc(toString:)
  override func toString(_ args: Any!) -> Any! {
    return "SocketManager (\(self)) \(manager!)"
  }

  // MARK: Private API's
  
  private func convertOptions(_ jsOptions: [String: Any]) -> [String: Any] {
    var options = jsOptions
    
    options = self.options(removeUnsupported: options, optionName: "path", silent: false)
    options = self.options(options, rename: "reconnection", toName: "reconnects")
    options = self.options(options, rename: "reconnectionAttempts", toName: "reconnectAttempts")
    options = self.options(options, rename: "reconnectionDelay", toName: "reconnectWait")
    
    if options["reconnectWait"] != nil {
      options["reconnectWait"] = TiUtils.doubleValue("reconnectWait", properties: options, def: 1000.0) / 1000
    }
    
    options = self.options(options, rename: "reconnectionDelayMax", toName: "reconnectionWaitMax")
    
    if options["reconnectWaitMax"] != nil {
      options["reconnectWaitMax"] = TiUtils.doubleValue("reconnectWaitMax", properties: options, def: 5000.0) / 1000
    }
    
    options = self.options(removeUnsupported: options, optionName: "timeout", silent: true)
    options = self.options(removeUnsupported: options, optionName: "autoConnect", silent: true)
    options = self.options(removeUnsupported: options, optionName: "parser", silent: false)
    
    let queryParams = options["query"]
    if queryParams != nil {
      options["connectParams"] = queryParams
      options.removeValue(forKey: "query")
    }

    return options
  }
  
  private func options(_ options: [String: Any], rename fromName: String, toName: String) -> [String: Any] {
    var optionsCopy = options
    let optionValue = optionsCopy[fromName]
    if optionValue == nil {
      return optionsCopy
    }
    
    optionsCopy.removeValue(forKey: fromName)
    optionsCopy[toName] = optionValue
    return optionsCopy
  }

  private func options(removeUnsupported options: [String: Any], optionName: String, silent: Bool) -> [String: Any] {
    var optionsCopy = options
    let optionValue = optionsCopy[optionName]
    if optionValue == nil {
      return optionsCopy
    }
    
    if (!silent) {
      NSLog("[WARN] The option \(optionName) is not supported on the iOS client and will be ignored.");
    }
    optionsCopy.removeValue(forKey: optionName)
    return optionsCopy
  }
}
