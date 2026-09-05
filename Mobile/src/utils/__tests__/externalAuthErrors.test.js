import { 
    resolveExternalAuthCode, 
    getExternalAuthErrorMessage, 
    FRIENDLY_MESSAGES 
} from '../externalAuthErrors';

describe('externalAuthErrors', () => {
    describe('resolveExternalAuthCode', () => {
        it('returns null for null or undefined input', () => {
            expect(resolveExternalAuthCode(null)).toBeNull();
            expect(resolveExternalAuthCode(undefined)).toBeNull();
        });

        it('extracts code from error object code property', () => {
            expect(resolveExternalAuthCode({ code: 'invalid_id_token' })).toBe('invalid_id_token');
            expect(resolveExternalAuthCode({ code: 'account_exists' })).toBe('account_exists');
        });

        it('extracts known error code from errors array', () => {
            expect(resolveExternalAuthCode({ errors: ['invalid_id_token'] })).toBe('invalid_id_token');
            expect(resolveExternalAuthCode({ errors: ['other_error', 'admin_social_forbidden'] })).toBe('admin_social_forbidden');
        });

        it('extracts code from axios response data', () => {
            const axiosError = {
                response: {
                    data: {
                        code: 'idp_unavailable',
                        message: 'JWKS error',
                    },
                },
            };
            expect(resolveExternalAuthCode(axiosError)).toBe('idp_unavailable');
        });
    });

    describe('getExternalAuthErrorMessage', () => {
        it('returns friendly message for known error codes', () => {
            expect(getExternalAuthErrorMessage('invalid_id_token')).toBe(FRIENDLY_MESSAGES.invalid_id_token);
            expect(getExternalAuthErrorMessage('account_exists')).toBe(FRIENDLY_MESSAGES.account_exists);
            expect(getExternalAuthErrorMessage('admin_social_forbidden')).toBe(FRIENDLY_MESSAGES.admin_social_forbidden);
            expect(getExternalAuthErrorMessage('provider_disabled')).toBe(FRIENDLY_MESSAGES.provider_disabled);
        });

        it('maps raw backend Invalid or expired identity token message', () => {
            const error = {
                response: {
                    data: {
                        message: 'Invalid or expired identity token',
                        errors: ['invalid_id_token'],
                    },
                },
            };
            expect(getExternalAuthErrorMessage(error)).toBe(FRIENDLY_MESSAGES.invalid_id_token);
        });

        it('falls back to default friendly message when error is unrecognized', () => {
            expect(getExternalAuthErrorMessage({})).toBe('Google Sign-In failed. Please try again.');
        });
    });
});
