import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  BackHandler,
  useColorScheme,
  useWindowDimensions,
  NativeModules,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import Header from './src/components/Header';
import BottomNav from './src/components/BottomNav';
import SidebarNav from './src/components/SidebarNav';
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

  // Cinematic Paper Boat Splash Screen
  if (!isSplashDone || isSessionRestoring) {
    return (
      <View style={styles.splashRoot}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="#FFFBF7"
        />
        <SplashScreen
          onFinish={() => {
            setIsSplashDone(true);
          }}
        />
      </View>
    );
  }

  // AUTHENTICATION FLOW: Mobile Number / Login Screen
  if (currentRoute.name === 'Login') {
    return (
      <View style={[styles.root, { backgroundColor: '#FFFBF7', paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="#FFFBF7"
        />
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
  splashRoot: {
    flex: 1,
    backgroundColor: '#FFFBF7',
  },
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
});
