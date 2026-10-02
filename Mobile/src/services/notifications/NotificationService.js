/**
 * NotificationService.js
 * Handles Firebase Cloud Messaging (FCM) for real device push notifications.
 * Includes permission requests, token registration/deregistration with backend,
 * foreground message banners, and background/quit-state notification tap routing.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import firebase from '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventBus } from '../../utils/EventBus';
import apiClient from '../api/apiClient';
import ENDPOINTS from '../api/endpoints';
import logger from '../../utils/logger';
import Constants from 'expo-constants';
import { storageService } from '../storage/secureStorage';

const TAG = 'NotificationService';
const DEVICE_ID_STORAGE_KEY = 'parkease_device_id';

/**
 * Reads and persists a stable device identifier for backend upsert behavior.
 * Prefer Firebase Installations on Android to match backend expectations.
 */
async function getOrCreateDeviceId() {
    try {
        const stored = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
        if (stored) {
            return stored;
        }

        const firebaseInstallationId = await getFirebaseInstallationId();
        const expoId = Constants?.installationId;
        const newId = firebaseInstallationId || expoId || generateUUID();

        await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, newId);
        return newId;
    } catch (error) {
        logger.warn(TAG, 'Could not persist deviceId, using in-memory fallback', error);
        return generateUUID();
    }
}

