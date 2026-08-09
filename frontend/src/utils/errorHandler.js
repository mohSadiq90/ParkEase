/**
 * Extract user-friendly error message from API response
 * @param {Object} response - API response object
 * @returns {string} - Formatted error message
 */
/** True when a string looks like an API machine code (e.g. account_exists), not user copy. */
const isMachineCode = (value) =>
    typeof value === 'string' && /^[a-z][a-z0-9_]*$/.test(value);

export const getErrorMessage = (response) => {
    // If there are specific validation errors, show them
    if (response?.errors) {
        // Handle array of errors
        if (Array.isArray(response.errors) && response.errors.length > 0) {
            // Prefer human Message when Errors is only machine codes (ApiResponse pattern)
            const onlyCodes = response.errors.every(isMachineCode);
            if (onlyCodes && response.message && !isMachineCode(response.message)) {
                return response.message;
            }
            return response.errors.join(', ');
        }

        // Handle validation errors object (key: [messages])
        if (typeof response.errors === 'object') {
            const messages = Object.values(response.errors)
                .flat()
                .filter(msg => typeof msg === 'string' && msg.length > 0);

            if (messages.length > 0) {
                return messages.join(', ');
            }
        }
    }

    // Otherwise use the general message
    return response?.detail || response?.title || response?.message || 'An error occurred';
};

/**
 * Handle API error and extract message
 * Handles both direct API responses and caught errors
 * @param {Error|Object} err - Error object or API response
 * @param {string} defaultMessage - Default message if no specific error found
 * @returns {string} - Formatted error message
 */
export const handleApiError = (err, defaultMessage = 'An error occurred') => {
    // If error has response data (from our api service)
    if (err.response?.data) {
        return getErrorMessage(err.response.data);
    }
    // If error has a message property
    if (err.message) {
        return err.message;
    }
    // Fallback to default
    return defaultMessage;
};
