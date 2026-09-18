/**
 * Automated End-to-End Flow Tests: Authentication & Role-Based Navigation
 *
 * Covers:
 * 1. Open App -> Login with valid Member credentials -> Verifies Member experience (Search, Bookings, Menu tabs; Member Dashboard)
 * 2. Open App -> Login with valid Vendor credentials -> Verifies Vendor experience (Listings, Bookings, Menu tabs; Vendor Dashboard)
 * 3. Open App -> Switch to Corporate mode -> Login with Corporate credentials -> Verifies Corporate experience (Inventory, Bookings, Menu tabs; Corporate Dashboard)
 * 4. Open App -> Login with invalid credentials (401 Unauthorized) -> Verifies UI error banner and failed login state
 * 5. Open App -> Login during network failure -> Verifies network error message and resilient error handling
 * 6. Open App -> Client-side form validation edge cases (empty fields, malformed email) -> Verifies field errors without network dispatch
 * 7. Session Restore on startup -> Valid stored token immediately loads authenticated role dashboard without login screen
 * 8. Session Restore expired -> Expired token (401 on /me) clears session and safely presents Login screen
 * 9. End-to-End Logout Flow -> Authenticated user logs out from Menu -> Clears state and transitions back to Auth stack
 * 10. Corporate SSO Discovery -> Tests SSO available detection and domain not configured fallback alerts
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

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

function createTestStore(preloadedState = {}) {
    return configureStore({
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
        preloadedState,
    });
}

function renderFlowApp(customStore) {
    const store = customStore || createTestStore();
    const renderResult = render(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
            <Provider store={store}>
                <RootNavigator />
            </Provider>
        </SafeAreaProvider>
    );
    return { ...renderResult, store };
}

describe('Automated Flow Tests: Authentication & Role-Based Navigation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        SecureStore.getItemAsync.mockResolvedValue(null);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Flow 1: Open app -> Login with valid Member credentials -> successfully authenticates and renders Member experience', async () => {
        // Setup API mock: GET /me returns 401 initially (unauthenticated)
        apiClient.get.mockImplementation((url) => {
            if (url.includes('dashboard/member') || url.includes('dashboard')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            stats: { totalBookings: 3, activeBookings: 1, totalSpent: 75 },
                            upcomingBookings: [],
                            recentBookings: [],
                        },
                    },
                });
            }
            if (url.includes('notifications') || url.includes('unread')) {
                return Promise.resolve({ data: { success: true, data: { unreadCount: 0, count: 0, notifications: [] } } });
            }
            return Promise.reject({ response: { status: 401 } });
        });

        // POST /api/auth/login -> returns valid Member session
        apiClient.post.mockImplementation((url) => {
            if (url.includes('login')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            token: 'mock-member-jwt-token',
                            user: {
                                id: 'member-001',
                                firstName: 'Alice',
                                email: 'alice@parkease.com',
                                role: 2, // Member
                            },
                        },
                    },
                });
            }
            return Promise.resolve({ data: { success: true, data: {} } });
        });

        const { findByText, getByPlaceholderText, getByText, queryByText } = renderFlowApp();

        // 1. Initial Launch: App finishes session check and lands on Login screen
        const welcomeHeader = await findByText('Welcome Back');
        expect(welcomeHeader).toBeTruthy();

        // 2. Input valid Member credentials
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'alice@parkease.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'SecurePassword123!');
        fireEvent.press(getByText('Sign In'));

        // 3. Verifies transition to Member App Experience
        const memberGreeting = await findByText(/Find your perfect parking spot/i);
        expect(memberGreeting).toBeTruthy();

        // 4. Role-based tabs verification for Member:
        // - Search tab is PRESENT
        // - Bookings tab is PRESENT
        // - Menu tab is PRESENT
        // - Listings tab (Vendor only) is NOT PRESENT
        expect(getByText('Search')).toBeTruthy();
        expect(getByText('Bookings')).toBeTruthy();
        expect(getByText('Menu')).toBeTruthy();
        expect(queryByText('Listings')).toBeNull();
        expect(queryByText('Inventory')).toBeNull();
    });

    it('Flow 2: Open app -> Login with valid Vendor credentials -> successfully authenticates and renders Vendor experience', async () => {
        apiClient.get.mockImplementation((url) => {
            if (url.includes('dashboard/vendor') || url.includes('dashboard')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            totalParkingSpaces: 2,
                            totalBookings: 14,
                            totalEarnings: 450,
                            monthlyEarnings: 300,
                            recentBookings: [],
                        },
                    },
                });
            }
            if (url.includes('notifications') || url.includes('unread')) {
                return Promise.resolve({ data: { success: true, data: { unreadCount: 0, count: 0, notifications: [] } } });
            }
            return Promise.reject({ response: { status: 401 } });
        });

        // POST /api/auth/login -> returns valid Vendor session
        apiClient.post.mockImplementation((url) => {
            if (url.includes('login')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            token: 'mock-vendor-jwt-token',
                            user: {
                                id: 'vendor-001',
                                firstName: 'Bob',
                                email: 'bob@parkeasevendor.com',
                                role: 1, // Vendor
                            },
                        },
                    },
                });
            }
            return Promise.resolve({ data: { success: true, data: {} } });
        });

        const { findByText, getByPlaceholderText, getByText, queryByText } = renderFlowApp();

        // 1. Initial Launch
        await findByText('Welcome Back');

        // 2. Input valid Vendor credentials
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'bob@parkeasevendor.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'VendorPass456!');
        fireEvent.press(getByText('Sign In'));

        // 3. Verifies transition to Vendor Dashboard
        const vendorHeader = await findByText(/Manage your parking business/i);
        expect(vendorHeader).toBeTruthy();

        // 4. Role-based tabs verification for Vendor:
        // - Listings tab is PRESENT
        // - Bookings tab is PRESENT
        // - Menu tab is PRESENT
        // - Search tab (Member only) is NOT PRESENT
        expect(getByText('Listings')).toBeTruthy();
        expect(getByText('Bookings')).toBeTruthy();
        expect(getByText('Menu')).toBeTruthy();
        expect(queryByText('Search')).toBeNull();
        expect(queryByText('Inventory')).toBeNull();
    });

    it('Flow 3: Open app -> Switch to Corporate tab -> Login with valid Corporate credentials -> renders Corporate experience', async () => {
        apiClient.get.mockImplementation((url) => {
            if (url.includes('corporate/companies')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: [{ id: 'corp-001', name: 'Acme Fleet Corp', role: 'FleetManager' }],
                    },
                });
            }
            if (url.includes('corporate/dashboard') || url.includes('dashboard')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            totalMembers: 45,
                            activeAllocations: 30,
                            todaysBookings: 12,
                        },
                    },
                });
            }
            if (url.includes('notifications') || url.includes('unread')) {
                return Promise.resolve({ data: { success: true, data: { unreadCount: 0, count: 0, notifications: [] } } });
            }
            return Promise.reject({ response: { status: 401 } });
        });

        apiClient.post.mockImplementation((url) => {
            if (url.includes('corporate') || url.includes('login')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            session: {
                                accessToken: 'mock-corp-jwt-token',
                                channel: 'Corporate',
                                companyId: 'corp-001',
                                companyRole: 'FleetManager',
                                user: {
                                    id: 'corp-user-001',
                                    firstName: 'Carol',
                                    email: 'carol@acmecorp.com',
                                    role: 2,
                                },
                                companies: [{ companyId: 'corp-001', name: 'Acme Fleet Corp', role: 'FleetManager' }],
                            },
                        },
                    },
                });
            }
            return Promise.resolve({ data: { success: true, data: {} } });
        });

        const { findByText, getByPlaceholderText, getByText, queryByText } = renderFlowApp();

        // 1. Initial Launch
        await findByText('Welcome Back');

        // 2. Switch to Corporate Login Mode
        fireEvent.press(getByText('Corporate'));

        // 3. Input corporate credentials
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'carol@acmecorp.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'AcmeCorpPass789!');
        fireEvent.press(getByText('Corporate Sign In'));

        // 4. Verifies transition to Corporate Experience
        const corporateHeader = await findByText(/Welcome to Corporate|ACTIVE COMPANY/i);
        expect(corporateHeader).toBeTruthy();

        // 5. Role-based tabs verification for Corporate:
        // - Corporate Inventory tab ('Inventory') is PRESENT
        // - Bookings tab is PRESENT
        // - Menu tab is PRESENT
        // - Search tab (Driver Member) is NOT PRESENT
        // - Listings tab (Vendor Partner) is NOT PRESENT
        expect(getByText('Inventory')).toBeTruthy();
        expect(getByText('Bookings')).toBeTruthy();
        expect(getByText('Menu')).toBeTruthy();
        expect(queryByText('Search')).toBeNull();
        expect(queryByText('Listings')).toBeNull();
    });

    it('Flow 4: Open app -> Login with invalid credentials -> shows error banner in UI, login fails, remains on Login screen', async () => {
        apiClient.get.mockRejectedValue({ response: { status: 401 } });

        // POST /api/auth/login fails with 401 Unauthorized
        apiClient.post.mockRejectedValue({
            response: {
                status: 401,
                data: {
                    success: false,
                    message: 'Invalid email or password',
                },
            },
        });

        const { findByText, getByPlaceholderText, getByText, queryByText } = renderFlowApp();

        await findByText('Welcome Back');

        // Input invalid credentials
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'unregistered@unknown.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'wrongpassword');
        fireEvent.press(getByText('Sign In'));

        // Verifies error banner is displayed on the screen
        const errorBanner = await findByText('Invalid email or password');
        expect(errorBanner).toBeTruthy();

        // Verifies user remains safely on Login Screen and did not navigate into the app
        expect(getByText('Welcome Back')).toBeTruthy();
        expect(queryByText('Home')).toBeNull();
    });

    it('Flow 5: Open app -> Login during network outage -> displays network error banner and keeps user on login screen', async () => {
        apiClient.get.mockRejectedValue({ response: { status: 401 } });

        // Simulate network disconnect / unreachable host
        apiClient.post.mockRejectedValue({
            request: {},
            message: 'Network Error',
        });

        const { findByText, getByPlaceholderText, getByText, queryByText } = renderFlowApp();

        await findByText('Welcome Back');

        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'validuser@parkease.com');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'validpassword');
        fireEvent.press(getByText('Sign In'));

        // Verifies network error message is displayed
        const networkErrorText = await findByText(/Network error/i);
        expect(networkErrorText).toBeTruthy();

        // User remains on login screen
        expect(getByText('Welcome Back')).toBeTruthy();
        expect(queryByText('Home')).toBeNull();
    });

    it('Flow 6: Client-side validation edge cases: empty fields and malformed email fail without network calls', async () => {
        apiClient.get.mockRejectedValue({ response: { status: 401 } });

        const { findByText, getByPlaceholderText, getByText } = renderFlowApp();

        await findByText('Welcome Back');

        // 1. Submit completely empty form
        fireEvent.press(getByText('Sign In'));

        // Client-side validation triggers immediately
        await waitFor(() => {
            expect(getByText('Email is required')).toBeTruthy();
            expect(getByText('Password is required')).toBeTruthy();
        });
        expect(apiClient.post).not.toHaveBeenCalled();

        // 2. Submit invalid email format
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'not-an-email');
        fireEvent.changeText(getByPlaceholderText('Enter your password'), 'validpassword123');
        fireEvent.press(getByText('Sign In'));

        await waitFor(() => {
            expect(getByText('Please enter a valid email')).toBeTruthy();
        });
        expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('Flow 7: Session restore on startup: Valid stored token bypasses login and launches directly into dashboard', async () => {
        // Mock stored access token exists
        SecureStore.getItemAsync.mockResolvedValue('stored-valid-jwt-token');

        // GET /users/me successfully returns authenticated Member
        apiClient.get.mockImplementation((url) => {
            if (url.includes('me')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            id: 'persisted-user-01',
                            firstName: 'David',
                            email: 'david@parkease.com',
                            role: 2, // Member
                        },
                    },
                });
            }
            if (url.includes('dashboard/member') || url.includes('dashboard')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            stats: { totalBookings: 5, activeBookings: 0, totalSpent: 120 },
                            upcomingBookings: [],
                            recentBookings: [],
                        },
                    },
                });
            }
            return Promise.resolve({ data: { success: true, data: {} } });
        });

        const { findByText, queryByText } = renderFlowApp();

        // Verifies the app boots directly to the Member Dashboard without showing the Login screen
        const dashboardGreeting = await findByText(/Find your perfect parking spot/i);
        expect(dashboardGreeting).toBeTruthy();
        expect(queryByText('Welcome Back')).toBeNull();
    });

    it('Flow 8: Session restore failure: Expired stored token routes user cleanly to Login screen', async () => {
        SecureStore.getItemAsync.mockResolvedValue('expired-jwt-token');

        // GET /users/me fails with 401 Unauthorized (expired token)
        apiClient.get.mockRejectedValue({ response: { status: 401 } });

        const { findByText, queryByText } = renderFlowApp();

        // Verifies the app routes user to Login Screen
        const loginHeader = await findByText('Welcome Back');
        expect(loginHeader).toBeTruthy();
        expect(queryByText('Find your perfect parking spot')).toBeNull();
    });

    it('Flow 9: End-to-End Logout Flow: Authenticated user logs out from Menu -> Clears state and transitions back to Auth stack', async () => {
        // Mock stored token exists so restoreSessionThunk preserves authenticated session on mount
        SecureStore.getItemAsync.mockResolvedValue('active-session-token');

        // Preload an authenticated Member in Redux store
        const store = createTestStore({
            auth: {
                user: { id: 'logout-user-01', firstName: 'Elena', email: 'elena@parkease.com', role: 2 },
                token: 'active-session-token',
                channel: 'Marketplace',
                isAuthenticated: true,
                isSessionChecked: true,
                loading: false,
                error: null,
            },
        });

        apiClient.get.mockImplementation((url) => {
            if (url.includes('me')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            id: 'logout-user-01',
                            firstName: 'Elena',
                            email: 'elena@parkease.com',
                            role: 2,
                        },
                    },
                });
            }
            if (url.includes('dashboard') || url.includes('notifications') || url.includes('unread')) {
                return Promise.resolve({
                    data: { success: true, data: { stats: {}, unreadCount: 0 } },
                });
            }
            return Promise.resolve({ data: { success: true, data: {} } });
        });
        apiClient.post.mockResolvedValue({ data: { success: true } });

        const { findByText, getByText } = renderFlowApp(store);

        // App starts inside the AppTabNavigator
        await findByText('Home');

        // Navigate to Menu Tab
        fireEvent.press(getByText('Menu'));

        // Menu screen displays user profile
        await findByText('Driver Member');

        // Press Log Out button
        const logoutButton = getByText('Log Out');
        fireEvent.press(logoutButton);

        // Confirmation Alert pops up
        expect(Alert.alert).toHaveBeenCalledWith(
            'Logout',
            'Are you sure you want to logout?',
            expect.any(Array)
        );

        // Simulate pressing destructive 'Logout' button on Alert
        const logoutAlertAction = Alert.alert.mock.calls[0][2].find((btn) => btn.text === 'Logout').onPress;

        await act(async () => {
            await logoutAlertAction();
        });

        // Verifies transition back to Login Screen
        const welcomeBack = await findByText('Welcome Back');
        expect(welcomeBack).toBeTruthy();
        expect(store.getState().auth.isAuthenticated).toBe(false);
    });

    it('Flow 10: Corporate SSO Discovery: prompts SSO login when domain configured, alerts fallback when unconfigured', async () => {
        apiClient.get.mockImplementation((url, config) => {
            if (url.includes('corporate/sso/discover')) {
                const emailParam = config?.params?.email || config?.params?.domain || '';
                if (emailParam.includes('enterprise-sso.com')) {
                    return Promise.resolve({
                        data: {
                            success: true,
                            data: {
                                ssoAvailable: true,
                                companyName: 'Enterprise Corp',
                            },
                        },
                    });
                }
                return Promise.resolve({
                    data: {
                        success: true,
                        data: {
                            ssoAvailable: false,
                        },
                    },
                });
            }
            return Promise.reject({ response: { status: 401 } });
        });

        const { findByText, getByText, getByPlaceholderText } = renderFlowApp();

        await findByText('Welcome Back');
        fireEvent.press(getByText('Corporate'));

        // 1. SSO Discovery with unconfigured corporate domain
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'user@standard-domain.com');
        fireEvent.press(getByText('Sign in with Company SSO (OIDC/SAML)'));

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'SSO Not Configured',
                expect.stringContaining('Corporate SSO is not configured for this domain')
            );
        });

        // 2. SSO Discovery with configured corporate domain
        fireEvent.changeText(getByPlaceholderText('Enter your email'), 'employee@enterprise-sso.com');
        fireEvent.press(getByText('Sign in with Company SSO (OIDC/SAML)'));

        await waitFor(() => {
            expect(Alert.alert).toHaveBeenCalledWith(
                'SSO Available',
                expect.stringContaining('Corporate SSO is enabled for Enterprise Corp'),
                expect.any(Array)
            );
        });
    });
});
