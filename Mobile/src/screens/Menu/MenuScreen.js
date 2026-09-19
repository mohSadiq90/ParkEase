/**
 * MenuScreen
 * Central navigation hub for Account, Garage, Messages, Corporate, and System Settings
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { APP_VERSION_STRING } from '../../config/version';
import { EventBus } from '../../utils/EventBus';

export const PARKEASE_BUILT_WITH_TAGS = [
    { id: '1', name: 'React Native', category: 'Core Framework', icon: 'logo-react' },
    { id: '2', name: 'Expo SDK 54', category: 'Platform Engine', icon: 'phone-portrait-outline' },
    { id: '3', name: 'JavaScript ES2024', category: 'Core Language', icon: 'code-slash-outline' },
    { id: '4', name: 'Redux Toolkit', category: 'State Management', icon: 'layers-outline' },
    { id: '5', name: 'React Navigation', category: 'Navigation', icon: 'navigate-outline' },
    { id: '6', name: 'React Native Maps', category: 'Geo & Maps', icon: 'map-outline' },
    { id: '7', name: 'Axios REST Client', category: 'Networking', icon: 'cloud-outline' },
    { id: '8', name: 'Expo SecureStore', category: 'Security & Auth', icon: 'shield-checkmark-outline' },
    { id: '9', name: 'Expo BarCodeScanner', category: 'Hardware / Camera', icon: 'qr-code-outline' },
    { id: '10', name: 'Google Sign-In SDK', category: 'Identity & SSO', icon: 'logo-google' },
    { id: '11', name: 'Apple SSO Auth', category: 'Identity & SSO', icon: 'logo-apple' },
    { id: '12', name: 'Stripe Mobile SDK', category: 'Payment Gateway', icon: 'card-outline' },
    { id: '13', name: 'Firebase App Distribution', category: 'CI / CD Pipeline', icon: 'flame-outline' },
    { id: '14', name: 'PostHog Analytics', category: 'Telemetry & Events', icon: 'analytics-outline' },
    { id: '15', name: 'Jest Testing Framework', category: 'Automated QA', icon: 'checkmark-circle-outline' },
    { id: '16', name: 'React Native Testing Library', category: 'Component QA', icon: 'flask-outline' },
    { id: '17', name: 'GitHub Actions', category: 'CI / CD Automation', icon: 'logo-github' },
    { id: '18', name: 'Android Release Engine', category: 'Mobile Platform', icon: 'logo-android' },
    { id: '19', name: 'iOS Native Engine', category: 'Mobile Platform', icon: 'logo-apple' },
    { id: '20', name: 'LPR OCR Recognition', category: 'Smart Parking', icon: 'scan-outline' },
    { id: '21', name: 'EventBus Architecture', category: 'PubSub Reactive', icon: 'radio-outline' },
    { id: '22', name: 'Expo Linear Gradient', category: 'UI / UX Styling', icon: 'color-palette-outline' },
    { id: '23', name: 'Ionicons Vector Icons', category: 'Design System', icon: 'sparkles-outline' },
    { id: '24', name: 'Dynamic Safe Area Insets', category: 'Adaptive Layout', icon: 'phone-portrait-outline' },
    { id: '25', name: 'Monorepo Architecture', category: 'DevOps & Tooling', icon: 'cube-outline' },
];

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
    const { user, isVendor, isAdmin, isCorporate } = useAuth();
    const [builtWithModalVisible, setBuiltWithModalVisible] = useState(false);
    const { unreadCount: notificationUnreadCount } = useSelector((s) => s.notification || { unreadCount: 0 });
    const { unreadTotalCount: messageUnreadCount } = useSelector((s) => s.chat || { unreadTotalCount: 0 });

    const displayName =
        user?.fullName ||
        (user?.firstName ? `${user.firstName} ${user?.lastName || ''}`.trim() : null) ||
        (user?.name ? user.name : null) ||
        user?.email?.split('@')[0] ||
        (isCorporate ? 'Corporate Account' : 'Partner');

    const displayEmail = user?.email || (isCorporate ? 'corporate@company.com' : 'user@parkease.com');

    const avatarInitial1 = (user?.firstName?.[0] || displayName?.[0] || 'U').toUpperCase();
    const avatarInitial2 = (user?.lastName?.[0] || displayName?.split(' ')?.[1]?.[0] || '').toUpperCase();

    return (
        <ScreenLayout scrollable>
            {/* User Profile Card */}
            <Card style={styles.profileCard}>
                <View style={styles.avatarWrap}>
                    <Text style={styles.avatarText}>
                        {avatarInitial1}{avatarInitial2}
                    </Text>
                </View>
                <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Text style={styles.profileEmail}>{displayEmail}</Text>
                    <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>
                            {isCorporate ? 'Corporate Fleet' : isVendor ? 'Vendor Partner' : 'Driver Member'}
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

            {/* Corporate & Fleet Hub - ONLY for Corporate Users */}
            {isCorporate && (
                <>
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
                            icon="layers-outline"
                            label="Parking Inventory"
                            subtitle="Company-owned facilities & bays"
                            onPress={() => navigation.navigate('CorporateParkingSpaces')}
                        />
                        <MenuItem
                            icon="search-circle-outline"
                            label="Lease Browse"
                            subtitle="Discover & lease marketplace spaces"
                            onPress={() => navigation.navigate('CorporateLeaseBrowse')}
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
                </>
            )}

            {/* Marketplace Operations & Listings - ONLY for Marketplace Users (Vendors / Drivers / Admins) */}
            {!isCorporate && (
                <>
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
                            icon="ticket-outline"
                            label="Event Parking Packages"
                            subtitle="Manage venue zones & event packages"
                            onPress={() => navigation.navigate('VendorEventPackages')}
                        />
                        <MenuItem
                            icon="scan-outline"
                            label="LPR Camera & Rules"
                            subtitle="Camera keys & plate access rules"
                            onPress={() => navigation.navigate('LprSettings')}
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
                </>
            )}

            {/* Communication & Garage */}
            <Text style={styles.sectionHeader}>{isCorporate ? 'Communications & Passes' : 'Garage & Messages'}</Text>
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
                {!isCorporate && (
                    <>
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
                    </>
                )}
                <MenuItem
                    icon="ticket-outline"
                    label="My Passes"
                    subtitle="Subscription & digital wallet passes"
                    onPress={() => navigation.navigate('MyPasses')}
                />
                {!isCorporate && (
                    <MenuItem
                        icon="flame-outline"
                        label="Event Parking Passes"
                        subtitle="Browse & buy event tickets"
                        onPress={() => navigation.navigate('EventPackages')}
                    />
                )}
            </Card>

            {/* Tools & Simulators - Marketplace only */}
            {!isCorporate && (
                <>
                    <Text style={styles.sectionHeader}>Tools & Simulators</Text>
                    <Card style={styles.cardGroup}>
                        <MenuItem
                            icon="scan-circle-outline"
                            label="LPR Simulator"
                            subtitle="Simulate ticketless barrier entry/exit"
                            onPress={() => navigation.navigate('LprSimulator')}
                        />
                        <MenuItem
                            icon="flash-outline"
                            label="EV Charge Simulator"
                            subtitle="Simulate OCPP charging & fee settlement"
                            onPress={() => navigation.navigate('EvChargeSimulator')}
                        />
                    </Card>
                </>
            )}

            {/* Account & Security */}
            <Text style={styles.sectionHeader}>Account & Security</Text>
            <Card style={styles.cardGroup}>
                <MenuItem
                    icon="person-outline"
                    label="Profile Details"
                    subtitle="Name, email, phone number"
                    onPress={() => navigation.navigate('Profile')}
                />
            </Card>

            {/* About & System */}
            <Text style={styles.sectionHeader}>About & System</Text>
            <Card style={styles.cardGroup}>
                <MenuItem
                    icon="code-slash-outline"
                    label="Built With"
                    subtitle="Technology stack & architecture (25 Tags)"
                    onPress={() => setBuiltWithModalVisible(true)}
                />
            </Card>

            <TouchableOpacity
                style={styles.footer}
                onPress={() => setBuiltWithModalVisible(true)}
                activeOpacity={0.7}
                testID="menu-footer-built-with"
            >
                <Text style={styles.versionText}>ParkEase {APP_VERSION_STRING}</Text>
                <Text style={styles.builtWithFooterLink}>Built with React Native & Expo • View 25 Tags</Text>
            </TouchableOpacity>

            {/* Built With Technology Stack Modal */}
            <Modal
                visible={builtWithModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setBuiltWithModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalTitleRow}>
                                <View style={styles.modalIconWrap}>
                                    <Ionicons name="code-slash" size={22} color={colors.primary} />
                                </View>
                                <View style={styles.modalTitleTextWrap}>
                                    <Text style={styles.modalTitle}>Built With</Text>
                                    <Text style={styles.modalSubtitle}>25 Core Technologies & Architecture</Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setBuiltWithModalVisible(false)}
                                accessibilityLabel="Close Built With Modal"
                            >
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalScrollView}
                            contentContainerStyle={styles.modalScrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.tagSummaryCard}>
                                <Text style={styles.tagSummaryTitle}>Architecture & Production Stack</Text>
                                <Text style={styles.tagSummaryDesc}>
                                    ParkEase Mobile is engineered as a zero-compromise cross-platform React Native client with 100% automated test coverage.
                                </Text>
                            </View>

                            <View style={styles.tagsGrid}>
                                {PARKEASE_BUILT_WITH_TAGS.map((tag) => (
                                    <View key={tag.id} style={styles.tagChip}>
                                        <Ionicons name={tag.icon} size={15} color={colors.primary} style={styles.tagIcon} />
                                        <View style={styles.tagTextWrap}>
                                            <Text style={styles.tagName}>{tag.name}</Text>
                                            <Text style={styles.tagCategory}>{tag.category}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <View style={styles.rawTagsCard}>
                                <Text style={styles.rawTagsLabel}>Core Architecture Tags (Comma-Separated):</Text>
                                <Text style={styles.rawTagsText} selectable>
                                    react-native, expo, javascript, redux-toolkit, react-navigation, react-native-maps, axios, secure-store, barcode-scanner, google-signin, apple-sso, stripe, firebase, posthog, jest, react-native-testing-library, github-actions, android, ios, lpr-recognition, eventbus, linear-gradient, vector-icons, safe-area-insets, monorepo
                                </Text>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalDoneBtn}
                                onPress={() => setBuiltWithModalVisible(false)}
                            >
                                <Text style={styles.modalDoneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    builtWithFooterLink: {
        ...typography.caption,
        fontSize: 12,
        color: colors.primary,
        fontWeight: '600',
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingTop: spacing.lg,
        ...shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    modalTitleTextWrap: {
        flex: 1,
    },
    modalTitle: {
        ...typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    modalSubtitle: {
        ...typography.caption,
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: spacing.sm,
    },
    modalScrollView: {
        flexGrow: 0,
    },
    modalScrollContent: {
        paddingHorizontal: spacing.screenHorizontal,
        paddingVertical: spacing.md,
    },
    tagSummaryCard: {
        backgroundColor: colors.primarySoft,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    tagSummaryTitle: {
        ...typography.label,
        fontSize: 13,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 4,
    },
    tagSummaryDesc: {
        ...typography.caption,
        fontSize: 12,
        lineHeight: 18,
        color: colors.textPrimary,
    },
    tagsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        minWidth: '47%',
        flex: 1,
    },
    tagIcon: {
        marginRight: 8,
    },
    tagTextWrap: {
        flex: 1,
    },
    tagName: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    tagCategory: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 1,
    },
    rawTagsCard: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: spacing.sm,
    },
    rawTagsLabel: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    rawTagsText: {
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 18,
        color: colors.primary,
    },
    modalFooter: {
        paddingHorizontal: spacing.screenHorizontal,
        paddingVertical: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        backgroundColor: colors.surface,
    },
    modalDoneBtn: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalDoneBtnText: {
        ...typography.button,
        color: colors.white,
        fontWeight: '700',
        fontSize: 15,
    },
});

export default MenuScreen;
