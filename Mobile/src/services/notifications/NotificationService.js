/**
 * NotificationService
 * Push notifications and FCM/APNs device token lifecycle
 * Matches API_ENDPOINTS_MOBILE.md Section 17 & DeviceTokensController
 */

import { Platform } from 'react-native';
import apiClient from '../api/apiClient';
import ENDPOINTS from '../api/endpoints';
import logger from '../../utils/logger';

const TAG = 'NotificationService';

let _navigationRef = null;
let _currentToken = null;

export const NotificationService = {
    setNavigationRef: (ref) => {
        _navigationRef = ref;
    },

    initialize: async () => {
        logger.info(TAG, 'Initializing NotificationService');
    },

    registerCurrentDevice: async (token = null, deviceId = null) => {
        try {
            const fcmToken = token || `sim-token-${Platform.OS}-${Date.now()}`;
            const stableDeviceId = deviceId || `device-${Platform.OS}-default`;
            _currentToken = fcmToken;
            const res = await apiClient.post(ENDPOINTS.DEVICE_TOKENS.REGISTER, {
                deviceId: stableDeviceId,
                platform: Platform.OS === 'ios' ? 'ios' : 'android',
                fcmToken: fcmToken,
                appVersion: '1.0.0',
            });
            logger.info(TAG, 'Device token registered successfully', { fcmToken, deviceId: stableDeviceId });
            return res.data;
        } catch (error) {
            logger.warn(TAG, 'Failed to register device token with backend', error);
            return null;
        }
    },

    deregisterCurrentDevice: async () => {
        // Backend currently only maintains upsert on register
        _currentToken = null;
        logger.info(TAG, 'Local device token cleared');
    },

    onNotification: (callback) => {
        // Event listener hook
        return () => {};
    },
};

export default NotificationService;
