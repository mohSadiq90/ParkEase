import reducer, { clearBookingDetail } from '../bookingSlice';

describe('bookingSlice unit tests', () => {
  const initialState = {
    myBookings: [],
    myBookingsLoading: false,
    myBookingsError: null,
    vendorBookings: [],
    vendorBookingsLoading: false,
    selectedBooking: null,
    detailLoading: false,
    createLoading: false,
    priceBreakdown: null,
    priceLoading: false,
    actionLoading: false,
  };

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearBookingDetail', () => {
    const stateWithData = {
      ...initialState,
      selectedBooking: { id: 1, title: 'Test Booking' },
    };
    
    const state = reducer(stateWithData, clearBookingDetail());
    
    expect(state.selectedBooking).toBeNull();
  });
});
