//
//  SocketIOClientProxy.h
//  ti.socketio
//
//  Created by Jan Vennemann on 20.05.18.
//

#import "TiProxy.h"

@class SocketIOClient;

@interface SocketIOClientProxy : TiProxy

@property (nonatomic, strong) SocketIOClient *socket;

- (instancetype)initWithSocket:(SocketIOClient *)socket;

- (NSString *)id;
- (NSNumber *)connected;
- (NSNumber *)disconnected;

- (void)open:(id)args;
- (void)connect:(id)args;
- (NSString *)on:(id)args;
- (NSString *)once:(id)args;
- (void)off:(id)args;
- (void)emit:(id)args;
- (void)close:(id)args;
- (void)disconnect:(id)args;

@end
