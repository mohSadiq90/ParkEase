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

    const { getByText, findByText } = renderWithProviders(
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
});
