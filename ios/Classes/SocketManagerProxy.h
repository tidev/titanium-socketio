//
//  SocketManagerProxy.h
//  ti.socketio
//
//  Created by Jan Vennemann on 14.12.18.
//

#import "TiProxy.h"

@class SocketIOClientProxy;
@class SocketManager;

@interface SocketManagerProxy : TiProxy

@property (nonatomic, strong) SocketManager *manager;

- (instancetype)initWithContext:(id<TiEvaluator>)context url:(NSURL *)url options:(NSDictionary *)options;
- (SocketIOClientProxy *)socket:(id)args;
- (void)open:(id)args;
- (void)connect:(id)args;
- (void)close:(id)args;
- (void)disconnect:(id)args;

@end
