import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, renderWithProviders, waitFor, act } from '../../../utils/test-utils';
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

      const plate = await findByText(/MH02AB1234/);
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

    it('opens Add Vehicle modal and renders horizontally scrollable vehicle category pills', async () => {
      apiClient.get.mockResolvedValueOnce({ success: true, data: [] });

      const { findByTestId, getByText, getByTestId } = renderWithProviders(
        <MyVehiclesScreen navigation={mockNavigation} />
      );

      const addBtn = await findByTestId('add-vehicle-btn');
      fireEvent.press(addBtn);

      expect(getByText('Vehicle Category')).toBeTruthy();
      expect(getByTestId('my-vehicle-category-pill-0')).toBeTruthy();
      expect(getByTestId('my-vehicle-category-pill-1')).toBeTruthy();
      expect(getByTestId('my-vehicle-category-pill-2')).toBeTruthy();
      expect(getByTestId('my-vehicle-category-pill-5')).toBeTruthy();

      // Tap pill
      fireEvent.press(getByTestId('my-vehicle-category-pill-5'));
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

  describe('ProfileScreen', () => {
    it('renders profile with user info and features menu', () => {
      const ProfileScreen = require('../ProfileScreen').default;
      const preloadedState = {
        auth: {
          user: {
            id: 'u-1',
            firstName: 'Sarah',
            lastName: 'Connor',
            email: 'sarah@skynet.com',
            phoneNumber: '9876543210',
          },
          token: 'jwt-token',
        },
        notification: {
          unreadCount: 3,
        },
      };

      const { getByText, getAllByText, queryByText, queryAllByText } = renderWithProviders(
        <ProfileScreen navigation={mockNavigation} />,
        { preloadedState }
      );

      expect(getAllByText('Sarah Connor').length).toBeGreaterThan(0);
      expect(getAllByText('sarah@skynet.com').length).toBeGreaterThan(0);
      expect(queryByText('My Garage (Vehicles)')).toBeNull();
      expect(queryByText('Saved Favorites')).toBeNull();
      expect(queryByText('Parking Passes')).toBeNull();
      expect(queryByText('Notifications')).toBeNull();
      expect(getByText('Edit Profile')).toBeTruthy();
      expect(getByText('Change Password')).toBeTruthy();
      expect(getByText('Delete Account')).toBeTruthy();
      expect(getByText('Logout')).toBeTruthy();

      // Ensure duplicate items are not present
      const allMyVehicles = queryAllByText ? queryAllByText('My Vehicles') : [];
      expect(allMyVehicles.length).toBe(0);
    });

    it('navigates to ChangePassword and EditProfile from Account Settings without duplicate options', () => {
      const ProfileScreen = require('../ProfileScreen').default;
      const preloadedState = {
        auth: {
          user: { id: 'u-1', firstName: 'Sarah', lastName: 'Connor', email: 'sarah@skynet.com' },
          token: 'jwt-token',
        },
      };

      const { getByText, queryByText } = renderWithProviders(
        <ProfileScreen navigation={mockNavigation} />,
        { preloadedState }
      );

      // Verify no duplicate options on profile screen
      expect(queryByText('My Vehicles')).toBeNull();
      expect(queryByText('My Garage (Vehicles)')).toBeNull();

      // Navigate to ChangePassword
      fireEvent.press(getByText('Change Password'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ChangePassword');

      // Navigate to EditProfile
      fireEvent.press(getByText('Edit Profile'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile');
    });

    it('triggers Alert confirmation and handles logout on Press', async () => {
      const ProfileScreen = require('../ProfileScreen').default;
      const alertSpy = jest.spyOn(Alert, 'alert');
      const preloadedState = {
        auth: {
          user: { id: 'u-1', firstName: 'Sarah', lastName: 'Connor', email: 'sarah@skynet.com' },
          token: 'jwt-token',
          isAuthenticated: true,
        },
      };

      const { getByText } = renderWithProviders(
        <ProfileScreen navigation={mockNavigation} />,
        { preloadedState }
      );

      fireEvent.press(getByText('Logout'));
      expect(alertSpy).toHaveBeenCalledWith(
        'Logout',
        'Are you sure you want to logout?',
        expect.any(Array)
      );

      const alertButtons = alertSpy.mock.calls[0][2];
      const logoutButton = alertButtons.find((btn) => btn.text === 'Logout');
      await act(async () => {
        await logoutButton.onPress();
      });
      alertSpy.mockRestore();
    });
  });
});
