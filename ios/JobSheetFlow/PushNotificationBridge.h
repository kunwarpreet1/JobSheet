#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UserNotifications/UserNotifications.h>

@interface PushNotificationBridge : RCTEventEmitter <RCTBridgeModule>

+ (void)handleNotificationReceived:(NSDictionary *)userInfo;

@end
