import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import iotService from '../../services/api/iotService';

export const fetchCameraKeys = createAsyncThunk(
    'iot/fetchCameraKeys',
    async (parkingSpaceId, { rejectWithValue }) => {
        try {
            const response = await iotService.getCameraKeys(parkingSpaceId);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch camera keys');
        }
    }
);

export const fetchPlateRules = createAsyncThunk(
    'iot/fetchPlateRules',
    async (parkingSpaceId, { rejectWithValue }) => {
        try {
            const response = await iotService.getPlateRules(parkingSpaceId);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch plate rules');
        }
    }
);

export const toggleCameraKeyThunk = createAsyncThunk(
    'iot/toggleCameraKey',
    async ({ parkingSpaceId, keyId, isEnabled }, { rejectWithValue }) => {
        try {
            const response = await iotService.toggleCameraKey(parkingSpaceId, keyId, isEnabled);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to toggle camera key');
        }
    }
);

export const createCameraKeyThunk = createAsyncThunk(
    'iot/createCameraKey',
    async ({ parkingSpaceId, keyData }, { rejectWithValue }) => {
        try {
            const response = await iotService.createCameraKey(parkingSpaceId, keyData);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create camera key');
        }
    }
);

export const deleteCameraKeyThunk = createAsyncThunk(
    'iot/deleteCameraKey',
    async ({ parkingSpaceId, keyId }, { rejectWithValue }) => {
        try {
            await iotService.deleteCameraKey(parkingSpaceId, keyId);
            return keyId;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete camera key');
        }
    }
);

export const createPlateRuleThunk = createAsyncThunk(
    'iot/createPlateRule',
    async ({ parkingSpaceId, ruleData }, { rejectWithValue }) => {
        try {
            const response = await iotService.createPlateRule(parkingSpaceId, ruleData);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create plate rule');
        }
    }
);

export const togglePlateRuleThunk = createAsyncThunk(
    'iot/togglePlateRule',
    async ({ parkingSpaceId, ruleId, isEnabled }, { rejectWithValue }) => {
        try {
            const response = await iotService.togglePlateRule(parkingSpaceId, ruleId, isEnabled);
            return response.data || response;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to toggle plate rule');
        }
    }
);

export const deletePlateRuleThunk = createAsyncThunk(
    'iot/deletePlateRule',
    async ({ parkingSpaceId, ruleId }, { rejectWithValue }) => {
        try {
            await iotService.deletePlateRule(parkingSpaceId, ruleId);
            return ruleId;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete plate rule');
        }
    }
);

const iotSlice = createSlice({
    name: 'iot',
    initialState: {
        cameraKeys: [],
        plateRules: [],
        isLoading: false,
        error: null,
    },
    reducers: {
        clearIotState: (state) => {
            state.cameraKeys = [];
            state.plateRules = [];
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCameraKeys.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchCameraKeys.fulfilled, (state, action) => {
                state.isLoading = false;
                state.cameraKeys = action.payload || [];
            })
            .addCase(fetchCameraKeys.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchPlateRules.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchPlateRules.fulfilled, (state, action) => {
                state.isLoading = false;
                state.plateRules = action.payload || [];
            })
            .addCase(fetchPlateRules.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    }
});

export const { clearIotState } = iotSlice.actions;
export default iotSlice.reducer;
