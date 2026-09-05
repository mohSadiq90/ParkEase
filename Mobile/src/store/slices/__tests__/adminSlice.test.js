import adminReducer, {
    getAdminDashboardThunk,
    getAdminUsersThunk,
    verifyListingThunk,
    clearAdminError,
} from '../adminSlice';

describe('adminSlice', () => {
    const initialState = {
        dashboard: null,
        dashboardLoading: false,
        users: [],
        usersLoading: false,
        listings: [],
        listingsLoading: false,
        bookings: [],
        bookingsLoading: false,
        payments: [],
        paymentsLoading: false,
        auditLogs: [],
        auditLogsLoading: false,
        outboxMessages: [],
        outboxLoading: false,
        actionLoading: false,
        error: null,
    };

    it('returns the initial state by default', () => {
        expect(adminReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('handles getAdminDashboardThunk.pending and fulfilled', () => {
        const loadingState = adminReducer(
            initialState,
            getAdminDashboardThunk.pending('req-1')
        );
        expect(loadingState.dashboardLoading).toBe(true);

        const mockDashboard = {
            totalUsers: 1500,
            activeUsers: 900,
            totalBookings: 6000,
            revenueToday: 25000,
        };

        const fulfilledState = adminReducer(
            loadingState,
            getAdminDashboardThunk.fulfilled(mockDashboard)
        );

        expect(fulfilledState.dashboardLoading).toBe(false);
        expect(fulfilledState.dashboard).toEqual(mockDashboard);
    });

    it('handles getAdminUsersThunk.fulfilled with items', () => {
        const mockUsers = [
            { id: 'u-1', email: 'test@domain.com', role: 'Member' },
        ];

        const state = adminReducer(
            initialState,
            getAdminUsersThunk.fulfilled({ items: mockUsers })
        );

        expect(state.usersLoading).toBe(false);
        expect(state.users).toEqual(mockUsers);
    });

    it('handles verifyListingThunk.fulfilled and marks listing verified', () => {
        const stateWithListings = {
            ...initialState,
            listings: [
                { id: 'list-1', title: 'Listing 1', isVerified: false },
                { id: 'list-2', title: 'Listing 2', isVerified: false },
            ],
        };

        const state = adminReducer(
            stateWithListings,
            verifyListingThunk.fulfilled({ id: 'list-1', isVerified: true })
        );

        expect(state.listings[0].isVerified).toBe(true);
        expect(state.listings[1].isVerified).toBe(false);
    });

    it('clears error when clearAdminError is dispatched', () => {
        const stateWithError = {
            ...initialState,
            error: 'Failed to fetch admin data',
        };

        expect(adminReducer(stateWithError, clearAdminError())).toEqual(initialState);
    });
});
