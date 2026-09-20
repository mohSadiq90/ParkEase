import React from 'react';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import MyBookingsScreen from '../MyBookingsScreen';
import apiClient from '../../../services/api/apiClient';

// Mock the API client
jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  navigate: jest.fn(),
};

describe('MyBookingsScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and loads bookings', async () => {
    const mockBookings = {
      data: {
        bookings: [
          {
            id: '1',
            parkingSpaceTitle: 'Downtown Spot',
            status: 'CONFIRMED',
            totalAmount: 15,
            bookingReference: 'REF123',
            startDateTime: new Date().toISOString(),
            endDateTime: new Date().toISOString(),
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockBookings });

    const { getByText, findByText, getByTestId } = renderWithProviders(
      <MyBookingsScreen navigation={mockNavigation} />
    );

    const title = await findByText('Downtown Spot');
    expect(title).toBeTruthy();
    expect(getByText('Ref: REF123')).toBeTruthy();
    expect(getByText('₹15')).toBeTruthy(); // Using ₹ because of en-IN default
  });

  it('navigates to details on press', async () => {
    const mockBookings = {
      data: {
        bookings: [
          {
            id: '500',
            parkingSpaceTitle: 'VIP Parking',
            status: 'COMPLETED',
            totalAmount: 50,
            bookingReference: 'REF999',
            startDateTime: new Date().toISOString(),
            endDateTime: new Date().toISOString(),
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockBookings });

    const { findByText } = renderWithProviders(
      <MyBookingsScreen navigation={mockNavigation} />
    );

    const card = await findByText('VIP Parking');
    fireEvent.press(card);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('BookingDetail', { bookingId: '500' });
  });

  it('displays empty state when no bookings exist', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { data: { bookings: [] } } });

    const { findByText } = renderWithProviders(
      <MyBookingsScreen navigation={mockNavigation} />
    );

    const emptyText = await findByText("You don't have any bookings yet");
    expect(emptyText).toBeTruthy();
  });

  it('renders all filter tabs including Pending and Cancelled', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { data: { bookings: [] } } });

    const { getByText, findByText, getByTestId } = renderWithProviders(
      <MyBookingsScreen navigation={mockNavigation} />
    );

    expect(await findByText('My Bookings')).toBeTruthy();
    expect(getByTestId('filter-tab-all')).toBeTruthy();
    expect(getByTestId('filter-tab-pending')).toBeTruthy();
    expect(getByTestId('filter-tab-active')).toBeTruthy();
    expect(getByTestId('filter-tab-completed')).toBeTruthy();
    expect(getByTestId('filter-tab-cancelled / rejected')).toBeTruthy();
  });

  it('filters bookings by Pending and displays 2 decimal currency formatting', async () => {
    const identicalTime = '2026-09-17T16:44:00.000Z';
    const mockBookings = {
      data: {
        bookings: [
          {
            id: '1',
            parkingSpaceTitle: 'Pending Slot',
            status: 0,
            totalAmount: 12.3,
            bookingReference: 'REF-P1',
            startDateTime: identicalTime,
            endDateTime: identicalTime,
          },
          {
            id: '2',
            parkingSpaceTitle: 'Active Slot',
            status: 1,
            totalAmount: 20,
            bookingReference: 'REF-A1',
            startDateTime: identicalTime,
            endDateTime: '2026-09-17T18:00:00.000Z',
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockBookings });

    const { getByText, findByText, queryByText, getByTestId } = renderWithProviders(
      <MyBookingsScreen navigation={mockNavigation} />
    );

    expect(await findByText('Pending Slot')).toBeTruthy();
    expect(getByText('₹12.30')).toBeTruthy();

    // Tap Pending tab
    fireEvent.press(getByTestId('filter-tab-pending'));

    expect(getByText('Pending Slot')).toBeTruthy();
    expect(queryByText('Active Slot')).toBeNull();
  });
});
