import {
    SSO_ERROR_MESSAGES,
    resolveCorporateSsoCode,
    getCorporateSsoErrorMessage,
} from '../corporateSsoErrors';

describe('corporateSsoErrors', () => {
    describe('resolveCorporateSsoCode', () => {
        it('returns null for falsy inputs', () => {
            expect(resolveCorporateSsoCode(null)).toBeNull();
            expect(resolveCorporateSsoCode(undefined)).toBeNull();
        });

        it('resolves code from string', () => {
            expect(resolveCorporateSsoCode('sso_not_available')).toBe('sso_not_available');
            expect(resolveCorporateSsoCode('Error: account_disabled occurred')).toBe('account_disabled');
        });

        it('resolves code from object code property', () => {
            expect(resolveCorporateSsoCode({ code: 'invalid_exchange_code' })).toBe('invalid_exchange_code');
        });

        it('resolves code from errors array', () => {
            expect(resolveCorporateSsoCode({ errors: ['no_membership'] })).toBe('no_membership');
        });

        it('resolves code from Axios response data', () => {
            expect(
                resolveCorporateSsoCode({
                    response: {
                        data: { code: 'sso_identity_mismatch' },
                    },
                })
            ).toBe('sso_identity_mismatch');
        });

        it('resolves code from HTTP status codes', () => {
            expect(resolveCorporateSsoCode({ response: { status: 404 } })).toBe('sso_not_available');
            expect(resolveCorporateSsoCode({ response: { status: 400 } })).toBe('invalid_exchange_code');
            expect(resolveCorporateSsoCode({ response: { status: 409 } })).toBe('sso_identity_mismatch');
            expect(resolveCorporateSsoCode({ response: { status: 503 } })).toBe('sso_disabled');
        });
    });

    describe('getCorporateSsoErrorMessage', () => {
        it('maps standard error codes to friendly messages per Section 5', () => {
            expect(getCorporateSsoErrorMessage({ code: 'sso_not_available' })).toBe(
                'Corporate SSO is not configured for this domain. Please log in using password.'
            );
            expect(getCorporateSsoErrorMessage({ code: 'sso_disabled' })).toBe(
                'Enterprise SSO is temporarily unavailable. Contact your IT administrator.'
            );
            expect(getCorporateSsoErrorMessage({ code: 'no_membership' })).toBe(
                'No active corporate membership found for your account. Please ask your administrator for an invite.'
            );
            expect(getCorporateSsoErrorMessage({ code: 'account_disabled' })).toBe(
                'Your corporate account has been disabled.'
            );
            expect(getCorporateSsoErrorMessage({ code: 'invalid_exchange_code' })).toBe(
                'Session timed out. Please tap Sign In to try again.'
            );
            expect(getCorporateSsoErrorMessage({ code: 'sso_identity_mismatch' })).toBe(
                'SSO identity conflict. Please contact support.'
            );
            expect(getCorporateSsoErrorMessage({ code: 'sso_store_unavailable' })).toBe(
                'Temporary server issue. Retrying...'
            );
            expect(getCorporateSsoErrorMessage({ code: 'user_cancelled' })).toBe(
                'SSO authentication was cancelled.'
            );
        });

        it('handles direct string error codes', () => {
            expect(getCorporateSsoErrorMessage('invalid_exchange_code')).toBe(
                SSO_ERROR_MESSAGES.invalid_exchange_code
            );
        });

        it('returns fallback message for unknown errors', () => {
            expect(getCorporateSsoErrorMessage(null)).toBe(SSO_ERROR_MESSAGES.sso_failed);
            expect(getCorporateSsoErrorMessage({})).toBe(SSO_ERROR_MESSAGES.sso_failed);
        });

        it('extracts backend human-readable message if present', () => {
            expect(
                getCorporateSsoErrorMessage({
                    response: { data: { message: 'Custom IdP error occurred' } },
                })
            ).toBe('Custom IdP error occurred');
        });
    });
});
