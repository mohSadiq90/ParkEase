/**
 * Auth Slice
 * Authentication state management with thunks matching API_ENDPOINTS_MOBILE.md Section 3
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/auth/authService';
import { getErrorMessage } from '../../utils/errorHandler';
import { getExternalAuthErrorMessage } from '../../utils/externalAuthErrors';

/**
 * Login thunk
 */
export const loginThunk = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const result = await authService.login(credentials);
            if (!result.success) {
                return rejectWithValue(result.message || 'Login failed');
            }
            return result.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Corporate login thunk
 */
export const loginCorporateThunk = createAsyncThunk(
    'auth/loginCorporate',
    async (credentials, { rejectWithValue }) => {
        try {
            const result = await authService.loginCorporate(credentials);
            if (!result.success) {
                return rejectWithValue(result.message || 'Corporate login failed');
            }
            return result.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * External social login thunk (Google)
 */
export const loginExternalThunk = createAsyncThunk(
    'auth/loginExternal',
    async (payload, { rejectWithValue }) => {
        try {
            const result = await authService.loginExternal(payload);
            if (!result.success) {
                return rejectWithValue(getExternalAuthErrorMessage(result));
            }
            return result.data;
        } catch (error) {
            return rejectWithValue(getExternalAuthErrorMessage(error));
        }
    }
);


/**
 * Switch channel thunk
 */
export const switchChannelThunk = createAsyncThunk(
    'auth/switchChannel',
    async (channelData, { rejectWithValue }) => {
        try {
            const result = await authService.switchChannel(channelData);
            if (!result.success) {
                return rejectWithValue(result.message || 'Channel switch failed');
            }
            return result.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Get channel context thunk
 */
export const getChannelContextThunk = createAsyncThunk(
    'auth/getChannelContext',
    async (_, { rejectWithValue }) => {
        try {
            const result = await authService.getChannelContext();
            return result.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Register thunk
 */
export const registerThunk = createAsyncThunk(
    'auth/register',
    async (data, { rejectWithValue }) => {
        try {
            const result = await authService.register(data);
            if (!result.success) {
                return rejectWithValue(result.message || 'Registration failed');
            }
            return result.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Logout thunk
 */
export const logoutThunk = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await authService.logout();
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Restore session thunk
 */
export const restoreSessionThunk = createAsyncThunk(
    'auth/restoreSession',
    async (_, { rejectWithValue }) => {
        try {
            const user = await authService.tryRestoreSession();
            if (!user) {
                return rejectWithValue('No active session');
            }
            return user;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Update profile thunk
 */
export const updateProfileThunk = createAsyncThunk(
    'auth/updateProfile',
    async (data, { rejectWithValue }) => {
        try {
            const result = await authService.updateProfile(data);
            if (!result.success) {
                return rejectWithValue(result.message || 'Update failed');
            }
            return result.data;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Change password thunk
 */
export const changePasswordThunk = createAsyncThunk(
    'auth/changePassword',
    async (data, { rejectWithValue }) => {
        try {
            const result = await authService.changePassword(data);
            if (!result.success) {
                return rejectWithValue(result.message || 'Password change failed');
            }
            return result;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Set password thunk (for social login accounts)
 */
export const setPasswordThunk = createAsyncThunk(
    'auth/setPassword',
    async (data, { rejectWithValue }) => {
        try {
            const result = await authService.setPassword(data);
            if (!result.success) {
                return rejectWithValue(result.message || 'Setting password failed');
            }
            return result;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

/**
 * Delete account thunk
 */
export const deleteAccountThunk = createAsyncThunk(
    'auth/deleteAccount',
    async (_, { rejectWithValue }) => {
        try {
            const result = await authService.deleteAccount();
            return result;
        } catch (error) {
            return rejectWithValue(getErrorMessage(error));
        }
    }
);

const initialState = {
    user: null,
    token: null,
    channel: 'Marketplace',
    companyId: null,
    companyRole: null,
    corporateCompanies: [],
    loading: false,
    error: null,
    isAuthenticated: false,
    isSessionChecked: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        resetAuth: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.accessToken || action.payload.token;
                state.channel = action.payload.channel || 'Marketplace';
                state.companyId = action.payload.companyId || null;
                state.companyRole = action.payload.companyRole || null;
                state.isAuthenticated = true;
                state.isSessionChecked = true;
            })
            .addCase(loginThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                state.isAuthenticated = false;
            })

            // Corporate Login
            .addCase(loginCorporateThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginCorporateThunk.fulfilled, (state, action) => {
                state.loading = false;
                const session = action.payload.session || action.payload;
                state.user = session.user;
                state.token = session.accessToken || session.token;
                state.channel = 'Corporate';
                state.companyId = session.companyId || null;
                state.companyRole = session.companyRole || null;
                state.corporateCompanies = action.payload.companies || [];
                state.isAuthenticated = true;
                state.isSessionChecked = true;
            })
            .addCase(loginCorporateThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // External / Social Login
            .addCase(loginExternalThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginExternalThunk.fulfilled, (state, action) => {
                state.loading = false;
                const session = action.payload.tokens || action.payload;
                state.user = action.payload.user || session.user;
                state.token = session.accessToken || session.token;
                state.channel = 'Marketplace';
                state.isAuthenticated = true;
                state.isSessionChecked = true;
            })
            .addCase(loginExternalThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Switch Channel
            .addCase(switchChannelThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.accessToken || action.payload.token;
                state.channel = action.payload.channel || state.channel;
                state.companyId = action.payload.companyId || null;
                state.companyRole = action.payload.companyRole || null;
                if (action.payload.user) state.user = action.payload.user;
            })

            // Channel Context
            .addCase(getChannelContextThunk.fulfilled, (state, action) => {
                if (action.payload) {
                    state.channel = action.payload.channel || state.channel;
                    state.companyId = action.payload.companyId || state.companyId;
                    state.companyRole = action.payload.companyRole || state.companyRole;
                }
            })

            // Register
            .addCase(registerThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(registerThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload.user;
                state.token = action.payload.accessToken || action.payload.token;
                state.channel = action.payload.channel || 'Marketplace';
                state.isAuthenticated = true;
                state.isSessionChecked = true;
            })
            .addCase(registerThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Logout
            .addCase(logoutThunk.fulfilled, (state) => {
                Object.assign(state, { ...initialState, isSessionChecked: true });
            })

            // Delete Account
            .addCase(deleteAccountThunk.fulfilled, (state) => {
                Object.assign(state, { ...initialState, isSessionChecked: true });
            })

            // Restore Session
            .addCase(restoreSessionThunk.pending, (state) => {
                state.loading = true;
            })
            .addCase(restoreSessionThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
                state.isSessionChecked = true;
            })
            .addCase(restoreSessionThunk.rejected, (state) => {
                state.loading = false;
                state.isAuthenticated = false;
                state.isSessionChecked = true;
            })

            // Update Profile
            .addCase(updateProfileThunk.fulfilled, (state, action) => {
                state.user = action.payload;
            });
    },
});

export const { clearError, resetAuth } = authSlice.actions;
export default authSlice.reducer;
