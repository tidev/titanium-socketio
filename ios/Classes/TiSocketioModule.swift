//
//  TiSocketioModule.swift
//  ti.socketio
//
//  Created by Hans Knöchel
//  Copyright (c) 2022-present TiDev. All rights reserved.
//

import UIKit
import TitaniumKit
import SocketIO

@objc(TiSocketioModule)
class TiSocketioModule: TiModule {

  private var managers: [String: SocketManagerProxy] = [:]

  func moduleGUID() -> String {
    return "65fbdc59-432f-40d8-8ea9-02799887db3c"
  }

  override func moduleId() -> String! {
    return "ti.socketio"
  }

  // MARK: Public API's

  @objc(connect:)
  func connect(args: [Any]) -> SocketIOClientProxy? {
    guard let urlString = args.first as? String, let url = URL(string: urlString) else {
      throwException("Invalid arguments", subreason: "connect() expects a URL string as first argument", location: "\(#file):\(#line)")
      return nil
    }

    var options: [String: Any] = [:]
    if args.count > 1, let customOptions = args[1] as? [String: Any] {
      options = customOptions
    }

    return lookupClient(for: url, options: options)
  }

  @objc(Manager:)
  func Manager(args: [Any]) -> SocketManagerProxy? {
    guard let urlString = args.first as? String, let url = URL(string: urlString) else {
      throwException("Invalid arguments", subreason: "Manager() expects a URL string as first argument", location: "\(#file):\(#line)")
      return nil
    }

    var options: [String: Any] = [:]
    if args.count > 1, let customOptions = args[1] as? [String: Any] {
      options = customOptions
    }

    return SocketManagerProxy()._init(withPageContext: pageContext, url: url, options: options)
  }

  // MARK: Private API's

  /// Mirrors the lookup of the web client: one manager per host, the URL path is the namespace.
  private func lookupClient(for url: URL, options jsOptions: [String: Any]) -> SocketIOClientProxy? {
    guard var urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
      throwException("Invalid arguments", subreason: "Cannot parse the URL \(url)", location: "\(#file):\(#line)")
      return nil
    }

    var options = jsOptions

    // make sure we always have a scheme and port
    if urlComponents.scheme == nil {
      urlComponents.scheme = "https"
    }
    if urlComponents.port == nil {
      switch urlComponents.scheme ?? "" {
      case "http", "ws":
        urlComponents.port = 80
      case "https", "wss":
        urlComponents.port = 443
      default:
        break
      }
    }

    // the path is the namespace and not part of the manager URL
    let path = urlComponents.path.isEmpty ? "/" : urlComponents.path
    urlComponents.path = ""

    // assign parameters from the query string
    if let queryItems = urlComponents.queryItems, options["connectParams"] == nil {
      var connectParams: [String: Any] = [:]
      for queryItem in queryItems {
        connectParams[queryItem.name] = queryItem.value ?? ""
      }
      options["connectParams"] = connectParams
    }
    urlComponents.query = nil

    guard let managerURL = urlComponents.url, let cacheIdentifier = urlComponents.string else {
      throwException("Invalid arguments", subreason: "Cannot construct the manager URL from \(url)", location: "\(#file):\(#line)")
      return nil
    }

    let forceNew = TiUtils.boolValue("forceNew", properties: options, def: false)
    options.removeValue(forKey: "forceNew")
    let sameNamespace = managers[cacheIdentifier]?.manager.nsps[path] != nil
    let newConnection = sameNamespace || forceNew

    let manager: SocketManagerProxy
    if newConnection {
      manager = SocketManagerProxy()._init(withPageContext: pageContext, url: managerURL, options: options)
    } else if let cachedManager = managers[cacheIdentifier] {
      manager = cachedManager
    } else {
      manager = SocketManagerProxy()._init(withPageContext: pageContext, url: managerURL, options: options)
      managers[cacheIdentifier] = manager
    }

    return manager.socket([path])
  }
}
