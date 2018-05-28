/**
 * ti.socketio
 *
 * Created by Jan Vennemann
 * Copyright (c) 2018-Present Axway Appcelerator. All rights reserved.
 */

#import "TiSocketioModule.h"
#import "SocketIOClientProxy.h"
#import "TiBase.h"
#import "TiHost.h"
#import "TiUtils.h"

#import <SocketIO/SocketIO-Swift.h>

@interface TiSocketioModule ()

@property (nonatomic, strong) SocketManager *manager;

@end

@implementation TiSocketioModule

#pragma mark - Internal

// This is generated for your module, please do not change it
- (id)moduleGUID
{
  return @"65fbdc59-432f-40d8-8ea9-02799887db3c";
}

// This is generated for your module, please do not change it
- (NSString *)moduleId
{
  return @"com.appc.titanium.socketio";
}

#pragma mark - Lifecycle

- (void)startup
{
  // This method is called when the module is first loaded
  // You *must* call the superclass
  [super startup];
  DebugLog(@"[DEBUG] %@ loaded", self);
}

#pragma mark - Public APIs

- (SocketIOClientProxy *)connect:(id)args
{
  ENSURE_TYPE(args, NSArray);

  NSURL *url = [[NSURL alloc] initWithString:[TiUtils stringValue:[args objectAtIndex:0]]];
  NSMutableDictionary *options = nil;
  if ([args count] == 2) {
    id jsOptions = [args objectAtIndex:1];
    ENSURE_TYPE(jsOptions, NSDictionary);
    options = [self convertOptions:jsOptions];
  }

  BOOL autoConnect = [TiUtils boolValue:@"autoConnect" properties:options def:YES];
  [options removeObjectForKey:@"autoConnect"];

  self.manager = [[SocketManager alloc] initWithSocketURL:url config:options];
  if (autoConnect) {
    [self.manager connect];
  }

  SocketIOClient *socket;
  if (url.path == nil || [url.path isEqualToString:@""] || [url.path isEqualToString:@"/"]) {
    socket = self.manager.defaultSocket;
  } else {
    socket = [self.manager socketForNamespace:url.path];
  }
  SocketIOClientProxy *socketProxy = [[SocketIOClientProxy alloc] initWithSocket:socket];

  return socketProxy;
}

#pragma mark - Private methods

- (NSMutableDictionary *)convertOptions:(NSDictionary *)jsOptions
{
  NSMutableDictionary *options = [NSMutableDictionary dictionaryWithDictionary:jsOptions];

  [self options:options rename:@"reconnection" to:@"reconnects"];
  [self options:options rename:@"reconnectionAttempts" to:@"reconnectAttempts"];
  [self options:options rename:@"reconnectionDelay" to:@"reconnectWait"];

  [self options:options removeUnsupported:@"reconnectionDelayMax"];
  [self options:options removeUnsupported:@"randomizationFactor"];
  [self options:options removeUnsupported:@"parser"];

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

- (void)options:(NSMutableDictionary *)options removeUnsupported:(NSString *)optionName
{
  id optionValue = [options objectForKey:optionName];
  if (optionValue == nil) {
    return;
  }

  NSLog(@"[WARN] The option %@ is not supported on the iOS client and will be ignored.", optionName);
  [options removeObjectForKey:optionName];
}

@end
