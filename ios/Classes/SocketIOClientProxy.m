//
//  SocketIOClientProxy.m
//  ti.socketio
//
//  Created by Jan Vennemann on 20.05.18.
//

#import "SocketManagerProxy.h"
#import "SocketIOClientProxy.h"
#import "TiUtils.h"

#import <SocketIO/SocketIO-Swift.h>

@interface SocketIOClientProxy ()

@property (nonatomic, strong) SocketIOClient *socket;
@property (nonatomic, strong) NSMapTable<KrollCallback *, NSUUID *> *handlerIdentifiers;
@property (nonatomic, strong) NSMutableDictionary<NSString *, NSMutableSet *> *eventHandlers;
@property (nonatomic, strong) NSDictionary<NSString *, NSString *> *eventRenamingMap;

@end

@implementation SocketIOClientProxy

- (instancetype)initWithContext:(id<TiEvaluator>)context socket:(SocketIOClient *)socket manager:(SocketManagerProxy *)manager
{
  if (self = [self _initWithPageContext:context]) {
    _io = manager;
    self.socket = socket;
    self.handlerIdentifiers = [NSMapTable strongToStrongObjectsMapTable];
    self.eventHandlers = [NSMutableDictionary new];
    self.eventRenamingMap = @{
                              @"connect_error": @"error",
                              @"reconnect_attempt": @"reconnectAttempt",
                              @"reconnecting": @"reconnectAttempt"
                              };
  }

  return self;
}

#pragma mark - Public JS properties

- (NSString *)id
{
  return self.socket.status == SocketIOStatusConnected ? self.socket.sid : nil;
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

- (SocketIOClientProxy *)on:(id)args
{
  ENSURE_TYPE(args, NSArray);
  ENSURE_ARG_COUNT(args, 2);

  NSString *eventName = [TiUtils stringValue:[args objectAtIndex:0]];
  if (self.eventRenamingMap[eventName] != nil) {
    eventName = self.eventRenamingMap[eventName];
  }
  KrollCallback *callback = [args objectAtIndex:1];
  NSUUID *handlerId = [self.socket on:eventName
                             callback:^(NSArray *data, SocketAckEmitter *ack) {
                               // TODO: Handle ack callback
                               //KrollCallback *ackCallback = [KrollCallback alloc] initWithCallback:nil thisObject:nil context:[callback context]]
                               [callback call:data thisObject:nil];
                             }];
  [self.handlerIdentifiers setObject:handlerId forKey:callback];
  [self storeEventHandler:callback forEvent:eventName];

  return self;
}

- (SocketIOClientProxy *)once:(id)args
{
  ENSURE_TYPE(args, NSArray);
  ENSURE_ARG_COUNT(args, 2);

  NSString *eventName = [TiUtils stringValue:[args objectAtIndex:0]];
  if (self.eventRenamingMap[eventName] != nil) {
    eventName = self.eventRenamingMap[eventName];
  }
  KrollCallback *callback = [args objectAtIndex:1];
  NSUUID *handlerId = [self.socket once:eventName
                               callback:^(NSArray *data, SocketAckEmitter *ack) {
                                 // TODO: Handle ack callback
                                 [callback call:data thisObject:nil];
                                 [self removeEventHandler:callback forEvent:eventName];
                               }];
  [self.handlerIdentifiers setObject:handlerId forKey:callback];
  [self storeEventHandler:callback forEvent:eventName];

  return self;
}

- (SocketIOClientProxy *)off:(id)args
{
  ENSURE_TYPE_OR_NIL(args, NSArray);

  if (args == nil) {
    [self.socket removeAllHandlers];
    [self removeAllEventHandlers];
  } else if ([args count] == 1) {
    NSString *eventName = [TiUtils stringValue:[args objectAtIndex:0]];
    if (self.eventRenamingMap[eventName] != nil) {
      eventName = self.eventRenamingMap[eventName];
    }
    [self.socket off:eventName];
    [self removeAllEventHandlersForEvent:eventName];
  } else if ([args count] == 2) {
    NSString *eventName = [TiUtils stringValue:[args objectAtIndex:0]];
    if (self.eventRenamingMap[eventName] != nil) {
      eventName = self.eventRenamingMap[eventName];
    }
    KrollCallback *handler = [args objectAtIndex:1];
    NSUUID *handlerId = [self findHandlerId:handler];
    if (handlerId != nil) {
      [self.socket offWithId:handlerId];
      [self removeEventHandler:handler forEvent:eventName];
    }
  }

  return self;
}

- (SocketIOClientProxy *)emit:(id)args
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

  return self;
}

- (void)close:(id)args
{
  [self disconnect:args];
}

- (void)disconnect:(id)args
{
  [self.socket disconnect];
}

#pragma mark - Public methods

- (void)fireClientEvent:(NSString *)eventName data:(NSArray *)data
{
  NSMutableSet *handlers = self.eventHandlers[eventName];
  for (KrollCallback *callback in handlers) {
    [callback call:data thisObject:nil];
  }
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

/**
Stores an event handler for the given event name.

For compatibility with the web client we expose the method on, once and off.
This delegates to our internal event handling using addEventListener to take
care of safely storing the handler function and protecting it against GC.
 */
- (void)storeEventHandler:(KrollCallback *)callback forEvent:(NSString *)eventName
{
  [self addEventListener:@[eventName, callback]];

  NSMutableSet *handlers = self.eventHandlers[eventName];
  if (handlers == nil) {
    handlers = [NSMutableSet new];
  }
  [handlers addObject:callback];
}

- (void)removeEventHandler:(KrollCallback *)callback forEvent:(NSString *)eventName
{
  NSMutableSet *handlers = self.eventHandlers[eventName];
  if (handlers != nil) {
    [handlers removeObject:callback];
  }

  [self removeEventListener:@[eventName, callback]];
  [self removeHandlerId:callback];
}

- (void)removeAllEventHandlersForEvent:(NSString *)eventName
{
  NSMutableSet *handlers = self.eventHandlers[eventName];
  if (handlers == nil) {
    return;
  }
  for (KrollCallback *callback in handlers) {
    [self removeEventHandler:callback forEvent:eventName];
  }
  [self.eventHandlers removeObjectForKey:eventName];
}

- (void)removeAllEventHandlers
{
  for (NSString *eventName in self.eventHandlers.allKeys) {
    [self removeAllEventHandlersForEvent:eventName];
  }
}

- (NSUUID *)findHandlerId:(KrollCallback *)handler
{
  for (KrollCallback *storedCallback in self.handlerIdentifiers.keyEnumerator) {
    if ([storedCallback isEqual: handler]) {
      return [self.handlerIdentifiers objectForKey:storedCallback];
    }
  }

  return nil;
}

- (void)removeHandlerId:(KrollCallback *)handler
{
  for (KrollCallback *storedCallback in self.handlerIdentifiers.keyEnumerator) {
    if ([storedCallback isEqual: handler]) {
      [self.handlerIdentifiers removeObjectForKey:storedCallback];
      return;
    }
  }
}

@end
