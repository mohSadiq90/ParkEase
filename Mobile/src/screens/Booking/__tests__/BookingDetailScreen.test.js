import React from 'react';
import { renderWithProviders } from '../../../utils/test-utils';
import BookingDetailScreen from '../BookingDetailScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('BookingDetailScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders booking details, slot number, and digital gate token', async () => {
    const mockBooking = {
      data: {
        data: {
          id: 'booking-12345678-uuid',
          bookingReference: 'PE-BK-999',
          parkingSpaceTitle: 'Grand Tower Garage',
          parkingSpaceAddress: '456 Main St, Metropolis',
          slotNumber: '12',
          status: 1, // Confirmed
          totalAmount: 120,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
          vehicleNumber: 'MH01CD5678',
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockBooking);

    const { findByText, getByText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-12345678-uuid' } }}
      />
    );

    const title = await findByText('Grand Tower Garage');
    expect(title).toBeTruthy();
    expect(getByText('Ref: PE-BK-999')).toBeTruthy();
    expect(getByText('🅿️ Slot P12')).toBeTruthy();
    expect(getByText('Digital Gate Token')).toBeTruthy();
    expect(getByText('✓ Verified Paid & Active')).toBeTruthy();
    expect(getByText('₹120')).toBeTruthy();
  });

  it('renders refund notice for cancelled booking', async () => {
    const mockCancelledBooking = {
      data: {
        data: {
          id: 'booking-cancelled-uuid',
          bookingReference: 'PE-BK-CANCELLED',
          parkingSpaceTitle: 'Airport Long Term Bay',
          status: 4, // Cancelled
          totalAmount: 200,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockCancelledBooking);

    const { findByText, getByText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-cancelled-uuid' } }}
      />
    );

    const refundText = await findByText(/Refund Status: Automatic refund initiated/i);
    expect(refundText).toBeTruthy();
  });
});
