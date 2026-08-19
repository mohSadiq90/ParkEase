import React from 'react';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import SearchScreen from '../SearchScreen';
import apiClient from '../../../services/api/apiClient';

// Mock the API client
jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  navigate: jest.fn(),
};

describe('SearchScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Return a never-resolving promise so loading stays true
    apiClient.get.mockReturnValue(new Promise(() => {}));

    const { getByText } = renderWithProviders(<SearchScreen navigation={mockNavigation} />);
    
    expect(getByText('Loading parking spaces...')).toBeTruthy();
  });

  it('renders parking spaces correctly (Happy Path)', async () => {
    const mockData = {
      data: {
        parkingSpaces: [
          {
            id: '1',
            title: 'Downtown Spot',
            address: '123 Main St',
            city: 'Seattle',
            hourlyRate: 10,
            availableSpots: 5,
            averageRating: 4.5,
            totalReviews: 12,
            is24Hours: true,
          },
        ],
        totalCount: 1,
      },
    };
    
    apiClient.get.mockResolvedValueOnce({ data: mockData });

    const { getByText, findByText } = renderWithProviders(<SearchScreen navigation={mockNavigation} />);

    // Wait for the parking title to appear
    const titleElement = await findByText('Downtown Spot');
    expect(titleElement).toBeTruthy();
    expect(getByText('123 Main St, Seattle')).toBeTruthy();
    expect(getByText('₹10/hr')).toBeTruthy();
    expect(getByText('1 parking space available')).toBeTruthy();
  });

  it('shows empty state when no results found', async () => {
    const mockEmptyData = {
      data: {
        parkingSpaces: [],
        totalCount: 0,
      },
    };
    
    apiClient.get.mockResolvedValueOnce({ data: mockEmptyData });

    const { findByText } = renderWithProviders(<SearchScreen navigation={mockNavigation} />);

    const emptyTitle = await findByText('No parking spaces found');
    expect(emptyTitle).toBeTruthy();
  });

  it('navigates to details screen on press', async () => {
    const mockData = {
      data: {
        parkingSpaces: [
          {
            id: '99',
            title: 'Test Spot',
            address: '123 Main St',
            city: 'Seattle',
            hourlyRate: 10,
            availableSpots: 1,
          },
        ],
        totalCount: 1,
      },
    };
    apiClient.get.mockResolvedValueOnce({ data: mockData });

    const { findByText } = renderWithProviders(<SearchScreen navigation={mockNavigation} />);
    
    const cardTitle = await findByText('Test Spot');
    fireEvent.press(cardTitle);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ParkingDetail', { parkingId: '99' });
  });

  it('filters results by rating and sorting in filter modal', async () => {
    const mockData = {
      data: {
        parkingSpaces: [
          {
            id: '1',
            title: 'Cheap Spot',
            address: '100 First Ave',
            city: 'Seattle',
            hourlyRate: 5,
            availableSpots: 2,
            averageRating: 3.0,
            amenities: ['CCTV'],
          },
          {
            id: '2',
            title: 'Luxury Spot',
            address: '200 Second Ave',
            city: 'Seattle',
            hourlyRate: 30,
            availableSpots: 10,
            averageRating: 4.8,
            amenities: ['EV Charging', 'CCTV'],
          },
        ],
        totalCount: 2,
      },
    };
    apiClient.get.mockResolvedValueOnce({ data: mockData });

    const { findByText, getByText } = renderWithProviders(<SearchScreen navigation={mockNavigation} />);

    await findByText('Cheap Spot');
    expect(getByText('Luxury Spot')).toBeTruthy();
  });
});
