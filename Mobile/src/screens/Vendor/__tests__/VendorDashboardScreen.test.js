import React from 'react';
import { renderWithProviders, waitFor } from '../../../utils/test-utils';
import VendorDashboardScreen from '../VendorDashboardScreen';
import apiClient from '../../../services/api/apiClient';

// Mock the API client
jest.mock('../../../services/api/apiClient');

describe('VendorDashboardScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and loads dashboard stats', async () => {
    const mockDashboard = {
      data: {
        totalParkingSpaces: 5,
        totalBookings: 120,
        totalEarnings: 5000,
        monthlyEarnings: 1200,
        recentBookings: [
          {
            id: '1',
            userName: 'John Doe',
            parkingSpaceTitle: 'VIP Slot A',
            startDateTime: new Date().toISOString(),
            status: 'CONFIRMED',
            totalAmount: 50,
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockDashboard });

    const { getByText, findByText } = renderWithProviders(
      <VendorDashboardScreen navigation={{}} />
    );

    // Should render the stats
    expect(await findByText('5')).toBeTruthy(); // Spaces
    expect(getByText('120')).toBeTruthy(); // Bookings
    expect(getByText('₹5,000')).toBeTruthy(); // Earnings

    // Should render recent bookings
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('VIP Slot A')).toBeTruthy();
    expect(getByText('₹50')).toBeTruthy();
  });

  it('displays empty state when no recent bookings exist', async () => {
    const mockDashboard = {
      data: {
        totalParkingSpaces: 0,
        totalBookings: 0,
        totalEarnings: 0,
        monthlyEarnings: 0,
        recentBookings: [],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockDashboard });

    const { findByText } = renderWithProviders(
      <VendorDashboardScreen navigation={{}} />
    );

    const emptyText = await findByText('Your booking activity will appear here');
    expect(emptyText).toBeTruthy();
  });

  it('handles error state or failure gracefully without crashing', async () => {
    apiClient.get.mockRejectedValueOnce({
      response: { data: { message: 'Failed to load' } },
    });

    const { findByText } = renderWithProviders(
      <VendorDashboardScreen navigation={{}} />
    );

    // It should render empty values or empty state
    const emptyText = await findByText('Your booking activity will appear here');
    expect(emptyText).toBeTruthy();
  });
});
