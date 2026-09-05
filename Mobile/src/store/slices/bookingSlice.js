/**
 * Booking Slice
 * State for user bookings, vendor bookings, and booking operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/api/apiClient';
import ENDPOINTS from '../../services/api/endpoints';
import { getErrorMessage } from '../../utils/errorHandler';

export const getMyBookingsThunk = createAsyncThunk(
    'booking/getMyBookings',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(ENDPOINTS.BOOKINGS.MY_BOOKINGS, { params });
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const getBookingDetailThunk = createAsyncThunk(
    'booking/getDetail',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(ENDPOINTS.BOOKINGS.BY_ID(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const createBookingThunk = createAsyncThunk(
    'booking/create',
    async (data, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.BASE, data);
            if (!response.data.success) {
                return rejectWithValue(response.data.message);
            }
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const cancelBookingThunk = createAsyncThunk(
    'booking/cancel',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.CANCEL(id), { reason });
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const calculatePriceThunk = createAsyncThunk(
    'booking/calculatePrice',
    async (data, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.CALCULATE_PRICE, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Vendor actions
export const getVendorBookingsThunk = createAsyncThunk(
    'booking/getVendorBookings',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(ENDPOINTS.BOOKINGS.VENDOR_BOOKINGS, { params });
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const approveBookingThunk = createAsyncThunk(
    'booking/approve',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.APPROVE(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const rejectBookingThunk = createAsyncThunk(
    'booking/reject',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.REJECT(id), { reason });
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Valet Lifecycle
export const requestValetThunk = createAsyncThunk(
    'booking/requestValet',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.VALET_REQUEST(id), data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const cancelValetThunk = createAsyncThunk(
    'booking/cancelValet',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.VALET_CANCEL(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const acknowledgeValetThunk = createAsyncThunk(
    'booking/acknowledgeValet',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.VALET_ACKNOWLEDGE(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const readyValetThunk = createAsyncThunk(
    'booking/readyValet',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.VALET_READY(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const completeValetThunk = createAsyncThunk(
    'booking/completeValet',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.VALET_COMPLETE(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Bay Assignment
export const assignBayThunk = createAsyncThunk(
    'booking/assignBay',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.BAY_ASSIGNMENT(id), data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Access Pass
export const getAccessPassThunk = createAsyncThunk(
    'booking/getAccessPass',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(ENDPOINTS.BOOKINGS.ACCESS_PASS(id));
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const verifyAccessPassThunk = createAsyncThunk(
    'booking/verifyAccessPass',
    async (token, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.ACCESS_PASS_VERIFY, { token });
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const getGoogleWalletPassThunk = createAsyncThunk(
    'booking/getGoogleWalletPass',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(ENDPOINTS.BOOKINGS.ACCESS_PASS_GOOGLE(id));
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const updateBookingThunk = createAsyncThunk(
    'booking/update',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await apiClient.put(ENDPOINTS.BOOKINGS.BY_ID(id), data);
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);


// Check-in & Check-out Lifecycle
export const checkInThunk = createAsyncThunk(
    'booking/checkIn',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.CHECK_IN(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const checkOutThunk = createAsyncThunk(
    'booking/checkOut',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.CHECK_OUT(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// Booking Extensions
export const extendBookingThunk = createAsyncThunk(
    'booking/extend',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.EXTEND(id), data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const approveExtensionThunk = createAsyncThunk(
    'booking/approveExtension',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.APPROVE_EXTENSION(id));
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const rejectExtensionThunk = createAsyncThunk(
    'booking/rejectExtension',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.BOOKINGS.REJECT_EXTENSION(id), { reason });
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

// EV Session
export const getEvSessionThunk = createAsyncThunk(
    'booking/getEvSession',
    async (id, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(ENDPOINTS.BOOKINGS.EV_SESSION(id));
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

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

const bookingSlice = createSlice({
    name: 'booking',
    initialState,
    reducers: {
        clearBookingDetail: (state) => {
            state.selectedBooking = null;
        },
        clearPriceBreakdown: (state) => {
            state.priceBreakdown = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // My Bookings
            .addCase(getMyBookingsThunk.pending, (state) => {
                state.myBookingsLoading = true;
                state.myBookingsError = null;
            })
            .addCase(getMyBookingsThunk.fulfilled, (state, action) => {
                state.myBookingsLoading = false;
                const bookings = Array.isArray(action.payload)
                    ? action.payload
                    : (Array.isArray(action.payload?.bookings) ? action.payload.bookings : (Array.isArray(action.payload?.items) ? action.payload.items : []));
                state.myBookings = bookings;
            })
            .addCase(getMyBookingsThunk.rejected, (state, action) => {
                state.myBookingsLoading = false;
                state.myBookingsError = action.payload;
            })
            // Booking Detail
            .addCase(getBookingDetailThunk.pending, (state) => {
                state.detailLoading = true;
            })
            .addCase(getBookingDetailThunk.fulfilled, (state, action) => {
                state.detailLoading = false;
                state.selectedBooking = action.payload;
            })
            .addCase(getBookingDetailThunk.rejected, (state) => {
                state.detailLoading = false;
            })
            // Create Booking
            .addCase(createBookingThunk.pending, (state) => {
                state.createLoading = true;
            })
            .addCase(createBookingThunk.fulfilled, (state, action) => {
                state.createLoading = false;
                if (action.payload) {
                    state.myBookings = [action.payload, ...state.myBookings];
                }
            })
            .addCase(createBookingThunk.rejected, (state) => {
                state.createLoading = false;
            })
            // Cancel Booking
            .addCase(cancelBookingThunk.fulfilled, (state, action) => {
                if (action.payload) {
                    const idx = state.myBookings.findIndex((b) => b.id === action.payload.id);
                    if (idx !== -1) state.myBookings[idx] = action.payload;
                    if (state.selectedBooking?.id === action.payload.id) {
                        state.selectedBooking = action.payload;
                    }
                }
            })
            // Calculate Price
            .addCase(calculatePriceThunk.pending, (state) => {
                state.priceLoading = true;
            })
            .addCase(calculatePriceThunk.fulfilled, (state, action) => {
                state.priceLoading = false;
                state.priceBreakdown = action.payload;
            })
            .addCase(calculatePriceThunk.rejected, (state) => {
                state.priceLoading = false;
            })
            // Vendor Bookings
            .addCase(getVendorBookingsThunk.pending, (state) => {
                state.vendorBookingsLoading = true;
            })
            .addCase(getVendorBookingsThunk.fulfilled, (state, action) => {
                state.vendorBookingsLoading = false;
                const bookings = Array.isArray(action.payload)
                    ? action.payload
                    : (Array.isArray(action.payload?.bookings) ? action.payload.bookings : (Array.isArray(action.payload?.items) ? action.payload.items : []));
                state.vendorBookings = bookings;
            })
            .addCase(getVendorBookingsThunk.rejected, (state) => {
                state.vendorBookingsLoading = false;
            })
            // Approve
            .addCase(approveBookingThunk.fulfilled, (state, action) => {
                if (action.payload) {
                    const idx = state.vendorBookings.findIndex((b) => b.id === action.payload.id);
                    if (idx !== -1) state.vendorBookings[idx] = action.payload;
                }
            })
            // Reject
            .addCase(rejectBookingThunk.fulfilled, (state, action) => {
                if (action.payload) {
                    const idx = state.vendorBookings.findIndex((b) => b.id === action.payload.id);
                    if (idx !== -1) state.vendorBookings[idx] = action.payload;
                }
            })
            // Lifecycle, Extension, Valet & Bay Assignment updates (common helper to update state)
            .addMatcher(
                (action) => [
                    checkInThunk.fulfilled.type,
                    checkOutThunk.fulfilled.type,
                    extendBookingThunk.fulfilled.type,
                    approveExtensionThunk.fulfilled.type,
                    rejectExtensionThunk.fulfilled.type,
                    requestValetThunk.fulfilled.type,
                    cancelValetThunk.fulfilled.type,
                    acknowledgeValetThunk.fulfilled.type,
                    readyValetThunk.fulfilled.type,
                    completeValetThunk.fulfilled.type,
                    assignBayThunk.fulfilled.type,
                ].includes(action.type),
                (state, action) => {
                    if (action.payload) {
                        const updatedBooking = action.payload;
                        if (state.selectedBooking?.id === updatedBooking.id) {
                            state.selectedBooking = updatedBooking;
                        }
                        const myIdx = state.myBookings.findIndex(b => b.id === updatedBooking.id);
                        if (myIdx !== -1) state.myBookings[myIdx] = updatedBooking;
                        
                        const vendorIdx = state.vendorBookings.findIndex(b => b.id === updatedBooking.id);
                        if (vendorIdx !== -1) state.vendorBookings[vendorIdx] = updatedBooking;
                    }
                }
            );
    },
});

export const { clearBookingDetail, clearPriceBreakdown } = bookingSlice.actions;
export default bookingSlice.reducer;
