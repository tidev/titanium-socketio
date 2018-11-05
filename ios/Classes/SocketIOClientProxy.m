//
//  SocketIOClientProxy.m
//  ti.socketio
//
//  Created by Jan Vennemann on 20.05.18.
//

#import "SocketIOClientProxy.h"
#import "TiUtils.h"

#import <SocketIO/SocketIO-Swift.h>

@interface SocketIOClientProxy ()

@property (nonatomic, strong) NSMapTable<KrollCallback *, NSUUID *> *handlerIdentifiers;

@end

@implementation SocketIOClientProxy

- (instancetype)initWithSocket:(SocketIOClient *)socket
{
  if (self = [self init]) {
    self.socket = socket;
    self.handlerIdentifiers = [NSMapTable weakToStrongObjectsMapTable];
  }

  return self;
}

#pragma mark - Public JS properties

- (NSString *)id
{
  return self.socket.sid;
}

- (NSNumber *)connected
{
  return @(self.socket.status == SocketIOStatusConnected);
}

- (NSNumber *)disconnected
{
  return @(self.socket.status == SocketIOStatusDisconnected);
}

#pragma mark - Public JS methods

- (void)open:(id)args
{
  [self connect:args];
}

- (void)connect:(id)args
{
  [self.socket connect];
}

- (NSString *)on:(id)args
{
  ENSURE_TYPE(args, NSArray);
  ENSURE_ARG_COUNT(args, 2);

  NSString *eventName = [TiUtils stringValue:[args objectAtIndex:0]];
  KrollCallback *callback = [args objectAtIndex:1];
  NSUUID *handlerId = [self.socket on:eventName
                             callback:^(NSArray *data, SocketAckEmitter *ack) {
                               // TODO: Handle ack callback
                               //KrollCallback *ackCallback = [KrollCallback alloc] initWithCallback:nil thisObject:nil context:[callback context]]
                               [callback call:data thisObject:nil];
                             }];
  [self.handlerIdentifiers setObject:handlerId forKey:callback];

  return [handlerId UUIDString];
}

- (NSString *)once:(id)args
{
  ENSURE_TYPE(args, NSArray);
  ENSURE_ARG_COUNT(args, 2);

  NSString *eventName = [TiUtils stringValue:[args objectAtIndex:0]];
  KrollCallback *callback = [args objectAtIndex:1];
  NSUUID *handlerId = [self.socket once:eventName
                               callback:^(NSArray *data, SocketAckEmitter *ack) {
                                 // TODO: Handle ack callback
                                 [self.handlerIdentifiers removeObjectForKey:callback];
                                 [callback call:data thisObject:nil];
                               }];
  [self.handlerIdentifiers setObject:handlerId forKey:callback];

  return [handlerId UUIDString];
}

- (void)off:(id)args
{
  ENSURE_TYPE_OR_NIL(args, NSArray);

  if ([args count] == 0) {
    [self.socket removeAllHandlers];
    [self.handlerIdentifiers removeAllObjects];
  } else if ([args count] == 1) {
    NSString *eventName = [TiUtils stringValue:[args objectAtIndex:0]];
    [self.socket off:eventName];
  } else if ([args count] == 2) {
    KrollCallback *handler = [args objectAtIndex:1];
    NSUUID *handlerId = [self.handlerIdentifiers objectForKey:handler];
    if (handlerId != nil) {
      [self.socket offWithId:handlerId];
      [self.handlerIdentifiers removeObjectForKey:handler];
    }
  }
}

- (void)emit:(id)args
{
  ENSURE_TYPE(args, NSArray);
  ENSURE_ARG_COUNT(args, 1);

  NSString *eventName = [TiUtils stringValue:[args objectAtIndex:0]];
  NSMutableArray *data = [NSMutableArray new];
  KrollCallback *ackCallback = nil;

  if ([args count] > 1) {
    NSUInteger lastArgumentIndex = [args count] - 1;

    if ([[args objectAtIndex:lastArgumentIndex] isKindOfClass:KrollCallback.class]) {
      ackCallback = [args objectAtIndex:lastArgumentIndex];
      lastArgumentIndex -= 1;
    }

    // Exclude the first argument to only map the data between the second and penultimate index
    NSArray *metaArguments = [args subarrayWithRange:NSMakeRange(1, lastArgumentIndex)];
    [metaArguments enumerateObjectsUsingBlock:^(id  _Nonnull obj, NSUInteger idx, BOOL * _Nonnull stop) {
      [data addObject:obj];
    }];

    data = [self sanitizeValue:data];
  }

  if (ackCallback != nil) {
    [[self.socket emitWithAck:eventName with:data] timingOutAfter:0
                                                         callback:^(NSArray *ackData) {
                                                           [ackCallback call:ackData thisObject:nil];
                                                         }];
  } else {
    [self.socket emit:eventName with:data];
  }
}

- (void)close:(id)args
{
  [self disconnect:args];
}

- (void)disconnect:(id)args
{
  [self.socket disconnect];
}

#pragma mark - Private methods

- (id)sanitizeValue:(id)value
{
  if (![NSJSONSerialization isValidJSONObject:value]) {
    // [TiUtils stripInvalidJSONPayload] is private, so invoke it indirectly
    NSString *stringyfiedValue = [TiUtils jsonStringify:value];
    return [TiUtils jsonParse:stringyfiedValue];
  } else {
    return value;
  }
}

@end
