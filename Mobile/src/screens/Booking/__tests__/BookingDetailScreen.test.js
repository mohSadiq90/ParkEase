import React from 'react';
import { renderWithProviders } from '../../../utils/test-utils';
import BookingDetailScreen from '../BookingDetailScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('BookingDetailScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders booking details, slot number, and digital gate token', async () => {
    const mockBooking = {
      data: {
        data: {
          id: 'booking-12345678-uuid',
          bookingReference: 'PE-BK-999',
          parkingSpaceTitle: 'Grand Tower Garage',
          parkingSpaceAddress: '456 Main St, Metropolis',
          slotNumber: '12',
          status: 1, // Confirmed
          totalAmount: 120,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
          vehicleNumber: 'MH01CD5678',
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockBooking);

    const { findByText, getByText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-12345678-uuid' } }}
      />
    );

    const title = await findByText('Grand Tower Garage');
    expect(title).toBeTruthy();
    expect(getByText('Ref: PE-BK-999')).toBeTruthy();
    expect(getByText('🅿️ Slot P12')).toBeTruthy();
    expect(getByText('Digital Gate Token')).toBeTruthy();
    expect(getByText('✓ Verified Paid & Active')).toBeTruthy();
    expect(getByText('₹120')).toBeTruthy();
    expect(getByText('Check In')).toBeTruthy();
    expect(getByText('Extend Booking')).toBeTruthy();
  });

  it('renders Check Out and Extend Booking for in-progress bookings', async () => {
    const mockInProgress = {
      data: {
        data: {
          id: 'booking-inprogress-uuid',
          bookingReference: 'PE-BK-INPROGRESS',
          parkingSpaceTitle: 'Grand Central Hub',
          parkingSpaceAddress: '100 Main St',
          status: 2, // InProgress
          totalAmount: 180,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockInProgress);

    const { findByText, getByText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-inprogress-uuid' } }}
      />
    );

    const checkOutBtn = await findByText('Check Out');
    expect(checkOutBtn).toBeTruthy();
    expect(getByText('Extend Booking')).toBeTruthy();
  });

  it('renders pending extension notice when booking has pending extension', async () => {
    const mockExtending = {
      data: {
        data: {
          id: 'booking-ext-uuid',
          bookingReference: 'PE-BK-EXT',
          parkingSpaceTitle: 'Sky Deck',
          status: 2, // InProgress
          hasPendingExtension: true,
          pendingEndDateTime: '2026-08-18T16:00:00Z',
          totalAmount: 220,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockExtending);

    const { findByText, getByText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-ext-uuid' } }}
      />
    );

    const extNotice = await findByText('Extension Pending Host Approval');
    expect(extNotice).toBeTruthy();
  });

  it('renders refund notice for cancelled booking', async () => {
    const mockCancelledBooking = {
      data: {
        data: {
          id: 'booking-cancelled-uuid',
          bookingReference: 'PE-BK-CANCELLED',
          parkingSpaceTitle: 'Airport Long Term Bay',
          status: 4, // Cancelled
          totalAmount: 200,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockCancelledBooking);

    const { findByText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-cancelled-uuid' } }}
      />
    );

    const refundText = await findByText(/Refund Status: Automatic refund initiated/i);
    expect(refundText).toBeTruthy();
  });

  it('renders horizontally scrollable extension hour pills in extend modal', async () => {
    const mockBooking = {
      data: {
        data: {
          id: 'booking-inprogress-uuid',
          bookingReference: 'PE-BK-INPROGRESS',
          parkingSpaceTitle: 'Grand Central Hub',
          status: 2, // InProgress
          totalAmount: 180,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockBooking);

    const { findByText, getByText, getByTestId } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-inprogress-uuid' } }}
      />
    );

    const extendBtn = await findByText('Extend Booking');
    const { fireEvent } = require('../../../utils/test-utils');
    fireEvent.press(extendBtn);

    // Verify extension hour pills exist
    expect(getByTestId('extension-hour-pill-1')).toBeTruthy();
    expect(getByTestId('extension-hour-pill-2')).toBeTruthy();
    expect(getByTestId('extension-hour-pill-3')).toBeTruthy();
    expect(getByTestId('extension-hour-pill-4')).toBeTruthy();
    expect(getByTestId('extension-hour-pill-6')).toBeTruthy();
    expect(getByTestId('extension-hour-pill-12')).toBeTruthy();

    // Select +3 hrs
    fireEvent.press(getByTestId('extension-hour-pill-3'));
  });

  it('renders Request Valet button, opens modal, selects lead minutes, enters notes, and submits request', async () => {
    const mockBooking = {
      data: {
        data: {
          id: 'booking-valet-req-uuid',
          bookingReference: 'PE-BK-VALET-1',
          parkingSpaceTitle: 'Grand Tower Garage',
          status: 1, // Confirmed
          totalAmount: 120,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
          valetStatus: 0, // None
          isValetEnabled: true,
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockBooking);
    apiClient.post.mockResolvedValueOnce({
      data: {
        data: {
          ...mockBooking.data.data,
          valetStatus: 1, // Requested
          valetNotes: 'Near pillar B2',
        },
      },
    });

    const { findByText, getByText, getByTestId, getByPlaceholderText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-valet-req-uuid' } }}
      />
    );

    const { fireEvent, act } = require('../../../utils/test-utils');
    const requestValetBtn = await findByText('Request Valet');
    expect(requestValetBtn).toBeTruthy();

    fireEvent.press(requestValetBtn);

    // Verify modal elements
    expect(getByText('Request Valet Retrieval')).toBeTruthy();
    expect(getByTestId('valet-lead-pill-15')).toBeTruthy();

    // Select 15 mins
    fireEvent.press(getByTestId('valet-lead-pill-15'));

    // Enter pickup notes
    const notesInput = getByPlaceholderText('e.g. Near Pillar B2, key with front desk');
    fireEvent.changeText(notesInput, 'Near pillar B2');

    // Submit
    const submitBtn = getByText('Submit Request');
    await act(async () => {
      fireEvent.press(submitBtn);
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/bookings/booking-valet-req-uuid/valet/request',
      {
        notes: 'Near pillar B2',
        leadMinutes: 15,
      }
    );
  });

  it('renders Cancel Valet Request button when valet status is requested and confirms cancellation', async () => {
    const mockBooking = {
      data: {
        data: {
          id: 'booking-valet-cancel-uuid',
          bookingReference: 'PE-BK-VALET-2',
          parkingSpaceTitle: 'Grand Tower Garage',
          status: 1, // Confirmed
          totalAmount: 120,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
          valetStatus: 1, // Requested
          valetNotes: 'Vehicle retrieval requested',
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockBooking);
    apiClient.post.mockResolvedValueOnce({
      data: {
        data: {
          ...mockBooking.data.data,
          valetStatus: 5, // Cancelled
        },
      },
    });

    const { Alert } = require('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { findByText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-valet-cancel-uuid' } }}
      />
    );

    const { fireEvent, act } = require('../../../utils/test-utils');
    const cancelValetBtn = await findByText('Cancel Valet Request');
    expect(cancelValetBtn).toBeTruthy();

    fireEvent.press(cancelValetBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Cancel Valet Request',
      'Are you sure you want to cancel your vehicle retrieval request?',
      expect.any(Array)
    );

    // Trigger the destructive confirm button
    const confirmAction = alertSpy.mock.calls[0][2][1];
    await act(async () => {
      await confirmAction.onPress();
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/bookings/booking-valet-cancel-uuid/valet/cancel'
    );
  });

  it('renders Assign Bay button, opens modal, fills bay fields, and submits assignment', async () => {
    const mockBooking = {
      data: {
        data: {
          id: 'booking-assign-bay-uuid',
          bookingReference: 'PE-BK-BAY-1',
          parkingSpaceTitle: 'Skyline Metro Park',
          status: 1,
          totalAmount: 150,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockBooking);
    apiClient.post.mockResolvedValueOnce({
      data: {
        data: {
          ...mockBooking.data.data,
          bayLabel: 'Bay A-14',
          facilityLevel: 'B1',
          facilityZone: 'Blue',
          slotNumber: 14,
        },
      },
    });

    const { findByText, getByText, getByPlaceholderText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-assign-bay-uuid', isVendor: true } }}
      />
    );

    const { fireEvent, act } = require('../../../utils/test-utils');
    const assignBayBtn = await findByText('Assign Bay');
    expect(assignBayBtn).toBeTruthy();

    fireEvent.press(assignBayBtn);

    // Verify modal title
    expect(getByText('Assign Parking Bay')).toBeTruthy();

    // Fill inputs
    const bayInput = getByPlaceholderText('e.g. Bay A-14, A1-001');
    const levelInput = getByPlaceholderText('e.g. B1, L2');
    const zoneInput = getByPlaceholderText('e.g. North, Blue');
    const slotInput = getByPlaceholderText('e.g. 14');

    fireEvent.changeText(bayInput, 'Bay A-14');
    fireEvent.changeText(levelInput, 'B1');
    fireEvent.changeText(zoneInput, 'Blue');
    fireEvent.changeText(slotInput, '14');

    // Save
    const saveBtn = getByText('Save Bay Assignment');
    await act(async () => {
      fireEvent.press(saveBtn);
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/bookings/booking-assign-bay-uuid/bay-assignment',
      {
        bayLabel: 'Bay A-14',
        facilityLevel: 'B1',
        facilityZone: 'Blue',
        slotNumber: 14,
      }
    );
  });

  it('renders and triggers vendor valet actions (Acknowledge, Ready, Complete)', async () => {
    // 1. Acknowledge when requested
    const mockRequestedBooking = {
      data: {
        data: {
          id: 'booking-valet-flow-uuid',
          bookingReference: 'PE-BK-VALET-FLOW',
          parkingSpaceTitle: 'Skyline Metro Park',
          status: 1,
          totalAmount: 150,
          startDateTime: '2026-08-18T10:00:00Z',
          endDateTime: '2026-08-18T14:00:00Z',
          pricingType: 0,
          vehicleType: 0,
          valetStatus: 1, // Requested
        },
      },
    };

    apiClient.get.mockResolvedValueOnce(mockRequestedBooking);
    apiClient.post.mockResolvedValueOnce({
      data: {
        data: {
          ...mockRequestedBooking.data.data,
          valetStatus: 2, // InProgress
        },
      },
    });

    const { findByText } = renderWithProviders(
      <BookingDetailScreen
        navigation={mockNavigation}
        route={{ params: { bookingId: 'booking-valet-flow-uuid', isVendor: true } }}
      />
    );

    const { fireEvent, act } = require('../../../utils/test-utils');
    const ackBtn = await findByText('Acknowledge Valet (Vendor)');
    expect(ackBtn).toBeTruthy();

    await act(async () => {
      fireEvent.press(ackBtn);
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/bookings/booking-valet-flow-uuid/valet/acknowledge'
    );
  });
});
