
/**
 * NotificationService
 * Push notifications and FCM/APNs device token lifecycle
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

    registerCurrentDevice: async (token = null) => {
        try {
            const deviceToken = token || `sim-token-${Platform.OS}-${Date.now()}`;
            _currentToken = deviceToken;
            const res = await apiClient.post(ENDPOINTS.DEVICE_TOKENS.REGISTER, {
                token: deviceToken,
                platform: Platform.OS === 'ios' ? 1 : 2, // 1: iOS (APNs), 2: Android (FCM)
            });
            logger.info(TAG, 'Device token registered successfully', { token: deviceToken });
            return res.data;
        } catch (error) {
            logger.warn(TAG, 'Failed to register device token with backend', error);
            return null;
        }
    },

    deregisterCurrentDevice: async () => {
        try {
            if (_currentToken) {
                await apiClient.post(ENDPOINTS.DEVICE_TOKENS.DEREGISTER, {
                    token: _currentToken,
                });
                _currentToken = null;
                logger.info(TAG, 'Device token deregistered successfully');
            }
        } catch (error) {
            logger.warn(TAG, 'Failed to deregister device token', error);
        }
    },

    onNotification: (callback) => {
        // Event listener hook
        return () => {};
    },
};

export default NotificationService;
