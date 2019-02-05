//
//  SocketIOClientProxy.h
//  ti.socketio
//
//  Created by Jan Vennemann on 20.05.18.
//

#import "TiProxy.h"

@class SocketIOClient;
@class SocketManagerProxy;

@interface SocketIOClientProxy : TiProxy

@property (nonatomic, strong, readonly) NSString *id;
@property (nonatomic, strong, readonly) NSNumber *connected;
@property (nonatomic, strong, readonly) NSNumber *disconnected;
@property (nonatomic, strong, readonly) SocketManagerProxy *io;

- (instancetype)initWithContext:(id<TiEvaluator>)context socket:(SocketIOClient *)socket manager:(SocketManagerProxy *)manager;

- (void)open:(id)args;
- (void)connect:(id)args;
- (SocketIOClientProxy *)on:(id)args;
- (SocketIOClientProxy *)once:(id)args;
- (SocketIOClientProxy *)off:(id)args;
- (SocketIOClientProxy *)emit:(id)args;
- (void)close:(id)args;
- (void)disconnect:(id)args;

- (void)fireClientEvent:(NSString *)eventName data:(NSArray *)data;

@end
