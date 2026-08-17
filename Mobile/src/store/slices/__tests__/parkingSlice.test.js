import reducer, {
  searchParkingThunk,
  getParkingDetailThunk,
  clearSearch,
  clearSelectedParking,
} from '../parkingSlice';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}));

const initialState = {
  searchResults: [],
  searchTotalCount: 0,
  searchPage: 1,
  searchLoading: false,
  searchError: null,
  selectedParking: null,
  detailLoading: false,
  myListings: [],
  listingsLoading: false,
  createLoading: false,
};

describe('parkingSlice', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should handle clearSearch', () => {
      const stateWithSearch = {
        ...initialState,
        searchResults: [{ id: 1 }],
        searchTotalCount: 1,
        searchError: 'error',
      };
      expect(reducer(stateWithSearch, clearSearch())).toEqual({
        ...initialState,
        searchResults: [],
        searchTotalCount: 0,
        searchError: null,
      });
    });

    it('should handle clearSelectedParking', () => {
      const stateWithSelected = {
        ...initialState,
        selectedParking: { id: 1 },
      };
      expect(reducer(stateWithSelected, clearSelectedParking())).toEqual({
        ...initialState,
        selectedParking: null,
      });
    });
  });

  describe('searchParkingThunk', () => {
    it('should handle pending state', () => {
      const action = { type: searchParkingThunk.pending.type };
      const state = reducer(initialState, action);
      expect(state.searchLoading).toBe(true);
      expect(state.searchError).toBeNull();
    });

    it('should handle fulfilled state (Happy Path)', () => {
      const mockPayload = {
        data: {
          parkingSpaces: [{ id: 1, name: 'Test Spot' }],
          totalCount: 1,
        },
      };
      const action = { type: searchParkingThunk.fulfilled.type, payload: mockPayload };
      const state = reducer(initialState, action);
      
      expect(state.searchLoading).toBe(false);
      expect(state.searchResults).toEqual(mockPayload.data.parkingSpaces);
      expect(state.searchTotalCount).toBe(1);
    });

    it('should handle rejected state (Error Scenario)', () => {
      const action = { type: searchParkingThunk.rejected.type, payload: 'Network Error' };
      const state = reducer(initialState, action);
      
      expect(state.searchLoading).toBe(false);
      expect(state.searchError).toBe('Network Error');
    });
  });

  describe('getParkingDetailThunk', () => {
    it('should handle pending state', () => {
      const action = { type: getParkingDetailThunk.pending.type };
      const state = reducer(initialState, action);
      expect(state.detailLoading).toBe(true);
    });

    it('should handle fulfilled state (Happy Path)', () => {
      const mockPayload = { id: 1, name: 'Detail Spot' };
      const action = { type: getParkingDetailThunk.fulfilled.type, payload: mockPayload };
      const state = reducer(initialState, action);
      
      expect(state.detailLoading).toBe(false);
      expect(state.selectedParking).toEqual(mockPayload);
    });

    it('should handle rejected state (Error Scenario)', () => {
      const action = { type: getParkingDetailThunk.rejected.type };
      const state = reducer(initialState, action);
      
      expect(state.detailLoading).toBe(false);
    });
  });
});
