/**
 * Auth Service
 * Authentication API wrappers matching API_ENDPOINTS_MOBILE.md Section 3
 */

import { Platform } from 'react-native';
import apiClient from '../api/apiClient';
import ENDPOINTS from '../api/endpoints';
import { storageService } from '../storage/secureStorage';
import logger from '../../utils/logger';
import posthogService, { AnalyticsEvents } from '../analytics/posthogService';

const TAG = 'AuthService';

export const authService = {
    async login(credentials) {
        logger.info(TAG, 'Login attempt', { email: credentials.email });
        const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, credentials);
        if (response.data?.success && response.data?.data) {
            const tokenData = response.data.data;
            const accessToken = tokenData.accessToken || tokenData.token;
            const refreshToken = tokenData.refreshToken;
            const user = tokenData.user;
            if (accessToken) await storageService.setTokens(accessToken, refreshToken);
            if (user) {
                await storageService.setUser(user);
                posthogService.identifyUser(user);
                posthogService.trackEvent(AnalyticsEvents.AUTH_LOGIN, { method: 'email', role: user.role });
            }
        }
        return response.data;
    },

    async register(data) {
        logger.info(TAG, 'Register attempt', { email: data.email, role: data.role });
        const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, data);
        if (response.data?.success && response.data?.data) {
            const tokenData = response.data.data;
            const accessToken = tokenData.accessToken || tokenData.token;
            const refreshToken = tokenData.refreshToken;
            const user = tokenData.user;
            if (accessToken) await storageService.setTokens(accessToken, refreshToken);
            if (user) {
                await storageService.setUser(user);
                posthogService.identifyUser(user);
                posthogService.trackEvent(AnalyticsEvents.AUTH_REGISTER, { role: user.role });
            }
        }
        return response.data;
    },

    async loginCorporate(credentials) {
        logger.info(TAG, 'Corporate login attempt', { email: credentials.email, companyId: credentials.companyId });
        const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN_CORPORATE, credentials);
        if (response.data?.success && response.data?.data) {
            const session = response.data.data.session || response.data.data;
            const accessToken = session.accessToken || session.token;
            const refreshToken = session.refreshToken;
            const user = session.user;
            if (accessToken) await storageService.setTokens(accessToken, refreshToken);
            if (user) {
                await storageService.setUser(user);
                posthogService.identifyUser(user);
                posthogService.trackEvent(AnalyticsEvents.AUTH_LOGIN, { method: 'corporate', companyId: credentials.companyId });
            }
        }
        return response.data;
    },

    async loginExternal(payload) {
        logger.info(TAG, 'External social auth attempt', { provider: payload.provider || 'google' });
        const body = {
            provider: payload.provider || 'google',
            idToken: payload.idToken,
            rawIdToken: payload.rawIdToken || null,
            userConsentGiven: payload.userConsentGiven !== undefined ? payload.userConsentGiven : true,
            deviceClientType: payload.deviceClientType || (Platform.OS === 'ios' ? 'ios' : 'android'),
            nonce: payload.nonce || null,
        };
        const response = await apiClient.post(ENDPOINTS.AUTH.EXTERNAL, body);
        if (response.data?.success && response.data?.data) {
            const sessionData = response.data.data;
            const session = sessionData.session || sessionData.tokens || sessionData;
            const accessToken = session.accessToken || session.token || sessionData.accessToken;
            const refreshToken = session.refreshToken || sessionData.refreshToken;
            const user = session.user || sessionData.user;
            if (user && sessionData.linkedProviders && (!user.linkedProviders || user.linkedProviders.length === 0)) {
                user.linkedProviders = sessionData.linkedProviders;
            }
            if (accessToken) await storageService.setTokens(accessToken, refreshToken);
            if (user) {
                await storageService.setUser(user);
                posthogService.identifyUser(user);
                posthogService.trackEvent(AnalyticsEvents.AUTH_EXTERNAL_LOGIN, { provider: payload.provider || 'google' });
            }
        }
        return response.data;
    },

    async linkExternal(data) {
        logger.info(TAG, 'Link external account', { provider: data.provider });
        const response = await apiClient.post(ENDPOINTS.AUTH.EXTERNAL_LINK, data);
        if (response.data?.success && response.data?.data) {
            const currentUser = await storageService.getUser();
            if (currentUser) {
                const linkedProviders = response.data.data.linkedProviders || [];
                currentUser.linkedProviders = linkedProviders;
                await storageService.setUser(currentUser);
            }
            posthogService.trackEvent(AnalyticsEvents.AUTH_EXTERNAL_LINK, { provider: data.provider });
        }
        return response.data;
    },

    async setPassword(data) {
        logger.info(TAG, 'Set password attempt');
        const response = await apiClient.post(ENDPOINTS.AUTH.SET_PASSWORD, data);
        return response.data;
    },

    async getExternalProviders() {
        const response = await apiClient.get(ENDPOINTS.AUTH.EXTERNAL_PROVIDERS);
        return response.data;
    },

    async switchChannel(channelData) {
        logger.info(TAG, 'Switch channel attempt', channelData);
        const response = await apiClient.post(ENDPOINTS.AUTH.CHANNEL, channelData);
        if (response.data?.success && response.data?.data) {
            const tokenData = response.data.data;
            const accessToken = tokenData.accessToken || tokenData.token;
            const refreshToken = tokenData.refreshToken;
            const user = tokenData.user;
            if (accessToken) await storageService.setTokens(accessToken, refreshToken);
            if (user) {
                await storageService.setUser(user);
                posthogService.identifyUser(user);
                posthogService.trackEvent(AnalyticsEvents.AUTH_CHANNEL_SWITCHED, { channel: channelData.channel });
            }
        }
        return response.data;
    },

    async getChannelContext() {
        const response = await apiClient.get(ENDPOINTS.AUTH.CHANNEL_CONTEXT);
        return response.data;
    },

    async discoverSSO(email) {
        const response = await apiClient.get(ENDPOINTS.AUTH.CORPORATE_SSO_DISCOVER, {
            params: { email },
        });
        return response.data;
    },

    async startSSO(payload) {
        const response = await apiClient.post(ENDPOINTS.AUTH.CORPORATE_SSO_START, payload);
        return response.data;
    },

    async completeSSO(payload) {
        const response = await apiClient.post(ENDPOINTS.AUTH.CORPORATE_SSO_COMPLETE, payload);
        if (response.data?.success && response.data?.data) {
            const session = response.data.data.session || response.data.data;
            const accessToken = session.accessToken || session.token;
            const refreshToken = session.refreshToken;
            const user = session.user;
            if (accessToken) await storageService.setTokens(accessToken, refreshToken);
            if (user) {
                await storageService.setUser(user);
                posthogService.identifyUser(user);
                posthogService.trackEvent(AnalyticsEvents.AUTH_LOGIN, { method: 'sso' });
            }
        }
        return response.data;
    },

    async logout() {
        try {
            await apiClient.post(ENDPOINTS.AUTH.LOGOUT);
        } catch (error) {
            logger.warn(TAG, 'Logout API call failed', error);
        }
        posthogService.trackEvent(AnalyticsEvents.AUTH_LOGOUT);
        posthogService.resetUser();
        await storageService.clearAll();
    },

    async refreshToken() {
        const refreshToken = await storageService.getRefreshToken();
        if (!refreshToken) return null;

        const response = await apiClient.post(ENDPOINTS.AUTH.REFRESH, { refreshToken });
        if (response.data?.success && response.data?.data) {
            const tokenData = response.data.data;
            const accessToken = tokenData.accessToken || tokenData.token;
            const newRefreshToken = tokenData.refreshToken;
            await storageService.setTokens(accessToken, newRefreshToken);
            return response.data.data;
        }
        return null;
    },

    async changePassword(data) {
        const response = await apiClient.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, data);
        return response.data;
    },

    async getCurrentUser() {
        const response = await apiClient.get(ENDPOINTS.USERS.ME);
        return response.data;
    },

    async updateProfile(data) {
        const response = await apiClient.put(ENDPOINTS.USERS.ME, data);
        return response.data;
    },

    async deleteAccount() {
        const response = await apiClient.delete(ENDPOINTS.USERS.ME);
        posthogService.trackEvent('user_account_deleted');
        posthogService.resetUser();
        await storageService.clearAll();
        return response.data;
    },

    /** Try restoring session from stored tokens */
    async tryRestoreSession() {
        const token = await storageService.getAccessToken();
        if (!token) return null;

        try {
            const response = await apiClient.get(ENDPOINTS.USERS.ME);
            if (response.data?.success && response.data?.data) {
                const user = response.data.data;
                posthogService.identifyUser(user);
                posthogService.trackEvent(AnalyticsEvents.AUTH_SESSION_RESTORED);
                return user;
            }
        } catch (error) {
            logger.warn(TAG, 'Session restore failed', error);
            await storageService.clearAll();
        }
        return null;
    },
};

export default authService;
