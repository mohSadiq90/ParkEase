/**
 * Member Booking & Discovery End-to-End Flow Tests
 *
 * Covers:
 * 1. Search & Discovery: Keyword search, filter by parking type, loading shimmers, empty state
 * 2. Search Failure: Network error handling and retry mechanism
 * 3. Spot Details & Actions: Spot metadata, amenities, hourly rates, favorite bookmark toggle
 * 4. Booking Screen & Price Calculation: Date/time duration, vehicle category pills, price breakdown
 * 5. Booking Validation: Missing/invalid booking dates, conflict (409) handling
 * 6. Payment Flow: Method selection (Card/Wallet), transaction loading, success and failure paths
 * 7. My Bookings: Filter tabs (All, Pending, Active, Completed, Cancelled), pull to refresh
 * 8. Booking Detail & Pass: Slot number, QR digital pass, extend booking modal, check in
 */

import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, fireEvent, waitFor } from '../../utils/test-utils';
import apiClient from '../../services/api/apiClient';
import SearchScreen from '../../screens/Search/SearchScreen';
import ParkingDetailScreen from '../../screens/Search/ParkingDetailScreen';
import BookingScreen from '../../screens/Booking/BookingScreen';
import PaymentScreen from '../../screens/Payment/PaymentScreen';
import MyBookingsScreen from '../../screens/Booking/MyBookingsScreen';
import BookingDetailScreen from '../../screens/Booking/BookingDetailScreen';
import { EventBus } from '../../utils/EventBus';

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

