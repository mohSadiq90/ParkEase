import reducer, {
  getMyBookingsThunk,
  createBookingThunk,
  cancelBookingThunk,
  clearBookingDetail,
} from '../bookingSlice';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

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

describe('bookingSlice', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should handle clearBookingDetail', () => {
      const stateWithDetail = {
        ...initialState,
        selectedBooking: { id: 1 },
      };
      expect(reducer(stateWithDetail, clearBookingDetail())).toEqual({
        ...initialState,
        selectedBooking: null,
      });
    });
  });

  describe('getMyBookingsThunk', () => {
    it('should handle pending state', () => {
      const action = { type: getMyBookingsThunk.pending.type };
      const state = reducer(initialState, action);
      expect(state.myBookingsLoading).toBe(true);
      expect(state.myBookingsError).toBeNull();
    });

    it('should handle fulfilled state (Happy Path)', () => {
      const mockPayload = {
        bookings: [{ id: 1, status: 'PENDING' }],
      };
      const action = { type: getMyBookingsThunk.fulfilled.type, payload: mockPayload };
      const state = reducer(initialState, action);
      
      expect(state.myBookingsLoading).toBe(false);
      expect(state.myBookings).toEqual(mockPayload.bookings);
    });
  });

  describe('createBookingThunk', () => {
    it('should handle pending state', () => {
      const action = { type: createBookingThunk.pending.type };
      const state = reducer(initialState, action);
      expect(state.createLoading).toBe(true);
    });

    it('should handle fulfilled state (Happy Path)', () => {
      const mockPayload = { id: 2, status: 'PENDING' };
      const action = { type: createBookingThunk.fulfilled.type, payload: mockPayload };
      const state = reducer(initialState, action);
      
      expect(state.createLoading).toBe(false);
      expect(state.myBookings).toEqual([mockPayload]);
    });

    it('should handle rejected state (Error Scenario)', () => {
      const action = { type: createBookingThunk.rejected.type, payload: 'Spot Unavailable' };
      const state = reducer(initialState, action);
      
      expect(state.createLoading).toBe(false);
    });
  });
});
