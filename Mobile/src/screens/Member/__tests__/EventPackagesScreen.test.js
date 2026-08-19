import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import EventPackagesScreen from '../EventPackagesScreen';
import eventPackageService from '../../../services/api/eventPackageService';

jest.mock('../../../services/api/eventPackageService', () => ({
  getOnSale: jest.fn().mockResolvedValue({
    data: [
      {
        id: 'ep-1',
        name: 'VIP Finals Parking',
        venueName: 'Metropolis Arena',
        eventName: 'Championship Finals',
        eventStart: '2026-09-20T18:00:00Z',
        price: 1200,
      },
    ],
  }),
  getMyPackages: jest.fn().mockResolvedValue({
    data: [
      {
        id: 'my-ep-1',
        name: 'VIP Finals Pass',
        venueName: 'Metropolis Arena',
        eventDate: '2026-09-20T18:00:00Z',
        licensePlate: 'MH01AA1111',
      },
    ],
  }),
  purchasePackage: jest.fn().mockResolvedValue({
    success: true,
    data: { id: 'purchased-1' },
  }),
}));

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

describe('EventPackagesScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders on sale event packages', async () => {
    const { findByText, getByText } = renderWithProviders(
      <EventPackagesScreen navigation={mockNavigation} />
    );

    const title = await findByText('VIP Finals Parking');
    expect(title).toBeTruthy();
    expect(getByText('₹1,200')).toBeTruthy();
    expect(getByText('Book Pass')).toBeTruthy();
  });

  it('switches tabs and opens purchase modal', async () => {
    const { findByText, getByText } = renderWithProviders(
      <EventPackagesScreen navigation={mockNavigation} />
    );

    const bookBtn = await findByText('Book Pass');
    fireEvent.press(bookBtn);

    expect(getByText('Event Pass Checkout')).toBeTruthy();

    const confirmBtn = getByText('Confirm & Pay');
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(eventPackageService.purchasePackage).toHaveBeenCalled();
    });
  });
});
