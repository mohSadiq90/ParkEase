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
            user: { firstName: 'Sadiq' },
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
      expect(getByText('Hello, Sadiq 👋')).toBeTruthy();
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
});
