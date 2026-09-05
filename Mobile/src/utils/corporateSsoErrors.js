/**
 * Corporate SSO Error Messages
 * Maps backend machine error codes to user-friendly messages
 * Matching MOBILE_CORPORATE_SSO_IMPLEMENTATION_GUIDE.md Section 5
 */

export const SSO_ERROR_MESSAGES = {
    sso_not_available: 'Corporate SSO is not configured for this domain. Please log in using password.',
    sso_disabled: 'Enterprise SSO is temporarily unavailable. Contact your IT administrator.',
    no_membership: 'No active corporate membership found for your account. Please ask your administrator for an invite.',
    account_disabled: 'Your corporate account has been disabled.',
    invalid_exchange_code: 'Session timed out. Please tap Sign In to try again.',
    sso_identity_mismatch: 'SSO identity conflict. Please contact support.',
    sso_store_unavailable: 'Temporary server issue. Retrying...',
    user_cancelled: 'SSO authentication was cancelled.',
    invalid_return_url: 'Invalid callback redirect configuration.',
    sso_failed: 'Unable to complete Single Sign-On. Please try again or sign in with password.',
};

/**
 * Resolve error code from API response or error object
 * @param {Object|string} errorOrResult
 * @returns {string|null}
 */
export function resolveCorporateSsoCode(errorOrResult) {
    if (!errorOrResult) return null;

    if (typeof errorOrResult === 'string') {
        const lower = errorOrResult.toLowerCase();
        for (const code of Object.keys(SSO_ERROR_MESSAGES)) {
            if (lower === code.toLowerCase() || lower.includes(code.toLowerCase())) {
                return code;
            }
        }
        return null;
    }

    if (errorOrResult.code && typeof errorOrResult.code === 'string') {
        const code = errorOrResult.code.toLowerCase();
        if (SSO_ERROR_MESSAGES[code]) return code;
    }

    if (Array.isArray(errorOrResult.errors) && errorOrResult.errors.length > 0) {
        const found = errorOrResult.errors.find(
            (e) => typeof e === 'string' && Object.prototype.hasOwnProperty.call(SSO_ERROR_MESSAGES, e.toLowerCase())
        );
        if (found) return found.toLowerCase();
    }

    if (errorOrResult.response?.data) {
        const data = errorOrResult.response.data;
        if (data.code && typeof data.code === 'string') {
            const code = data.code.toLowerCase();
            if (SSO_ERROR_MESSAGES[code]) return code;
        }
        if (Array.isArray(data.errors)) {
            const found = data.errors.find(
                (e) => typeof e === 'string' && Object.prototype.hasOwnProperty.call(SSO_ERROR_MESSAGES, e.toLowerCase())
            );
            if (found) return found.toLowerCase();
        }
    }

    // Check HTTP status codes per Section 5 spec
    const status = errorOrResult.response?.status || errorOrResult.status;
    if (status === 404) return 'sso_not_available';
    if (status === 400) return 'invalid_exchange_code';
    if (status === 409) return 'sso_identity_mismatch';
    if (status === 503) return 'sso_disabled';

    return null;
}

/**
 * Extract user-friendly error message for Corporate SSO errors
 * @param {Object|string} error
 * @returns {string}
 */
export function getCorporateSsoErrorMessage(error) {
    if (!error) return SSO_ERROR_MESSAGES.sso_failed;

    if (typeof error === 'string') {
        if (SSO_ERROR_MESSAGES[error]) {
            return SSO_ERROR_MESSAGES[error];
        }
        for (const [code, msg] of Object.entries(SSO_ERROR_MESSAGES)) {
            if (error.toLowerCase().includes(code.toLowerCase())) {
                return msg;
            }
        }
        return error;
    }

    const code = resolveCorporateSsoCode(error);
    if (code && SSO_ERROR_MESSAGES[code]) {
        return SSO_ERROR_MESSAGES[code];
    }

    const backendMessage = error?.response?.data?.message || error?.message;
    if (backendMessage && typeof backendMessage === 'string') {
        const lower = backendMessage.toLowerCase();
        for (const [key, msg] of Object.entries(SSO_ERROR_MESSAGES)) {
            if (lower.includes(key.replace(/_/g, ' ')) || lower.includes(key)) {
                return msg;
            }
        }
        if (!/^[a-z][a-z0-9_]*$/.test(backendMessage)) {
            return backendMessage;
        }
    }

    return SSO_ERROR_MESSAGES.sso_failed;
}
