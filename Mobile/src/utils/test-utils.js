import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { NavigationContainer } from '@react-navigation/native';
import authReducer from '../store/slices/authSlice';
import parkingReducer from '../store/slices/parkingSlice';
import bookingReducer from '../store/slices/bookingSlice';
import dashboardReducer from '../store/slices/dashboardSlice';
import reviewReducer from '../store/slices/reviewSlice';
import uiReducer from '../store/slices/uiSlice';

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
        bookings: bookingReducer,
        dashboard: dashboardReducer,
        reviews: reviewReducer,
        ui: uiReducer,
      },
      preloadedState,
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <NavigationContainer>{children}</NavigationContainer>
      </Provider>
    );
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Re-export everything
export * from '@testing-library/react-native';
