import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import authService from '../authService';
import corporateSsoService, {
    extractSsoCode,
    launchAuthBrowser,
    performCorporateSSO,
    DEFAULT_SSO_RETURN_URL,
} from '../corporateSsoService';

jest.mock('../authService');

describe('corporateSsoService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('extractSsoCode', () => {
        it('extracts sso_code parameter from standard deep link', () => {
            const url = 'parkease://sso-callback?sso_code=abc123exchange';
            expect(extractSsoCode(url)).toBe('abc123exchange');
        });

        it('extracts alternative code parameter names', () => {
            expect(extractSsoCode('parkease://sso-callback?exchangeCode=test-code')).toBe('test-code');
            expect(extractSsoCode('parkease://sso-callback?exchange_code=test-code-2')).toBe('test-code-2');
            expect(extractSsoCode('parkease://sso-callback?code=test-code-3')).toBe('test-code-3');
        });

        it('handles URL-encoded exchange codes', () => {
            const url = 'parkease://sso-callback?sso_code=abc%2F123%2Bdef%3D';
            expect(extractSsoCode(url)).toBe('abc/123+def=');
        });

        it('throws error for invalid or empty URL', () => {
            expect(() => extractSsoCode('')).toThrow('Invalid or empty redirect URL');
            expect(() => extractSsoCode(null)).toThrow('Invalid or empty redirect URL');
        });

        it('throws error if code parameter is not present', () => {
            expect(() => extractSsoCode('parkease://sso-callback?other_param=123')).toThrow(
                'No sso_code parameter found in deep link redirect'
            );
        });
    });

    describe('launchAuthBrowser', () => {
        it('calls WebBrowser.openAuthSessionAsync with ephemeral session', async () => {
            WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
                type: 'success',
                url: 'parkease://sso-callback?sso_code=mock-code-999',
            });

            const code = await launchAuthBrowser('https://idp.example.com/auth');
            expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith(
                'https://idp.example.com/auth',
                DEFAULT_SSO_RETURN_URL,
                { preferEphemeralSession: true, showTitle: true }
            );
            expect(code).toBe('mock-code-999');
        });

        it('throws user_cancelled code when user cancels browser', async () => {
            WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
                type: 'cancel',
            });

            await expect(launchAuthBrowser('https://idp.example.com/auth')).rejects.toMatchObject({
                code: 'user_cancelled',
            });
        });

        it('throws user_cancelled code when user dismisses browser', async () => {
            WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
                type: 'dismiss',
            });

            await expect(launchAuthBrowser('https://idp.example.com/auth')).rejects.toMatchObject({
                code: 'user_cancelled',
            });
        });
    });

    describe('performCorporateSSO', () => {
        it('executes full 4-step SSO flow successfully', async () => {
            authService.discoverSSO.mockResolvedValueOnce({
                success: true,
                data: {
                    ssoAvailable: true,
                    companies: [{ companyId: 'comp-123', name: 'Acme Corp' }],
                },
            });

            authService.startSSO.mockResolvedValueOnce({
                success: true,
                data: {
                    authorizationUrl: 'https://login.microsoftonline.com/authorize?state=xyz',
                },
            });

            WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
                type: 'success',
                url: 'parkease://sso-callback?sso_code=auth-exchange-token-456',
            });

            const mockSessionData = {
                token: 'jwt-access-token',
                refreshToken: 'refresh-token-xyz',
                user: { id: 'u-1', email: 'employee@acme.com', firstName: 'Jane' },
                companyMembership: { companyId: 'comp-123', companyName: 'Acme Corp', role: 'Employee' },
            };

            authService.completeSSO.mockResolvedValueOnce({
                success: true,
                data: mockSessionData,
            });

            const result = await performCorporateSSO({ email: 'employee@acme.com' });

            expect(authService.discoverSSO).toHaveBeenCalledWith('employee@acme.com');
            expect(authService.startSSO).toHaveBeenCalledWith({
                email: 'employee@acme.com',
                domain: undefined,
                client: 'mobile',
                returnUrl: DEFAULT_SSO_RETURN_URL,
            });
            expect(authService.completeSSO).toHaveBeenCalledWith({
                exchangeCode: 'auth-exchange-token-456',
            });
            expect(result).toEqual(mockSessionData);
        });

        it('supports ssoEnabled flag during discovery', async () => {
            authService.discoverSSO.mockResolvedValueOnce({
                success: true,
                data: { ssoEnabled: true, companyName: 'Beta LLC' },
            });

            authService.startSSO.mockResolvedValueOnce({
                success: true,
                data: { authorizationUrl: 'https://idp.betacorp.com/oauth' },
            });

            WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
                type: 'success',
                url: 'parkease://sso-callback?sso_code=beta-exchange-code',
            });

            authService.completeSSO.mockResolvedValueOnce({
                success: true,
                data: { token: 'beta-jwt', user: { id: 'u-2' } },
            });

            const result = await performCorporateSSO({ email: 'user@betacorp.com' });
            expect(result.token).toBe('beta-jwt');
        });

        it('throws sso_not_available when discover reports SSO is not available', async () => {
            authService.discoverSSO.mockResolvedValueOnce({
                success: true,
                data: { ssoAvailable: false },
            });

            await expect(performCorporateSSO({ email: 'user@unknown.com' })).rejects.toMatchObject({
                code: 'sso_not_available',
            });
            expect(authService.startSSO).not.toHaveBeenCalled();
        });

        it('throws error when authorizationUrl is missing', async () => {
            authService.discoverSSO.mockResolvedValueOnce({
                success: true,
                data: { ssoAvailable: true },
            });

            authService.startSSO.mockResolvedValueOnce({
                success: true,
                data: {},
            });

            await expect(performCorporateSSO({ email: 'user@acme.com' })).rejects.toMatchObject({
                code: 'sso_failed',
            });
        });

        it('throws error when completeSSO fails', async () => {
            authService.discoverSSO.mockResolvedValueOnce({
                success: true,
                data: { ssoAvailable: true },
            });

            authService.startSSO.mockResolvedValueOnce({
                success: true,
                data: { authorizationUrl: 'https://idp.acme.com/auth' },
            });

            WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({
                type: 'success',
                url: 'parkease://sso-callback?sso_code=invalid-code',
            });

            authService.completeSSO.mockResolvedValueOnce({
                success: false,
                code: 'invalid_exchange_code',
                message: 'Code expired',
            });

            await expect(performCorporateSSO({ email: 'user@acme.com' })).rejects.toMatchObject({
                code: 'invalid_exchange_code',
            });
        });
    });
});
