/**
 * ti.socketio
 *
 * Created by Jan Vennemann
 * Copyright (c) 2018-Present Axway Appcelerator. All rights reserved.
 */

#import "TiSocketioModule.h"
#import "SocketIOClientProxy.h"
#import "SocketManagerProxy.h"
#import "TiBase.h"
#import "TiHost.h"
#import "TiUtils.h"

#import <SocketIO/SocketIO-Swift.h>

@interface TiSocketioModule ()

@property (nonatomic, strong) NSMutableDictionary<NSString *, SocketManagerProxy *> *managers;

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
  return @"ti.socketio";
}

#pragma mark - Lifecycle

- (void)startup
{
  // This method is called when the module is first loaded
  // You *must* call the superclass
  [super startup];

  self.managers = [NSMutableDictionary new];

  DebugLog(@"[DEBUG] %@ loaded", self);
}

#pragma mark - Public APIs

- (SocketIOClientProxy *)connect:(id)args
{
  ENSURE_TYPE(args, NSArray);
  NSURL *url = [[NSURL alloc] initWithString:[TiUtils stringValue:[args objectAtIndex:0]]];
  NSMutableDictionary *options = [NSMutableDictionary new];
  if ([args count] == 2) {
    ENSURE_ARG_AT_INDEX(options, args, 1, NSMutableDictionary);
  }

  return [self lookupClientForUrl:url options:options];
}

- (SocketManagerProxy *)Manager:(id)args
{
  ENSURE_TYPE(args, NSArray);
  ENSURE_ARG_COUNT(args, 1)
  NSString *urlString = nil;
  ENSURE_ARG_AT_INDEX(urlString, args, 0, NSString)
  NSURL *url = [[NSURL alloc] initWithString:urlString];
  NSDictionary *options = [NSDictionary new];
  if ([args count] == 2) {
    ENSURE_ARG_AT_INDEX(options, args, 1, NSDictionary);
  }
  return [[SocketManagerProxy alloc] initWithContext:self.pageContext url:url options:options];
}

#pragma mark - Private methods

- (SocketIOClientProxy *)lookupClientForUrl:(NSURL *)url options:(NSMutableDictionary *)options
{
  NSURLComponents *urlComponents = [[NSURLComponents alloc] initWithURL:url resolvingAgainstBaseURL:NO];

  // make sure we always have a scheme and port
  if (urlComponents.scheme == nil) {
    urlComponents.scheme = @"https";
  }
  if (urlComponents.port == nil) {
    if ([urlComponents.scheme isEqualToString:@"http"] || [urlComponents.scheme isEqualToString:@"ws"]) {
      urlComponents.port = @(80);
    } else if ([urlComponents.scheme isEqualToString:@"https"] || [urlComponents.scheme isEqualToString:@"wss"]) {
      urlComponents.port = @(443);
    }
  }

  NSString *path = urlComponents.path != nil && urlComponents.path.length > 0 ? urlComponents.path : @"/";
  urlComponents.path = nil;

  // assign parameters from query string
  if (urlComponents.queryItems != nil && options[@"connectParams"] == nil) {
    NSMutableDictionary *connectParams = [NSMutableDictionary new];
    for (NSURLQueryItem *queryItem in urlComponents.queryItems) {
      connectParams[queryItem.name] = queryItem.value;
    }
    options[@"connectParams"] = connectParams;
  }
  urlComponents.query = nil;

  NSString *cacheIdentifier = urlComponents.string;

  BOOL forceNew = [TiUtils boolValue:@"forceNew" properties:options def:NO];
  [options removeObjectForKey:@"forceNew"];
  BOOL sameNamespace = self.managers[cacheIdentifier].manager.nsps[path] != nil;
  BOOL newConnection = sameNamespace || forceNew;

  SocketManagerProxy *manager;
  if (newConnection) {
    manager = [[SocketManagerProxy alloc] initWithContext:self.pageContext url:urlComponents.URL options:options];
  } else {
    if (self.managers[cacheIdentifier] == nil) {
      manager = [[SocketManagerProxy alloc] initWithContext:self.pageContext url:urlComponents.URL options:options];
      self.managers[cacheIdentifier] = manager;
    }
    manager = self.managers[cacheIdentifier];
  }

  return [manager socket:@[path, options]];
}

@end
