/**
 * ProfileScreen (Profile Details)
 * User profile, garage, saved favorites, passes, and account security settings
 * Streamlined to eliminate redundant duplicate options and dead inline form code.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { deleteAccountThunk } from '../../store/slices/authSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { APP_VERSION_STRING } from '../../config/version';

const MenuItem = ({ icon, label, value, onPress, danger = false, badge = 0 }) => (
    <TouchableOpacity style={menuStyles.item} onPress={onPress}>
        <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.primary} />
        <View style={menuStyles.info}>
            <Text style={[menuStyles.label, danger && { color: colors.danger }]}>{label}</Text>
            {value && <Text style={menuStyles.value}>{value}</Text>}
        </View>
        {badge > 0 && (
            <View style={menuStyles.badge}>
                <Text style={menuStyles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
);

const menuStyles = StyleSheet.create({
    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    info: { flex: 1 },
    label: { ...typography.body, color: colors.textPrimary },
    value: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    badge: {
        backgroundColor: colors.danger,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginRight: spacing.xs,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: {
        color: colors.white,
        fontSize: 11,
        fontWeight: '700',
    },
});

const ProfileScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { user, logout, isAdmin, isCorporate, isVendor } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Get unread count safely
    const { unreadCount: notificationUnreadCount } = useSelector((s) => s.notification || { unreadCount: 0 });

    const handleLogout = useCallback(() => {
        if (isLoggingOut) {
            return;
        }

        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setIsLoggingOut(true);
                        await logout();
                    } catch (error) {
                        setIsLoggingOut(false);
                    }
                },
            },
        ]);
    }, [isLoggingOut, logout]);

    const handleChangePassword = () => {
        navigation.navigate('ChangePassword');
    };

    const handleDeleteAccount = useCallback(() => {
        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await dispatch(deleteAccountThunk()).unwrap();
                        } catch (error) {
                            Alert.alert('Error', error || 'Failed to delete account.');
                        }
                    },
                },
            ]
        );
    }, [dispatch]);

    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.fullName || 'User';
    const roleLabel = isCorporate ? 'Corporate Fleet' : isVendor ? 'Vendor Partner' : 'Driver Member';

    return (
        <ScreenLayout scrollable contentStyle={styles.contentContainer}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.screenTitle}>Profile Details</Text>
                    <TouchableOpacity
                        style={styles.headerEditBtn}
                        onPress={() => navigation.navigate('EditProfile')}
                        accessibilityRole="button"
                        accessibilityLabel="Edit Profile"
                    >
                        <Ionicons name="create-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                </View>

                {/* Avatar & Info */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                            {user?.firstName?.charAt(0) || fullName?.charAt(0) || 'U'}
                            {user?.lastName?.charAt(0) || ''}
                        </Text>
                    </View>
                    <Text style={styles.userName}>{fullName}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{roleLabel}</Text>
                    </View>
                </View>


                {/* Platform Admin Console (Only visible to Admin) */}
                {isAdmin && (
                    <Card style={{ marginBottom: spacing.md }}>
                        <MenuItem
                            icon="shield-checkmark-outline"
                            label="Platform Admin Console"
                            value="System health, outbox & verifications"
                            onPress={() => navigation.navigate('AdminDashboard')}
                        />
                    </Card>
                )}

                {/* Account Settings Menu - Cleaned of duplicate vehicles/passes/favorites rows */}
                <Card style={{ marginBottom: spacing.md }}>
                    <MenuItem
                        icon="person-outline"
                        label="Edit Profile"
                        value={fullName}
                        onPress={() => navigation.navigate('EditProfile')}
                    />
                    <MenuItem
                        icon="mail-outline"
                        label="Email"
                        value={user?.email || 'Not provided'}
                        onPress={() => { }}
                    />
                    <MenuItem
                        icon="call-outline"
                        label="Phone"
                        value={user?.phoneNumber || 'Not provided'}
                        onPress={() => { }}
                    />
                    <MenuItem
                        icon="lock-closed-outline"
                        label="Change Password"
                        onPress={handleChangePassword}
                    />
                    <MenuItem
                        icon="notifications-outline"
                        label="Notifications"
                        badge={notificationUnreadCount}
                        onPress={() => navigation.navigate('Notifications')}
                    />
                </Card>

                <Card>
                    <MenuItem
                        icon="trash-outline"
                        label="Delete Account"
                        onPress={handleDeleteAccount}
                        danger
                    />
                </Card>

                <Button
                    title={isLoggingOut ? 'Logging out...' : 'Logout'}
                    onPress={handleLogout}
                    loading={isLoggingOut}
                    variant="danger"
                    style={styles.logoutBtn}
                    icon={!isLoggingOut ? <Ionicons name="log-out-outline" size={20} color={colors.white} /> : undefined}
                />

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>{APP_VERSION_STRING}</Text>
                </View>
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    contentContainer: { paddingBottom: spacing['3xl'] },
    content: { paddingBottom: spacing['3xl'] },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    screenTitle: { ...typography.h3, color: colors.textPrimary },
    headerEditBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    avatarSection: { alignItems: 'center', paddingVertical: spacing.lg },
    avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.lg },
    avatarText: { fontSize: 28, fontWeight: '700', color: colors.white },
    userName: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.md },
    userEmail: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },
    roleBadge: { marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.primarySoft, borderRadius: spacing.radius.full },
    roleText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
    logoutBtn: { marginTop: spacing.xl, marginHorizontal: spacing.screenHorizontal },
    versionContainer: { alignItems: 'center', marginTop: spacing.lg, paddingBottom: spacing.md },
    versionText: { ...typography.caption, color: colors.textMuted },
});

export default ProfileScreen;
