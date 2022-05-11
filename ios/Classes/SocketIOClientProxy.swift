//
//  TiSocketioExampleProxy.swift
//  ti.socketio
//
//  Created by Your Name
//  Copyright (c) 2022 Your Company. All rights reserved.
//

import UIKit
import TitaniumKit

@objc(SocketIOClientProxy)
class SocketIOClientProxy: TiProxy {

  override func _init(withPageContext context: TiEvaluator!) -> Self? {
    super._init(withPageContext: context)

    // Custom proxy init
    
    return self
  }
  
  /**
   Test a number return value.
 
   - returns: The numeric return value
   
   - parameters:
       - unused An unused parameter
   */

  @objc(testNumber:)
  func testNumber(unused: Any?) -> Any {
    return TiUtils.intValue("42") // or return 42 directly
  }
  
  /**
   Test a string return value.
   
   - returns: The string return value
   
   - parameters:
   - unused An unused parameter
   */

  @objc(testString:)
  func testString(unused: Any?) -> String {
    return "Hello world"
  }
  
  /**
   Test a dictionary return value.
   
   - returns: The dictionary return value
   
   - parameters:
   - unused An unused parameter
   */
  
  @objc(testDictionary:)
  func testDictionary(unused: Any?) -> [String: String] {
    return ["hello": "world"]
  }
  
  /**
   Tests an array return value.
   
   - returns: The array return value
   
   - parameters:
   - unused An unused parameter
   */

  @objc(testArray:)
  func testArray(unused: Any?) -> [String] {
    return ["hello", "world"]
  }

  /**
   Tests a nil/null return value.
   
   - returns: The null return value
   
   - parameters:
   - unused An unused parameter
   */
  
  @objc(testNull:)
  func testNull(unused: Any?) -> Any? {
    return nil // Or "NSNull()" for dictionary safety
  }
}
