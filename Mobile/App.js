/**
 * App.js - ParkEase Mobile App Entry Point
 * Wraps the app with providers: Redux, Navigation, StatusBar
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider } from 'posthog-react-native';
import store from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { posthog } from './src/services/analytics/posthogService';

export default function App() {
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
        </SafeAreaProvider>
      </PostHogProvider>
    </Provider>
  );
}
