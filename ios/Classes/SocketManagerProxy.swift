//
//  SocketManagerProxy.swift
//  ti.socketio
//
//  Created by Hans Knöchel
//  Copyright (c) 2022-present TiDev. All rights reserved.
//

import UIKit
import TitaniumKit
import SocketIO

@objc(SocketManagerProxy)
class SocketManagerProxy: TiProxy {

  private(set) var manager: SocketManager!

  /// The web client connects automatically. The native client does not, so we emulate it.
  private var autoConnect = true

  /// Connection timeout in milliseconds, same default as the web client.
  private var timeout: Double = 20000

  func _init(withPageContext context: TiEvaluator!, url: URL, options: [String: Any]) -> Self! {
    super._init(withPageContext: context)

    autoConnect = TiUtils.boolValue("autoConnect", properties: options, def: true)
    timeout = TiUtils.doubleValue("timeout", properties: options, def: 20000)

    manager = SocketManager(socketURL: url, config: convertOptions(options))

    return self
  }

  // MARK: Public API's

  @objc(socket:)
  func socket(_ args: [Any]) -> SocketIOClientProxy? {
    guard let path = args.first as? String else {
      throwException("Invalid arguments", subreason: "socket() expects a namespace string as first argument", location: "\(#file):\(#line)")
      return nil
    }

    let socket = path == "/" ? manager.defaultSocket : manager.socket(forNamespace: path)

    guard let socketProxy = SocketIOClientProxy()._init(withPageContext: pageContext, socket: socket, manager: self) else {
      return nil
    }

    if autoConnect {
      if abs(timeout) < Double.ulpOfOne {
        socket.connect()
      } else {
        socket.connect(timeoutAfter: timeout / 1000.0) { [weak socketProxy] in
          socketProxy?.fireClientEvent("connect_timeout", data: [])
        }
      }
    }

    return socketProxy
  }

  @objc(open:)
  func open(args: [Any]?) {
    connect(args: args)
  }

  @objc(connect:)
  func connect(args: [Any]?) {
    manager.connect()
  }

  @objc(close:)
  func close(args: [Any]?) {
    disconnect(args: args)
  }

  @objc(disconnect:)
  func disconnect(args: [Any]?) {
    manager.disconnect()
  }

  @objc(toString:)
  override func toString(_ args: Any!) -> Any! {
    return "SocketManager (\(Unmanaged.passUnretained(self).toOpaque())) \(manager!)"
  }

  // MARK: Private API's

  /// Maps the option names of the web client to the ones of the native client.
  private func convertOptions(_ jsOptions: [String: Any]) -> [String: Any] {
    var options = jsOptions

    rename(&options, "reconnection", to: "reconnects")
    rename(&options, "reconnectionAttempts", to: "reconnectAttempts")
    rename(&options, "reconnectionDelay", to: "reconnectWait")
    rename(&options, "reconnectionDelayMax", to: "reconnectWaitMax")

    // the web client uses milliseconds, the native client whole seconds
    for key in ["reconnectWait", "reconnectWaitMax"] where options[key] != nil {
      let milliseconds = TiUtils.doubleValue(key, properties: options, def: 0)
      options[key] = max(1, Int((milliseconds / 1000).rounded()))
    }

    // handled by this proxy, not by the native client
    removeUnsupported(&options, "timeout", silent: true)
    removeUnsupported(&options, "autoConnect", silent: true)

    removeUnsupported(&options, "parser", silent: false)

    if let queryParams = options.removeValue(forKey: "query") {
      options["connectParams"] = queryParams
    }

    return options
  }

  private func rename(_ options: inout [String: Any], _ fromName: String, to toName: String) {
    guard let optionValue = options.removeValue(forKey: fromName) else {
      return
    }
    options[toName] = optionValue
  }

  private func removeUnsupported(_ options: inout [String: Any], _ optionName: String, silent: Bool) {
    guard options.removeValue(forKey: optionName) != nil else {
      return
    }
    if !silent {
      NSLog("[WARN] The option \(optionName) is not supported on the iOS client and will be ignored.")
    }
  }
}
