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

    it('should correctly preserve inactive state when backend returns data: true with deactivated message', () => {
      // Step 1: Pending optimistically flips isActive from true to false and records originalState
      const pendingAction = {
        type: toggleParkingActiveThunk.pending.type,
        meta: { arg: 'space-1' },
      };
      const pendingState = reducer(stateWithListing, pendingAction);
      expect(pendingState.myListings[0].isActive).toBe(false);
      expect(pendingState.optimisticOriginalMap['space-1']).toBe(true);

      // Step 2: Backend returns ApiResponse<bool> where data is hardcoded to true, but message says deactivated
      const fulfilledAction = {
        type: toggleParkingActiveThunk.fulfilled.type,
        payload: {
          id: 'space-1',
          data: true,
          message: 'Parking space deactivated',
          rawResponse: { success: true, message: 'Parking space deactivated', data: true },
        },
        meta: { arg: 'space-1' },
      };
      const finalState = reducer(pendingState, fulfilledAction);

      expect(finalState.myListings[0].isActive).toBe(false);
      expect(finalState.togglingListingIds).not.toContain('space-1');
      expect(finalState.optimisticOriginalMap['space-1']).toBeUndefined();
    });

    it('should correctly set active state when backend returns data: true with activated message', () => {
      // Step 1: Pending optimistically flips isActive from false to true
      const pendingAction = {
        type: toggleParkingActiveThunk.pending.type,
        meta: { arg: 'space-2' },
      };
      const pendingState = reducer(stateWithListing, pendingAction);
      expect(pendingState.myListings[1].isActive).toBe(true);
      expect(pendingState.optimisticOriginalMap['space-2']).toBe(false);

      // Step 2: Backend returns ApiResponse<bool> with activated message
      const fulfilledAction = {
        type: toggleParkingActiveThunk.fulfilled.type,
        payload: {
          id: 'space-2',
          data: true,
          message: 'Parking space activated',
          rawResponse: { success: true, message: 'Parking space activated', data: true },
        },
        meta: { arg: 'space-2' },
      };
      const finalState = reducer(pendingState, fulfilledAction);

      expect(finalState.myListings[1].isActive).toBe(true);
      expect(finalState.togglingListingIds).not.toContain('space-2');
    });

    it('should invert original active state when backend returns data: true without message', () => {
      // User deactivates space-1 (was true, user flips to false)
      const pendingAction = {
        type: toggleParkingActiveThunk.pending.type,
        meta: { arg: 'space-1' },
      };
      const pendingState = reducer(stateWithListing, pendingAction);

      // Backend returns data: true with empty/generic message
      const fulfilledAction = {
        type: toggleParkingActiveThunk.fulfilled.type,
        payload: {
          id: 'space-1',
          data: true,
          message: '',
          rawResponse: { success: true, data: true },
        },
        meta: { arg: 'space-1' },
      };
      const finalState = reducer(pendingState, fulfilledAction);

      // Since originalState was true, successful toggle must invert to false
      expect(finalState.myListings[0].isActive).toBe(false);
      expect(finalState.togglingListingIds).not.toContain('space-1');
    });

    it('should revert isActive back to original state upon rejected state', () => {
      const pendingState = {
        ...stateWithListing,
        myListings: [
          { id: 'space-1', title: 'Main Garage', isActive: false },
          { id: 'space-2', title: 'Second Lot', isActive: false },
        ],
        togglingListingIds: ['space-1'],
        optimisticOriginalMap: { 'space-1': true },
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