async function getFirebaseInstallationId() {
    if (Platform.OS !== 'android') {
        return null;
    }

    try {
        if (firebase?.installations) {
            return await firebase.installations().getId();
        }
        return null;
    } catch (error) {
        logger.warn(TAG, 'Failed to get Firebase installation ID, falling back to local identifier', error);
        return null;
    }
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Maps an FCM notification payload to an in-app navigation action.
 * Returns { screen, params } or null if no navigation needed.
 */
function resolveNavigationTarget(data = {}) {
    const type = data.type || '';
    const bookingId = data.bookingId || data.BookingId;
    const parkingId = data.parkingSpaceId || data.ParkingSpaceId || data.parkingId;
    const conversationId = data.conversationId || data.ConversationId;

    const bookingTypes = [
        'booking.approved',
        'booking.rejected',
        'booking.cancelled',
        'booking.expiring',
        'booking.checkin',
        'booking.checkout',
        'payment.completed',
        'payment.failed',
    ];

    if (bookingTypes.includes(type) && bookingId) {
        return { screen: 'BookingDetail', params: { bookingId } };
    }

    if (conversationId) {
        return { screen: 'ChatScreen', params: { conversationId } };
    }

    if (parkingId) {
        return { screen: 'ParkingDetail', params: { parkingId } };
    }

    // Fallback: open Notifications screen for any other recognized notification
    if (type) {
        return { screen: 'Notifications', params: {} };
    }

    return null;
}

class NotificationServiceImpl {
    constructor() {
        this.isInitialized = false;
        this._navigationRef = null;
        this._pendingNavigation = null;
        this.unsubscribeForegroundListener = null;
        this.unsubscribeTokenRefresh = null;
        this.unsubscribeNotificationOpened = null;
        this._currentToken = null;
    }

    /**
     * Call from AppTabNavigator once navigation is mounted.
     * Drains any queued navigation from quit-state taps.
     */
    setNavigationRef(navigationDispatch) {
        this._navigationRef = navigationDispatch;
        if (this._pendingNavigation) {
            this._navigateTo(this._pendingNavigation);
            this._pendingNavigation = null;
        }
    }

    /**
     * Initialize FCM listeners: token refresh, foreground banners,
     * background taps, and quit-state taps.
     */
    async initialize() {
        if (Platform.OS !== 'android') {
            logger.info(TAG, 'Skipping notification initialization on non-Android platform');
            return;
        }

        if (this.isInitialized) {
            return;
        }

        try {
            // 1. Request permissions
            const hasPermission = await this.requestUserPermission();
            if (!hasPermission) {
                logger.warn(TAG, 'User declined notification permissions');
                return;
            }

            await this._ensureRemoteMessagesRegistration();

            // 2. Token refresh listener
            this.unsubscribeTokenRefresh = messaging().onTokenRefresh(async (newToken) => {
                if (!(await this._hasAuthenticatedSession())) {
                    logger.info(TAG, 'Skipping token refresh registration: no active session');
                    return;
                }
                logger.info(TAG, 'FCM token refreshed — re-registering with backend');
                await this.registerTokenWithBackend(newToken);
            });

            // 3. Foreground message listener -> show in-app banner
            this.unsubscribeForegroundListener = messaging().onMessage(async (remoteMessage) => {
                logger.info(TAG, 'Foreground push notification received', remoteMessage?.notification?.title);
                EventBus.emit('SHOW_BANNER', {
                    title: remoteMessage.notification?.title || 'New Notification',
                    message: remoteMessage.notification?.body || 'You have received a new update',
                    type: 'info',
                });
            });

            // 4. Background tap: user tapped notification while app was in background
            this.unsubscribeNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
                logger.info(TAG, 'Notification opened app from background');
                this.handleNotificationOpening(remoteMessage);
            });

            // 5. Quit-state tap: user tapped notification while app was completely closed
            messaging()
                .getInitialNotification()
                .then((remoteMessage) => {
                    if (remoteMessage) {
                        logger.info(TAG, 'Notification opened app from quit state');
                        this.handleNotificationOpening(remoteMessage);
                    }
                })
                .catch((err) => {
                    logger.warn(TAG, 'Failed to query initial notification', err);
                });

            this.isInitialized = true;
            logger.info(TAG, 'NotificationService initialized successfully');
        } catch (error) {
            logger.error(TAG, 'Failed to initialize NotificationService', error);
        }
    }

    /**
     * Request notification permission on Android 13+ (API 33+)
     */
    async requestUserPermission() {
        if (Platform.OS === 'android' && Platform.Version >= 33) {
            try {
                const hasPermission = await PermissionsAndroid.check(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                if (hasPermission) {
                    return true;
                }
                const result = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                );
                return result === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                logger.warn(TAG, 'Permission check/request failed', err);
                return false;
            }
        }
        return true; // Android < 13: granted at install time
    }

    /**
     * Retrieve native FCM device token
     */
    async getDeviceToken() {
        if (Platform.OS !== 'android') {
            return null;
        }

        try {
            await this._ensureRemoteMessagesRegistration();
            const token = await messaging().getToken();
            this._currentToken = token;
            logger.info(TAG, 'FCM token retrieved successfully');
            return token;
        } catch (error) {
            logger.error(TAG, 'Failed to get device token', error);
            return null;
        }
    }

    /**
     * Retrieve device token if permission is granted
     */
    async getAuthorizedDeviceToken() {
        if (Platform.OS !== 'android') {
            return null;
        }

        const hasPermission = await this.requestUserPermission();
        if (!hasPermission) {
            logger.warn(TAG, 'Notification permission not granted — skipping token request');
            return null;
        }
        return this.getDeviceToken();
    }

    /**
     * Register physical FCM device token with backend API POST /api/device-tokens/register
     */
    async registerTokenWithBackend(fcmToken, customDeviceId = null) {
        if (Platform.OS !== 'android') {
            logger.info(TAG, 'Skipping backend token registration on non-Android platform');
            return false;
        }

        try {
            const deviceId = customDeviceId || (await getOrCreateDeviceId());
            const appVersion = Constants?.expoConfig?.version || Constants?.manifest?.version || '1.0.0';

            const payload = {
                deviceId,
                platform: Platform.OS, // 'android'
                fcmToken,
                appVersion,
            };

            const response = await apiClient.post(ENDPOINTS.DEVICE_TOKENS.REGISTER, payload);

            if (response.data?.success) {
                logger.info(TAG, 'Device token registered with backend successfully', { deviceId });
                return true;
            } else {
                logger.warn(TAG, 'Backend returned unexpected response for token registration', response.data);
            }
        } catch (error) {
            logger.error(TAG, 'Failed to register device token with backend', error);
        }

        return false;
    }

    /**
     * Public entrypoint: initialize and register current device with backend
     */
    async registerCurrentDevice(token = null, deviceId = null) {
        if (Platform.OS !== 'android') {
            return false;
        }

        await this.initialize();

        const fcmToken = token || (await this.getAuthorizedDeviceToken());
        if (!fcmToken) {
            logger.warn(TAG, 'No valid FCM token available to register');
            return false;
        }

        return this.registerTokenWithBackend(fcmToken, deviceId);
    }

    /**
     * Deregister token on logout (deletes FCM token locally and cleans up listeners)
     */
    async deregisterCurrentDevice() {
        return this.deregisterToken();
    }

    async deregisterToken() {
        if (Platform.OS !== 'android') {
            this.cleanup();
            return;
        }

        try {
            await messaging().deleteToken();
            this._currentToken = null;
            logger.info(TAG, 'Local FCM token deleted successfully');
        } catch (error) {
            logger.warn(TAG, 'Failed to delete local FCM token (non-critical)', error);
        }

        this.cleanup();
    }

    /**
     * Routes a tapped push notification to the appropriate screen
     */
    handleNotificationOpening(remoteMessage) {
        if (!remoteMessage) return;

        const data = remoteMessage.data || {};
        const target = resolveNavigationTarget(data);

        if (!target) {
            logger.info(TAG, 'No specific navigation target for notification data', data);
            return;
        }

        if (this._navigationRef) {
            this._navigateTo(target);
        } else {
            logger.info(TAG, 'Navigation not ready, queuing target:', target);
            this._pendingNavigation = target;
        }
    }

    _navigateTo({ screen, params }) {
        try {
            if (typeof this._navigationRef === 'function') {
                this._navigationRef(screen, params);
            }
        } catch (error) {
            logger.warn(TAG, 'Navigation failed', error);
        }
    }

    async _ensureRemoteMessagesRegistration() {
        if (Platform.OS !== 'android') return;

        try {
            const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
            if (!isRegistered) {
                await messaging().registerDeviceForRemoteMessages();
            }
        } catch (error) {
            logger.warn(TAG, 'Failed to register device for remote messages', error);
        }
    }

    async _hasAuthenticatedSession() {
        try {
            const accessToken = await storageService.getAccessToken();
            return Boolean(accessToken);
        } catch {
            return false;
        }
    }

    onNotification(callback) {
        if (typeof callback !== 'function') return () => {};
        EventBus.on('SHOW_BANNER', callback);
        return () => EventBus.off('SHOW_BANNER', callback);
    }

    cleanup() {
        if (this.unsubscribeForegroundListener) {
            this.unsubscribeForegroundListener();
            this.unsubscribeForegroundListener = null;
        }
        if (this.unsubscribeTokenRefresh) {
            this.unsubscribeTokenRefresh();
            this.unsubscribeTokenRefresh = null;
        }
        if (this.unsubscribeNotificationOpened) {
            this.unsubscribeNotificationOpened();
            this.unsubscribeNotificationOpened = null;
        }
        this._navigationRef = null;
        this._pendingNavigation = null;
        this.isInitialized = false;
        logger.info(TAG, 'NotificationService cleaned up');
    }
}

export const NotificationService = new NotificationServiceImpl();
export default NotificationService;