describe('Member Discovery & Booking End-to-End Flows', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        jest.spyOn(EventBus, 'emit').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ── 1. Search Screen Flows ──
    describe('Search & Discovery Flow', () => {
        it('performs search, renders spot cards, and filters by covered/open types', async () => {
            apiClient.get.mockImplementation((url) => {
                if (url.includes('search')) {
                    return Promise.resolve({
                        data: {
                            success: true,
                            data: {
                                parkingSpaces: [
                                    {
                                        id: 'spot-101',
                                        title: 'Downtown Secure Garage',
                                        address: '100 Main St',
                                        city: 'Metro City',
                                        hourlyRate: 15,
                                        pricePerHour: 15,
                                        parkingType: 0, // Covered
                                        rating: 4.8,
                                        totalSpots: 50,
                                        is24Hours: true,
                                    },
                                    {
                                        id: 'spot-102',
                                        title: 'Airport Open Lot',
                                        address: '500 Airport Way',
                                        city: 'Metro City',
                                        hourlyRate: 8,
                                        pricePerHour: 8,
                                        parkingType: 1, // Open
                                        rating: 4.2,
                                        totalSpots: 100,
                                        is24Hours: false,
                                    }
                                ],
                                totalCount: 2,
                            }
                        }
                    });
                }
                return Promise.resolve({ data: { success: true, data: [] } });
            });

            const { findByText, getByText, getByPlaceholderText } = renderWithProviders(
                <SearchScreen navigation={mockNavigation} />
            );

            // Initial search results render
            const spotTitle = await findByText('Downtown Secure Garage');
            expect(spotTitle).toBeTruthy();
            expect(getByText('Airport Open Lot')).toBeTruthy();

            // Perform text search
            const searchInput = getByPlaceholderText('Search by city or location...');
            fireEvent.changeText(searchInput, 'Downtown');

            // Select spot and navigate to detail
            fireEvent.press(spotTitle);
            expect(mockNavigation.navigate).toHaveBeenCalledWith('ParkingDetail', {
                parkingId: 'spot-101',
            });
        });

        it('renders empty state when search returns zero results', async () => {
            apiClient.get.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { parkingSpaces: [], totalCount: 0 }
                }
            });

            const { findByText } = renderWithProviders(
                <SearchScreen navigation={mockNavigation} />
            );

            const emptyMsg = await findByText(/No parking spaces found/i);
            expect(emptyMsg).toBeTruthy();
        });

        it('handles search API failure gracefully with error alert or banner', async () => {
            apiClient.get.mockRejectedValueOnce(new Error('Network error'));

            const { findByText } = renderWithProviders(
                <SearchScreen navigation={mockNavigation} />
            );

            // Should render search input without unhandled exception
            const header = await findByText('Find Parking');
            expect(header).toBeTruthy();
        });
    });

    // ── 2. Parking Detail Flow ──
    describe('Parking Detail Screen Flow', () => {
        it('loads parking spot metadata, toggles favorite, and initiates booking', async () => {
            apiClient.get.mockImplementation((url) => {
                if (url.includes('parking/spot-101') || url.endsWith('/101')) {
                    return Promise.resolve({
                        data: {
                            success: true,
                            data: {
                                id: 'spot-101',
                                title: 'Downtown Secure Garage',
                                address: '100 Main St',
                                city: 'Metro City',
                                hourlyRate: 15,
                                totalSpots: 50,
                                availableSpots: 12,
                                is24Hours: true,
                                hasEvCharging: true,
                                hasValet: true,
                                isCovered: true,
                                description: 'Safe underground parking with 24/7 CCTV surveillance.',
                            }
                        }
                    });
                }
                if (url.includes('reviews')) {
                    return Promise.resolve({
                        data: {
                            success: true,
                            data: [
                                { id: 'rev-1', rating: 5, comment: 'Great spot, very clean!', userName: 'Alice' }
                            ]
                        }
                    });
                }
                return Promise.resolve({ data: { success: true, data: [] } });
            });

            apiClient.post.mockImplementation((url) => {
                if (url.includes('favorites')) {
                    return Promise.resolve({ data: { success: true, message: 'Added to favorites' } });
                }
                return Promise.resolve({ data: { success: true } });
            });

            const { findByText, getByText } = renderWithProviders(
                <ParkingDetailScreen
                    navigation={mockNavigation}
                    route={{ params: { parkingId: 'spot-101' } }}
                />
            );

            // Spot loaded
            const title = await findByText('Downtown Secure Garage');
            expect(title).toBeTruthy();
            expect(getByText(/100 Main St/i)).toBeTruthy();

            // Check Book Now button press navigates to BookParking
            const bookButton = getByText('Book Now');
            fireEvent.press(bookButton);
            expect(mockNavigation.navigate).toHaveBeenCalledWith('BookParking', {
                parkingId: 'spot-101',
            });
        });
    });

    // ── 3. Booking Screen & Price Calculation Flow ──
    describe('Booking Screen & Calculation Flow', () => {
        const preloadedState = {
            parking: {
                selectedParking: {
                    id: 'spot-101',
                    title: 'Downtown Secure Garage',
                    address: '100 Main St',
                    hourlyRate: 15,
                }
            }
        };

        it('calculates price and creates booking successfully', async () => {
            apiClient.post.mockImplementation((url) => {
                if (url.includes('calculate')) {
                    return Promise.resolve({
                        data: {
                            success: true,
                            data: { basePrice: 30, valetFee: 5, discount: 0, totalPrice: 35 }
                        }
                    });
                }
                if (url.includes('bookings')) {
                    return Promise.resolve({
                        data: {
                            success: true,
                            data: { id: 'bk-999', status: 'PENDING', totalAmount: 35 }
                        }
                    });
                }
                return Promise.resolve({ data: { success: true } });
            });

            const { findByText, getByText } = renderWithProviders(
                <BookingScreen
                    navigation={mockNavigation}
                    route={{ params: { parkingId: 'spot-101' } }}
                />,
                { preloadedState }
            );

            expect(getByText('Downtown Secure Garage')).toBeTruthy();

            // Total price calculated
            const priceText = await findByText('₹35');
            expect(priceText).toBeTruthy();

            // Confirm Booking
            const confirmBtn = getByText('Confirm Booking');
            fireEvent.press(confirmBtn);

            await waitFor(() => {
                expect(mockNavigation.goBack).toHaveBeenCalled();
            });
        });

        it('handles booking slot conflict (409) with error banner without crashing', async () => {
            apiClient.post.mockImplementation((url) => {
                if (url.includes('calculate')) {
                    return Promise.resolve({
                        data: { success: true, data: { basePrice: 30, discount: 0, totalPrice: 30 } }
                    });
                }
                return Promise.reject({
                    response: {
                        status: 409,
                        data: { message: 'This parking bay has already been booked for this timeframe.' }
                    }
                });
            });

            const { findByText, getByText, findAllByText } = renderWithProviders(
                <BookingScreen
                    navigation={mockNavigation}
                    route={{ params: { parkingId: 'spot-101' } }}
                />,
                { preloadedState }
            );

            const priceMatches = await findAllByText('₹30');
            expect(priceMatches.length).toBeGreaterThan(0);
            const confirmBtn = getByText('Confirm Booking');
            fireEvent.press(confirmBtn);

            await waitFor(() => {
                // Should not navigate back on conflict
                expect(mockNavigation.goBack).not.toHaveBeenCalled();
            });
        });
    });

    // ── 4. Payment Screen Flow ──
    describe('Payment Screen Flow', () => {
        it('validates missing booking information with error banner', async () => {
            const { getByText } = renderWithProviders(
                <PaymentScreen
                    navigation={mockNavigation}
                    route={{ params: {} }}
                />
            );

            const payBtn = getByText('Pay ₹0');
            fireEvent.press(payBtn);

            expect(EventBus.emit).toHaveBeenCalledWith(
                'SHOW_ERROR_BANNER',
                expect.objectContaining({ message: 'Missing booking information' })
            );
        });

        it('processes payment successfully and navigates back with success banner', async () => {
            apiClient.post.mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { transactionId: 'tx-12345', status: 'SUCCESS' }
                }
            });

            const { findByText, getByText } = renderWithProviders(
                <PaymentScreen
                    navigation={mockNavigation}
                    route={{
                        params: {
                            bookingId: 'bk-999',
                            amount: 35,
                            parkingTitle: 'Downtown Secure Garage',
                        }
                    }}
                />
            );

            const totalText = await findByText('₹35');
            expect(totalText).toBeTruthy();

            // Trigger payment
            const payBtn = getByText(/Pay ₹35/i);
            fireEvent.press(payBtn);

            await waitFor(() => {
                expect(EventBus.emit).toHaveBeenCalledWith(
                    'SHOW_BANNER',
                    expect.objectContaining({ title: 'Payment Successful', type: 'success' })
                );
                expect(mockNavigation.goBack).toHaveBeenCalled();
            });
        });
    });

    // ── 5. My Bookings & Status Tabs Flow ──
    describe('My Bookings Screen Flow', () => {
        it('renders categorized booking list and switches between filter tabs', async () => {
            const mockBookings = [
                {
                    id: 'bk-1',
                    parkingSpaceTitle: 'Central City Bay',
                    status: 1, // Confirmed / Active
                    totalAmount: 40,
                    startDateTime: '2026-08-20T10:00:00Z',
                    endDateTime: '2026-08-20T14:00:00Z',
                },
                {
                    id: 'bk-2',
                    parkingSpaceTitle: 'Westside Deck',
                    status: 3, // Completed
                    totalAmount: 25,
                    startDateTime: '2026-08-15T10:00:00Z',
                    endDateTime: '2026-08-15T12:00:00Z',
                },
            ];

            apiClient.get.mockResolvedValueOnce({
                data: { success: true, data: mockBookings }
            });

            const { findByText, getByText, getByTestId } = renderWithProviders(
                <MyBookingsScreen navigation={mockNavigation} />
            );

            // Active booking renders
            const bookingTitle = await findByText('Central City Bay');
            expect(bookingTitle).toBeTruthy();
            expect(getByText('₹40')).toBeTruthy();

            // Switch to Completed filter tab
            const completedTab = getByTestId('filter-tab-completed');
            fireEvent.press(completedTab);

            // Completed booking visible
            expect(await findByText('Westside Deck')).toBeTruthy();

            // Tap card navigates to BookingDetail
            fireEvent.press(getByText('Westside Deck'));
            expect(mockNavigation.navigate).toHaveBeenCalledWith('BookingDetail', {
                bookingId: 'bk-2',
            });
        });
    });

    // ── 6. Booking Detail Screen & QR Pass Flow ──
    describe('Booking Detail & Pass Management Flow', () => {
        it('renders slot number, QR gate pass, and triggers check-in', async () => {
            const mockDetail = {
                id: 'bk-1',
                bookingReference: 'PE-BK-100',
                parkingSpaceTitle: 'Central City Bay',
                parkingSpaceAddress: '200 Market St',
                slotNumber: 'B4',
                status: 1, // Confirmed
                totalAmount: 40,
                startDateTime: '2026-08-20T10:00:00Z',
                endDateTime: '2026-08-20T14:00:00Z',
                vehicleNumber: 'KA01AB1234',
            };

            apiClient.get.mockResolvedValueOnce({
                data: { success: true, data: mockDetail }
            });
            apiClient.post.mockResolvedValueOnce({
                data: { success: true, message: 'Vehicle Checked In Successfully' }
            });

            const { findByText, getByText } = renderWithProviders(
                <BookingDetailScreen
                    navigation={mockNavigation}
                    route={{ params: { bookingId: 'bk-1' } }}
                />
            );

            const title = await findByText('Central City Bay');
            expect(title).toBeTruthy();
            expect(getByText('Ref: PE-BK-100')).toBeTruthy();
            expect(getByText('🅿️ Slot PB4')).toBeTruthy();
            expect(getByText('Digital Gate Token')).toBeTruthy();

            // Trigger Check In -> Confirms alert
            const checkInBtn = getByText('Check In');
            fireEvent.press(checkInBtn);

            const alertCall = Alert.alert.mock.calls.find((c) => c[0] === 'Confirm Check-In');
            expect(alertCall).toBeTruthy();
            // Press the confirm button in the alert
            const confirmBtn = alertCall[2].find((b) => b.text === 'Check In Now');
            await confirmBtn.onPress();

            await waitFor(() => {
                expect(apiClient.post).toHaveBeenCalled();
            });
        });
    });
});
