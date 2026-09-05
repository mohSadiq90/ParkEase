import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import LoginScreen from '../LoginScreen';
import authService from '../../../services/auth/authService';
import googleAuthService from '../../../services/auth/googleAuthService';

// Mock Alert.alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock the navigation prop
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock the auth services
jest.mock('../../../services/auth/authService', () => ({
  login: jest.fn(),
  loginCorporate: jest.fn(),
  loginExternal: jest.fn(),
}));

jest.mock('../../../services/auth/googleAuthService', () => ({
  signIn: jest.fn(),
  configure: jest.fn(),
  signOut: jest.fn(),
  checkPlayServices: jest.fn(),
}));

describe('LoginScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen navigation={mockNavigation} />);
    
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Continue with Google')).toBeTruthy();
  });

  it('shows validation errors when fields are empty', async () => {
    const { getByText } = renderWithProviders(<LoginScreen navigation={mockNavigation} />);
    
    // Press the sign in button without filling fields
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      // Assuming the Input component displays the error prop text
      expect(getByText('Email is required')).toBeTruthy();
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('calls login service when valid data is provided', async () => {
    // Setup the mock to return success
    authService.login.mockResolvedValueOnce({
      success: true,
      data: { user: { id: 1 }, accessToken: 'token' },
    });

    const { getByText, getByPlaceholderText } = renderWithProviders(<LoginScreen navigation={mockNavigation} />);
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    
    // Submit
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('navigates to Signup screen when Sign Up is pressed', () => {
    const { getByText } = renderWithProviders(<LoginScreen navigation={mockNavigation} />);
    
    fireEvent.press(getByText('Sign Up'));
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Signup');
  });

  it('calls googleAuthService and loginExternal when Continue with Google is pressed', async () => {
    googleAuthService.signIn.mockResolvedValueOnce({
      idToken: 'real-google-jwt-token-12345',
      user: { email: 'googleuser@example.com', name: 'Google User' },
      cancelled: false,
    });

    authService.loginExternal.mockResolvedValueOnce({
      success: true,
      data: {
        tokens: { accessToken: 'access-jwt', refreshToken: 'refresh-jwt' },
        user: { id: 'guid-123', email: 'googleuser@example.com', role: 1 },
      },
    });

    const { getByText } = renderWithProviders(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => {
      expect(googleAuthService.signIn).toHaveBeenCalled();
      expect(authService.loginExternal).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'google',
          idToken: 'real-google-jwt-token-12345',
          userConsentGiven: true,
        })
      );
    });
  });

  it('handles Google Sign-in cancellation gracefully without error', async () => {
    googleAuthService.signIn.mockResolvedValueOnce({
      cancelled: true,
    });

    const { getByText } = renderWithProviders(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => {
      expect(googleAuthService.signIn).toHaveBeenCalled();
      expect(authService.loginExternal).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  it('shows friendly alert when Google Sign-in fails with invalid token', async () => {
    googleAuthService.signIn.mockRejectedValueOnce(
      new Error('Google identity token expired or invalid. Please sign in again.')
    );

    const { getByText } = renderWithProviders(<LoginScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Continue with Google'));

    await waitFor(() => {
      expect(googleAuthService.signIn).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Google Sign-In Failed',
        expect.stringContaining('Google identity token expired or invalid')
      );
    });
  });
});

