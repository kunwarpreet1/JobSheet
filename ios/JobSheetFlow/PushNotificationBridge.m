#import "PushNotificationBridge.h"

static NSDictionary *_initialNotification = nil;

@implementation PushNotificationBridge {
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE(PushNotificationBridge);

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

+ (void)handleNotificationReceived:(NSDictionary *)userInfo {
  _initialNotification = userInfo;
  [[NSNotificationCenter defaultCenter] postNotificationName:@"PushNotificationTapped"
                                                      object:nil
                                                    userInfo:userInfo];
}

- (instancetype)init {
  self = [super init];
  if (self) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(onPushNotificationTappedNotification:)
                                                 name:@"PushNotificationTapped"
                                               object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onNotificationTapped"];
}

- (void)startObserving {
  _hasListeners = YES;
}

- (void)stopObserving {
  _hasListeners = NO;
}

- (void)onPushNotificationTappedNotification:(NSNotification *)notification {
  if (_hasListeners && notification.userInfo) {
    [self sendEventWithName:@"onNotificationTapped" body:notification.userInfo];
  }
}

RCT_EXPORT_METHOD(displayNotification:(NSString *)title
                  body:(NSString *)body
                  data:(NSDictionary *)data
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  
  [center getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
    if (settings.authorizationStatus == UNAuthorizationStatusNotDetermined) {
      [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge)
                            completionHandler:^(BOOL granted, NSError * _Nullable error) {
        if (granted) {
          [self deliverNotification:title body:body data:data resolver:resolve rejecter:reject];
        } else {
          resolve(@{@"success": @NO, @"reason": @"Notification permission not granted"});
        }
      }];
    } else {
      [self deliverNotification:title body:body data:data resolver:resolve rejecter:reject];
    }
  }];
}

- (void)deliverNotification:(NSString *)title
                       body:(NSString *)body
                       data:(NSDictionary *)data
                   resolver:(RCTPromiseResolveBlock)resolve
                   rejecter:(RCTPromiseRejectBlock)reject
{
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
  content.title = title ?: @"JobSheetFlow Notification";
  content.body = body ?: @"";
  content.sound = [UNNotificationSound defaultSound];
  content.badge = @1;
  content.userInfo = data ?: @{};

  if (@available(iOS 15.0, *)) {
    content.interruptionLevel = UNNotificationInterruptionLevelTimeSensitive;
  }

  // Trigger after 0.1s so system presents it immediately
  UNTimeIntervalNotificationTrigger *trigger = [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:0.1 repeats:NO];
  NSString *identifier = [NSString stringWithFormat:@"JobSheetFlow_%@", [[NSUUID UUID] UUIDString]];
  UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:identifier content:content trigger:trigger];

  [center addNotificationRequest:request withCompletionHandler:^(NSError * _Nullable error) {
    if (error) {
      NSLog(@"⚠️ [PushNotificationBridge iOS Error]: %@", error.localizedDescription);
      reject(@"NOTIFICATION_ERROR", error.localizedDescription, error);
    } else {
      NSLog(@"📲 [PushNotificationBridge iOS]: Scheduled notification: '%@'", title);
      resolve(@{@"success": @YES, @"id": identifier});
    }
  }];
}

RCT_EXPORT_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge)
                        completionHandler:^(BOOL granted, NSError * _Nullable error) {
    if (error) {
      resolve(@NO);
    } else {
      resolve(@(granted));
    }
  }];
}

RCT_EXPORT_METHOD(getInitialNotification:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (_initialNotification) {
    NSDictionary *payload = [_initialNotification copy];
    _initialNotification = nil;
    resolve(payload);
  } else {
    resolve([NSNull null]);
  }
}

@end
