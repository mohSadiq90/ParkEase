/**
 * App.js - ParkEase Mobile App Entry Point
 * Wraps the app with providers: Redux, Navigation, StatusBar, GlobalErrorBanner
 */

import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider } from 'posthog-react-native';
import store from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { posthog } from './src/services/analytics/posthogService';
import GlobalErrorBanner from './src/components/Common/GlobalErrorBanner';
import NotificationService from './src/services/notifications/NotificationService';

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NotificationService.initialize();
    }
    return () => {
      if (Platform.OS === 'android') {
        NotificationService.cleanup();
      }
    };
  }, []);

  return (
    <Provider store={store}>
      <PostHogProvider
        client={posthog}
        autocapture={{
          captureTouches: true,
          captureScreens: false,
        }}
      >
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <RootNavigator />
          <GlobalErrorBanner />
        </SafeAreaProvider>
      </PostHogProvider>
    </Provider>
  );
}
