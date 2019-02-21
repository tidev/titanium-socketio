//
//  SocketManagerProxy.m
//  ti.socketio
//
//  Created by Jan Vennemann on 14.12.18.
//

#import "SocketManagerProxy.h"
#import "SocketIOClientProxy.h"
#import "TiUtils.h"

#import <SocketIO/SocketIO-Swift.h>

@interface SocketManagerProxy ()

@property BOOL autoConnect;
@property double timeout;

@end

@implementation SocketManagerProxy

- (instancetype)initWithContext:(id<TiEvaluator>)context url:(NSURL *)url options:(NSDictionary *)options;
{
  self = [self _initWithPageContext:context];
  if (self == nil) {
    return nil;
  }

  self.autoConnect = [TiUtils boolValue:@"autoConnect" properties:options def:YES];
  self.timeout = [TiUtils doubleValue:@"timeout" properties:options def:20000.f];

  NSDictionary *nativeOptions = [self convertOptions:options];
#if DEBUG
  DebugLog(@"lookup manager with options %@", nativeOptions);
#endif
  self.manager = [[SocketManager alloc] initWithSocketURL:url config:nativeOptions];

  return self;
}

#pragma mark - Public JS methods

- (SocketIOClientProxy *)socket:(id)args
{
  ENSURE_ARG_COUNT(args, 1);
  NSString *path = [TiUtils stringValue:[args objectAtIndex:0]];

  SocketIOClient *socket;
  if ([path isEqualToString:@"/"]) {
    socket = self.manager.defaultSocket;
  } else {
    socket = [self.manager socketForNamespace:path];
  }
  SocketIOClientProxy *socketProxy = [[SocketIOClientProxy alloc] initWithContext:self.pageContext socket:socket manager:self];
  if (self.autoConnect) {
    if (fabs(self.timeout - 0.0f) < DBL_EPSILON) {
      [socket connect];
    } else {
      [socket connectWithTimeoutAfter:self.timeout / 1000.f withHandler:^(void) {
        [socketProxy fireClientEvent:@"connect_timeout" data:nil];
      }];
    }
  }
  return socketProxy;
}

- (void)open:(id)args
{
  [self connect:args];
}

- (void)connect:(id)args
{
  [self.manager connect];
}

- (void)close:(id)args
{
  [self disconnect:args];
}

- (void)disconnect:(id)args
{
  [self.manager disconnect];
}

- (id)toString:(id)args
{
  return [NSString stringWithFormat: @"SocketManager (%p) %@", self, self.manager];
}

#pragma mark - Private methods

- (NSMutableDictionary *)convertOptions:(NSDictionary *)jsOptions
{
  NSMutableDictionary *options = [NSMutableDictionary dictionaryWithDictionary:jsOptions];

  [self options:options removeUnsupported:@"path" silent:false];
  [self options:options rename:@"reconnection" to:@"reconnects"];
  [self options:options rename:@"reconnectionAttempts" to:@"reconnectAttempts"];
  [self options:options rename:@"reconnectionDelay" to:@"reconnectWait"];
  if (options[@"reconnectWait"] != nil) {
    options[@"reconnectWait"] = @([TiUtils doubleValue:@"reconnectWait" properties:options def:1000.f] / 1000);
  }
  [self options:options rename:@"reconnectionDelayMax" to:@"reconnectWaitMax"];
  if (options[@"reconnectWaitMax"] != nil) {
    options[@"reconnectWaitMax"] = @([TiUtils doubleValue:@"reconnectWaitMax" properties:options def:5000.f] / 1000);
  }
  [self options:options removeUnsupported:@"timeout" silent:true];
  [self options:options removeUnsupported:@"autoConnect" silent:true];
  [self options:options removeUnsupported:@"parser" silent:false];

  NSDictionary *queryParams = [options objectForKey:@"query"];
  if (queryParams != nil) {
    [options setObject:queryParams forKey:@"connectParams"];
    [options removeObjectForKey:@"query"];
  }

  return options;
}

- (void)options:(NSMutableDictionary *)options rename:(NSString *)fromName to:(NSString *)toName
{
  id optionValue = [options objectForKey:fromName];
  if (optionValue == nil) {
    return;
  }

  [options removeObjectForKey:fromName];
  [options setObject:optionValue forKey:toName];
}

- (void)options:(NSMutableDictionary *)options removeUnsupported:(NSString *)optionName silent:(BOOL)silent
{
  id optionValue = [options objectForKey:optionName];
  if (optionValue == nil) {
    return;
  }

  if (!silent) {
    NSLog(@"[WARN] The option %@ is not supported on the iOS client and will be ignored.", optionName);
  }
  [options removeObjectForKey:optionName];
}

@end
