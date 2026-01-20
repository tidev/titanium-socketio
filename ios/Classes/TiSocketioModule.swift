//
//  TiSocketioModule.swift
//  ti.socketio
//
//  Created by Hans Knöchel
//  Copyright (c) 2022 TiDev. All rights reserved.
//

import UIKit
import TitaniumKit

@objc(TiSocketioModule)
class TiSocketioModule: TiModule {

  var managers: [String: SocketManagerProxy] = [:]
  
  func moduleGUID() -> String {
    return "65fbdc59-432f-40d8-8ea9-02799887db3c"
  }
  
  override func moduleId() -> String! {
    return "ti.socketio"
  }

  @objc(connect:)
  func connect(args: [Any]) -> SocketIOClientProxy {
    guard let urlString = args.first as? String,
          let url = URL(string: urlString) else {
      fatalError("Missing required parameters")
    }

    var options: [String: Any] = [:]

    if args.count == 2 , let customOptions = args[1] as? [String: Any] {
      options = customOptions
    }

    return lookupClient(for: url, and: options)
  }

  @objc(Manager:)
  func Manager(args: [Any]) -> SocketManagerProxy {
    guard let urlString = args.first as? String, let url = URL(string: urlString) else {
      fatalError("Missing required parameters")
    }

    var options: [String: Any] = [:]
    if args.count == 2 {
      options = args[1] as! [String: Any]
    }
    
    return SocketManagerProxy()._init(withPageContext: pageContext, and: url, options: options)
  }

  private func lookupClient(for url: URL, and options: [String: Any]) -> SocketIOClientProxy {
    guard var urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
      fatalError("Cannot construct URL components!")
    }

    var _options = options

    if urlComponents.scheme == nil {
      urlComponents.scheme = "https"
    }
    if urlComponents.port == nil {
      if urlComponents.scheme == "http" || urlComponents.scheme == "ws" {
        urlComponents.port = 80
      } else if urlComponents.scheme == "https" || urlComponents.scheme == "wss" {
        urlComponents.port = 443
      }
    }

    let path = !urlComponents.path.isEmpty ? urlComponents.path : "/"
    if urlComponents.queryItems != nil && options["connectParams"] == nil {
      var connectParams: [String: Any] = [:]
      for queryItem in urlComponents.queryItems ?? [] {
        connectParams[queryItem.name] = queryItem.value
      }
    }
    urlComponents.query = nil

    let cacheIdentifier: String = urlComponents.string ?? ""
    
    let forceNew = TiUtils.boolValue("forceNew", properties: options, def: false)
    _options.removeValue(forKey: "forceNew")
    let sameNamespace = self.managers[cacheIdentifier]?.manager.nsps[path] != nil
    let newConnection = sameNamespace || forceNew
    
    var manager: SocketManagerProxy!
    if newConnection {
      manager = SocketManagerProxy()._init(withPageContext: pageContext,
                                           and: urlComponents.url!,
                                           options: _options)
    } else {
      if self.managers[cacheIdentifier] == nil {
        manager = SocketManagerProxy()._init(withPageContext: pageContext, and: urlComponents.url!, options: options)
        managers[cacheIdentifier] = manager
      }
      manager = self.managers[cacheIdentifier]
    }
    
    NSLog("[WARN] path = " + path);
    NSLog("[WARN] options = " + options.description);

    return manager.socket([path, options])
  }
}
