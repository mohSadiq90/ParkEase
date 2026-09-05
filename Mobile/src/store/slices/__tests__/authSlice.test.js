import reducer, {
  loginThunk,
  registerThunk,
  restoreSessionThunk,
  loginExternalThunk,
  updateLinkedProviders,
  clearError,
  resetAuth,
} from '../authSlice';
import authService from '../../../services/auth/authService';

// Mock the auth service
jest.mock('../../../services/auth/authService');

const initialState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  isSessionChecked: false,
  channel: 'Marketplace',
  companyId: null,
  companyRole: null,
  corporateCompanies: [],
};

describe('authSlice', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should return the initial state', () => {
      expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle clearError', () => {
      const stateWithError = { ...initialState, error: 'Some error' };
      expect(reducer(stateWithError, clearError())).toEqual(initialState);
    });

    it('should handle resetAuth', () => {
      const loggedInState = {
        ...initialState,
        user: { id: 1 },
        token: 'token123',
        isAuthenticated: true,
      };
      expect(reducer(loggedInState, resetAuth())).toEqual(initialState);
    });
    it('should handle updateLinkedProviders', () => {
      const stateWithUser = {
        ...initialState,
        user: { id: 1, firstName: 'John', lastName: 'Doe', linkedProviders: [] },
      };
      const state = reducer(stateWithUser, updateLinkedProviders(['Google']));
      expect(state.user.linkedProviders).toEqual(['Google']);
    });
  });

  describe('loginThunk', () => {
    it('should handle pending state', () => {
      const action = { type: loginThunk.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state (Happy Path)', async () => {
      const mockPayload = { user: { id: 1, name: 'Test User' }, accessToken: 'fake-token' };
      
      const action = { type: loginThunk.fulfilled.type, payload: mockPayload };
      const state = reducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.user).toEqual(mockPayload.user);
      expect(state.token).toBe('fake-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isSessionChecked).toBe(true);
    });

    it('should handle rejected state (Error Scenario)', () => {
      const action = { type: loginThunk.rejected.type, payload: 'Invalid credentials' };
      const state = reducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('registerThunk', () => {
    it('should handle fulfilled state (Happy Path)', () => {
      const mockPayload = { user: { id: 2, email: 'new@test.com' }, accessToken: 'new-token' };
      const action = { type: registerThunk.fulfilled.type, payload: mockPayload };
      const state = reducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.user).toEqual(mockPayload.user);
      expect(state.token).toBe('new-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isSessionChecked).toBe(true);
    });

    it('should handle rejected state (Error Scenario)', () => {
      const action = { type: registerThunk.rejected.type, payload: 'Email already exists' };
      const state = reducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Email already exists');
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('restoreSessionThunk', () => {
    it('should handle fulfilled state (Happy Path)', () => {
      const mockUser = { id: 1, name: 'Restored User' };
      const action = { type: restoreSessionThunk.fulfilled.type, payload: mockUser };
      const state = reducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isSessionChecked).toBe(true);
    });

    it('should handle rejected state (Error Scenario)', () => {
      const action = { type: restoreSessionThunk.rejected.type, payload: 'No active session' };
      const state = reducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.isSessionChecked).toBe(true); // Always true after check completes
    });
  });

  describe('loginExternalThunk', () => {
    it('should handle fulfilled state with backend ExternalAuthSessionDto shape', () => {
      const backendPayload = {
        session: {
          accessToken: 'ext-access-token',
          refreshToken: 'ext-refresh-token',
          user: {
            id: 'uuid-456',
            firstName: 'Jane',
            lastName: 'Doe',
            email: 'jane@example.com',
          },
          channel: 'Marketplace',
        },
        isNewUser: false,
        requiresPhone: false,
        linkedProviders: ['Google'],
      };

      const action = { type: loginExternalThunk.fulfilled.type, payload: backendPayload };
      const state = reducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.user).toEqual({
        id: 'uuid-456',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        linkedProviders: ['Google'],
      });
      expect(state.token).toBe('ext-access-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isSessionChecked).toBe(true);
      expect(state.channel).toBe('Marketplace');
    });

    it('should handle fulfilled state with legacy tokens/user payload shape', () => {
      const legacyPayload = {
        tokens: { accessToken: 'legacy-token', refreshToken: 'legacy-refresh' },
        user: { id: 789, firstName: 'Legacy', lastName: 'User', email: 'legacy@example.com' },
      };

      const action = { type: loginExternalThunk.fulfilled.type, payload: legacyPayload };
      const state = reducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.user).toEqual(legacyPayload.user);
      expect(state.token).toBe('legacy-token');
      expect(state.isAuthenticated).toBe(true);
      expect(state.isSessionChecked).toBe(true);
    });

    it('should handle rejected state', () => {
      const action = { type: loginExternalThunk.rejected.type, payload: 'Account exists with password' };
      const state = reducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe('Account exists with password');
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
