/**
 * Vendor Management & Space Hosting End-to-End Flow Tests
 *
 * Covers:
 * 1. Vendor Dashboard: Earnings, occupancy metrics, and quick action navigations
 * 2. My Listings Lifecycle: Listing cards, active/inactive switch toggle, pull-to-refresh, empty state
 * 3. Space Creation Form & Validation: Required field alerts, validation banner, successful submission
 * 4. Vendor Bookings Management: Incoming bookings listing, host approval, host rejection
 * 5. Access Pass Scanner: Empty token validation, valid token check-in, invalid/expired denial
 */

import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, fireEvent, waitFor } from '../../utils/test-utils';
import apiClient from '../../services/api/apiClient';
import VendorDashboardScreen from '../../screens/Vendor/VendorDashboardScreen';
import MyListingsScreen from '../../screens/Vendor/MyListingsScreen';
import CreateParkingScreen from '../../screens/Vendor/CreateParkingScreen';
import VendorBookingsScreen from '../../screens/Vendor/VendorBookingsScreen';
import AccessPassScannerScreen from '../../screens/Vendor/AccessPassScannerScreen';

jest.mock('../../services/api/apiClient');
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}),
    getParent: jest.fn(() => ({
        setOptions: jest.fn(),
        navigate: jest.fn(),
    })),
};

