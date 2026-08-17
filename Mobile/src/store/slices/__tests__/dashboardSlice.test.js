import reducer, {
  getMemberDashboardThunk,
  getVendorDashboardThunk,
  clearDashboard,
} from '../dashboardSlice';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient', () => ({
  get: jest.fn(),
}));

const initialState = {
  memberDashboard: null,
  vendorDashboard: null,
  loading: false,
  error: null,
};

describe('dashboardSlice', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should handle clearDashboard', () => {
      const stateWithData = {
        ...initialState,
        vendorDashboard: { stats: {} },
      };
      expect(reducer(stateWithData, clearDashboard())).toEqual(initialState);
    });
  });

  describe('getVendorDashboardThunk', () => {
    it('should handle pending state', () => {
      const action = { type: getVendorDashboardThunk.pending.type };
      const state = reducer(initialState, action);
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state', () => {
      const mockPayload = { revenue: 500, activeBookings: 2 };
      const action = { type: getVendorDashboardThunk.fulfilled.type, payload: mockPayload };
      const state = reducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.vendorDashboard).toEqual(mockPayload);
    });

    it('should handle rejected state', () => {
      const action = { type: getVendorDashboardThunk.rejected.type, payload: 'Failed to load' };
      const state = reducer(initialState, action);
      
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Failed to load');
    });
  });
});
