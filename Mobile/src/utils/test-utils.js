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
        booking: bookingReducer,
        dashboard: dashboardReducer,
        review: reviewReducer,
        ui: uiReducer,
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
