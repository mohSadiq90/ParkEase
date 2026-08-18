import React from 'react';
import { fireEvent, renderWithProviders, waitFor } from '../../../utils/test-utils';
import MyVehiclesScreen from '../MyVehiclesScreen';
import FavoritesScreen from '../FavoritesScreen';
import MyPassesScreen from '../MyPassesScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('Mobile Profile Extension Screens', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MyVehiclesScreen', () => {
    it('renders vehicles correctly from API', async () => {
      const mockVehicles = {
        success: true,
        data: [
          {
            id: 'v-1',
            licensePlate: 'MH02AB1234',
            make: 'Honda',
            model: 'Civic',
            color: 'White',
          },
        ],
      };

      apiClient.get.mockResolvedValueOnce(mockVehicles);

      const { findByText, getByText } = renderWithProviders(
        <MyVehiclesScreen navigation={mockNavigation} />
      );

      const plate = await findByText('MH02AB1234');
      expect(plate).toBeTruthy();
      expect(getByText('Honda Civic · White')).toBeTruthy();
    });

    it('renders empty state when no vehicles', async () => {
      apiClient.get.mockResolvedValueOnce({ success: true, data: [] });

      const { findByText } = renderWithProviders(
        <MyVehiclesScreen navigation={mockNavigation} />
      );

      const emptyTitle = await findByText('No vehicles in garage');
      expect(emptyTitle).toBeTruthy();
    });
  });

  describe('FavoritesScreen', () => {
    it('renders saved favorite locations correctly', async () => {
      const mockFavorites = {
        success: true,
        data: [
          {
            id: 'fav-1',
            parkingSpaceId: 'spot-100',
            title: 'Downtown Secure Bay',
            address: '123 Market St, Central City',
            hourlyRate: 60,
            averageRating: 4.8,
          },
        ],
      };

      apiClient.get.mockResolvedValueOnce(mockFavorites);

      const { findByText, getByText } = renderWithProviders(
        <FavoritesScreen navigation={mockNavigation} />
      );

      const title = await findByText('Downtown Secure Bay');
      expect(title).toBeTruthy();
      expect(getByText('123 Market St, Central City')).toBeTruthy();
      expect(getByText('₹60/hr')).toBeTruthy();
    });

    it('renders empty state when no favorites exist', async () => {
      apiClient.get.mockResolvedValueOnce({ success: true, data: [] });

      const { findByText } = renderWithProviders(
        <FavoritesScreen navigation={mockNavigation} />
      );

      const emptyMsg = await findByText('No favorites saved');
      expect(emptyMsg).toBeTruthy();
    });
  });

  describe('MyPassesScreen', () => {
    it('renders active passes and digital gate token', async () => {
      const mockPasses = {
        success: true,
        data: {
          hasActivePass: true,
          activePasses: [
            {
              id: 'pass-abcd-1234-5678',
              passType: 0, // Monthly
              parkingSpaceTitle: 'Central Tech Garage',
              startDateUtc: '2026-08-01T00:00:00Z',
              endDateUtc: '2026-08-31T23:59:59Z',
              usageMode: 0,
              isActive: true,
            },
          ],
        },
      };

      apiClient.get.mockResolvedValueOnce(mockPasses);

      const { findByText, getByText } = renderWithProviders(
        <MyPassesScreen navigation={mockNavigation} />
      );

      const passType = await findByText('Monthly Pass');
      expect(passType).toBeTruthy();
      expect(getByText('Central Tech Garage')).toBeTruthy();
      expect(getByText('Unlimited Access')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
    });

    it('renders empty state when user has no active passes', async () => {
      apiClient.get.mockResolvedValueOnce({
        success: true,
        data: { hasActivePass: false, activePasses: [] },
      });

      const { findByText } = renderWithProviders(
        <MyPassesScreen navigation={mockNavigation} />
      );

      const empty = await findByText('No active passes');
      expect(empty).toBeTruthy();
    });
  });
});
