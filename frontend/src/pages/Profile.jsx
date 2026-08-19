import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LinkedAccountsSection from '../components/LinkedAccountsSection';
import showToast from '../utils/toast.jsx';
import {
  PASSWORD_POLICY_HINT,
  validatePasswordPolicy,
} from '../utils/passwordPolicy';
import './Profile.css';

const ROLE_LABELS = { 0: 'Admin', 1: 'User', Admin: 'Admin', User: 'User' };

const Profile = () => {
    const { user, logout, updateUser, setPassword, linkExternal } = useAuth();
    const navigate = useNavigate();

    // Profile edit state
    const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', phoneNumber: '' });
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);

    // Security: hasPassword + linked IdPs from GET /users/me
    const [hasPassword, setHasPassword] = useState(true);
    const [linkedProviders, setLinkedProviders] = useState([]);

    // Password change / set state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordSaving, setPasswordSaving] = useState(false);

    // Delete account state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [linkBusy, setLinkBusy] = useState(false);

    const applySecurityFields = useCallback((data) => {
        if (!data) return;
        // Prefer camelCase JSON; tolerate PascalCase from some serializers
        const hp =
            data.hasPassword !== undefined
                ? !!data.hasPassword
                : data.HasPassword !== undefined
                  ? !!data.HasPassword
                  : true;
        setHasPassword(hp);

        const linked =
            data.linkedProviders ||
            data.linkedProviderNames ||
            data.LinkedProviders ||
            data.LinkedProviderNames ||
            [];
        setLinkedProviders(Array.isArray(linked) ? linked : []);
    }, []);

    // Fetch current user profile from API
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.getCurrentUser();
                if (response?.success && response.data) {
                    const { firstName, lastName, phoneNumber } = response.data;
                    setProfileForm({
                        firstName: firstName || '',
                        lastName: lastName || '',
                        phoneNumber: phoneNumber || '',
                    });
                    applySecurityFields(response.data);
                }
            } catch {
                // Fall back to locally stored user data
                if (user) {
                    setProfileForm({
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        phoneNumber: user.phoneNumber || '',
                    });
                    applySecurityFields(user);
                }
            } finally {
                setProfileLoading(false);
            }
        };
        fetchProfile();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Profile Update ---
    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileForm(prev => ({ ...prev, [name]: value }));
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        if (!profileForm.firstName.trim() || !profileForm.lastName.trim()) {
            showToast.error('First name and last name are required');
            return;
        }
        try {
            setProfileSaving(true);
            const response = await api.updateProfile({
                firstName: profileForm.firstName.trim(),
                lastName: profileForm.lastName.trim(),
                phoneNumber: profileForm.phoneNumber.trim() || null,
            });
            if (response?.success) {
                updateUser({
                    firstName: profileForm.firstName.trim(),
                    lastName: profileForm.lastName.trim(),
                    phoneNumber: profileForm.phoneNumber.trim(),
                });
                showToast.success('Profile updated successfully');
            } else {
                showToast.error(response?.message || 'Failed to update profile');
            }
        } catch (error) {
            showToast.error(error.message || 'Failed to update profile');
        } finally {
            setProfileSaving(false);
        }
    };

    // --- Password helpers ---
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSetPassword = async (e) => {
        e.preventDefault();
        const policyError = validatePasswordPolicy(passwordForm.newPassword);
        if (policyError) {
            showToast.error(policyError);
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast.error('Passwords do not match');
            return;
        }
        try {
            setPasswordSaving(true);
            const result = await setPassword(passwordForm.newPassword);
            if (result.success) {
                setHasPassword(true);
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                showToast.success('Password set — you can now sign in with email');
            } else if (result.code === 'password_already_set') {
                setHasPassword(true);
                showToast.error(result.message || 'Password is already set. Use change password.');
            } else {
                showToast.error(result.message || 'Failed to set password');
            }
        } catch (error) {
            showToast.error(error.message || 'Failed to set password');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handlePasswordSave = async (e) => {
        e.preventDefault();
        if (!passwordForm.currentPassword || !passwordForm.newPassword) {
            showToast.error('Please fill in all password fields');
            return;
        }
        const policyError = validatePasswordPolicy(passwordForm.newPassword);
        if (policyError) {
            showToast.error(policyError);
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            showToast.error('New passwords do not match');
            return;
        }
        try {
            setPasswordSaving(true);
            const response = await api.changePassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            if (response?.success) {
                showToast.success('Password changed successfully');
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else if (response?.code === 'password_not_set') {
                setHasPassword(false);
                showToast.error(
                    'No password is set yet. Use “Set a password” below instead of change password.'
                );
            } else {
                showToast.error(response?.message || 'Failed to change password');
            }
        } catch (error) {
            const code = error.response?.data?.code || error.code;
            if (code === 'password_not_set') {
                setHasPassword(false);
                showToast.error(
                    'No password is set yet. Use “Set a password” below instead of change password.'
                );
            } else {
                const msg = error.response?.data?.message || error.message || 'Failed to change password';
                showToast.error(msg);
            }
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleLinkProvider = async ({ provider, idToken, nonce }) => {
        setLinkBusy(true);
        try {
            const result = await linkExternal({ provider, idToken, nonce });
            if (result.success) {
                setLinkedProviders(result.linkedProviders || []);
                showToast.success(`${provider} linked to your account`);
            } else {
                showToast.error(result.message || `Failed to link ${provider}`);
            }
        } catch (error) {
            showToast.error(error.message || `Failed to link ${provider}`);
        } finally {
            setLinkBusy(false);
        }
    };

    // --- Delete Account ---
    const handleDeleteAccount = async () => {
        try {
            setDeleting(true);
            const response = await api.deleteProfile();
            if (response?.success) {
                showToast.success('Account deleted');
                await logout();
                navigate('/login');
            } else {
                showToast.error(response?.message || 'Failed to delete account');
            }
        } catch (error) {
            showToast.error(error.message || 'Failed to delete account');
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    const initials = user
        ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
        : '?';

    const roleName = ROLE_LABELS[user?.role] || 'User';
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—';

    if (profileLoading) {
        return (
            <div className="profile-container">
                <div className="loading" style={{ minHeight: '40vh' }}>
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            {/* Header */}
            <div className="profile-header">
                <div className="profile-avatar">{initials}</div>
                <h1>{user?.firstName} {user?.lastName}</h1>
                <p className="profile-role">{roleName} · Member since {memberSince}</p>
            </div>

            {!hasPassword && (
                <div className="profile-banner" data-testid="set-password-banner" role="status">
                    You signed in with a social provider and have no password yet. Set one below so
                    you can recover access and sign in with email.
                </div>
            )}

            {/* Profile Information */}
            <div className="profile-section">
                <h2>👤 Profile Information</h2>

                {/* Read-only info */}
                <div className="profile-info-grid">
                    <div className="profile-info-item">
                        <span className="info-label">Email</span>
                        <span className="info-value">{user?.email}</span>
                    </div>
                    <div className="profile-info-item">
                        <span className="info-label">Role</span>
                        <span className="info-value">{roleName}</span>
                    </div>
                </div>

                {/* Editable form */}
                <form onSubmit={handleProfileSave}>
                    <div className="profile-form-grid">
                        <div className="form-group">
                            <label className="form-label">First Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                name="firstName"
                                value={profileForm.firstName}
                                onChange={handleProfileChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                name="lastName"
                                value={profileForm.lastName}
                                onChange={handleProfileChange}
                                required
                            />
                        </div>
                        <div className="form-group full-width">
                            <label className="form-label">Phone Number</label>
                            <input
                                type="tel"
                                className="form-input"
                                name="phoneNumber"
                                value={profileForm.phoneNumber}
                                onChange={handleProfileChange}
                                placeholder="e.g. +91 9876543210"
                            />
                        </div>
                    </div>
                    <div className="profile-actions">
                        <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                            {profileSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Linked social accounts (Marketplace) */}
            <LinkedAccountsSection
                linkedProviders={linkedProviders}
                onLink={handleLinkProvider}
                disabled={linkBusy}
            />

            {/* Set password (social-only) OR change password */}
            <div className="profile-section" data-testid="password-section">
                {hasPassword ? (
                    <>
                        <h2>🔒 Change Password</h2>
                        <form onSubmit={handlePasswordSave}>
                            <div className="profile-form-grid">
                                <div className="form-group full-width">
                                    <label className="form-label">Current Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        name="currentPassword"
                                        value={passwordForm.currentPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        autoComplete="current-password"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                    />
                                    <div className="password-hint">{PASSWORD_POLICY_HINT}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm New Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                    />
                                </div>
                            </div>
                            <div className="profile-actions">
                                <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                                    {passwordSaving ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <h2>🔑 Set a Password</h2>
                        <p className="profile-section-hint">
                            Add a password for email sign-in and account recovery. This does not
                            remove your linked social providers.
                        </p>
                        <form onSubmit={handleSetPassword} data-testid="set-password-form">
                            <div className="profile-form-grid">
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        data-testid="set-password-new"
                                    />
                                    <div className="password-hint">{PASSWORD_POLICY_HINT}</div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        data-testid="set-password-confirm"
                                    />
                                </div>
                            </div>
                            <div className="profile-actions">
                                <button type="submit" className="btn btn-primary" disabled={passwordSaving}>
                                    {passwordSaving ? 'Saving...' : 'Set Password'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>

            {/* Danger Zone */}
            <div className="profile-section danger-zone">
                <h2>⚠️ Danger Zone</h2>
                <p className="danger-description">
                    Permanently delete your account and all associated data. This action cannot be undone —
                    your bookings, reviews, and listings will be removed.
                </p>
                <button
                    className="btn btn-danger"
                    onClick={() => setShowDeleteModal(true)}
                >
                    Delete My Account
                </button>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="profile-modal-overlay" onClick={() => !deleting && setShowDeleteModal(false)}>
                    <div className="profile-modal" onClick={e => e.stopPropagation()}>
                        <h3>Delete Account</h3>
                        <p>
                            This will permanently delete your account and all associated data.
                            Type <strong>DELETE</strong> below to confirm.
                        </p>
                        <div className="form-group">
                            <input
                                type="text"
                                className="form-input"
                                placeholder='Type "DELETE" to confirm'
                                value={deleteConfirmText}
                                onChange={e => setDeleteConfirmText(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="profile-modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteAccount}
                                disabled={deleting || deleteConfirmText !== 'DELETE'}
                            >
                                {deleting ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
