import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import ParkingDetailScreen from '../ParkingDetailScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('ParkingDetailScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders parking info, availability forecast, and host reply', async () => {
    const mockParking = {
      data: {
        id: 'spot-555',
        title: 'Metro Central Deck',
        address: '789 Grand Blvd',
        city: 'Metro City',
        state: 'CA',
        averageRating: 4.9,
        totalReviews: 24,
        parkingType: 0,
        availableSpots: 18,
        totalSpots: 50,
        is24Hours: true,
        description: 'Secure covered parking in central hub.',
        hourlyRate: 40,
        dailyRate: 250,
        weeklyRate: 1200,
        monthlyRate: 4000,
        amenities: ['CCTV', 'EV Charging', 'Covered'],
      },
    };

    const mockReviews = {
      data: {
        reviews: [
          {
            id: 'rev-1',
            userName: 'Alice Walker',
            rating: 5,
            comment: 'Great spot with super clean bays!',
            ownerResponse: 'Thank you Alice! Happy to host you.',
            createdAt: '2026-08-10T12:00:00Z',
          },
        ],
      },
    };

    const mockForecast = {
      success: true,
      data: {
        currentAvailabilityBand: 'High',
        currentPredictedAvailableSpots: 20,
        currentConfidenceScore: 0.9,
      },
    };

    apiClient.get.mockImplementation((url) => {
      if (url.includes('forecast')) {
        return Promise.resolve(mockForecast);
      }
      if (url.includes('reviews')) {
        return Promise.resolve({ data: mockReviews.data });
      }
      return Promise.resolve({ data: { data: mockParking.data } });
    });

    const { findByText, getByText } = renderWithProviders(
      <ParkingDetailScreen
        navigation={mockNavigation}
        route={{ params: { parkingId: 'spot-555' } }}
      />
    );

    const title = await findByText('Metro Central Deck');
    expect(title).toBeTruthy();
    expect(getByText('Availability Forecast')).toBeTruthy();
    expect(getByText('High Demand')).toBeTruthy();
    expect(getByText(/Predicted free spots:/)).toBeTruthy();
    expect(getByText('Alice Walker')).toBeTruthy();
    expect(getByText('Great spot with super clean bays!')).toBeTruthy();
    expect(getByText('Response from Host')).toBeTruthy();
    expect(getByText('Thank you Alice! Happy to host you.')).toBeTruthy();
  });

  it('renders consolidated Edit and Delete in bottom bar, status badge & toggle, and photo trust banner for own listing', async () => {
    const mockParking = {
      data: {
        id: 'spot-777',
        title: 'Host Own Garage',
        address: '123 Host Lane',
        city: 'Metro City',
        state: 'CA',
        averageRating: 5.0,
        totalReviews: 10,
        parkingType: 0,
        availableSpots: 5,
        totalSpots: 10,
        hourlyRate: 20,
        ownerId: 'user-host-1',
        isActive: true,
      },
    };

    apiClient.get.mockImplementation((url) => {
      if (url.includes('forecast')) {
        return Promise.resolve({ success: true, data: {} });
      }
      if (url.includes('reviews')) {
        return Promise.resolve({ data: { reviews: [] } });
      }
      return Promise.resolve({ data: { data: mockParking.data } });
    });

    const { findByText, getByTestId, getByText, queryByTestId } = renderWithProviders(
      <ParkingDetailScreen
        navigation={mockNavigation}
        route={{ params: { parkingId: 'spot-777', isOwnListing: true } }}
      />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-host-1', name: 'Host User' },
            isAuthenticated: true,
          },
        },
      }
    );

    await findByText('Host Own Garage');

    // Listing context and banners
    expect(getByText('This is your listing')).toBeTruthy();
    expect(getByTestId('owner-listing-banner')).toBeTruthy();
    expect(getByTestId('owner-status-toggle')).toBeTruthy();
    expect(getByText(/Active \(Visible to renters\)/)).toBeTruthy();
    expect(getByTestId('listing-status-badge')).toBeTruthy();
    expect(getByText('ACTIVE')).toBeTruthy();

    // Photo Trust & Quality Callout
    expect(getByTestId('photo-trust-banner')).toBeTruthy();
    expect(getByText('Upload Real Photos for Trust')).toBeTruthy();
    expect(getByTestId('update-photos-btn')).toBeTruthy();

    // Verify removed redundant hero and banner actions
    expect(queryByTestId('hero-edit-listing-btn')).toBeNull();
    expect(queryByTestId('hero-delete-listing-btn')).toBeNull();
    expect(queryByTestId('owner-banner-edit-btn')).toBeNull();
    expect(queryByTestId('owner-banner-delete-btn')).toBeNull();

    // Consolidated bottom bar actions
    expect(getByText('Your Listing')).toBeTruthy();
    expect(getByTestId('edit-listing-bottom-button')).toBeTruthy();
    expect(getByTestId('delete-listing-bottom-button')).toBeTruthy();

    fireEvent.press(getByTestId('edit-listing-bottom-button'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {
      editData: mockParking.data,
    });

    fireEvent.press(getByTestId('update-photos-btn'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {
      editData: mockParking.data,
    });
  });

  it('renders INACTIVE status badge and toggles status when owner-status-toggle is changed', async () => {
    const mockParking = {
      data: {
        id: 'spot-778',
        title: 'Inactive Garage',
        address: '456 Quiet St',
        city: 'Metro City',
        state: 'CA',
        hourlyRate: 15,
        ownerId: 'user-host-1',
        isActive: false,
      },
    };

    apiClient.get.mockImplementation((url) => {
      if (url.includes('forecast')) {
        return Promise.resolve({ success: true, data: {} });
      }
      if (url.includes('reviews')) {
        return Promise.resolve({ data: { reviews: [] } });
      }
      return Promise.resolve({ data: { data: mockParking.data } });
    });

    apiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'spot-778', isActive: true },
        message: 'Parking space activated successfully',
      },
    });

    const { findByText, getByTestId, getByText } = renderWithProviders(
      <ParkingDetailScreen
        navigation={mockNavigation}
        route={{ params: { parkingId: 'spot-778', isOwnListing: true } }}
      />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-host-1', name: 'Host User' },
            isAuthenticated: true,
          },
        },
      }
    );

    await findByText('Inactive Garage');

    expect(getByTestId('listing-status-badge')).toBeTruthy();
    expect(getByText('INACTIVE')).toBeTruthy();
    expect(getByText(/Inactive \(Hidden from search\)/)).toBeTruthy();

    const statusToggle = getByTestId('owner-status-toggle');
    fireEvent(statusToggle, 'valueChange', true);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        expect.stringContaining('spot-778')
      );
    });
  });

  it('triggers delete confirmation and deletes parking space when tapping delete in sticky bottom bar', async () => {
    jest.spyOn(Alert, 'alert');
    apiClient.delete.mockResolvedValueOnce({
      data: { success: true },
    });

    const mockParking = {
      data: {
        id: 'spot-888',
        title: 'Host Listing To Delete',
        address: '999 Delete Ave',
        city: 'Metro City',
        state: 'CA',
        averageRating: 4.5,
        totalReviews: 2,
        parkingType: 0,
        availableSpots: 1,
        totalSpots: 5,
        hourlyRate: 10,
        ownerId: 'user-host-1',
      },
    };

    apiClient.get.mockImplementation((url) => {
      if (url.includes('forecast')) {
        return Promise.resolve({ success: true, data: {} });
      }
      if (url.includes('reviews')) {
        return Promise.resolve({ data: { reviews: [] } });
      }
      return Promise.resolve({ data: { data: mockParking.data } });
    });

    const { findByText, getByTestId } = renderWithProviders(
      <ParkingDetailScreen
        navigation={mockNavigation}
        route={{ params: { parkingId: 'spot-888', isOwnListing: true } }}
      />,
      {
        preloadedState: {
          auth: {
            user: { id: 'user-host-1', name: 'Host User' },
            isAuthenticated: true,
          },
        },
      }
    );

    await findByText('Host Listing To Delete');

    const deleteBtn = getByTestId('delete-listing-bottom-button');
    fireEvent.press(deleteBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Parking Space',
      expect.stringContaining('Host Listing To Delete'),
      expect.any(Array)
    );

    const alertButtons = Alert.alert.mock.calls[0][2];
    const confirmBtn = alertButtons.find((b) => b.text === 'Delete');
    await confirmBtn.onPress();

    await waitFor(() => {
      expect(apiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining('spot-888')
      );
    });
  });
});
