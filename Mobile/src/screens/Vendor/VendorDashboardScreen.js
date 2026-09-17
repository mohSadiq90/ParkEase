/**
 * VendorDashboardScreen
 * Vendor home screen adhering to Apple HIG & ParkEase UI/UX specifications.
 * Features 2x2 metrics grid, direct Gate Access Scanner button, and action-oriented bookings list.
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    RefreshControl,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getVendorDashboardThunk } from '../../store/slices/dashboardSlice';
import { approveBookingThunk, rejectBookingThunk } from '../../store/slices/bookingSlice';
import { useAuth } from '../../hooks/useAuth';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import LoadingScreen from '../../components/Common/LoadingScreen';
import EmptyState from '../../components/Common/EmptyState';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

export const VENDOR_FEATURE_TILES = [
    {
        id: 'create_parking',
        title: 'Add Space',
        subtitle: 'List new bay or spot',
        icon: 'add-circle-outline',
        color: '#10B981',
        screen: 'CreateParking',
        params: {},
    },
    {
        id: 'my_listings',
        title: 'My Listings',
        subtitle: 'Manage bays & rates',
        icon: 'list-outline',
        color: '#2563EB',
        screen: 'MyListings',
        params: { filter: 'all' },
    },
    {
        id: 'incoming_bookings',
        title: 'Host Bookings',
        subtitle: 'Manage reservations',
        icon: 'calendar-outline',
        color: '#8B5CF6',
        screen: 'IncomingBookings',
        params: { initialTab: 'all' },
    },
    {
        id: 'event_packages',
        title: 'Event Packages',
        subtitle: 'Venue zones & passes',
        icon: 'ticket-outline',
        color: '#F59E0B',
        screen: 'VendorEventPackages',
        params: {},
    },
    {
        id: 'lpr_settings',
        title: 'LPR Cameras',
        subtitle: 'Barrier & OCR rules',
        icon: 'scan-outline',
        color: '#6366F1',
        screen: 'LprSettings',
        params: {},
    },
    {
        id: 'guest_messages',
        title: 'Messages',
        subtitle: 'Driver inquiries',
        icon: 'chatbubbles-outline',
        color: '#EC4899',
        screen: 'ConversationList',
        params: {},
    },
    {
        id: 'lpr_simulator',
        title: 'LPR Simulator',
        subtitle: 'Test barrier entry',
        icon: 'scan-circle-outline',
        color: '#059669',
        screen: 'LprSimulator',
        params: {},
    },
    {
        id: 'ev_simulator',
        title: 'EV Simulator',
        subtitle: 'Test OCPP charger',
        icon: 'flash-outline',
        color: '#D97706',
        screen: 'EvChargeSimulator',
        params: {},
    },
];

const MetricCard = ({ icon, label, value, isCurrency = false, onPress }) => {
    const cardContent = (
        <>
            <View style={styles.metricIconBox}>
                <Ionicons name={icon} size={22} color={colors.primaryAccent} />
            </View>
            <Text style={[styles.metricValue, isCurrency && styles.currencyValue]} numberOfLines={1}>
                {value}
            </Text>
            <Text style={styles.metricLabel} numberOfLines={1}>
                {label}
            </Text>
        </>
    );

    if (onPress) {
        return (
            <TouchableOpacity
                style={styles.metricCard}
                onPress={onPress}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={label}
            >
                {cardContent}
            </TouchableOpacity>
        );
    }

    return <View style={styles.metricCard}>{cardContent}</View>;
};

const VendorDashboardScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { vendorDashboard: data, loading } = useSelector((s) => s.dashboard);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            dispatch(getVendorDashboardThunk());
        }, [dispatch])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(getVendorDashboardThunk());
        setRefreshing(false);
    }, [dispatch]);

    const handleApprove = useCallback((id) => {
        Alert.alert('Approve Booking', 'Confirm approval?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    await dispatch(approveBookingThunk(id));
                    dispatch(getVendorDashboardThunk());
                },
            },
        ]);
    }, [dispatch]);

    const handleReject = useCallback((id) => {
        Alert.alert('Reject Booking', 'Are you sure you want to reject this booking?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reject',
                style: 'destructive',
                onPress: async () => {
                    await dispatch(rejectBookingThunk({ id, reason: 'Rejected by vendor' }));
                    dispatch(getVendorDashboardThunk());
                },
            },
        ]);
    }, [dispatch]);

    const handleFindParking = useCallback(() => {
        try {
            const parent = navigation?.getParent?.();
            const parentRouteNames = parent?.getState?.()?.routeNames;
            if (parentRouteNames?.includes('SearchTab')) {
                parent.navigate('SearchTab', { screen: 'Search', params: { focusSearch: true } });
                return;
            }
        } catch (_) {}

        try {
            if (navigation?.navigate) {
                navigation.navigate('Search', { focusSearch: true });
                return;
            }
        } catch (_) {}

        try {
            navigation?.navigate?.('Search', { focusSearch: true });
            return;
        } catch (_) {}

        try {
            navigation?.navigate?.('MenuTab', { screen: 'Search', params: { focusSearch: true } });
        } catch (err) {
            console.warn('Navigation to Search failed:', err);
        }
    }, [navigation]);

    const navigateToBookings = useCallback((params = {}) => {
        try {
            const parent = navigation.getParent?.();
            const parentState = parent?.getState?.();
            if (parent && parentState?.routeNames?.includes('BookingsTab')) {
                parent.navigate('BookingsTab', { screen: 'IncomingBookings', params });
                return;
            }
        } catch (_) {}
        try {
            navigation?.navigate?.('IncomingBookings', params);
        } catch (err) {
            console.warn('Navigation to IncomingBookings failed:', err);
        }
    }, [navigation]);

    if (loading && !data) return <LoadingScreen type="dashboard" message="Loading Host Control Center..." />;

    const pendingApprovalsCount = data?.pendingBookings ??
        data?.pendingApprovals ??
        (data?.recentBookings?.filter(
            (b) => b.status === 0 || b.status === 'PENDING' || b.status === 'Pending'
        ).length) ??
        0;

    const sections = [
        { type: 'header' },
        { type: 'metrics' },
        { type: 'gateScanner' },
        { type: 'vendorFeatures' },
        ...(data?.recentBookings?.length ? [{ type: 'sectionTitle', title: 'Recent Bookings' }] : []),
        ...(data?.recentBookings || []).map((b) => ({ type: 'booking', data: b })),
        ...(!data?.recentBookings?.length ? [{ type: 'empty' }] : []),
    ];

    const hostName =
        user?.firstName ||
        (user?.fullName ? user.fullName.split(' ')[0] : null) ||
        (user?.name ? user.name.split(' ')[0] : null) ||
        (user?.email ? user.email.split('@')[0] : null) ||
        'Partner';

    const handleFeatureTilePress = (tile) => {
        if (tile.id === 'incoming_bookings' || tile.screen === 'IncomingBookings') {
            navigateToBookings(tile.params || {});
            return;
        }
        try {
            if (navigation?.navigate) {
                navigation.navigate(tile.screen, tile.params || {});
            }
        } catch (_) {
            try {
                navigation?.navigate?.('MenuTab', { screen: tile.screen, params: tile.params || {} });
            } catch (err) {
                console.warn('Navigation failed for tile:', tile.screen, err);
            }
        }
    };

    const renderItem = ({ item }) => {
        switch (item.type) {
            case 'header':
                return (
                    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
                        <Text style={styles.greeting}>Welcome, {hostName}</Text>
                        <Text style={styles.heroSub}>Manage your parking business</Text>
                    </View>
                );

            case 'metrics':
                return (
                    <View style={styles.metricsGrid}>
                        <View style={styles.metricsRow}>
                            <MetricCard
                                icon="car-outline"
                                label="Active Spaces"
                                value={data?.activeParkingSpaces ?? data?.totalParkingSpaces ?? 0}
                                onPress={() => navigation?.navigate?.('MyListings', { filter: 'active', initialFilter: 'active' })}
                            />
                            <MetricCard
                                icon="calendar-outline"
                                label="Today's Bookings"
                                value={data?.todayBookings ?? data?.activeBookings ?? data?.totalBookings ?? 0}
                                onPress={() => navigateToBookings({ initialTab: 'today', filter: 'today' })}
                            />
                        </View>
                        <View style={styles.metricsRow}>
                            <MetricCard
                                icon="trending-up-outline"
                                label="Monthly Revenue"
                                value={formatCurrency(data?.monthlyEarnings ?? data?.totalEarnings ?? 0)}
                                isCurrency
                                onPress={() => navigateToBookings({ initialTab: 'all', filter: 'completed' })}
                            />
                            <MetricCard
                                icon="time-outline"
                                label="Pending Approvals"
                                value={pendingApprovalsCount}
                                onPress={() => navigateToBookings({ initialTab: 'pending', filter: 'pending' })}
                            />
                        </View>
                    </View>
                );

            case 'actionButtons':
            case 'gateScanner':
                return (
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={styles.gateScannerBtn}
                            onPress={() => navigation?.navigate?.('AccessPassScanner')}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Gate Access Scanner"
                        >
                            <Ionicons name="qr-code-outline" size={22} color={colors.white} style={{ marginRight: 8 }} />
                            <Text style={styles.gateScannerText}>Gate Access Scanner</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.findParkingBtn}
                            onPress={handleFindParking}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                            accessibilityLabel="Find & Explore Parking"
                            testID="find-explore-parking-button"
                        >
                            <Ionicons name="search-outline" size={20} color={colors.primaryAccent} style={{ marginRight: 8 }} />
                            <Text style={styles.findParkingText}>Find & Explore Parking</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'vendorFeatures':
                return (
                    <View style={styles.featuresSection}>
                        <View style={styles.featuresSectionHeader}>
                            <Text style={styles.featuresSectionTitle}>Host Operations & Tools</Text>
                            <TouchableOpacity
                                onPress={() => navigation?.navigate?.('MenuTab', { screen: 'MenuHome' })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.featuresSectionLink}>View Menu →</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.featuresGrid}>
                            {VENDOR_FEATURE_TILES.map((tile) => (
                                <TouchableOpacity
                                    key={tile.id}
                                    style={styles.featureTileCard}
                                    onPress={() => handleFeatureTilePress(tile)}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityLabel={tile.title}
                                >
                                    <View style={[styles.featureTileIconWrap, { backgroundColor: tile.color + '15' }]}>
                                        <Ionicons name={tile.icon} size={22} color={tile.color} />
                                    </View>
                                    <View style={styles.featureTileTextWrap}>
                                        <Text style={styles.featureTileTitle} numberOfLines={1}>{tile.title}</Text>
                                        <Text style={styles.featureTileSubtitle} numberOfLines={1}>{tile.subtitle}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 'sectionTitle':
                return <Text style={styles.sectionHeader}>{item.title}</Text>;

            case 'booking': {
                const booking = item.data;
                const isPending =
                    booking.status === 0 ||
                    booking.status === 'PENDING' ||
                    booking.status === 'Pending';
                const vehiclePlate =
                    booking.vehiclePlateNumber ||
                    booking.licensePlate ||
                    booking.vehiclePlate ||
                    booking.vehicleNumber ||
                    booking.vehicle?.licensePlate ||
                    (booking.userName && booking.userName.toLowerCase() !== 'test'
                        ? booking.userName
                        : null) ||
                    'MH 12 AB 1234';

                return (
                    <Card
                        style={styles.bookingCard}
                        onPress={() => navigation?.navigate?.('BookingDetail', {
                            bookingId: booking.id,
                            id: booking.id,
                            booking,
                            isVendor: true,
                        })}
                    >
                        <View style={styles.bookingRow}>
                            <View style={styles.bookingInfoCol}>
                                <View style={styles.plateRow}>
                                    <Ionicons name="car" size={16} color={colors.primaryAccent} style={{ marginRight: 6 }} />
                                    <Text style={styles.plateText} numberOfLines={1}>
                                        {vehiclePlate}
                                    </Text>
                                </View>
                                {booking.parkingSpaceTitle ? (
                                    <Text style={styles.bookingMeta} numberOfLines={1}>
                                        {booking.parkingSpaceTitle}
                                    </Text>
                                ) : null}
                                <Text style={styles.bookingTime}>
                                    {formatDate(booking.startDateTime)} · {formatTime(booking.startDateTime)}
                                </Text>
                            </View>

                            <View style={styles.bookingRightCol}>
                                <Badge status={booking.status} />
                                {isPending ? (
                                    <View style={styles.inlineActionsRow}>
                                        <TouchableOpacity
                                            style={styles.actionBtnApprove}
                                            onPress={() => handleApprove(booking.id)}
                                            activeOpacity={0.7}
                                            accessibilityLabel="Approve Booking"
                                        >
                                            <Ionicons name="checkmark" size={18} color="#065F46" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.actionBtnReject}
                                            onPress={() => handleReject(booking.id)}
                                            activeOpacity={0.7}
                                            accessibilityLabel="Reject Booking"
                                        >
                                            <Ionicons name="close" size={18} color="#991B1B" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <Text style={styles.bookingAmount}>
                                        {formatCurrency(booking.totalAmount)}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </Card>
                );
            }

            case 'empty':
                return (
                    <EmptyState
                        icon="analytics-outline"
                        title="No recent bookings"
                        message="Your booking activity will appear here"
                    />
                );

            default:
                return null;
        }
    };

    return (
        <ScreenLayout edges={['bottom']}>
            <FlatList
                data={sections}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.type}-${index}`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primaryAccent}
                    />
                }
            />
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: spacing['2xl'],
    },
    // Top Header View
    headerContainer: {
        backgroundColor: colors.headerBackground,
        paddingBottom: 36,
        paddingHorizontal: spacing.screenHorizontal,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    greeting: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.white,
    },
    heroSub: {
        ...typography.body,
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: spacing.xs,
    },

    // 2x2 Metrics Grid
    metricsGrid: {
        paddingHorizontal: spacing.screenHorizontal,
        marginTop: -20,
        gap: spacing.md,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    metricCard: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.base,
        ...shadows.card,
    },
    metricIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    metricValue: {
        ...typography.h3,
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        fontVariant: ['tabular-nums'],
    },
    currencyValue: {
        fontSize: 18,
        fontVariant: ['tabular-nums'],
    },
    metricLabel: {
        ...typography.caption,
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 4,
        fontWeight: '500',
    },

    actionButtonsContainer: {
        marginHorizontal: spacing.screenHorizontal,
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    // Gate Access Scanner (Primary Action Button)
    gateScannerBtn: {
        height: 52,
        backgroundColor: colors.primaryAccent,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.button,
    },
    gateScannerText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
    },
    findParkingBtn: {
        height: 48,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.primaryAccent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    findParkingText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primaryAccent,
    },

    // Recent Bookings Section
    sectionHeader: {
        ...typography.h4,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        paddingHorizontal: spacing.screenHorizontal,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
    },
    bookingCard: {
        marginHorizontal: spacing.screenHorizontal,
        marginBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.base,
        ...shadows.card,
    },
    bookingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bookingInfoCol: {
        flex: 1,
        marginRight: spacing.sm,
    },
    plateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    plateText: {
        ...typography.label,
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    bookingMeta: {
        ...typography.caption,
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    bookingTime: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
    },
    bookingRightCol: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 6,
    },
    inlineActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
    },
    actionBtnApprove: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: colors.statusSemantic.approved.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionBtnReject: {
        width: 32,
        height: 32,
        borderRadius: 12,
        backgroundColor: colors.statusSemantic.cancelled.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookingAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
        fontVariant: ['tabular-nums'],
        marginTop: 2,
    },
    // Vendor Feature Tiles
    featuresSection: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing.screenHorizontal,
    },
    featuresSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    featuresSectionTitle: {
        ...typography.h3,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    featuresSectionLink: {
        ...typography.body,
        fontSize: 13,
        color: colors.primaryAccent,
        fontWeight: '600',
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    featureTileCard: {
        width: '48.5%',
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadows.card,
    },
    featureTileIconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    featureTileTextWrap: {
        flex: 1,
        marginRight: 4,
    },
    featureTileTitle: {
        ...typography.label,
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    featureTileSubtitle: {
        ...typography.caption,
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
});

export default VendorDashboardScreen;
