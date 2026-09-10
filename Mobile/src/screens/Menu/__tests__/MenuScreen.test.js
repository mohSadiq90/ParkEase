import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import MenuScreen from '../MenuScreen';

describe('MenuScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all sections and navigates correctly to operations, corporate, garage, and account screens', () => {
    const { getByText } = renderWithProviders(
      <MenuScreen navigation={mockNavigation} />
    );

    // Section headers
    expect(getByText('Operations & Listings')).toBeTruthy();
    expect(getByText('Corporate & Fleet')).toBeTruthy();
    expect(getByText('Garage & Messages')).toBeTruthy();
    expect(getByText('Account & Security')).toBeTruthy();

    // Operations & Listings items
    expect(getByText('My Listings')).toBeTruthy();
    fireEvent.press(getByText('My Listings'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyListings');

    expect(getByText('Add Parking Space')).toBeTruthy();
    fireEvent.press(getByText('Add Parking Space'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateParking');

    expect(getByText('Gate Access Scanner')).toBeTruthy();
    fireEvent.press(getByText('Gate Access Scanner'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('AccessPassScanner');

    expect(getByText('Find Parking Spaces')).toBeTruthy();
    fireEvent.press(getByText('Find Parking Spaces'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Search');

    expect(getByText('My Reservations')).toBeTruthy();
    fireEvent.press(getByText('My Reservations'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyBookings');

    expect(getByText('Incoming Host Bookings')).toBeTruthy();
    fireEvent.press(getByText('Incoming Host Bookings'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('IncomingBookings');

    // Corporate & Fleet items
    expect(getByText('Corporate Dashboard')).toBeTruthy();
    fireEvent.press(getByText('Corporate Dashboard'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateDashboard');

    expect(getByText('Company Management')).toBeTruthy();
    fireEvent.press(getByText('Company Management'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CompanyManagement');

    expect(getByText('Corporate Members')).toBeTruthy();
    fireEvent.press(getByText('Corporate Members'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateMembers');

    expect(getByText('Corporate Bookings')).toBeTruthy();
    fireEvent.press(getByText('Corporate Bookings'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateBookings');

    expect(getByText('Department Allocations')).toBeTruthy();
    fireEvent.press(getByText('Department Allocations'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateAllocations');

    expect(getByText('Corporate Invoices')).toBeTruthy();
    fireEvent.press(getByText('Corporate Invoices'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateInvoices');

    // Garage & Messages
    expect(getByText('Messages')).toBeTruthy();
    fireEvent.press(getByText('Messages'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ConversationList');

    expect(getByText('Notifications')).toBeTruthy();
    fireEvent.press(getByText('Notifications'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Notifications');

    expect(getByText('My Vehicles')).toBeTruthy();
    fireEvent.press(getByText('My Vehicles'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Vehicles');

    expect(getByText('Favorites')).toBeTruthy();
    fireEvent.press(getByText('Favorites'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Favorites');

    expect(getByText('My Passes')).toBeTruthy();
    fireEvent.press(getByText('My Passes'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyPasses');

    // Account & Security
    expect(getByText('Profile Details')).toBeTruthy();
    fireEvent.press(getByText('Profile Details'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');

    expect(getByText('Edit Profile')).toBeTruthy();
    fireEvent.press(getByText('Edit Profile'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile');

    expect(getByText('Change Password')).toBeTruthy();
    fireEvent.press(getByText('Change Password'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ChangePassword');

    expect(getByText('Log Out')).toBeTruthy();
  });
});
