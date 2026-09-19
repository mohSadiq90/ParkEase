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

    // Should render the header with default Partner fallback when unauthenticated
    expect(await findByText('Welcome, Partner')).toBeTruthy();

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

  it('renders Host Operations & Tools feature grid and navigates on tile and metric press', async () => {
    const mockDashboard = {
      data: {
        totalParkingSpaces: 3,
        totalBookings: 12,
        monthlyEarnings: 3400,
        pendingBookings: 2,
        recentBookings: [],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockDashboard });

    const mockNavigation = {
      navigate: jest.fn(),
    };

    const { findByText, getByText, getByLabelText } = renderWithProviders(
      <VendorDashboardScreen navigation={mockNavigation} />
    );

    expect(await findByText('Host Operations & Tools')).toBeTruthy();
    expect(getByText('All Tools →')).toBeTruthy();
    expect(getByText('Add Space')).toBeTruthy();
    expect(getByText('My Listings')).toBeTruthy();
    expect(getByText('Host Bookings')).toBeTruthy();
    expect(getByText('Messages')).toBeTruthy();
    expect(getByText('LPR Cameras')).toBeTruthy();
    expect(getByText('Event Passes')).toBeTruthy();
    expect(getByText('Testing & Simulators')).toBeTruthy();
    expect(getByText('LPR Simulator')).toBeTruthy();
    expect(getByText('EV Simulator')).toBeTruthy();

    const { fireEvent } = require('@testing-library/react-native');

    // Press Find & Explore Parking button
    fireEvent.press(getByLabelText('Find & Explore Parking'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Search', { focusSearch: true });

    // Press Gate Access Scanner primary action button
    fireEvent.press(getByLabelText('Gate Access Scanner'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('AccessPassScanner');

    // Press Share Listing button
    const { Share } = require('react-native');
    const shareSpy = jest.spyOn(Share, 'share').mockImplementation(() => Promise.resolve());
    fireEvent.press(getByLabelText('Share Listing'));
    expect(shareSpy).toHaveBeenCalled();
    shareSpy.mockRestore();

    // Verify redundant duplicate tiles (Explore Spots, duplicate Gate Scanner) are not in the grid
    const { queryByText } = renderWithProviders(
      <VendorDashboardScreen navigation={mockNavigation} />
    );
    expect(queryByText('Explore Spots')).toBeNull();

    // Press Add Space tile
    fireEvent.press(getByLabelText('Add Space'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {});

    // Press Active Spaces metric card
    fireEvent.press(getByLabelText('Active Spaces'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyListings', { filter: 'active', initialFilter: 'active' });

    // Press Today's Bookings metric card
    fireEvent.press(getByLabelText("Today's Bookings"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('IncomingBookings', { initialTab: 'today', filter: 'today' });
  });

  it('Find & Explore Parking big button navigates to parent SearchTab when present in parent navigator', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { totalParkingSpaces: 1, recentBookings: [] } } });

    const mockParent = {
      navigate: jest.fn(),
      getState: jest.fn(() => ({ routeNames: ['HomeTab', 'SearchTab', 'BookingsTab', 'MenuTab'] })),
    };
    const mockNavigationWithParent = {
      navigate: jest.fn(),
      getParent: jest.fn(() => mockParent),
    };

    const { findByLabelText } = renderWithProviders(
      <VendorDashboardScreen navigation={mockNavigationWithParent} />
    );

    const findParkingBtn = await findByLabelText('Find & Explore Parking');
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(findParkingBtn);

    expect(mockParent.navigate).toHaveBeenCalledWith('SearchTab', {
      screen: 'Search',
      params: { focusSearch: true },
    });
  });

  it('renders dynamic personalized host greetings when user profile is present', async () => {
    apiClient.get.mockResolvedValue({ data: { data: { totalParkingSpaces: 0, recentBookings: [] } } });

    // With firstName
    const { findByText: findByTextFirst } = renderWithProviders(
      <VendorDashboardScreen navigation={{}} />,
      { preloadedState: { auth: { user: { firstName: 'Alex' } } } }
    );
    expect(await findByTextFirst('Welcome, Alex')).toBeTruthy();

    // With fullName
    const { findByText: findByTextFull } = renderWithProviders(
      <VendorDashboardScreen navigation={{}} />,
      { preloadedState: { auth: { user: { fullName: 'Jane Foster' } } } }
    );
    expect(await findByTextFull('Welcome, Jane')).toBeTruthy();

    // With email
    const { findByText: findByTextEmail } = renderWithProviders(
      <VendorDashboardScreen navigation={{}} />,
      { preloadedState: { auth: { user: { email: 'hostuser@example.com' } } } }
    );
    expect(await findByTextEmail('Welcome, Hostuser')).toBeTruthy();
  });

  it('renders occupancy indicator and pending actions nudge when data is available', async () => {
    const mockDashboard = {
      data: {
        totalParkingSpaces: 5,
        activeParkingSpaces: 5,
        totalBookings: 10,
        pendingBookings: 3,
        recentBookings: [
          {
            id: 'b-awaiting-1',
            userName: 'Renter',
            vehiclePlateNumber: 'DL 01 AB 9999',
            startDateTime: new Date().toISOString(),
            status: 6, // Awaiting payment
            totalAmount: 12.3,
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockDashboard });

    const mockNavigation = { navigate: jest.fn(), getParent: jest.fn() };
    const { findByText, getByText, getByLabelText } = renderWithProviders(
      <VendorDashboardScreen navigation={mockNavigation} />
    );

    // Occupancy indicator
    expect(await findByText(/0\/5 spots/)).toBeTruthy();
    expect(getByText(/occupied right now/)).toBeTruthy();

    // Pending actions nudge
    expect(getByText(/3 actions require/)).toBeTruthy();

    // Host badge label
    expect(getByText('Awaiting driver payment')).toBeTruthy();

    // See All link
    expect(getByText('See All →')).toBeTruthy();
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByLabelText('See All Recent Bookings'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('IncomingBookings', { initialTab: 'all' });
  });

  it('renders starter tip card when host has 0 spaces', async () => {
    const mockDashboard = {
      data: {
        totalParkingSpaces: 0,
        activeParkingSpaces: 0,
        totalBookings: 0,
        recentBookings: [],
      },
    };

    apiClient.get.mockResolvedValueOnce({ data: mockDashboard });

    const mockNavigation = { navigate: jest.fn() };
    const { findByText, getByLabelText } = renderWithProviders(
      <VendorDashboardScreen navigation={mockNavigation} />
    );

    expect(await findByText('Get Started as a Host')).toBeTruthy();
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent.press(getByLabelText('Add Space Starter Tip'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {});
  });
});

