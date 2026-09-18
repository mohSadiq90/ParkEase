/**
 * Error Handler
 * Centralized error processing
 */

export class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.timestamp = new Date();
    }
}

export const handleError = (error) => {
    if (error instanceof AppError) {
        return {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
        };
    }

    if (error.response) {
        const data = error.response.data;
        if (typeof data === 'string') {
            return {
                message: data,
                code: 'SERVER_ERROR',
                statusCode: error.response.status,
                errors: [data],
                rawMessage: data,
            };
        }

        let errors = [];
        if (Array.isArray(data?.errors)) {
            errors = data.errors.filter(Boolean);
        } else if (data?.errors && typeof data.errors === 'object') {
            errors = Object.entries(data.errors).flatMap(([key, val]) => {
                if (Array.isArray(val)) {
                    return val.map((msg) => (key ? `${key}: ${msg}` : msg));
                }
                if (typeof val === 'string' && val.trim()) {
                    return key ? `${key}: ${val}` : val;
                }
                return [];
            }).filter(Boolean);
        }

        const baseMessage = data?.message || data?.title || 'Server error occurred';
        let message = baseMessage;
        if (errors.length > 0) {
            message = `${baseMessage}:\n• ${errors.join('\n• ')}`;
        }

        return {
            message,
            code: data?.code || 'SERVER_ERROR',
            statusCode: error.response.status,
            errors,
            rawMessage: baseMessage,
        };
    }

    if (error.request) {
        return {
            message: 'Network error. Please check your connection.',
            code: 'NETWORK_ERROR',
            statusCode: 0,
        };
    }

    return {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
    };
};

/**
 * Extract user-friendly error message from API error
 * @param {*} error
 * @returns {string}
 */
export const getErrorMessage = (error) => {
    if (typeof error === 'string') return error;
    const handled = handleError(error);
    return handled.message;
};

export default { AppError, handleError, getErrorMessage };