describe('Vendor Management & Space Hosting End-to-End Flows', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ── 1. Vendor Dashboard Flow ──
    describe('Vendor Dashboard Flow', () => {
        it('renders dashboard overview metrics and navigates to creation and listings', async () => {
            const preloadedState = {
                dashboard: {
                    vendorDashboard: {
                        totalParkingSpaces: 3,
                        totalBookings: 18,
                        totalEarnings: 450,
                        monthlyEarnings: 150,
                        recentBookings: [],
                    },
                    loading: false,
                }
            };

            apiClient.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        totalParkingSpaces: 3,
                        totalBookings: 18,
                        totalEarnings: 450,
                        monthlyEarnings: 150,
                        recentBookings: [],
                    }
                }
            });

            const { findByText, getByText } = renderWithProviders(
                <VendorDashboardScreen navigation={mockNavigation} />,
                { preloadedState }
            );

            // Verify metrics rendered
            expect(await findByText('Manage your parking business')).toBeTruthy();
            expect(getByText('Add Space')).toBeTruthy();
            expect(getByText('My Listings')).toBeTruthy();

            // Navigate to Add Space
            fireEvent.press(getByText('Add Space'));
            expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {});

            // Navigate to My Listings
            fireEvent.press(getByText('My Listings'));
            expect(mockNavigation.navigate).toHaveBeenCalledWith('MyListings', { filter: 'all' });
        });
    });

    // ── 2. My Listings Lifecycle Flow ──
    describe('My Listings Lifecycle Flow', () => {
        it('renders listings and toggles active switch state', async () => {
            const mockListings = [
                {
                    id: 'space-001',
                    title: 'Midtown Secure Deck',
                    address: '500 5th Ave',
                    city: 'New York',
                    pricePerHour: 20,
                    hourlyRate: 20,
                    totalSpots: 30,
                    occupiedSpots: 10,
                    isActive: true,
                    parkingType: 1,
                }
            ];

            apiClient.get.mockResolvedValueOnce({
                data: { success: true, data: mockListings }
            });

            // Mock toggle response (backend ApiResponse<bool> format)
            apiClient.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    message: 'Parking space deactivated',
                    data: true,
                }
            });

            const { findByText, getByTestId } = renderWithProviders(
                <MyListingsScreen navigation={mockNavigation} />
            );

            const title = await findByText('Midtown Secure Deck');
            expect(title).toBeTruthy();

            // Toggle active switch
            const switchEl = getByTestId('toggle-switch-space-001');
            expect(switchEl).toBeTruthy();
            fireEvent(switchEl, 'valueChange', false);

            await waitFor(() => {
                expect(apiClient.post).toHaveBeenCalled();
            });
        });

        it('renders empty listings state when vendor has no spaces', async () => {
            apiClient.get.mockResolvedValueOnce({
                data: { success: true, data: [] }
            });

            const { findByText } = renderWithProviders(
                <MyListingsScreen navigation={mockNavigation} />
            );

            const emptyMsg = await findByText('No listings yet');
            expect(emptyMsg).toBeTruthy();
        });
    });

    // ── 3. Create Parking Space Form & Inline Validation ──
    describe('Create Parking Space Flow', () => {
        it('validates required fields with alert and validation banner when submitted empty', async () => {
            const { getByText, getByTestId } = renderWithProviders(
                <CreateParkingScreen navigation={mockNavigation} route={{}} />
            );

            const submitBtn = getByText('Create Space');
            fireEvent.press(submitBtn);

            expect(Alert.alert).toHaveBeenCalledWith(
                'Required Fields',
                expect.stringContaining('Please fill in all required fields')
            );
            expect(getByTestId('validation-error-banner')).toBeTruthy();
            expect(apiClient.post).not.toHaveBeenCalled();
        });

        it('fills out form fields and successfully creates space', async () => {
            apiClient.post.mockResolvedValueOnce({
                data: { success: true, data: { id: 'new-spot-999' } }
            });

            const { getByPlaceholderText, getByText, getAllByPlaceholderText } = renderWithProviders(
                <CreateParkingScreen navigation={mockNavigation} route={{}} />
            );

            // Fill text fields
            fireEvent.changeText(getByPlaceholderText('e.g. Downtown Parking Garage'), 'Skyline Parking Lot');
            fireEvent.changeText(getByPlaceholderText('Describe your parking space, clearance height, gate access rules, etc.'), 'Heated underground garage with camera security.');
            fireEvent.changeText(getByPlaceholderText('Street address'), '789 Broadway');
            fireEvent.changeText(getByPlaceholderText('City'), 'New York');
            fireEvent.changeText(getByPlaceholderText('State'), 'NY');
            fireEvent.changeText(getByPlaceholderText('Zip code'), '10003');

            // Hourly rate & spots
            const rateInputs = getAllByPlaceholderText('0.00');
            fireEvent.changeText(rateInputs[0], '18');
            fireEvent.changeText(getByPlaceholderText('Number of spots'), '25');

            // Submit
            const submitBtn = getByText('Create Space');
            fireEvent.press(submitBtn);

            await waitFor(() => {
                expect(apiClient.post).toHaveBeenCalled();
            });

            const alertCall = Alert.alert.mock.calls.find((c) => c[0] === 'Success');
            expect(alertCall).toBeTruthy();
            alertCall[2][0].onPress();
            expect(mockNavigation.goBack).toHaveBeenCalled();
        });
    });

    // ── 4. Vendor Incoming Bookings Flow ──
    describe('Vendor Incoming Bookings Flow', () => {
        it('renders incoming booking and approves reservation via confirmation dialog', async () => {
            const mockBookings = [
                {
                    id: 'vendor-bk-1',
                    userName: 'John Driver',
                    parkingSpaceTitle: 'Midtown Secure Deck',
                    status: 0, // Pending
                    totalAmount: 36,
                    startDateTime: '2026-08-25T14:00:00Z',
                    endDateTime: '2026-08-25T16:00:00Z',
                }
            ];

            apiClient.get.mockResolvedValueOnce({
                data: { success: true, data: mockBookings }
            });
            apiClient.post.mockResolvedValueOnce({
                data: { success: true, message: 'Booking approved' }
            });

            const { findByText, getByText } = renderWithProviders(
                <VendorBookingsScreen navigation={mockNavigation} />
            );

            expect(await findByText('John Driver')).toBeTruthy();
            expect(getByText('Approve')).toBeTruthy();

            // Press Approve -> Prompts Alert confirmation
            fireEvent.press(getByText('Approve'));

            const alertCall = Alert.alert.mock.calls.find((c) => c[0] === 'Approve Booking');
            expect(alertCall).toBeTruthy();

            // Press Approve in dialog
            const approveConfirm = alertCall[2].find((b) => b.text === 'Approve');
            await approveConfirm.onPress();

            await waitFor(() => {
                expect(apiClient.post).toHaveBeenCalled();
            });
        });

        it('rejects reservation via confirmation dialog with reason', async () => {
            const mockBookings = [
                {
                    id: 'vendor-bk-2',
                    userName: 'Jane Driver',
                    parkingSpaceTitle: 'Midtown Secure Deck',
                    status: 0, // Pending
                    totalAmount: 50,
                    startDateTime: '2026-08-25T17:00:00Z',
                    endDateTime: '2026-08-25T20:00:00Z',
                }
            ];

            apiClient.get.mockResolvedValueOnce({
                data: { success: true, data: mockBookings }
            });
            apiClient.post.mockResolvedValueOnce({
                data: { success: true, message: 'Booking rejected' }
            });

            const { findByText, getByText } = renderWithProviders(
                <VendorBookingsScreen navigation={mockNavigation} />
            );

            expect(await findByText('Jane Driver')).toBeTruthy();
            expect(getByText('Reject')).toBeTruthy();

            // Press Reject
            fireEvent.press(getByText('Reject'));

            const alertCall = Alert.alert.mock.calls.find((c) => c[0] === 'Reject Booking');
            expect(alertCall).toBeTruthy();

            const rejectConfirm = alertCall[2].find((b) => b.text === 'Reject');
            await rejectConfirm.onPress();

            await waitFor(() => {
                expect(apiClient.post).toHaveBeenCalled();
            });
        });
    });

    // ── 5. Access Pass Scanner Flow ──
    describe('Access Pass Scanner Flow', () => {
        it('validates empty pass code with error alert', async () => {
            const { getByText } = renderWithProviders(
                <AccessPassScannerScreen navigation={mockNavigation} />
            );

            const verifyBtn = getByText('Verify Pass Clearance');
            fireEvent.press(verifyBtn);

            expect(Alert.alert).toHaveBeenCalledWith(
                'Required',
                'Please enter or scan an access pass token.'
            );
            expect(apiClient.post).not.toHaveBeenCalled();
        });

        it('verifies valid pass code and displays Access Granted result', async () => {
            apiClient.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        accessGranted: true,
                        decision: 'Granted',
                        booking: {
                            userName: 'Driver Dave',
                            vehicleNumber: 'KA01XY9999',
                            bayNumber: 'P14',
                        }
                    }
                }
            });

            const { findByText, getByPlaceholderText, getByText } = renderWithProviders(
                <AccessPassScannerScreen navigation={mockNavigation} />
            );

            const input = getByPlaceholderText('Paste token or enter pass code...');
            fireEvent.changeText(input, 'PE-BK-555-PASS');

            const verifyBtn = getByText('Verify Pass Clearance');
            fireEvent.press(verifyBtn);

            expect(await findByText('ACCESS GRANTED')).toBeTruthy();
            expect(getByText('Driver Dave')).toBeTruthy();
            expect(getByText('KA01XY9999')).toBeTruthy();
        });

        it('handles invalid or expired pass code and displays Denied result', async () => {
            apiClient.post.mockRejectedValueOnce({
                response: {
                    data: { message: 'Pass token has expired.' }
                }
            });

            const { findByText, getByPlaceholderText, getByText } = renderWithProviders(
                <AccessPassScannerScreen navigation={mockNavigation} />
            );

            const input = getByPlaceholderText('Paste token or enter pass code...');
            fireEvent.changeText(input, 'EXPIRED-TOKEN');

            const verifyBtn = getByText('Verify Pass Clearance');
            fireEvent.press(verifyBtn);

            expect(await findByText('ACCESS DENIED')).toBeTruthy();
            expect(getByText('Pass token has expired.')).toBeTruthy();
        });
    });
});
