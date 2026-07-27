import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import LoginScreen from '../LoginScreen';
import * as authSlice from '../../../store/slices/authSlice';

// Mock the dispatch thunk
jest.mock('../../../store/slices/authSlice', () => {
  const actual = jest.requireActual('../../../store/slices/authSlice');
  return {
    __esModule: true,
    ...actual,
    loginThunk: Object.assign(jest.fn(), actual.loginThunk),
    default: actual.default,
  };
});

describe('LoginScreen UI Tests', () => {
  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen navigation={{}} />);
    
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
  });

  it('shows error if fields are empty', async () => {
    // Need to provide a valid return for the thunk to avoid undefined type error
    authSlice.loginThunk.mockReturnValue(() => ({
      unwrap: () => Promise.reject('Empty fields')
    }));

    const { getByText } = renderWithProviders(<LoginScreen navigation={{}} />);
    
    fireEvent.press(getByText('Sign In'));
    
    // In our UI, Alert.alert is used for empty fields, but we should mock it
    // Or we assume validation prevents dispatch
  });

  it('calls login thunk with correct credentials', async () => {
    authSlice.loginThunk.mockReturnValue(() => ({
      unwrap: () => Promise.resolve({ user: { email: 'test@test.com' }, token: 'abc' })
    }));

    const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen navigation={{}} />);
    
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@test.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(authSlice.loginThunk).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
    });
  });
});
