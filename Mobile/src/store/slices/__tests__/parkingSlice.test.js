import reducer, {
  searchParkingThunk,
  getParkingDetailThunk,
  toggleParkingActiveThunk,
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

  describe('toggleParkingActiveThunk', () => {
    const stateWithListing = {
      ...initialState,
      myListings: [
        { id: 'space-1', title: 'Main Garage', isActive: true },
        { id: 'space-2', title: 'Second Lot', isActive: false },
      ],
      togglingListingIds: [],
    };

    it('should optimistically invert isActive and track id in pending state', () => {
      const action = {
        type: toggleParkingActiveThunk.pending.type,
        meta: { arg: 'space-1' },
      };
      const state = reducer(stateWithListing, action);

      expect(state.myListings[0].isActive).toBe(false);
      expect(state.myListings[1].isActive).toBe(false);
      expect(state.togglingListingIds).toContain('space-1');
    });

    it('should reconcile updated listing and remove id in fulfilled state with object payload', () => {
      const pendingState = {
        ...stateWithListing,
        myListings: [
          { id: 'space-1', title: 'Main Garage', isActive: false },
          { id: 'space-2', title: 'Second Lot', isActive: false },
        ],
        togglingListingIds: ['space-1'],
      };
      const action = {
        type: toggleParkingActiveThunk.fulfilled.type,
        payload: { id: 'space-1', title: 'Main Garage', isActive: false },
        meta: { arg: 'space-1' },
      };
      const state = reducer(pendingState, action);

      expect(state.myListings[0].isActive).toBe(false);
      expect(state.togglingListingIds).not.toContain('space-1');
    });

    it('should reconcile updated listing and remove id in fulfilled state with boolean payload', () => {
      const pendingState = {
        ...stateWithListing,
        myListings: [
          { id: 'space-1', title: 'Main Garage', isActive: false },
          { id: 'space-2', title: 'Second Lot', isActive: false },
        ],
        togglingListingIds: ['space-1'],
      };
      const action = {
        type: toggleParkingActiveThunk.fulfilled.type,
        payload: false,
        meta: { arg: 'space-1' },
      };
      const state = reducer(pendingState, action);

      expect(state.myListings[0].isActive).toBe(false);
      expect(state.togglingListingIds).not.toContain('space-1');
    });

    it('should revert isActive back to original state upon rejected state', () => {
      const pendingState = {
        ...stateWithListing,
        myListings: [
          { id: 'space-1', title: 'Main Garage', isActive: false },
          { id: 'space-2', title: 'Second Lot', isActive: false },
        ],
        togglingListingIds: ['space-1'],
      };
      const action = {
        type: toggleParkingActiveThunk.rejected.type,
        meta: { arg: 'space-1' },
      };
      const state = reducer(pendingState, action);

      expect(state.myListings[0].isActive).toBe(true);
      expect(state.togglingListingIds).not.toContain('space-1');
    });
  });
});
