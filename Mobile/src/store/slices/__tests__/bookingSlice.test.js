import reducer, {
  getMyBookingsThunk,
  createBookingThunk,
  cancelBookingThunk,
  clearBookingDetail,
  assignBayThunk,
  requestValetThunk,
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

  describe('assignBayThunk and valet lifecycle updates', () => {
    it('should update selectedBooking and myBookings with assigned bay details', () => {
      const existingState = {
        ...initialState,
        selectedBooking: { id: 10, status: 'CONFIRMED', totalAmount: 100 },
        myBookings: [{ id: 10, status: 'CONFIRMED' }, { id: 11, status: 'PENDING' }],
        vendorBookings: [{ id: 10, status: 'CONFIRMED' }],
      };

      const updatedData = {
        id: 10,
        bayLabel: 'A1-001',
        facilityLevel: 'B1',
        facilityZone: 'Blue',
        slotNumber: 12,
      };

      const action = { type: assignBayThunk.fulfilled.type, payload: updatedData };
      const state = reducer(existingState, action);

      expect(state.selectedBooking).toEqual({
        id: 10,
        status: 'CONFIRMED',
        totalAmount: 100,
        bayLabel: 'A1-001',
        facilityLevel: 'B1',
        facilityZone: 'Blue',
        slotNumber: 12,
      });
      expect(state.myBookings[0].bayLabel).toBe('A1-001');
      expect(state.vendorBookings[0].bayLabel).toBe('A1-001');
    });

    it('should update valetStatus on requestValetThunk fulfilled', () => {
      const existingState = {
        ...initialState,
        selectedBooking: { id: 20, status: 'CONFIRMED', valetStatus: 0 },
        myBookings: [{ id: 20, status: 'CONFIRMED', valetStatus: 0 }],
      };

      const updatedValet = {
        id: 20,
        valetStatus: 1,
        valetNotes: 'Gate 2',
      };

      const action = { type: requestValetThunk.fulfilled.type, payload: updatedValet };
      const state = reducer(existingState, action);

      expect(state.selectedBooking.valetStatus).toBe(1);
      expect(state.selectedBooking.valetNotes).toBe('Gate 2');
      expect(state.myBookings[0].valetStatus).toBe(1);
    });
  });
});
