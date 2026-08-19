/**
 * Review Slice
 * Reviews for parking spaces
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/api/apiClient';
import ENDPOINTS from '../../services/api/endpoints';
import { getErrorMessage } from '../../utils/errorHandler';

export const getReviewsThunk = createAsyncThunk(
    'review/getByParkingSpace',
    async (parkingSpaceId, { rejectWithValue }) => {
        try {
            const response = await apiClient.get(ENDPOINTS.REVIEWS.BY_PARKING_SPACE(parkingSpaceId));
            const data = response.data?.data || response.data;
            return Array.isArray(data) ? data : (data?.reviews || []);
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const createReviewThunk = createAsyncThunk(
    'review/create',
    async (data, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.REVIEWS.BASE, data);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

export const respondToReviewThunk = createAsyncThunk(
    'review/respond',
    async ({ reviewId, responseText }, { rejectWithValue }) => {
        try {
            const response = await apiClient.post(ENDPOINTS.REVIEWS.OWNER_RESPONSE(reviewId), { response: responseText });
            return response.data?.data || { id: reviewId, ownerResponse: responseText };
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

const initialState = {
    reviews: [],
    loading: false,
    createLoading: false,
    respondLoading: false,
    error: null,
};

const reviewSlice = createSlice({
    name: 'review',
    initialState,
    reducers: {
        clearReviews: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            .addCase(getReviewsThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(getReviewsThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.reviews = action.payload || [];
            })
            .addCase(getReviewsThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            .addCase(createReviewThunk.pending, (state) => {
                state.createLoading = true;
            })
            .addCase(createReviewThunk.fulfilled, (state, action) => {
                state.createLoading = false;
                if (action.payload) {
                    state.reviews = [action.payload, ...state.reviews];
                }
            })
            .addCase(createReviewThunk.rejected, (state) => {
                state.createLoading = false;
            })
            .addCase(respondToReviewThunk.pending, (state) => {
                state.respondLoading = true;
            })
            .addCase(respondToReviewThunk.fulfilled, (state, action) => {
                state.respondLoading = false;
                if (action.payload) {
                    const idx = state.reviews.findIndex(r => r.id === action.payload.id || r.id === action.meta.arg.reviewId);
                    if (idx !== -1) {
                        state.reviews[idx].ownerResponse = action.payload.ownerResponse || action.meta.arg.responseText;
                    }
                }
            })
            .addCase(respondToReviewThunk.rejected, (state) => {
                state.respondLoading = false;
            });
    },
});

export const { clearReviews } = reviewSlice.actions;
export default reviewSlice.reducer;
