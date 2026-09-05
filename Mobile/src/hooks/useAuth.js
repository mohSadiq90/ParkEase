/**
 * useAuth Hook
 * Wraps Redux auth state and dispatch for convenient access
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    loginThunk, 
    loginCorporateThunk,
    loginCorporateSsoThunk,
    completeCorporateSsoThunk,
    loginExternalThunk,
    switchChannelThunk,
    registerThunk, 
    logoutThunk, 
    updateProfileThunk, 
    clearError 
} from '../store/slices/authSlice';
import { UserRole } from '../utils/constants';

export const useAuth = () => {
    const dispatch = useDispatch();
    const { 
        user, 
        token,
        channel,
        companyId,
        companyRole,
        corporateCompanies,
        loading, 
        error, 
        isAuthenticated, 
        isSessionChecked 
    } = useSelector((state) => state.auth);

    const login = useCallback(
        (credentials) => dispatch(loginThunk(credentials)),
        [dispatch]
    );

    const loginCorporate = useCallback(
        (credentials) => dispatch(loginCorporateThunk(credentials)),
        [dispatch]
    );

    const loginCorporateSso = useCallback(
        (options) => dispatch(loginCorporateSsoThunk(options)),
        [dispatch]
    );

    const completeCorporateSso = useCallback(
        (payload) => dispatch(completeCorporateSsoThunk(payload)),
        [dispatch]
    );

    const loginExternal = useCallback(
        (payload) => dispatch(loginExternalThunk(payload)),
        [dispatch]
    );

    const switchChannel = useCallback(
        (channelData) => dispatch(switchChannelThunk(channelData)),
        [dispatch]
    );

    const register = useCallback(
        (data) => dispatch(registerThunk(data)),
        [dispatch]
    );

    const logout = useCallback(
        () => dispatch(logoutThunk()),
        [dispatch]
    );

    const updateProfile = useCallback(
        (data) => dispatch(updateProfileThunk(data)),
        [dispatch]
    );

    const dismissError = useCallback(
        () => dispatch(clearError()),
        [dispatch]
    );

    const isVendor = user?.role === UserRole.Vendor || user?.role === UserRole.Admin;
    const isMember = user?.role === UserRole.Member;
    const isAdmin = user?.role === UserRole.Admin;
    const isCorporate = channel === 'Corporate';

    return {
        user,
        token,
        channel,
        companyId,
        companyRole,
        corporateCompanies,
        loading,
        error,
        isAuthenticated,
        isSessionChecked,
        isVendor,
        isMember,
        isAdmin,
        isCorporate,
        login,
        loginCorporate,
        loginCorporateSso,
        completeCorporateSso,
        loginExternal,
        switchChannel,
        register,
        logout,
        updateProfile,
        dismissError,
    };
};

export default useAuth;
