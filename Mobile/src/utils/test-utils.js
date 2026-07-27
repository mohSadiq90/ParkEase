import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import bookingReducer from '../store/slices/bookingSlice';
import dashboardReducer from '../store/slices/dashboardSlice';
import parkingReducer from '../store/slices/parkingSlice';

// A utility function to render components with a Redux store and NavigationContainer
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    // Create a new store instance if no store was passed in
    store = configureStore({
      reducer: {
        auth: authReducer,
        booking: bookingReducer,
        dashboard: dashboardReducer,
        parking: parkingReducer,
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
