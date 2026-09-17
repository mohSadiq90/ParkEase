import authService from '../authService';
import apiClient from '../../api/apiClient';
import { ENDPOINTS } from '../../api/endpoints';
import { storageService } from '../../storage/secureStorage';
import posthogService, { AnalyticsEvents } from '../../analytics/posthogService';

jest.mock('../../api/apiClient', () => ({
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
}));

jest.mock('../../storage/secureStorage', () => ({
    storageService: {
        getAccessToken: jest.fn(),
        getRefreshToken: jest.fn(),
        setAccessToken: jest.fn(),
        setRefreshToken: jest.fn(),
        setTokens: jest.fn(),
        getUser: jest.fn(),
        setUser: jest.fn(),
        clearTokens: jest.fn(),
        clearUser: jest.fn(),
        clearAll: jest.fn(),
    },
}));

jest.mock('../../analytics/posthogService', () => ({
    __esModule: true,
    default: {
        trackEvent: jest.fn(),
        resetUser: jest.fn(),
        identifyUser: jest.fn(),
    },
    AnalyticsEvents: {
        AUTH_LOGOUT: 'user_logout',
        AUTH_LOGIN: 'user_login',
    },
}));

jest.mock('../../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('authService - logout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('immediately tracks AUTH_LOGOUT event and resets PostHog user identity', async () => {
        storageService.getAccessToken.mockResolvedValue('test-access-token');
        storageService.clearAll.mockResolvedValue(undefined);
        apiClient.post.mockResolvedValue({ data: { success: true } });

        await authService.logout();

        expect(posthogService.trackEvent).toHaveBeenCalledWith(AnalyticsEvents.AUTH_LOGOUT);
        expect(posthogService.resetUser).toHaveBeenCalledTimes(1);
    });

    it('immediately clears local secure storage', async () => {
        storageService.getAccessToken.mockResolvedValue('test-access-token');
        storageService.clearAll.mockResolvedValue(undefined);
        apiClient.post.mockResolvedValue({ data: { success: true } });

        await authService.logout();

        expect(storageService.clearAll).toHaveBeenCalledTimes(1);
    });

    it('fires server logout endpoint with bearer token in background without blocking', async () => {
        storageService.getAccessToken.mockResolvedValue('secret-jwt-token');
        storageService.clearAll.mockResolvedValue(undefined);
        apiClient.post.mockResolvedValue({ data: { success: true } });

        await authService.logout();

        expect(storageService.getAccessToken).toHaveBeenCalled();
        // Background call should have been triggered with headers and timeout
        expect(apiClient.post).toHaveBeenCalledWith(
            ENDPOINTS.AUTH.LOGOUT,
            {},
            expect.objectContaining({
                headers: { Authorization: 'Bearer secret-jwt-token' },
                timeout: 5000,
            })
        );
    });

    it('handles background API failure gracefully without throwing or rejecting', async () => {
        storageService.getAccessToken.mockResolvedValue('secret-jwt-token');
        storageService.clearAll.mockResolvedValue(undefined);
        apiClient.post.mockRejectedValue(new Error('Network request failed'));

        await expect(authService.logout()).resolves.toBeUndefined();
        expect(storageService.clearAll).toHaveBeenCalled();
    });

    it('handles storage or analytics errors gracefully without crashing', async () => {
        storageService.getAccessToken.mockRejectedValue(new Error('Storage access error'));
        storageService.clearAll.mockRejectedValue(new Error('Storage clear error'));
        posthogService.resetUser.mockImplementation(() => {
            throw new Error('PostHog error');
        });

        await expect(authService.logout()).resolves.toBeUndefined();
    });
});
