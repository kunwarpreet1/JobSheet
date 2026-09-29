import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    // Setup UNUserNotificationCenter for Push Notifications
    UNUserNotificationCenter.current().delegate = self
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
      if let error = error {
        print("⚠️ [Push Notifications Authorization Error]: \(error.localizedDescription)")
      } else {
        print("📲 [Push Notifications Authorization Granted]: \(granted)")
      }
    }
    application.registerForRemoteNotifications()

    factory.startReactNative(
      withModuleName: "JobSheetFlow",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // Remote Push Token Registration
  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()
    print("📲 [Native Device Token]: \(token)")
    NotificationCenter.default.post(
      name: NSNotification.Name("DeviceTokenReceived"),
      object: nil,
      userInfo: ["token": token]
    )
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("⚠️ [Push Registration Error]: \(error.localizedDescription)")
  }

  // Foreground presentation: Display status bar banner, sound, and badge even when app is open
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge, .list])
    } else {
      completionHandler([.alert, .sound, .badge])
    }
  }

  // Background / closed app tap: User taps the push notification in status bar or notification center
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    NotificationCenter.default.post(
      name: NSNotification.Name("PushNotificationTapped"),
      object: nil,
      userInfo: userInfo
    )
    completionHandler()
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    let port = ProcessInfo.processInfo.environment["RCT_METRO_PORT"] ?? "8082"
    RCTBundleURLProvider.sharedSettings().jsLocation = "localhost:\(port)"
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
      ?? RCTBundleURLProvider.jsBundleURL(
        forBundleRoot: "index",
        packagerHost: "localhost:\(port)",
        enableDev: true,
        enableMinification: false,
        inlineSourceMap: false
      )
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
