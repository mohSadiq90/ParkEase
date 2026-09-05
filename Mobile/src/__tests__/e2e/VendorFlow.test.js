import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import RootNavigator from '../../navigation/RootNavigator';
import authReducer from '../../store/slices/authSlice';
import parkingReducer from '../../store/slices/parkingSlice';
import bookingReducer from '../../store/slices/bookingSlice';
import dashboardReducer from '../../store/slices/dashboardSlice';
import reviewReducer from '../../store/slices/reviewSlice';
import uiReducer from '../../store/slices/uiSlice';
import favoriteReducer from '../../store/slices/favoriteSlice';
import notificationReducer from '../../store/slices/notificationSlice';
import chatReducer from '../../store/slices/chatSlice';
import paymentReducer from '../../store/slices/paymentSlice';
import passReducer from '../../store/slices/passSlice';
import corporateReducer from '../../store/slices/corporateSlice';
import ancillaryReducer from '../../store/slices/ancillarySlice';
import eventPackageReducer from '../../store/slices/eventPackageSlice';
import iotReducer from '../../store/slices/iotSlice';
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
      favorite: favoriteReducer,
      notification: notificationReducer,
      chat: chatReducer,
      payment: paymentReducer,
      pass: passReducer,
      ui: uiReducer,
      corporate: corporateReducer,
      ancillary: ancillaryReducer,
      eventPackage: eventPackageReducer,
      iot: iotReducer,
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

describe('Vendor E2E Flow (Hosting and Approving)', () => {
  beforeEach(() => {
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('completes the full flow for a Vendor', async () => {
    // 1. Initial / Auth
    apiClient.get.mockImplementation((url) => {
      if (url.includes('me')) {
        return Promise.reject({ response: { status: 401 } });
      }
      if (url.includes('dashboard/vendor')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              totalParkingSpaces: 1,
              totalBookings: 0,
              totalEarnings: 0,
              monthlyEarnings: 0,
              recentBookings: []
            }
          }
        });
      }
      if (url.includes('parking/my-listings')) {
        return Promise.resolve({
          data: { success: true, data: [] }
        });
      }
      if (url.includes('bookings/vendor-bookings')) {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              { id: '101', userName: 'John Doe', parkingSpaceTitle: 'Test Spot', status: 0, totalAmount: 50, startDateTime: new Date().toISOString() }
            ]
          }
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    apiClient.post.mockImplementation((url) => {
      if (url.includes('login')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              token: 'fake-vendor-token',
              user: { id: 'vendor1', firstName: 'Vendor', role: 1 }
            }
          }
        });
      }
      if (url.includes('parking')) {
        return Promise.resolve({
          data: { success: true, data: { id: 'new-spot', title: 'Test Spot', isOnline: false } }
        });
      }
      if (url.includes('approve')) {
        return Promise.resolve({
          data: { success: true, data: { id: '101', status: 1 } }
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    const { getByText, getByPlaceholderText, findByText, getAllByPlaceholderText, queryByText } = renderE2E();

    // 1. Login as Vendor
    const loginHeader = await findByText('Welcome Back');
    expect(loginHeader).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'vendor@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    // Wait for Dashboard to render
    const dashboardHeader = await findByText('Manage your parking business', {}, { timeout: 5000 });
    expect(dashboardHeader).toBeTruthy();

    // 2. Navigate to My Listings -> Create a new parking space
    fireEvent.press(getByText('Listings'));
    
    // My Listings screen should show
    const createNewBtn = await findByText('Add Parking Space');
    fireEvent.press(createNewBtn);

    // CreateParkingScreen
    await findByText('New Parking Space');
    fireEvent.changeText(getByPlaceholderText('e.g. Downtown Parking Garage'), 'Test Spot');
    fireEvent.changeText(getByPlaceholderText('Number of spots'), '5');
    fireEvent.changeText(getByPlaceholderText('Street address'), '123 Vendor St');
    fireEvent.changeText(getByPlaceholderText('City'), 'Vendor City');
    
    const zeroInputs = getAllByPlaceholderText('0.00');
    fireEvent.changeText(zeroInputs[0], '15'); // Hourly Rate

    fireEvent.press(getByText('Create Space'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Parking space created!',
        expect.any(Array)
      );
    });

    // Simulate clicking "OK" on the alert
    const okAction = Alert.alert.mock.calls[0][2][0].onPress;
    
    // We must wrap state updates (like navigation) in act
    await waitFor(() => {
      okAction();
    });

    // Wait for Listings Screen to show again
    await findByText('Test Spot');

    // 3. Go to Vendor Bookings -> Accept a pending booking request
    await act(async () => {
      fireEvent.press(getByText('Bookings'));
    });

    // Vendor Bookings Screen
    const approveBtn = await findByText('Approve');
    fireEvent.press(approveBtn);

    // Alert pops up
    expect(Alert.alert).toHaveBeenCalledWith(
      'Approve Booking',
      'Confirm approval?',
      expect.any(Array)
    );

    // Simulate clicking "Approve" (index 1 of Alert array)
    const approveAction = Alert.alert.mock.calls[1][2][1].onPress;
    
    // Update dashboard mock to reflect new stats before approving (as it might re-fetch)
    apiClient.get.mockImplementation((url) => {
      if (url.includes('dashboard/vendor')) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              totalParkingSpaces: 2,
              totalBookings: 1,
              totalEarnings: 50,
              monthlyEarnings: 50,
              recentBookings: []
            }
          }
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    await approveAction();

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('approve'));
    });

    // 4. Check Vendor Dashboard to see updated revenue/stats
    await act(async () => {
      const homeTab = queryByText('Dashboard') || getByText('Home');
      fireEvent.press(homeTab);
    });

    // We wait for the dashboard to render
    const dashboardTitle = await findByText('Manage your parking business');
    expect(dashboardTitle).toBeTruthy();
  });
});
