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

    // Should render the header
    expect(await findByText('Welcome, Sadiq')).toBeTruthy();

    // Should render the 4 metrics grid
    expect(getByText('5')).toBeTruthy(); // Active Spaces
    expect(getByText('Active Spaces')).toBeTruthy();
    expect(getByText('120')).toBeTruthy(); // Today's Bookings
    expect(getByText("Today's Bookings")).toBeTruthy();
    expect(getByText('₹1,200')).toBeTruthy(); // Monthly Revenue
    expect(getByText('Monthly Revenue')).toBeTruthy();
    expect(getByText('Pending Approvals')).toBeTruthy();

    // Should render Gate Access Scanner action button
    expect(getByText('Gate Access Scanner')).toBeTruthy();

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

  it('renders pending bookings with approve and reject inline action buttons and vehicle plate', async () => {
    const mockDashboard = {
      data: {
        totalParkingSpaces: 2,
        totalBookings: 1,
        totalEarnings: 100,
        monthlyEarnings: 100,
        recentBookings: [
          {
            id: 'b-pending-1',
            userName: 'Test',
            vehiclePlateNumber: 'MH 12 AB 1234',
            parkingSpaceTitle: 'Covered Bay 4',
            startDateTime: new Date().toISOString(),
            status: 0, // Pending
            totalAmount: 75,
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockDashboard });

    const { findByText, getByLabelText } = renderWithProviders(
      <VendorDashboardScreen navigation={{}} />
    );

    expect(await findByText('MH 12 AB 1234')).toBeTruthy();
    expect(getByLabelText('Approve Booking')).toBeTruthy();
    expect(getByLabelText('Reject Booking')).toBeTruthy();
  });
});
