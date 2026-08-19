import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import CorporateBookingsScreen from '../CorporateBookingsScreen';
import corporateService from '../../../services/api/corporateService';

jest.mock('../../../services/api/corporateService', () => ({
  getCorporateBookings: jest.fn().mockResolvedValue({
    items: [
      {
        id: 'cb-1',
        vehicleNumber: 'DL01AB1234',
        startDateTime: '2026-08-19T09:00:00Z',
        endDateTime: '2026-08-19T18:00:00Z',
        isVisitor: false,
      }
    ]
  }),
  createEmployeeBooking: jest.fn().mockResolvedValue({
    id: 'cb-2',
    vehicleNumber: 'MH02XY9999',
  }),
  cancelCorporateBooking: jest.fn().mockResolvedValue({ success: true }),
}));

describe('CorporateBookingsScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders corporate bookings list', async () => {
    const preloadedState = {
      corporate: {
        activeCompanyId: 'comp-1',
      }
    };

    const { findByText, getByText } = renderWithProviders(
      <CorporateBookingsScreen />,
      { preloadedState }
    );

    const vehicleText = await findByText('Vehicle: DL01AB1234');
    expect(vehicleText).toBeTruthy();
    expect(getByText('Book Slot')).toBeTruthy();
  });

  it('opens modal and creates employee booking', async () => {
    const preloadedState = {
      corporate: {
        activeCompanyId: 'comp-1',
      }
    };

    const { findByText, getByText, getByPlaceholderText } = renderWithProviders(
      <CorporateBookingsScreen />,
      { preloadedState }
    );

    const bookSlotBtn = await findByText('Book Slot');
    fireEvent.press(bookSlotBtn);

    expect(getByText('Book Employee Slot')).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText('Enter lease GUID'), 'alloc-guid-123');
    fireEvent.changeText(getByPlaceholderText('MH12AB1234'), 'MH02XY9999');

    const confirmBtn = getByText('Confirm Booking');
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(corporateService.createEmployeeBooking).toHaveBeenCalled();
    });
  });
});
