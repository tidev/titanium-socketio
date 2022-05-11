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

@objc(SocketManagerProxy)
class SocketManagerProxy: TiProxy {

  var manager: SocketManager!
  
  func _init(withPageContext context: TiEvaluator!, and url: URL, options: [String: Any]) -> Self! {
    super._init(withPageContext: context)
    
    return self
  }

  @objc(socket:)
  func socket(_ args: [Any]) -> SocketIOClientProxy {
    return SocketIOClientProxy()._init(withPageContext: pageContext)!
  }
}
