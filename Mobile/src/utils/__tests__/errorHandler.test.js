import { AppError, handleError, getErrorMessage } from '../errorHandler';

describe('errorHandler', () => {
  describe('AppError', () => {
    it('creates an AppError instance with correct defaults and properties', () => {
      const error = new AppError('Custom test error', 'CUSTOM_CODE', 404);
      expect(error.message).toBe('Custom test error');
      expect(error.code).toBe('CUSTOM_CODE');
      expect(error.statusCode).toBe(404);
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('uses default code and statusCode if omitted', () => {
      const error = new AppError('Default error');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('handleError', () => {
    it('handles AppError instances directly', () => {
      const appErr = new AppError('Unauthorized', 'UNAUTHORIZED', 401);
      const res = handleError(appErr);
      expect(res).toEqual({
        message: 'Unauthorized',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      });
    });

    it('handles response error with string data', () => {
      const error = {
        response: {
          status: 502,
          data: 'Bad Gateway Error',
        },
      };
      const res = handleError(error);
      expect(res).toEqual({
        message: 'Bad Gateway Error',
        code: 'SERVER_ERROR',
        statusCode: 502,
        errors: ['Bad Gateway Error'],
        rawMessage: 'Bad Gateway Error',
      });
    });

    it('handles response error with array errors', () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: ['Title is required', 'Hourly rate must be > 0'],
          },
        },
      };
      const res = handleError(error);
      expect(res.statusCode).toBe(400);
      expect(res.rawMessage).toBe('Validation failed');
      expect(res.errors).toEqual(['Title is required', 'Hourly rate must be > 0']);
      expect(res.message).toBe(
        'Validation failed:\n• Title is required\n• Hourly rate must be > 0'
      );
    });

    it('handles response error with dictionary/object errors (e.g. FluentValidation)', () => {
      const error = {
        response: {
          status: 400,
          data: {
            title: 'One or more validation errors occurred.',
            errors: {
              Title: ['Title must not be empty.', 'Title max length 100.'],
              PostalCode: ['Postal code is required.'],
            },
          },
        },
      };
      const res = handleError(error);
      expect(res.statusCode).toBe(400);
      expect(res.rawMessage).toBe('One or more validation errors occurred.');
      expect(res.errors).toEqual([
        'Title: Title must not be empty.',
        'Title: Title max length 100.',
        'PostalCode: Postal code is required.',
      ]);
      expect(res.message).toContain('Title: Title must not be empty.');
      expect(res.message).toContain('PostalCode: Postal code is required.');
    });

    it('handles network error when request exists but no response', () => {
      const error = {
        request: {},
      };
      const res = handleError(error);
      expect(res).toEqual({
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        statusCode: 0,
      });
    });

    it('handles standard Error or unknown exceptions', () => {
      const error = new Error('Unexpected crash');
      const res = handleError(error);
      expect(res).toEqual({
        message: 'Unexpected crash',
        code: 'UNKNOWN_ERROR',
        statusCode: 500,
      });
    });
  });

  describe('getErrorMessage', () => {
    it('returns raw string if passed a string', () => {
      expect(getErrorMessage('Direct error message')).toBe('Direct error message');
    });

    it('extracts formatted message from error response with sub-errors', () => {
      const error = {
        response: {
          status: 422,
          data: {
            message: 'Invalid parameters',
            errors: ['Field A invalid'],
          },
        },
      };
      expect(getErrorMessage(error)).toBe('Invalid parameters:\n• Field A invalid');
    });
  });
});
