import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import MemberDashboardScreen from '../MemberDashboardScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

describe('MemberDashboardScreen', () => {
  const mockParent = {
    navigate: jest.fn(),
  };

  const mockNavigation = {
    navigate: jest.fn(),
    getParent: jest.fn(() => mockParent),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dynamic greeting and prominent Find Parking CTA button', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          totalBookings: 10,
          activeBookings: 2,
          totalSpent: 450,
          upcomingBookings: [],
          recentBookings: [],
        },
      },
    });

    const { getByText, getAllByText, getByLabelText } = renderWithProviders(
      <MemberDashboardScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          auth: {
            user: { firstName: 'Alex' },
          },
          dashboard: {
            memberDashboard: {
              totalBookings: 10,
              activeBookings: 2,
              totalSpent: 450,
              upcomingBookings: [],
              recentBookings: [],
            },
            loading: false,
            error: null,
          },
        },
      }
    );

    // Dynamic greeting
    await waitFor(() => {
      expect(getByText('Hello, Alex 👋')).toBeTruthy();
      expect(getByText('Find your perfect parking spot')).toBeTruthy();
    });

    // Prominent Find Parking option on home page
    const findParkingButtons = getAllByText('Find Parking');
    expect(findParkingButtons.length).toBeGreaterThan(0);
    expect(getByText('Find & book parking spaces...')).toBeTruthy();

    // Press Find Parking CTA
    fireEvent.press(getByLabelText('Find parking spaces'));
    expect(mockNavigation.getParent().navigate).toHaveBeenCalledWith('SearchTab', { screen: 'Search' });
  });

  it('renders Find Parking action in empty state when user has no bookings', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          totalBookings: 0,
          activeBookings: 0,
          totalSpent: 0,
          upcomingBookings: [],
          recentBookings: [],
        },
      },
    });

    const { getByText, getAllByText } = renderWithProviders(
      <MemberDashboardScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          dashboard: {
            memberDashboard: {
              totalBookings: 0,
              activeBookings: 0,
              totalSpent: 0,
              upcomingBookings: [],
              recentBookings: [],
            },
            loading: false,
            error: null,
          },
        },
      }
    );

    await waitFor(() => {
      expect(getByText('No bookings yet')).toBeTruthy();
      expect(getAllByText('Find Parking').length).toBeGreaterThan(0);
    });
  });

  it('renders Features & Quick Access section and navigates on tile and stats card press', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        data: {
          totalBookings: 8,
          activeBookings: 1,
          totalSpent: 320,
          upcomingBookings: [],
          recentBookings: [],
        },
      },
    });

    const { getByText, getByLabelText } = renderWithProviders(
      <MemberDashboardScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          dashboard: {
            memberDashboard: {
              totalBookings: 8,
              activeBookings: 1,
              totalSpent: 320,
              upcomingBookings: [],
              recentBookings: [],
            },
            loading: false,
            error: null,
          },
        },
      }
    );

    await waitFor(() => {
      expect(getByText('Features & Quick Access')).toBeTruthy();
      expect(getByText('My Garage')).toBeTruthy();
      expect(getByText('Digital Passes')).toBeTruthy();
      expect(getByText('Event Passes')).toBeTruthy();
      expect(getByText('Gate Pass QR')).toBeTruthy();
      expect(getByText('EV Charging')).toBeTruthy();
      expect(getByText('LPR Simulator')).toBeTruthy();
    });

    // Press My Garage tile
    fireEvent.press(getByLabelText('My Garage'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Vehicles', { returnScreen: 'MemberDashboard' });

    // Press Total stat card
    fireEvent.press(getByLabelText('Total: 8'));
    expect(mockParent.navigate).toHaveBeenCalledWith('BookingsTab', {
      screen: 'MyBookings',
      params: { initialTab: 'all' },
    });
  });

  it('renders default greeting when user is unauthenticated or has no firstName', async () => {
    const { getByText: getByTextFallback } = renderWithProviders(
      <MemberDashboardScreen navigation={{}} />,
      {
        preloadedState: {
          auth: { user: null },
          dashboard: { memberDashboard: { totalBookings: 0 }, loading: false },
        },
      }
    );
    await waitFor(() => {
      expect(getByTextFallback('Hello, there 👋')).toBeTruthy();
    });

    const { getByText: getByTextFullName } = renderWithProviders(
      <MemberDashboardScreen navigation={{}} />,
      {
        preloadedState: {
          auth: { user: { fullName: 'Jordan Miller' } },
          dashboard: { memberDashboard: { totalBookings: 0 }, loading: false },
        },
      }
    );
    await waitFor(() => {
      expect(getByTextFullName('Hello, Jordan 👋')).toBeTruthy();
    });
  });
});


