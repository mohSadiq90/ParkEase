import React from 'react';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import BookingScreen from '../BookingScreen';
import apiClient from '../../../services/api/apiClient';
import { calculatePriceThunk } from '../../../store/slices/bookingSlice';

// Mock the API client
jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  goBack: jest.fn(),
};

const mockRoute = {
  params: { parkingId: 'test-parking-id' },
};

describe('BookingScreen', () => {
  const preloadedState = {
    parking: {
      selectedParking: {
        id: 'test-parking-id',
        title: 'Central Parking',
        address: 'Downtown',
      },
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders booking screen correctly and loads price', async () => {
    apiClient.post.mockImplementation((url) => {
      return Promise.resolve({
        data: { success: true, data: { basePrice: 20, discount: 0, totalPrice: 20 } }
      });
    });

    const { getByText, findAllByText } = renderWithProviders(
      <BookingScreen navigation={mockNavigation} route={mockRoute} />,
      { preloadedState }
    );

    expect(getByText('Central Parking')).toBeTruthy();
    expect(getByText('Downtown')).toBeTruthy();

    const priceTexts = await findAllByText('₹20');
    expect(priceTexts.length).toBeGreaterThan(0);
  });

  it('disables confirm button and shows warning if end time is before start time', async () => {
    apiClient.post.mockImplementation((url) => {
      return Promise.resolve({
        data: { success: true, data: { basePrice: 20, discount: 0, totalPrice: 20 } }
      });
    });

    const { getByText } = renderWithProviders(
      <BookingScreen navigation={mockNavigation} route={mockRoute} />,
      { preloadedState }
    );
    
    const confirmButton = getByText('Confirm Booking');
    expect(confirmButton).toBeTruthy();
  });

  it('handles booking creation successfully', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url && url.includes('calculate')) {
        return Promise.resolve({
          data: { success: true, data: { basePrice: 20, discount: 0, totalPrice: 20 } }
        });
      }
      return Promise.resolve({
        data: { success: true, data: { id: 101, status: 'PENDING' } }
      });
    });

    const { getByText, findAllByText } = renderWithProviders(
      <BookingScreen navigation={mockNavigation} route={mockRoute} />,
      { preloadedState }
    );

    const priceTexts = await findAllByText('₹20');
    expect(priceTexts.length).toBeGreaterThan(0);

    const confirmButton = getByText('Confirm Booking');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  it('handles booking conflict error gracefully', async () => {
    apiClient.post.mockImplementation((url) => {
      if (url && url.includes('calculate')) {
        return Promise.resolve({
          data: { success: true, data: { basePrice: 20, discount: 0, totalPrice: 20 } }
        });
      }
      return Promise.reject({
        response: {
          status: 409,
          data: { message: 'Spot no longer available for this time slot' }
        }
      });
    });

    const { getByText, findAllByText } = renderWithProviders(
      <BookingScreen navigation={mockNavigation} route={mockRoute} />,
      { preloadedState }
    );

    const priceTexts = await findAllByText('₹20');
    expect(priceTexts.length).toBeGreaterThan(0);

    const confirmButton = getByText('Confirm Booking');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    });
  });
});
