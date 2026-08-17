import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import VendorBookingsScreen from '../VendorBookingsScreen';
import apiClient from '../../../services/api/apiClient';
import { approveBookingThunk, rejectBookingThunk } from '../../../store/slices/bookingSlice';

jest.mock('../../../services/api/apiClient');

describe('VendorBookingsScreen', () => {
  const mockNavigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and loads vendor bookings', async () => {
    const mockBookings = {
      data: {
        bookings: [
          {
            id: '101',
            userName: 'John Doe',
            parkingSpaceTitle: 'VIP Slot A',
            startDateTime: new Date().toISOString(),
            status: 0,
            totalAmount: 50,
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockBookings });

    const { getByText, findByText } = renderWithProviders(
      <VendorBookingsScreen navigation={mockNavigation} />
    );

    const name = await findByText('John Doe');
    expect(name).toBeTruthy();
    expect(getByText('VIP Slot A')).toBeTruthy();
    expect(getByText('Approve')).toBeTruthy();
    expect(getByText('Reject')).toBeTruthy();
  });

  it('handles approving a booking', async () => {
    const mockBookings = {
      data: {
        bookings: [
          {
            id: '101',
            userName: 'John Doe',
            parkingSpaceTitle: 'VIP Slot A',
            status: 0,
            totalAmount: 50,
            startDateTime: new Date().toISOString(),
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockBookings });

    const { getByText, findByText } = renderWithProviders(
      <VendorBookingsScreen navigation={mockNavigation} />
    );

    const approveBtn = await findByText('Approve');
    fireEvent.press(approveBtn);

    // Should open Alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Approve Booking',
      'Confirm approval?',
      expect.any(Array)
    );

    // Simulate clicking "Approve" on the Alert
    // Alert buttons: [0] Cancel, [1] Approve
    const approveAction = Alert.alert.mock.calls[0][2][1].onPress;
    
    apiClient.post.mockResolvedValueOnce({
      data: { success: true, data: { id: '101', status: 1 } }
    });

    await approveAction();
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
    });
  });

  it('handles rejecting a booking', async () => {
    const mockBookings = {
      data: {
        bookings: [
          {
            id: '102',
            userName: 'Jane Doe',
            parkingSpaceTitle: 'Slot B',
            status: 0,
            totalAmount: 25,
            startDateTime: new Date().toISOString(),
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockBookings });

    const { getByText, findByText } = renderWithProviders(
      <VendorBookingsScreen navigation={mockNavigation} />
    );

    const rejectBtn = await findByText('Reject');
    fireEvent.press(rejectBtn);

    // Simulate clicking "Reject" on the Alert
    const rejectAction = Alert.alert.mock.calls[0][2][1].onPress;

    apiClient.post.mockResolvedValueOnce({
      data: { success: true, data: { id: '102', status: 7 } }
    });

    await rejectAction();

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
    });
  });
});
