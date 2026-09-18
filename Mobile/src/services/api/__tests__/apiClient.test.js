import apiClient from '../apiClient';
import environment from '../../../config/environment';
import { storageService } from '../../storage/secureStorage';

jest.mock('../../storage/secureStorage', () => ({
    storageService: {
        getAccessToken: jest.fn(),
        getRefreshToken: jest.fn(),
        setTokens: jest.fn(),
        clearAll: jest.fn(),
    },
}));

jest.mock('../../analytics/posthogService', () => ({
    __esModule: true,
    default: {
        trackEvent: jest.fn(),
    },
}));

jest.mock('../../../utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
}));

describe('apiClient Configuration & Interceptors', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('has timeout configured to 60000ms (1 minute)', () => {
        expect(environment.apiTimeout).toBe(60000);
        expect(apiClient.defaults.timeout).toBe(60000);
    });

    it('has baseURL configured to environment.apiUrl', () => {
        expect(apiClient.defaults.baseURL).toBe(environment.apiUrl);
    });

    it('has default Content-Type header set to application/json', () => {
        expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('attaches Bearer token in request interceptor when available', async () => {
        storageService.getAccessToken.mockResolvedValueOnce('test-jwt-token');

        // Find request interceptor handler
        const requestInterceptor = apiClient.interceptors.request.handlers[0];
        const config = { headers: {} };
        const updatedConfig = await requestInterceptor.fulfilled(config);

        expect(updatedConfig.headers.Authorization).toBe('Bearer test-jwt-token');
    });

    it('does not attach Authorization header when no token is present', async () => {
        storageService.getAccessToken.mockResolvedValueOnce(null);

        const requestInterceptor = apiClient.interceptors.request.handlers[0];
        const config = { headers: {} };
        const updatedConfig = await requestInterceptor.fulfilled(config);

        expect(updatedConfig.headers.Authorization).toBeUndefined();
    });
});
