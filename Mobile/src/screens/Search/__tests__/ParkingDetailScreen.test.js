import React from 'react';
import { renderWithProviders, fireEvent } from '../../../utils/test-utils';
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

  it('renders Edit Listing buttons and navigates to CreateParking when viewing own listing', async () => {
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

    const { findByText, getByTestId, getByText } = renderWithProviders(
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

    expect(getByText('This is your listing')).toBeTruthy();
    expect(getByTestId('hero-edit-listing-btn')).toBeTruthy();
    expect(getByTestId('owner-banner-edit-btn')).toBeTruthy();
    expect(getByTestId('edit-listing-bottom-button')).toBeTruthy();

    fireEvent.press(getByTestId('edit-listing-bottom-button'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking', {
      editData: mockParking.data,
    });
  });
});
