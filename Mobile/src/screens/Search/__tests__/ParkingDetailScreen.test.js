import React from 'react';
import { renderWithProviders } from '../../../utils/test-utils';
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
});
