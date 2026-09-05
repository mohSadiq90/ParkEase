/**
 * External Auth Error Messages
 * Maps backend machine error codes to user-friendly messages
 * Matching MOBILE_GOOGLE_SIGNIN_IMPLEMENTATION_GUIDE.md Section 3.3
 */

export const FRIENDLY_MESSAGES = {

    account_exists: 'An account with this email already exists with a password. Please sign in with your password, then link your Google account in Settings.',
    provider_already_linked: 'This Google account is already linked to another user profile.',
    provider_disabled: 'Google Sign-In is temporarily disabled on the server.',
    invalid_id_token: 'Google identity token expired or invalid. Please sign in again.',
    invalid_credentials: 'Could not verify your account. Please try again.',
    account_disabled: 'This account has been suspended or deactivated. Please contact support.',
    admin_social_forbidden: 'Platform Administrator accounts cannot log in using social authentication.',
    rate_limited: 'Too many login attempts. Please wait a moment and try again.',
    idp_unavailable: 'Google authentication service is temporarily unavailable. Please try again shortly.',
    validation_failed: 'Invalid request payload for social authentication.',
    invalid_provider: 'Unsupported social login provider.',
    email_required: 'Your Google account did not provide a verified email address.',
    email_not_verified: 'Please verify your email with Google, then try again.',
    play_services_missing: 'Google Play Services is not available or outdated on this device.',
};

/**
 * Resolve error code from API response or error object
 * @param {Object} errorOrResult
 * @returns {string|null}
 */
export function resolveExternalAuthCode(errorOrResult) {
    if (!errorOrResult) return null;

    if (errorOrResult.code && typeof errorOrResult.code === 'string') {
        return errorOrResult.code;
    }

    if (Array.isArray(errorOrResult.errors) && errorOrResult.errors.length > 0) {
        const found = errorOrResult.errors.find(
            (e) => typeof e === 'string' && Object.prototype.hasOwnProperty.call(FRIENDLY_MESSAGES, e)
        );
        if (found) return found;
    }

    if (errorOrResult.response?.data) {
        const data = errorOrResult.response.data;
        if (data.code && typeof data.code === 'string') {
            return data.code;
        }
        if (Array.isArray(data.errors)) {
            const found = data.errors.find(
                (e) => typeof e === 'string' && Object.prototype.hasOwnProperty.call(FRIENDLY_MESSAGES, e)
            );
            if (found) return found;
        }
    }

    return null;
}

/**
 * Extract user-friendly error message for external auth errors
 * @param {Object|string} error
 * @returns {string}
 */
export function getExternalAuthErrorMessage(error) {
    if (typeof error === 'string') {
        if (FRIENDLY_MESSAGES[error]) {
            return FRIENDLY_MESSAGES[error];
        }
        // Check if string contains known backend error codes
        for (const [code, msg] of Object.entries(FRIENDLY_MESSAGES)) {
            if (error.toLowerCase().includes(code.toLowerCase())) {
                return msg;
            }
        }
        return error;
    }

    const code = resolveExternalAuthCode(error);
    if (code && FRIENDLY_MESSAGES[code]) {
        return FRIENDLY_MESSAGES[code];
    }

    // Try backend message if friendly
    const backendMessage = error?.response?.data?.message || error?.message;
    if (backendMessage && typeof backendMessage === 'string') {
        // Map common raw backend message
        if (backendMessage.toLowerCase().includes('invalid or expired identity token')) {
            return FRIENDLY_MESSAGES.invalid_id_token;
        }
        if (!/^[a-z][a-z0-9_]*$/.test(backendMessage)) {
            return backendMessage;
        }
    }

    return 'Google Sign-In failed. Please try again.';
}

export default {
    FRIENDLY_MESSAGES,
    resolveExternalAuthCode,
    getExternalAuthErrorMessage,
};
