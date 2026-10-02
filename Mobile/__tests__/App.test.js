import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';
import App from '../App';
import RemoteConfigService from '../src/services/remoteConfig/RemoteConfigService';
import NotificationService from '../src/services/notifications/NotificationService';
import { startNetworkLogging, stopNetworkLogging } from 'react-native-network-logger';

// Mock RootNavigator so we don't render entire navigation hierarchy
jest.mock('../src/navigation/RootNavigator', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return () => (
    <View testID="root-navigator">
      <Text>Root Navigator</Text>
    </View>
  );
});

describe('App Entry Point', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders root navigator and initializes services without crashing', async () => {
    const { getByTestId } = render(<App />);

    await waitFor(() => {
      expect(getByTestId('root-navigator')).toBeTruthy();
    });
  });

  it('enables network logger FAB when isDebuggerEnabled is true in remote config', async () => {
    jest.spyOn(RemoteConfigService, 'getBooleanAsync').mockResolvedValue(true);

    const { getByTestId, queryByTestId } = render(<App />);

    await waitFor(() => {
      expect(getByTestId('debug-fab')).toBeTruthy();
    });

    expect(startNetworkLogging).toHaveBeenCalledWith(
      expect.objectContaining({
        ignoredPatterns: expect.any(Array),
      })
    );

    // Tap on debug FAB to open network logger modal
    fireEvent.press(getByTestId('debug-fab-button'));

    await waitFor(() => {
      expect(getByTestId('network-logger-modal')).toBeTruthy();
      expect(getByTestId('network-logger')).toBeTruthy();
    });

    // Close the modal
    fireEvent.press(getByTestId('close-network-logger'));

    await waitFor(() => {
      expect(queryByTestId('close-network-logger')).toBeNull();
    });
  });

  it('hides network logger FAB when isDebuggerEnabled is false', async () => {
    jest.spyOn(RemoteConfigService, 'getBooleanAsync').mockResolvedValue(false);

    const { queryByTestId } = render(<App />);

    await waitFor(() => {
      expect(queryByTestId('debug-fab')).toBeNull();
    });

    expect(stopNetworkLogging).toHaveBeenCalled();
  });
});
