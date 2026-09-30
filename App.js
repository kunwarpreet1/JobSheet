import React, { useEffect, useState } from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
  NativeModules,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import SidebarNav from './src/components/SidebarNav';
import VectorIcon from './src/components/VectorIcon';
import SplashScreen from './src/components/SplashScreen';

// Auth Flow Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Main Application Screens
import DashboardScreen from './src/screens/DashboardScreen';
import JobSheetsScreen from './src/screens/JobSheetsScreen';
import JobSheetDetailScreen from './src/screens/JobSheetDetailScreen';
import CreateJobSheetScreen from './src/screens/CreateJobSheetScreen';
import PerformanceScreen from './src/screens/PerformanceScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import MasterDataScreen from './src/screens/MasterDataScreen';
import MyTasksScreen from './src/screens/MyTasksScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import { COLORS } from './src/styles/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <MainContainer />
      </AppProvider>
    </SafeAreaProvider>
  );
}

function MainContainer() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= 768;
  const isDarkMode = useColorScheme() === 'dark';
  const {
    currentRoute,
    navigate,
    canGoBack,
    goBack,
    selectedJobSheetId,
    setSelectedJobSheetId,
    activeTab,
    activeBanner,
    setActiveBanner,
    isSessionRestoring,
  } = useApp();

  const [isSplashDone, setIsSplashDone] = useState(false);

  const themeBgColor = '#FFFFFF';

  // Hardware Back & Android TV Remote Back Handling
  useEffect(() => {
    const handleHardwareBack = () => {
      // If on Login screen -> ALWAYS cleanly exit the app!
      if (currentRoute.name === 'Login') {
        BackHandler.exitApp();
        return true;
      }
      if (canGoBack()) {
        goBack();
        // Handled: prevents closing/exiting the app from any non-HomeScreen
        return true;
      }
      // On HomeScreen with no back history -> cleanly exit the app
      BackHandler.exitApp();
      return true;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => backSubscription.remove();
  }, [canGoBack, goBack, currentRoute.name]);

  useEffect(() => {
    console.log('📲 [NativeModules.PushNotificationBridge available?]:', !!NativeModules.PushNotificationBridge);
    if (NativeModules.PushNotificationBridge) {
      console.log('📲 [PushNotificationBridge methods]:', Object.keys(NativeModules.PushNotificationBridge));
    }
  }, []);

  // Cinematic Netflix-Style Paper Boat Splash Screen
  if (!isSplashDone || isSessionRestoring) {
    return (
      <SplashScreen
        onFinish={() => {
          setIsSplashDone(true);
        }}
      />
    );
  }

  const renderNotificationBanner = () => {
    // For iOS, the default native system notification banner is shown; omit duplicate black banner.
    if (Platform.OS === 'ios') return null;
    if (!activeBanner) return null;
    const isOtp = activeBanner.type === 'OTP';
    return (
      <TouchableOpacity
        style={[
          styles.pushBanner,
          {
            top: Math.max(insets.top, 24) + 8,
            zIndex: 999999,
            elevation: 999,
          },
        ]}
        activeOpacity={0.9}
        onPress={() => {
          if (activeBanner.jobSheetId) {
            setSelectedJobSheetId(activeBanner.jobSheetId);
          }
          setActiveBanner(null);
        }}
      >
        <View style={[styles.pushBannerIconBox, isOtp && { backgroundColor: '#10B981' }]}>
          <VectorIcon name={isOtp ? 'shield' : 'bell'} size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pushBannerTitle}>
            {activeBanner.title || (isOtp ? 'Verification Code' : 'Notification')}
          </Text>
          <Text style={styles.pushBannerBody} numberOfLines={2}>
            {activeBanner.body || activeBanner.message}
          </Text>
          {activeBanner.otp && (
            <Text style={{ color: '#34D399', fontSize: 13, fontWeight: '900', marginTop: 2 }}>
              Verification Code: {activeBanner.otp}
            </Text>
          )}
          {activeBanner.jobSheetId && (
            <Text style={styles.pushBannerAction}>Tap to view Task & Job Sheet →</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.pushBannerClose}
          onPress={() => setActiveBanner(null)}
        >
          <VectorIcon name="close" size={14} color="#94A3B8" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // AUTHENTICATION FLOW: Mobile Number / Login Screen
  if (currentRoute.name === 'Login') {
    return (
      <View style={[styles.root, { backgroundColor: '#FFFBF7', paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="#FFFBF7"
        />
        {renderNotificationBanner()}
        <LoginScreen
          onBack={() => BackHandler.exitApp()}


        />
      </View>
    );
  }

  // AUTHENTICATION FLOW: Profile Registration Screen
  if (currentRoute.name === 'Register') {
    return (
      <View style={[styles.root, { backgroundColor: '#FFFBF7', paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="#FFFBF7"
        />
        {renderNotificationBanner()}
        <RegisterScreen
          onBack={() => {
            if (canGoBack && canGoBack()) {
              goBack();
            } else if (navigate) {
              navigate('Login');
            }
          }}
        />
      </View>
    );
  }

  // Standalone Job Sheet Detail View if active route is JobSheetDetail
  if (currentRoute.name === 'JobSheetDetail') {
    return (
      <View style={[styles.root, { backgroundColor: themeBgColor, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={themeBgColor}
        />
        <Header />
        {renderNotificationBanner()}
        {isTabletLayout ? (
          <View style={styles.tabletBody}>
            <SidebarNav />
            <View style={styles.screenWrapper}>
              <JobSheetDetailScreen
                jobSheetId={currentRoute.params?.jobSheetId || selectedJobSheetId}
                onBack={goBack}
              />
            </View>
          </View>
        ) : (
          <View style={styles.mobileBody}>
            <View style={styles.screenWrapper}>
              <JobSheetDetailScreen
                jobSheetId={currentRoute.params?.jobSheetId || selectedJobSheetId}
                onBack={goBack}
              />
            </View>
            <BottomNav />
          </View>
        )}
      </View>
    );
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardScreen />;
      case 'JobSheets':
        return <JobSheetsScreen />;
      case 'Create':
        return <CreateJobSheetScreen />;
      case 'Performance':
        return <PerformanceScreen />;
      case 'Notifications':
        return <NotificationsScreen />;
      case 'MasterData':
        return <MasterDataScreen />;
      case 'MyTasks':
        return <MyTasksScreen />;
      case 'Profile':
        return <ProfileScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: themeBgColor, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={themeBgColor}
      />
      {/* Universal Top Header */}
      <Header />

      {/* Real-Time Push Notification Banner */}
      {renderNotificationBanner()}

      {/* Main Body */}
      {isTabletLayout ? (
        <View style={styles.tabletBody}>
          <SidebarNav />
          <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
        </View>
      ) : (
        <View style={styles.mobileBody}>
          <View style={styles.screenWrapper}>{renderActiveScreen()}</View>
          <BottomNav />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabletBody: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.bgLight,
  },
  mobileBody: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  screenWrapper: {
    flex: 1,
  },
  pushBanner: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    zIndex: 9999,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pushBannerIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pushBannerBody: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 2,
  },
  pushBannerAction: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  pushBannerClose: {
    padding: 6,
  },
});
