import reducer, { clearError, resetAuth } from '../authSlice';

describe('authSlice unit tests', () => {
  const initialState = {
    user: null,
    token: null,
    loading: false,
    error: null,
    isAuthenticated: false,
    isSessionChecked: false,
  };

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle resetAuth', () => {
    const loggedInState = {
      ...initialState,
      user: { id: 1, email: 'test@example.com', role: 'Member' },
      token: 'fake-token',
      isAuthenticated: true,
      isSessionChecked: true,
    };
    
    const state = reducer(loggedInState, resetAuth());
    
    expect(state).toEqual(initialState);
  });
});
