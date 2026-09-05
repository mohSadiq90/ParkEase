import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import authReducer from '../store/slices/authSlice';
import parkingReducer from '../store/slices/parkingSlice';
import bookingReducer from '../store/slices/bookingSlice';
import dashboardReducer from '../store/slices/dashboardSlice';
import reviewReducer from '../store/slices/reviewSlice';
import favoriteReducer from '../store/slices/favoriteSlice';
import notificationReducer from '../store/slices/notificationSlice';
import chatReducer from '../store/slices/chatSlice';
import paymentReducer from '../store/slices/paymentSlice';
import passReducer from '../store/slices/passSlice';
import uiReducer from '../store/slices/uiSlice';
import corporateReducer from '../store/slices/corporateSlice';
import ancillaryReducer from '../store/slices/ancillarySlice';
import eventPackageReducer from '../store/slices/eventPackageSlice';
import iotReducer from '../store/slices/iotSlice';
import adminReducer from '../store/slices/adminSlice';

// Helper function to render components with Redux store
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    // Create a new store instance if none is provided
    store = configureStore({
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
        admin: adminReducer,
      },
      preloadedState,
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <Provider store={store}>
          <NavigationContainer>{children}</NavigationContainer>
        </Provider>
      </SafeAreaProvider>
    );
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Re-export everything
export * from '@testing-library/react-native';
