import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import MenuScreen from '../MenuScreen';

jest.mock('../../../services/api/apiClient');

describe('MenuScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders marketplace sections and hides corporate menu when channel is Marketplace', () => {
    const { getByText, queryByText } = renderWithProviders(
      <MenuScreen navigation={mockNavigation} />
    );

    // Section headers
    expect(getByText('Operations & Listings')).toBeTruthy();
    expect(queryByText('Corporate & Fleet')).toBeNull();
    expect(getByText('Garage & Messages')).toBeTruthy();
    expect(getByText('Tools & Simulators')).toBeTruthy();
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

    expect(getByText('Event Parking Packages')).toBeTruthy();
    fireEvent.press(getByText('Event Parking Packages'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('VendorEventPackages');

    expect(getByText('LPR Camera & Rules')).toBeTruthy();
    fireEvent.press(getByText('LPR Camera & Rules'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('LprSettings');

    expect(getByText('Find Parking Spaces')).toBeTruthy();
    fireEvent.press(getByText('Find Parking Spaces'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Search');

    expect(getByText('My Reservations')).toBeTruthy();
    fireEvent.press(getByText('My Reservations'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyBookings');

    expect(getByText('Incoming Host Bookings')).toBeTruthy();
    fireEvent.press(getByText('Incoming Host Bookings'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('IncomingBookings');

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

    expect(getByText('Event Parking Passes')).toBeTruthy();
    fireEvent.press(getByText('Event Parking Passes'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('EventPackages');

    // Tools & Simulators
    expect(getByText('LPR Simulator')).toBeTruthy();
    fireEvent.press(getByText('LPR Simulator'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('LprSimulator');

    expect(getByText('EV Charge Simulator')).toBeTruthy();
    fireEvent.press(getByText('EV Charge Simulator'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('EvChargeSimulator');

    // Account & Security
    expect(getByText('Profile Details')).toBeTruthy();
    fireEvent.press(getByText('Profile Details'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
    expect(queryByText('Edit Profile')).toBeNull();
    expect(queryByText('Change Password')).toBeNull();
    expect(queryByText('Log Out')).toBeNull();

    expect(getByText('About & System')).toBeTruthy();
    expect(getByText('Built With')).toBeTruthy();
  });

  it('renders corporate sections and hides marketplace operations when channel is Corporate', () => {
    const { getByText, queryByText } = renderWithProviders(
      <MenuScreen navigation={mockNavigation} />,
      {
        preloadedState: {
          auth: {
            channel: 'Corporate',
            user: { firstName: 'Alice', lastName: 'Corp', email: 'alice@corp.com' },
          },
        },
      }
    );

    // Corporate headers shown, Marketplace operations & tools hidden
    expect(getByText('Corporate & Fleet')).toBeTruthy();
    expect(getByText('Communications & Passes')).toBeTruthy();
    expect(queryByText('Operations & Listings')).toBeNull();
    expect(queryByText('Tools & Simulators')).toBeNull();

    // Corporate & Fleet items
    expect(getByText('Corporate Dashboard')).toBeTruthy();
    fireEvent.press(getByText('Corporate Dashboard'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateDashboard');

    expect(getByText('Company Management')).toBeTruthy();
    fireEvent.press(getByText('Company Management'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CompanyManagement');

    expect(getByText('Parking Inventory')).toBeTruthy();
    fireEvent.press(getByText('Parking Inventory'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateParkingSpaces');

    expect(getByText('Lease Browse')).toBeTruthy();
    fireEvent.press(getByText('Lease Browse'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateLeaseBrowse');

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

    // Communications & Passes
    expect(getByText('Messages')).toBeTruthy();
    fireEvent.press(getByText('Messages'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('ConversationList');

    expect(getByText('Notifications')).toBeTruthy();
    fireEvent.press(getByText('Notifications'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Notifications');

    expect(getByText('My Passes')).toBeTruthy();
    fireEvent.press(getByText('My Passes'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('MyPasses');

    // Marketplace garage items should not appear in Corporate
    expect(queryByText('My Vehicles')).toBeNull();
    expect(queryByText('Favorites')).toBeNull();
  });

  it('opens and closes the Built With modal with 25 technology tags', () => {
    const { getByText, getByTestId, getByLabelText } = renderWithProviders(
      <MenuScreen navigation={mockNavigation} />
    );

    // Open via Built With menu item
    fireEvent.press(getByText('Built With'));
    expect(getByText('25 Core Technologies & Architecture')).toBeTruthy();
    expect(getByText('React Native')).toBeTruthy();
    expect(getByText('Expo SDK 54')).toBeTruthy();
    expect(getByText('Redux Toolkit')).toBeTruthy();

    // Close via Done button
    fireEvent.press(getByText('Done'));

    // Open via Footer button
    fireEvent.press(getByTestId('menu-footer-built-with'));
    expect(getByText('25 Core Technologies & Architecture')).toBeTruthy();

    // Close via header close icon
    fireEvent.press(getByLabelText('Close Built With Modal'));
  });
});
