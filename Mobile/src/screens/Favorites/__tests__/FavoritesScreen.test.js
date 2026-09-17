import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import FavoritesScreen from '../FavoritesScreen';
import favoriteService from '../../../services/api/favoriteService';

jest.mock('../../../services/api/favoriteService', () => ({
  __esModule: true,
  default: {
    getFavorites: jest.fn().mockResolvedValue({ success: true, data: [] }),
    toggleFavorite: jest.fn().mockResolvedValue({ success: true }),
  },
}));

describe('FavoritesScreen', () => {
  const mockParent = {
    navigate: jest.fn(),
  };

  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    getParent: jest.fn(() => mockParent),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state and navigates to explore parking when clicked', async () => {
    const { getByText } = renderWithProviders(
      <FavoritesScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          favorite: {
            favorites: [],
            isLoading: false,
          },
        },
      }
    );

    await waitFor(() => {
      expect(getByText("You haven't saved any spots yet.")).toBeTruthy();
      expect(getByText('Explore Parking')).toBeTruthy();
    });

    fireEvent.press(getByText('Explore Parking'));
    // Should call getParent().navigate or navigate with SearchTab
    expect(
      mockParent.navigate
    ).toHaveBeenCalledWith('SearchTab', { screen: 'Search' });
  });

  it('renders favorite items and navigates to ParkingDetail with parkingId', async () => {
    const mockFavorites = [
      {
        id: 'spot-123',
        title: 'Central Park Bay',
        address: '100 Central Way',
        pricePerHour: 25,
      },
    ];

    const { getByText } = renderWithProviders(
      <FavoritesScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          favorite: {
            favorites: mockFavorites,
            isLoading: false,
          },
        },
      }
    );

    expect(getByText('Central Park Bay')).toBeTruthy();
    expect(getByText('100 Central Way')).toBeTruthy();
    expect(getByText('$25/hr')).toBeTruthy();

    fireEvent.press(getByText('Central Park Bay'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ParkingDetail', {
      parkingId: 'spot-123',
      id: 'spot-123',
    });
  });
});
