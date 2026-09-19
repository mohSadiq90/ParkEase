import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, renderWithProviders, waitFor, act } from '../../../utils/test-utils';
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

  it('does not render redundant edit and delete buttons in the card header', () => {
    const { queryByTestId, getByTestId } = renderWithProviders(
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

    expect(queryByTestId('quick-edit-space-1')).toBeNull();
    expect(queryByTestId('quick-delete-space-1')).toBeNull();
    expect(getByTestId('toggle-switch-space-1')).toBeTruthy();
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

  it('immediately reflects switch toggle in UI before API response resolves and shows sync spinner', async () => {
    let resolveApi;
    apiClient.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        })
    );

    const { getByTestId, queryByTestId } = renderWithProviders(
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
    expect(toggle.props.value).toBe(true);

    // Tap switch to disable
    fireEvent(toggle, 'valueChange', false);

    // UI immediately updates without waiting for network
    expect(getByTestId('toggle-switch-space-1').props.value).toBe(false);
    expect(getByTestId('toggle-sync-spinner-space-1')).toBeTruthy();

    // Now API resolves in background
    await act(async () => {
      resolveApi({
        data: { success: true, data: { ...sampleListings[0], isActive: false } },
      });
    });

    await waitFor(() => {
      expect(queryByTestId('toggle-sync-spinner-space-1')).toBeNull();
    });
    expect(getByTestId('toggle-switch-space-1').props.value).toBe(false);
  });

  it('preserves deactivated state when backend returns ApiResponse with hardcoded data=true and deactivated message', async () => {
    let resolveApi;
    apiClient.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        })
    );

    const { getByTestId, queryByTestId } = renderWithProviders(
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
    expect(toggle.props.value).toBe(true);

    // Tap switch to deactivate
    act(() => {
      fireEvent(toggle, 'valueChange', false);
    });

    // UI immediately updates optimistically
    expect(getByTestId('toggle-switch-space-1').props.value).toBe(false);
    expect(getByTestId('toggle-sync-spinner-space-1')).toBeTruthy();

    // Backend responds with real API format: success=true, message="Parking space deactivated", data=true
    await act(async () => {
      resolveApi({
        data: {
          success: true,
          message: 'Parking space deactivated',
          data: true,
        },
      });
    });

    // After loading finishes, the switch must STAY false and NOT revert to true
    await waitFor(() => {
      expect(queryByTestId('toggle-sync-spinner-space-1')).toBeNull();
    });
    expect(getByTestId('toggle-switch-space-1').props.value).toBe(false);
  });

  it('reverts switch back to original state and alerts user when background toggle fails', async () => {
    jest.spyOn(Alert, 'alert');
    apiClient.post.mockRejectedValueOnce(new Error('Network connection timeout'));

    const { getByTestId, queryByTestId } = renderWithProviders(
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
    expect(toggle.props.value).toBe(true);

    // Tap switch to disable
    fireEvent(toggle, 'valueChange', false);

    // Optimistically changed immediately
    expect(getByTestId('toggle-switch-space-1').props.value).toBe(false);

    // When background service fails, revert and alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Status Update Failed',
        expect.stringContaining('Network connection timeout')
      );
    });

    await waitFor(() => {
      expect(getByTestId('toggle-switch-space-1').props.value).toBe(true);
    });
    expect(queryByTestId('toggle-sync-spinner-space-1')).toBeNull();
  });

  it('ignores duplicate switch taps while a background toggle is in flight', async () => {
    let resolveApi;
    apiClient.post.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveApi = resolve;
        })
    );

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
    fireEvent(toggle, 'valueChange', true);

    expect(apiClient.post).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveApi({
        data: { success: true, data: { ...sampleListings[0], isActive: false } },
      });
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

    // Kebab button opens secondary menu protecting destructive actions
    fireEvent.press(getByTestId('listing-kebab-btn-space-1'));

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

  it('renders shimmer skeleton placeholders when listings are loading', () => {
    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: [],
            listingsLoading: true,
          },
        },
      }
    );

    expect(getByTestId('listings-shimmer-loading')).toBeTruthy();
  });

  it('renders square thumbnail when image is available and placeholder when absent', () => {
    const listingsWithImages = [
      {
        ...sampleListings[0],
        id: 'img-space',
        imageUrl: 'https://example.com/photo.jpg',
      },
      {
        ...sampleListings[1],
        id: 'no-img-space',
        imageUrl: null,
      },
    ];

    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: listingsWithImages,
            listingsLoading: false,
          },
        },
      }
    );

    expect(getByTestId('listing-thumb-img-space')).toBeTruthy();
    expect(getByTestId('listing-thumb-placeholder-no-img-space')).toBeTruthy();
  });

  it('renders subtle chevron icon for edit affordance on card', () => {
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

    expect(getByTestId('edit-chevron-space-1')).toBeTruthy();
    expect(getByTestId('edit-chevron-space-2')).toBeTruthy();
  });

  it('does not render redundant static Active text badge in info row', () => {
    const { queryByText, getAllByText } = renderWithProviders(
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

    // Filter tabs have "Active (1)" and "Inactive (1)", but the card info row should NOT have standalone "Active" or "Inactive"
    expect(queryByText('● Active')).toBeNull();
    expect(queryByText('● Inactive')).toBeNull();
  });

  it('renders muted "No reviews yet" for listings with zero reviews and star rating for listings with reviews', () => {
    const testListings = [
      {
        ...sampleListings[0],
        id: 'rev-space-1',
        averageRating: 4.8,
        totalReviews: 14,
      },
      {
        ...sampleListings[1],
        id: 'rev-space-2',
        averageRating: 0,
        totalReviews: 0,
      },
    ];

    const { getByTestId, queryByTestId, getByText } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: testListings,
            listingsLoading: false,
          },
        },
      }
    );

    expect(getByTestId('rating-summary-rev-space-1')).toBeTruthy();
    expect(getByText('4.8 (14)')).toBeTruthy();

    expect(getByTestId('no-reviews-rev-space-2')).toBeTruthy();
    expect(getByText('No reviews yet')).toBeTruthy();
    expect(queryByTestId('rating-summary-rev-space-2')).toBeNull();
  });

  it('handles third backend state (Pending Approval / Suspended) by showing banner and disabling toggle switch', () => {
    const thirdStateListings = [
      {
        ...sampleListings[0],
        id: 'pending-space',
        status: 'PendingApproval',
        isActive: false,
      },
      {
        ...sampleListings[1],
        id: 'suspended-space',
        status: 'Suspended',
        isActive: false,
      },
    ];

    const { getByTestId } = renderWithProviders(
      <MyListingsScreen navigation={mockNavigation} route={{}} />,
      {
        preloadedState: {
          parking: {
            myListings: thirdStateListings,
            listingsLoading: false,
          },
        },
      }
    );

    expect(getByTestId('pending-approval-banner-pending-space')).toBeTruthy();
    expect(getByTestId('suspended-banner-suspended-space')).toBeTruthy();

    const pendingSwitch = getByTestId('toggle-switch-pending-space');
    expect(pendingSwitch.props.disabled).toBe(true);

    const suspendedSwitch = getByTestId('toggle-switch-suspended-space');
    expect(suspendedSwitch.props.disabled).toBe(true);
  });

  it('opens Quick Edit modal when tapping hourly rate or spots and saves changes without navigating away', async () => {
    jest.spyOn(Alert, 'alert');
    apiClient.put.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          ...sampleListings[0],
          hourlyRate: 20,
          totalSpots: 25,
          availableSpots: 15,
        },
      },
    });

    const { getByTestId, queryByTestId } = renderWithProviders(
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

    // Tap the hourly rate chip on space-1
    fireEvent.press(getByTestId('quick-edit-rate-space-1'));

    // Quick Edit modal should now be visible
    expect(getByTestId('quick-edit-modal')).toBeTruthy();
    expect(getByTestId('quick-edit-rate-input').props.value).toBe('15');
    expect(getByTestId('quick-edit-total-spots-input').props.value).toBe('20');
    expect(getByTestId('quick-edit-available-spots-input').props.value).toBe('12');

    // Use stepper buttons
    fireEvent.press(getByTestId('quick-edit-rate-plus-btn')); // 15 + 5 = 20
    expect(getByTestId('quick-edit-rate-input').props.value).toBe('20');

    fireEvent.changeText(getByTestId('quick-edit-total-spots-input'), '25');
    fireEvent.changeText(getByTestId('quick-edit-available-spots-input'), '15');

    // Press Save Changes
    fireEvent.press(getByTestId('quick-edit-save-button'));

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.stringContaining('space-1'),
        expect.objectContaining({
          hourlyRate: 20,
          totalSpots: 25,
          availableSpots: 15,
        })
      );
    });

    // Alert confirms success
    expect(Alert.alert).toHaveBeenCalledWith(
      'Updated',
      'Pricing & availability updated successfully.'
    );

    // Verify modal is closed
    expect(queryByTestId('quick-edit-modal')).toBeNull();
    // Verify no navigation occurred away from the screen
    expect(mockNavigation.navigate).not.toHaveBeenCalledWith('CreateParking', expect.anything());
  });

  it('opens Quick Edit modal via spots chip and closes when pressing cancel', () => {
    const { getByTestId, queryByTestId } = renderWithProviders(
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

    fireEvent.press(getByTestId('quick-edit-spots-space-1'));
    expect(getByTestId('quick-edit-modal')).toBeTruthy();

    fireEvent.press(getByTestId('quick-edit-cancel-button'));
    expect(queryByTestId('quick-edit-modal')).toBeNull();
  });

  it('eliminates redundant "Tap to edit" hints to clarify editing options', () => {
    const { queryByText, getByTestId } = renderWithProviders(
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

    // No confusing "Tap to edit" text should appear anywhere on the card
    expect(queryByText('Tap to edit')).toBeNull();
    // Edit button remains prominent and clear
    expect(getByTestId('edit-listing-btn-space-1')).toBeTruthy();
  });

  it('renders prompt to upload real photos when listing has no photos and renders kebab menu', () => {
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

    // Prompt to upload real photos is displayed for listings without photos (space-2)
    expect(getByTestId('add-real-photo-prompt-space-2')).toBeTruthy();
    // Kebab button is rendered in the card header for secondary destructive options
    expect(getByTestId('listing-kebab-btn-space-1')).toBeTruthy();
  });
});
