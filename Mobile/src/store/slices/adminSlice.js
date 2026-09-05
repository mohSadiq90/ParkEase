/**
 * Platform Admin Slice
 * State management for Platform Admin operations (API_ENDPOINTS_MOBILE.md Section 21)
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import adminService from '../../services/api/adminService';
import { getErrorMessage } from '../../utils/errorHandler';

// 21.1 Dashboard
export const getAdminDashboardThunk = createAsyncThunk(
    'admin/getDashboard',
    async (_, { rejectWithValue }) => {
        try {
            const response = await adminService.getDashboard();
            return response.data || response;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 21.2 Users
export const getAdminUsersThunk = createAsyncThunk(
    'admin/getUsers',
    async (params, { rejectWithValue }) => {
        try {
            const response = await adminService.getUsers(params);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const activateUserThunk = createAsyncThunk(
    'admin/activateUser',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await adminService.activateUser(id, reason);
            return { id, result: response.data || response };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const deactivateUserThunk = createAsyncThunk(
    'admin/deactivateUser',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await adminService.deactivateUser(id, reason);
            return { id, result: response.data || response };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 21.3 Listings
export const getAdminListingsThunk = createAsyncThunk(
    'admin/getListings',
    async (params, { rejectWithValue }) => {
        try {
            const response = await adminService.getListings(params);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const verifyListingThunk = createAsyncThunk(
    'admin/verifyListing',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await adminService.verifyListing(id, reason);
            return { id, isVerified: true, result: response.data || response };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const unverifyListingThunk = createAsyncThunk(
    'admin/unverifyListing',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await adminService.unverifyListing(id, reason);
            return { id, isVerified: false, result: response.data || response };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 21.4 Bookings
export const getAdminBookingsThunk = createAsyncThunk(
    'admin/getBookings',
    async (params, { rejectWithValue }) => {
        try {
            const response = await adminService.getBookings(params);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const forceCancelAdminBookingThunk = createAsyncThunk(
    'admin/cancelBooking',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await adminService.forceCancelBooking(id, reason);
            return { id, result: response.data || response };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 21.5 Payments
export const getAdminPaymentsThunk = createAsyncThunk(
    'admin/getPayments',
    async (params, { rejectWithValue }) => {
        try {
            const response = await adminService.getPayments(params);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const processAdminRefundThunk = createAsyncThunk(
    'admin/refundPayment',
    async ({ paymentId, refundData }, { rejectWithValue }) => {
        try {
            const response = await adminService.processAdminRefund(paymentId, refundData);
            return { paymentId, result: response.data || response };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 21.6 Audit
export const getAdminAuditLogsThunk = createAsyncThunk(
    'admin/getAuditLogs',
    async (params, { rejectWithValue }) => {
        try {
            const response = await adminService.getAuditLogs(params);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// 21.8 Outbox
export const getAdminOutboxThunk = createAsyncThunk(
    'admin/getOutbox',
    async (params, { rejectWithValue }) => {
        try {
            const response = await adminService.getOutboxMessages(params);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const processOutboxBatchThunk = createAsyncThunk(
    'admin/processOutbox',
    async (batchSize = 50, { rejectWithValue }) => {
        try {
            const response = await adminService.processOutboxBatch(batchSize);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

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

const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        clearAdminError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Dashboard
            .addCase(getAdminDashboardThunk.pending, (state) => {
                state.dashboardLoading = true;
                state.error = null;
            })
            .addCase(getAdminDashboardThunk.fulfilled, (state, action) => {
                state.dashboardLoading = false;
                state.dashboard = action.payload;
            })
            .addCase(getAdminDashboardThunk.rejected, (state, action) => {
                state.dashboardLoading = false;
                state.error = action.payload;
            })

            // Users
            .addCase(getAdminUsersThunk.pending, (state) => {
                state.usersLoading = true;
            })
            .addCase(getAdminUsersThunk.fulfilled, (state, action) => {
                state.usersLoading = false;
                const items = action.payload?.items || (Array.isArray(action.payload) ? action.payload : []);
                state.users = items;
            })
            .addCase(getAdminUsersThunk.rejected, (state, action) => {
                state.usersLoading = false;
                state.error = action.payload;
            })

            // Listings
            .addCase(getAdminListingsThunk.pending, (state) => {
                state.listingsLoading = true;
            })
            .addCase(getAdminListingsThunk.fulfilled, (state, action) => {
                state.listingsLoading = false;
                const items = action.payload?.items || (Array.isArray(action.payload) ? action.payload : []);
                state.listings = items;
            })
            .addCase(getAdminListingsThunk.rejected, (state, action) => {
                state.listingsLoading = false;
                state.error = action.payload;
            })
            .addCase(verifyListingThunk.fulfilled, (state, action) => {
                const idx = state.listings.findIndex((l) => l.id === action.payload.id);
                if (idx !== -1) state.listings[idx].isVerified = action.payload.isVerified;
            })
            .addCase(unverifyListingThunk.fulfilled, (state, action) => {
                const idx = state.listings.findIndex((l) => l.id === action.payload.id);
                if (idx !== -1) state.listings[idx].isVerified = action.payload.isVerified;
            })

            // Bookings
            .addCase(getAdminBookingsThunk.fulfilled, (state, action) => {
                state.bookingsLoading = false;
                const items = action.payload?.items || (Array.isArray(action.payload) ? action.payload : []);
                state.bookings = items;
            })

            // Payments
            .addCase(getAdminPaymentsThunk.fulfilled, (state, action) => {
                state.paymentsLoading = false;
                const items = action.payload?.items || (Array.isArray(action.payload) ? action.payload : []);
                state.payments = items;
            })

            // Audit
            .addCase(getAdminAuditLogsThunk.fulfilled, (state, action) => {
                state.auditLogsLoading = false;
                const items = action.payload?.items || (Array.isArray(action.payload) ? action.payload : []);
                state.auditLogs = items;
            })

            // Outbox
            .addCase(getAdminOutboxThunk.fulfilled, (state, action) => {
                state.outboxLoading = false;
                const items = action.payload?.items || (Array.isArray(action.payload) ? action.payload : []);
                state.outboxMessages = items;
            });
    },
});

export const { clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;
