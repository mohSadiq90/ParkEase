/**
 * MenuScreen
 * Central navigation hub for Account, Garage, Messages, Corporate, and System Settings
 */

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { APP_VERSION_STRING } from '../../config/version';
import { EventBus } from '../../utils/EventBus';

const MenuItem = ({ icon, label, subtitle, onPress, badge = 0, danger = false }) => (
    <TouchableOpacity
        style={styles.menuItem}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
            <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
        </View>
        <View style={styles.menuInfo}>
            <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
            {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
        </View>
        {badge > 0 && (
            <View style={styles.badgeWrap}>
                <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
            </View>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
);

const MenuScreen = ({ navigation }) => {
    const { user, logout, isVendor, isAdmin } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { unreadCount: notificationUnreadCount } = useSelector((s) => s.notification || { unreadCount: 0 });
    const { unreadTotalCount: messageUnreadCount } = useSelector((s) => s.chat || { unreadTotalCount: 0 });

    const handleLogout = useCallback(() => {
        if (isLoggingOut) return;
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setIsLoggingOut(true);
                        await logout().unwrap();
                    } catch (error) {
                        setIsLoggingOut(false);
                        EventBus.emit('SHOW_BANNER', {
                            title: 'Logout Failed',
                            message: error || 'Could not log out right now.',
                            type: 'error',
                        });
                    }
                },
            },
        ]);
    }, [logout, isLoggingOut]);

    return (
        <ScreenLayout scrollable>
            {/* User Profile Card */}
            <Card style={styles.profileCard}>
                <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>
                        {(user?.firstName?.[0] || 'S').toUpperCase()}
                        {(user?.lastName?.[0] || '').toUpperCase()}
                    </Text>
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>
                        {user?.firstName || 'Sadiq'} {user?.lastName || ''}
                    </Text>
                    <Text style={styles.profileEmail}>{user?.email || 'vendor@parkease.com'}</Text>
                    <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>
                            {isVendor ? 'Vendor Partner' : 'Driver Member'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('EditProfile')}
                >
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                </TouchableOpacity>
            </Card>

            {/* Business & Operations */}
            <Text style={styles.sectionHeader}>Operations & Listings</Text>
            <Card style={styles.cardGroup}>
                <MenuItem
                    icon="list-outline"
                    label="My Listings"
                    subtitle="View, edit & manage parking spaces"
                    onPress={() => navigation.navigate('MyListings')}
                />
                <MenuItem
                    icon="add-circle-outline"
                    label="Add Parking Space"
                    subtitle="Create new parking space listing"
                    onPress={() => navigation.navigate('CreateParking')}
                />
                <MenuItem
                    icon="qr-code-outline"
                    label="Gate Access Scanner"
                    subtitle="Scan driver entry QR passes"
                    onPress={() => navigation.navigate('AccessPassScanner')}
                />
                <MenuItem
                    icon="search-outline"
                    label="Find Parking Spaces"
                    subtitle="Explore & search public spots"
                    onPress={() => navigation.navigate('Search')}
                />
                <MenuItem
                    icon="calendar-outline"
                    label="My Reservations"
                    subtitle="Personal driver parking bookings"
                    onPress={() => navigation.navigate('MyBookings')}
                />
                <MenuItem
                    icon="checkmark-done-circle-outline"
                    label="Incoming Host Bookings"
                    subtitle="Manage reservations for your spaces"
                    onPress={() => navigation.navigate('IncomingBookings')}
                />
                {isAdmin && (
                    <MenuItem
                        icon="shield-checkmark-outline"
                        label="Admin Dashboard"
                        subtitle="System overview & verification"
                        onPress={() => navigation.navigate('AdminDashboard')}
                    />
                )}
            </Card>

            {/* Corporate & Fleet Hub */}
            <Text style={styles.sectionHeader}>Corporate & Fleet</Text>
            <Card style={styles.cardGroup}>
                <MenuItem
                    icon="business-outline"
                    label="Corporate Dashboard"
                    subtitle="Fleet management & company accounts"
                    onPress={() => navigation.navigate('CorporateDashboard')}
                />
                <MenuItem
                    icon="briefcase-outline"
                    label="Company Management"
                    subtitle="Manage corporate organizations"
                    onPress={() => navigation.navigate('CompanyManagement')}
                />
                <MenuItem
                    icon="people-outline"
                    label="Corporate Members"
                    subtitle="Employee directory & access roles"
                    onPress={() => navigation.navigate('CorporateMembers')}
                />
                <MenuItem
                    icon="calendar-number-outline"
                    label="Corporate Bookings"
                    subtitle="Company & team reservations"
                    onPress={() => navigation.navigate('CorporateBookings')}
                />
                <MenuItem
                    icon="pie-chart-outline"
                    label="Department Allocations"
                    subtitle="Quota distribution & dedicated bays"
                    onPress={() => navigation.navigate('CorporateAllocations')}
                />
                <MenuItem
                    icon="receipt-outline"
                    label="Corporate Invoices"
                    subtitle="Monthly statements & receipts"
                    onPress={() => navigation.navigate('CorporateInvoices')}
                />
            </Card>

            {/* Communication & Garage */}
            <Text style={styles.sectionHeader}>Garage & Messages</Text>
            <Card style={styles.cardGroup}>
                <MenuItem
                    icon="chatbubbles-outline"
                    label="Messages"
                    subtitle="Driver inquiries & conversations"
                    badge={messageUnreadCount}
                    onPress={() => navigation.navigate('ConversationList')}
                />
                <MenuItem
                    icon="notifications-outline"
                    label="Notifications"
                    subtitle="Booking alerts & system updates"
                    badge={notificationUnreadCount}
                    onPress={() => navigation.navigate('Notifications')}
                />
                <MenuItem
                    icon="car-outline"
                    label="My Vehicles"
                    subtitle="Saved license plates & garage"
                    onPress={() => navigation.navigate('Vehicles')}
                />
                <MenuItem
                    icon="heart-outline"
                    label="Favorites"
                    subtitle="Saved parking facilities"
                    onPress={() => navigation.navigate('Favorites')}
                />
                <MenuItem
                    icon="ticket-outline"
                    label="My Passes"
                    subtitle="Subscription & digital wallet passes"
                    onPress={() => navigation.navigate('MyPasses')}
                />
            </Card>

            {/* Account & Security */}
            <Text style={styles.sectionHeader}>Account & Security</Text>
            <Card style={styles.cardGroup}>
                <MenuItem
                    icon="person-outline"
                    label="Profile Details"
                    subtitle="Name, email, phone number"
                    onPress={() => navigation.navigate('Profile')}
                />
                <MenuItem
                    icon="create-outline"
                    label="Edit Profile"
                    subtitle="Update personal information"
                    onPress={() => navigation.navigate('EditProfile')}
                />
                <MenuItem
                    icon="lock-closed-outline"
                    label="Change Password"
                    subtitle="Update your security credentials"
                    onPress={() => navigation.navigate('ChangePassword')}
                />
                <MenuItem
                    icon="log-out-outline"
                    label="Log Out"
                    subtitle="Sign out of your account"
                    danger
                    onPress={handleLogout}
                />
            </Card>

            <View style={styles.footer}>
                <Text style={styles.versionText}>ParkEase {APP_VERSION_STRING}</Text>
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.screenHorizontal,
        marginTop: spacing.sm,
        marginBottom: spacing.md,
        padding: spacing.base,
        borderRadius: 12,
        backgroundColor: colors.surface,
        ...shadows.card,
    },
    avatarWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        ...typography.h3,
        color: colors.white,
        fontWeight: '700',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        ...typography.h4,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    profileEmail: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    rolePill: {
        alignSelf: 'flex-start',
        backgroundColor: colors.primarySoft,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginTop: 6,
    },
    rolePillText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.primary,
    },
    editBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    sectionHeader: {
        ...typography.label,
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        color: colors.textSecondary,
        marginHorizontal: spacing.screenHorizontal,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
    },
    cardGroup: {
        marginHorizontal: spacing.screenHorizontal,
        marginBottom: spacing.sm,
        padding: 0,
        borderRadius: 12,
        backgroundColor: colors.surface,
        overflow: 'hidden',
        ...shadows.card,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        minHeight: 56,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    iconWrapDanger: {
        backgroundColor: colors.dangerSoft,
    },
    menuInfo: {
        flex: 1,
    },
    menuLabel: {
        ...typography.body,
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    menuSubtitle: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    badgeWrap: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingHorizontal: 7,
        paddingVertical: 2,
        marginRight: spacing.xs,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: {
        color: colors.white,
        fontSize: 11,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    versionText: {
        ...typography.caption,
        color: colors.textTertiary,
    },
});

export default MenuScreen;
