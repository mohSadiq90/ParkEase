import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from '../RootNavigator';
import authReducer from '../../store/slices/authSlice';

// Mock navigation child stacks to keep test light
jest.mock('../AuthNavigator', () => {
    const { View, Text } = require('react-native');
    return function MockAuthNavigator() {
        return (
            <View testID="auth-navigator">
                <Text>Mock Auth Navigator</Text>
            </View>
        );
    };
});

jest.mock('../AppTabNavigator', () => {
    const { View, Text } = require('react-native');
    return function MockAppTabNavigator() {
        return (
            <View testID="app-tab-navigator">
                <Text>Mock App Tab Navigator</Text>
            </View>
        );
    };
});

// Mock authService tryRestoreSession
jest.mock('../../services/auth/authService', () => ({
    tryRestoreSession: jest.fn().mockResolvedValue(null),
}));

const createMockStore = (authState = {}) => {
    return configureStore({
        reducer: {
            auth: authReducer,
        },
        preloadedState: {
            auth: {
                user: null,
                token: null,
                channel: 'Marketplace',
                companyId: null,
                companyRole: null,
                corporateCompanies: [],
                loading: false,
                error: null,
                isAuthenticated: false,
                isSessionChecked: false,
                ...authState,
            },
        },
    });
};

const renderWithState = (authState = {}) => {
    const store = createMockStore(authState);
    return render(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
            <Provider store={store}>
                <RootNavigator />
            </Provider>
        </SafeAreaProvider>
    );
};

describe('RootNavigator', () => {
    it('displays SplashScreen when session has not yet been verified', () => {
        const { getByTestId, queryByText } = renderWithState({
            isSessionChecked: false,
            isAuthenticated: false,
        });

        // Verifies SplashScreen is rendered
        expect(getByTestId('splash-screen')).toBeTruthy();
        expect(getByTestId('splash-progress-track')).toBeTruthy();

        // Verifies old generic loading screen text is NOT displayed
        expect(queryByText('Starting ParkEase...')).toBeNull();
    });

    it('navigates to Auth stack when session check is completed and unauthenticated', () => {
        const { getByTestId, queryByTestId } = renderWithState({
            isSessionChecked: true,
            isAuthenticated: false,
        });

        expect(queryByTestId('splash-screen')).toBeNull();
        expect(getByTestId('auth-navigator')).toBeTruthy();
    });

    it('navigates to App stack when session check is completed and authenticated', () => {
        const { getByTestId, queryByTestId } = renderWithState({
            isSessionChecked: true,
            isAuthenticated: true,
            user: { id: '1', name: 'Driver User', role: 'member' },
        });

        expect(queryByTestId('splash-screen')).toBeNull();
        expect(getByTestId('app-tab-navigator')).toBeTruthy();
    });
});
