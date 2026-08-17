import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import RootNavigator from '../../navigation/RootNavigator';
import authReducer from '../../store/slices/authSlice';
import parkingReducer from '../../store/slices/parkingSlice';
import bookingReducer from '../../store/slices/bookingSlice';
import dashboardReducer from '../../store/slices/dashboardSlice';
import reviewReducer from '../../store/slices/reviewSlice';
import uiReducer from '../../store/slices/uiSlice';
import apiClient from '../../services/api/apiClient';

jest.mock('../../services/api/apiClient');
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

import { SafeAreaProvider } from 'react-native-safe-area-context';

function renderE2E() {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      parking: parkingReducer,
      booking: bookingReducer,
      dashboard: dashboardReducer,
      review: reviewReducer,
      ui: uiReducer,
    },
  });

  return render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
      <Provider store={store}>
        <RootNavigator />
      </Provider>
    </SafeAreaProvider>
  );
}

describe('Member E2E Flow (Discovery to Booking)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('completes the full flow from signup to booking', async () => {
    // 1. Initial / Auth
    // Mock GET /auth/me -> Returns 401 initially so we stay on Auth screen
    apiClient.get.mockImplementation((url) => {
      if (url.includes('me')) {
        return Promise.reject({ response: { status: 401 } });
      }
      if (url.includes('search')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              parkingSpaces: [
                { id: '1', title: 'Central Park Garage', pricePerHour: 10, distance: 2.5, city: 'New York' }
              ],
              totalCount: 1
            }
          }
        });
      }
      if (url.includes('reviews/parking-space/1')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.endsWith('/parking/1')) {
        return Promise.resolve({
          data: {
            success: true,
            data: { id: '1', title: 'Central Park Garage', pricePerHour: 10, totalSpots: 50, city: 'New York', address: '123 Main', parkingType: 2, hourlyRate: 10, is24Hours: true }
          }
        });
      }
      if (url.includes('bookings/my-bookings')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              bookings: [
                { id: '101', parkingSpaceTitle: 'Central Park Garage', status: 0, totalAmount: 20, startDateTime: new Date().toISOString(), endDateTime: new Date().toISOString(), parkingSpaceAddress: '123 Main St', bookingReference: 'REF123' }
              ],
              totalCount: 1,
              page: 1,
              pageSize: 10,
              totalPages: 1
            }
          }
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    apiClient.post.mockImplementation((url) => {
      if (url.includes('register')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              token: 'fake-jwt-token',
              user: { id: 'user1', firstName: 'John', role: 2 }
            }
          }
        });
      }
      if (url.includes('calculate-price')) {
        return Promise.resolve({
          data: { success: true, data: { basePrice: 20, discount: 0, totalPrice: 20 } }
        });
      }
      if (url.includes('bookings')) {
        return Promise.resolve({
          data: { success: true, data: { id: '101', status: 0 } }
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    const { getByText, getByPlaceholderText, findAllByText, findByText, queryByText, getAllByPlaceholderText, getAllByText } = renderE2E();

    // The app starts with a session check, then goes to Auth screen
    // We want to sign up as a new member
    const switchToSignupBtn = await findByText("Sign Up");
    fireEvent.press(switchToSignupBtn);

    // Fill Registration Form
    fireEvent.changeText(getByPlaceholderText('First'), 'John');
    fireEvent.changeText(getByPlaceholderText('Last'), 'Doe');
    const emails = getAllByPlaceholderText('Enter your email');
    fireEvent.changeText(emails[emails.length - 1], 'john@example.com'); // Signup email is likely the last one
    fireEvent.changeText(getByPlaceholderText('Enter phone number'), '1234567890');
    fireEvent.changeText(getByPlaceholderText('Min. 8 characters'), 'password123');
    
    const signupBtns = getAllByText('Create Account');
    fireEvent.press(signupBtns[1]);

    // Wait for Dashboard to render (Home Tab)
    await findByText('Home'); // wait until tabs are visible
    const searchTab = getByText('Search');
    fireEvent.press(searchTab);

    // Wait to navigate to Search Screen
    const searchHeader = await findByText('Find Parking');
    expect(searchHeader).toBeTruthy();

    // 2. Search for parking
    fireEvent.changeText(getByPlaceholderText('Search by city or location...'), 'New York');
    const searchBtn = getByText('Search');
    fireEvent.press(searchBtn);

    // Select the first spot
    const spotTitle = await findByText('Central Park Garage');
    fireEvent.press(spotTitle);

    // 3. Parking Detail Screen
    const bookNowBtn = await findByText('Book Now');
    fireEvent.press(bookNowBtn);

    // 4. Booking Screen
    // It should load the calculated price (20)
    const priceTexts = await findAllByText('₹20');
    expect(priceTexts.length).toBeGreaterThan(0);

    const confirmBookingBtn = getByText('Confirm Booking');
    await act(async () => {
      fireEvent.press(confirmBookingBtn);
    });

    // 5. Success -> navigates back to Detail Screen, then we want to check My Bookings
    // Wait for the bookNowBtn to appear again (navigated back)
    await findByText('Book Now');

    // We can't easily click bottom tabs in RNTL without testIDs on the tab bar.
    // Wait, the bottom tab bar is rendered, we can find the text "Bookings" or "My Bookings"
    // Let's check what the tab label is
    // Wait, usually bottom tabs have the name of the route. Let's look for "Bookings"
    // Tab label might just be "Bookings" or "My Bookings". 
    // In MemberTabNavigator, it's called 'Bookings' 
    const bookingsTab = getByText('Bookings');
    await act(async () => {
      fireEvent.press(bookingsTab);
    });

    // 6. My Bookings screen
    // The mock for `/bookings/member` returns the new booking with status 0 (Pending)
    const pendingBookingTitle = await findByText('Central Park Garage');
    expect(pendingBookingTitle).toBeTruthy();
  });
});
