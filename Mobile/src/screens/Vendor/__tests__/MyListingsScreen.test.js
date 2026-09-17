import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import MyListingsScreen from '../MyListingsScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

describe('MyListingsScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const sampleListings = [
    {
      id: 'space-1',
      title: 'Downtown Secure Garage',
      address: '100 Main St',
      city: 'San Francisco',
      hourlyRate: 15,
      totalSpots: 20,
      availableSpots: 12,
      parkingType: 1,
      isActive: true,
      averageRating: 4.8,
      totalReviews: 35,
      hasEvCharging: true,
      isLprEnabled: true,
      instantBook: true,
    },
    {
      id: 'space-2',
      title: 'Airport Open Lot',
      address: '500 Skyway Blvd',
      city: 'Burlingame',
      hourlyRate: 8,
      totalSpots: 50,
      availableSpots: 40,
      parkingType: 0,
      isActive: false,
      averageRating: 4.2,
      totalReviews: 12,
      hasEvCharging: false,
      isLprEnabled: false,
      instantBook: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient.get.mockResolvedValue({
      data: { success: true, data: sampleListings },
    });
  });

  it('renders listings, counts, and search bar when listings exist', async () => {
    const { getByText, getByTestId, getByPlaceholderText } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    expect(getByText('My Listings')).toBeTruthy();
    expect(getByText('2 parking spaces listed')).toBeTruthy();
    expect(getByPlaceholderText('Search your listings...')).toBeTruthy();
    expect(getByText('Downtown Secure Garage')).toBeTruthy();
    expect(getByText('Airport Open Lot')).toBeTruthy();
    expect(getByText('All (2)')).toBeTruthy();
    expect(getByText('Active (1)')).toBeTruthy();
    expect(getByText('Inactive (1)')).toBeTruthy();
  });

  it('navigates to CreateParking with editData when tapping Edit Listing button', () => {
    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const editBtn = getByTestId('edit-listing-btn-space-1');
    fireEvent.press(editBtn);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {
      editData: sampleListings[0],
    });
  });

  it('navigates to CreateParking with editData when tapping quick edit icon in card header', () => {
    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const quickEditBtn = getByTestId('quick-edit-space-1');
    fireEvent.press(quickEditBtn);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {
      editData: sampleListings[0],
    });
  });

  it('navigates to CreateParking with editData when tapping listing card body', () => {
    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const card = getByTestId('listing-card-space-1');
    fireEvent.press(card);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {
      editData: sampleListings[0],
    });
  });

  it('navigates to ParkingDetail when tapping View Details button', () => {
    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const viewBtn = getByTestId('view-listing-btn-space-1');
    fireEvent.press(viewBtn);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ParkingDetail', {
      parkingId: 'space-1',
      isOwnListing: true,
    });
  });

  it('filters active listings when tapping Active tab', () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    fireEvent.press(getByTestId('filter-tab-active'));

    expect(getByText('Downtown Secure Garage')).toBeTruthy();
    expect(queryByText('Airport Open Lot')).toBeNull();
  });

  it('filters inactive listings when tapping Inactive tab', () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    fireEvent.press(getByTestId('filter-tab-inactive'));

    expect(getByText('Airport Open Lot')).toBeTruthy();
    expect(queryByText('Downtown Secure Garage')).toBeNull();
  });

  it('filters listings by search query', () => {
    const { getByTestId, getByText, queryByText } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const searchInput = getByTestId('search-listings-input');
    fireEvent.changeText(searchInput, 'Airport');

    expect(getByText('Airport Open Lot')).toBeTruthy();
    expect(queryByText('Downtown Secure Garage')).toBeNull();
  });

  it('navigates to CreateParking when clicking Add Space button in header', () => {
    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const addBtn = getByTestId('add-listing-button');
    fireEvent.press(addBtn);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking');
  });

  it('toggles listing active status via switch', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { success: true, data: { ...sampleListings[0], isActive: false } },
    });

    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const toggle = getByTestId('toggle-switch-space-1');
    fireEvent(toggle, 'valueChange', false);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('space-1/toggle-active')
      );
    });
  });

  it('renders empty state when there are no listings and allows adding a space', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: { success: true, data: [] },
    });

    const { findByText, getByText } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: [],
            listingsLoading: false,
          },
        },
      }
    );

    const emptyTitle = await findByText('No listings yet');
    expect(emptyTitle).toBeTruthy();
    const addBtn = getByText('Add Parking Space');
    fireEvent.press(addBtn);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking');
  });

  it('triggers delete confirmation and calls deleteParkingThunk when pressing Delete button', async () => {
    jest.spyOn(Alert, 'alert');
    apiClient.delete.mockResolvedValueOnce({
      data: { success: true },
    });

    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const deleteBtn = getByTestId('delete-listing-btn-space-1');
    fireEvent.press(deleteBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Parking Space',
      expect.stringContaining('Downtown Secure Garage'),
      expect.any(Array)
    );

    const alertButtons = Alert.alert.mock.calls[0][2];
    const confirmBtn = alertButtons.find((b) => b.text === 'Delete');
    await confirmBtn.onPress();

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining('space-1')
      );
    });
  });

  it('triggers delete confirmation and calls deleteParkingThunk when pressing quick delete button in header', async () => {
    jest.spyOn(Alert, 'alert');
    apiClient.delete.mockResolvedValueOnce({
      data: { success: true },
    });

    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: sampleListings,
            listingsLoading: false,
          },
        },
      }
    );

    const quickDeleteBtn = getByTestId('quick-delete-space-1');
    fireEvent.press(quickDeleteBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Parking Space',
      expect.stringContaining('Downtown Secure Garage'),
      expect.any(Array)
    );

    const alertButtons = Alert.alert.mock.calls[0][2];
    const confirmBtn = alertButtons.find((b) => b.text === 'Delete');
    await confirmBtn.onPress();

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining('space-1')
      );
    });
  });
});
