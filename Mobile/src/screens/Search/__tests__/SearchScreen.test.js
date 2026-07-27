import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import SearchScreen from '../SearchScreen';
import * as parkingSlice from '../../../store/slices/parkingSlice';

jest.mock('../../../store/slices/parkingSlice', () => {
  const actual = jest.requireActual('../../../store/slices/parkingSlice');
  return {
    __esModule: true,
    ...actual,
    searchParkingThunk: Object.assign(jest.fn(() => ({ type: 'mock/searchParkingThunk' })), actual.searchParkingThunk),
    default: actual.default,
  };
});

describe('SearchScreen UI Tests', () => {
  it('renders search bar and default state', () => {
    const { getByPlaceholderText, getByText } = renderWithProviders(<SearchScreen navigation={{}} />);
    
    expect(getByPlaceholderText('Search by city or location...')).toBeTruthy();
    expect(getByText('Find Parking')).toBeTruthy();
  });

  it('renders search results from store', () => {
    const preloadedState = {
      parking: {
        searchResults: [
          {
            id: '1',
            title: 'Downtown Garage',
            address: '123 Main St',
            city: 'Downtown',
            hourlyRate: 5,
            availableSpots: 10,
          },
        ],
        searchLoading: false,
        searchTotalCount: 1,
      },
    };

    const { getByPlaceholderText, getByText } = renderWithProviders(
      <SearchScreen navigation={{}} />,
      { preloadedState }
    );
    expect(getByText('Downtown Garage')).toBeTruthy();
    expect(getByText('₹5/hr')).toBeTruthy();
  });
});
