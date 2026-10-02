/**
 * App.js - ParkEase Mobile App Entry Point
 * Wraps the app with providers: Redux, Navigation, StatusBar, GlobalErrorBanner
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Platform,
  AppState,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider } from 'posthog-react-native';
import { Ionicons } from '@expo/vector-icons';
import NetworkLogger, { startNetworkLogging, stopNetworkLogging } from 'react-native-network-logger';
import store from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import { posthog } from './src/services/analytics/posthogService';
import GlobalErrorBanner from './src/components/Common/GlobalErrorBanner';
import NotificationService from './src/services/notifications/NotificationService';
import RemoteConfigService from './src/services/remoteConfig/RemoteConfigService';

const FAB_WIDTH = 112;
const FAB_HEIGHT = 44;
const FAB_MARGIN = 16;
const FAB_BOTTOM_OFFSET = 24;
const TAP_THRESHOLD = 6;

function getInitialFabPosition() {
  const { width, height } = Dimensions.get('window');

  return {
    x: Math.max(FAB_MARGIN, width - FAB_WIDTH - FAB_MARGIN),
    y: Math.max(FAB_MARGIN, height - FAB_HEIGHT - FAB_BOTTOM_OFFSET),
  };
}

export default function App() {
  const [isNetworkLoggerVisible, setIsNetworkLoggerVisible] = useState(false);
  const [isDebuggerEnabled, setIsDebuggerEnabled] = useState(false);
  const dragPosition = useRef(
    new Animated.ValueXY(getInitialFabPosition())
  ).current;
  const dragOffset = useRef(getInitialFabPosition());

  const clampFabPosition = useCallback((x, y) => {
    const { width, height } = Dimensions.get('window');
    const maxX = Math.max(FAB_MARGIN, width - FAB_WIDTH - FAB_MARGIN);
    const maxY = Math.max(FAB_MARGIN, height - FAB_HEIGHT - FAB_MARGIN);

    return {
      x: Math.min(Math.max(FAB_MARGIN, x), maxX),
      y: Math.min(Math.max(FAB_MARGIN, y), maxY),
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
      onPanResponderGrant: () => {
        dragPosition.stopAnimation((value) => {
          dragOffset.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const nextPosition = clampFabPosition(
          dragOffset.current.x + gestureState.dx,
          dragOffset.current.y + gestureState.dy
        );

        dragPosition.setValue(nextPosition);
      },
      onPanResponderRelease: (_, gestureState) => {
        const didTap =
          Math.abs(gestureState.dx) < TAP_THRESHOLD &&
          Math.abs(gestureState.dy) < TAP_THRESHOLD;

        const nextPosition = clampFabPosition(
          dragOffset.current.x + gestureState.dx,
          dragOffset.current.y + gestureState.dy
        );

        dragOffset.current = nextPosition;

        Animated.spring(dragPosition, {
          toValue: nextPosition,
          useNativeDriver: false,
          speed: 20,
          bounciness: 6,
        }).start();

        if (didTap) {
          setIsNetworkLoggerVisible(true);
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(dragPosition, {
          toValue: dragOffset.current,
          useNativeDriver: false,
          speed: 20,
          bounciness: 6,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    let isMounted = true;

    const syncDebuggerFlag = async (refresh = false) => {
      try {
        const shouldEnableDebugger = await RemoteConfigService.getBooleanAsync('isDebuggerEnabled', { refresh });
        if (isMounted) {
          setIsDebuggerEnabled(shouldEnableDebugger);
        }

        if (shouldEnableDebugger) {
          startNetworkLogging({
            ignoredPatterns: [/^GET https:\/\/firebaseremoteconfig\.googleapis\.com\//],
          });
          return;
        }

        stopNetworkLogging();
        if (isMounted) {
          setIsNetworkLoggerVisible(false);
        }
      } catch (err) {
        console.warn('Failed to sync debugger flag:', err);
      }
    };

    const initializeApp = async () => {
      await RemoteConfigService.initialize();
      await syncDebuggerFlag(true);
    };

    initializeApp();

    if (Platform.OS === 'android') {
      NotificationService.initialize();
    }

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        syncDebuggerFlag(true);
      }
    });

    return () => {
      isMounted = false;
      appStateSubscription?.remove?.();

      if (Platform.OS === 'android') {
        NotificationService.cleanup();
      }

      stopNetworkLogging();
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
          <View style={styles.container}>
            <RootNavigator />
            <GlobalErrorBanner />

            {isDebuggerEnabled ? (
              <>
                <Animated.View
                  {...panResponder.panHandlers}
                  style={[
                    styles.debugFab,
                    {
                      left: dragPosition.x,
                      top: dragPosition.y,
                    },
                  ]}
                  testID="debug-fab"
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.debugFabContent}
                    onPress={() => setIsNetworkLoggerVisible(true)}
                    testID="debug-fab-button"
                  >
                    <Ionicons name="pulse-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.debugFabText}>Network</Text>
                  </TouchableOpacity>
                </Animated.View>

                <Modal
                  visible={isNetworkLoggerVisible}
                  animationType="slide"
                  presentationStyle="fullScreen"
                  onRequestClose={() => setIsNetworkLoggerVisible(false)}
                  testID="network-logger-modal"
                >
                  <View style={styles.loggerHeader}>
                    <Text style={styles.loggerTitle}>Network Logger</Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setIsNetworkLoggerVisible(false)}
                      style={styles.closeButton}
                      testID="close-network-logger"
                    >
                      <Ionicons name="close" size={22} color="#0A1828" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.loggerBody}>
                    <NetworkLogger theme="light" compact />
                  </View>
                </Modal>
              </>
            ) : null}
          </View>
        </SafeAreaProvider>
      </PostHogProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugFab: {
    position: 'absolute',
    zIndex: 999,
  },
  debugFabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0A1828',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0A1828',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  debugFabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loggerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#F5F7FA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D5DEE8',
  },
  loggerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A1828',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  loggerBody: {
    flex: 1,
  },
});
