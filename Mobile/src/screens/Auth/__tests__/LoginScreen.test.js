import React from 'react';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import LoginScreen from '../LoginScreen';
import authService from '../../../services/auth/authService';

// Mock the navigation prop
const mockNavigation = {
  navigate: jest.fn(),
};

// Mock the auth service to prevent actual network calls
jest.mock('../../../services/auth/authService', () => ({
  login: jest.fn(),
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
});
