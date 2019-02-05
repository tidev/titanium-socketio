/**
 * ti.socketio
 *
 * Created by Jan Vennemann
 * Copyright (c) 2018-Present Axway Appcelerator. All rights reserved.
 */

#import "TiModule.h"

@class SocketIOClientProxy;
@class SocketManagerProxy;

@interface TiSocketioModule : TiModule

- (SocketIOClientProxy *)connect:(id)args;
- (SocketManagerProxy *)Manager:(id)args;

@end
