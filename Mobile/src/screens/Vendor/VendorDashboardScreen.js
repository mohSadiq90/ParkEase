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
    Share,
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

export const VENDOR_OPERATIONAL_TILES = [
    {
        id: 'create_parking',
        title: 'Add Space',
        subtitle: 'List a new spot',
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
        subtitle: 'Manage bookings',
        icon: 'calendar-outline',
        color: '#8B5CF6',
        screen: 'IncomingBookings',
        params: { initialTab: 'all' },
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
        id: 'event_packages',
        title: 'Event Passes',
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
];

export const VENDOR_SIMULATOR_TILES = [
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

export const VENDOR_FEATURE_TILES = [...VENDOR_OPERATIONAL_TILES, ...VENDOR_SIMULATOR_TILES];

export const getHostBadgeLabel = (status) => {
    if (status === 6 || status === 'AWAITING_PAYMENT' || status === 'Pending Payment' || status === 'PENDING PAYMENT') {
        return 'Awaiting driver payment';
    }
    if (status === 7 || status === 'REJECTED' || status === 'Rejected') {
        return 'Rejected by host';
    }
    if (status === 0 || status === 'PENDING' || status === 'Pending') {
        return 'Awaiting approval';
    }
    return undefined;
};

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

    const handleShareListing = useCallback(async () => {
        try {
            await Share.share({
                message: 'Book secure and verified parking spots with ParkEase! Check out my listings:\nhttps://parkease.app',
                title: 'Share ParkEase Listings',
            });
        } catch (_) {}
    }, []);

    if (loading && !data) return <LoadingScreen type="dashboard" message="Loading Host Control Center..." />;

    const pendingApprovalsCount = data?.pendingBookings ??
        data?.pendingApprovals ??
        (data?.recentBookings?.filter(
            (b) => b.status === 0 || b.status === 'PENDING' || b.status === 'Pending'
        ).length) ??
        0;

    const totalSpaces = data?.activeParkingSpaces ?? data?.totalParkingSpaces ?? 0;
    const occupiedSpaces = data?.occupiedSpaces ??
        data?.currentlyOccupied ??
        (data?.recentBookings?.filter(
            (b) => b.status === 'ACTIVE' || b.status === 2 || b.status === 'Active' || b.status === 'IN_PROGRESS'
        ).length) ??
        0;

    const recentBookingsList = (data?.recentBookings || []).slice(0, 5);

    const sections = [
        { type: 'header' },
        { type: 'metrics' },
        ...(pendingApprovalsCount > 0 ? [{ type: 'pendingNudge' }] : []),
        ...(totalSpaces > 0 ? [{ type: 'occupancy' }] : []),
        ...(totalSpaces === 0 || ((data?.totalBookings ?? 0) === 0 && (data?.recentBookings?.length ?? 0) === 0)
            ? [{ type: 'starterTip' }]
            : []),
        { type: 'actionButtons' },
        { type: 'vendorFeatures' },
        ...(recentBookingsList.length ? [{ type: 'recentBookingsHeader', totalCount: data?.recentBookings?.length || 0 }] : []),
        ...recentBookingsList.map((b) => ({ type: 'booking', data: b })),
        ...(!recentBookingsList.length ? [{ type: 'empty' }] : []),
    ];

    const rawName =
        user?.firstName ||
        (user?.fullName ? user.fullName.split(' ')[0] : null) ||
        (user?.name ? user.name.split(' ')[0] : null) ||
        (user?.email ? user.email.split('@')[0] : null) ||
        'Partner';
    const hostName = rawName.trim().charAt(0).toUpperCase() + rawName.trim().slice(1);

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
                                value={totalSpaces}
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

            case 'pendingNudge':
                return (
                    <TouchableOpacity
                        style={styles.pendingNudgeCard}
                        onPress={() => navigateToBookings({ initialTab: 'pending', filter: 'pending' })}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Pending Actions Nudge"
                    >
                        <View style={styles.pendingNudgeIconWrap}>
                            <Ionicons name="time" size={18} color="#D97706" />
                        </View>
                        <Text style={styles.pendingNudgeText}>
                            <Text style={styles.pendingNudgeBold}>
                                {pendingApprovalsCount} {pendingApprovalsCount === 1 ? 'action requires' : 'actions require'}
                            </Text>{' '}
                            attention (pending driver payment / approval)
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="#D97706" />
                    </TouchableOpacity>
                );

            case 'occupancy':
                return (
                    <View style={styles.occupancyBar}>
                        <View style={styles.occupancyLeft}>
                            <View style={styles.livePulseDot} />
                            <Text style={styles.occupancyText}>
                                <Text style={styles.occupancyHighlight}>{occupiedSpaces}/{totalSpaces} spots</Text> occupied right now
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation?.navigate?.('MyListings', { filter: 'active', initialFilter: 'active' })}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="View Spaces Occupancy"
                        >
                            <Text style={styles.occupancyLink}>View Spaces →</Text>
                        </TouchableOpacity>
                    </View>
                );

            case 'starterTip':
                if (totalSpaces === 0) {
                    return (
                        <TouchableOpacity
                            style={styles.starterTipCard}
                            onPress={() => navigation?.navigate?.('CreateParking', {})}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Add Space Starter Tip"
                        >
                            <View style={[styles.starterTipIcon, { backgroundColor: '#ECFDF5' }]}>
                                <Ionicons name="sparkles" size={20} color="#10B981" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.starterTipTitle}>Get Started as a Host</Text>
                                <Text style={styles.starterTipSub}>List your first parking spot to start receiving bookings and earning revenue.</Text>
                            </View>
                            <Ionicons name="arrow-forward" size={16} color={colors.primaryAccent} />
                        </TouchableOpacity>
                    );
                }
                return (
                    <View style={styles.starterTipCard}>
                        <View style={[styles.starterTipIcon, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="bulb-outline" size={20} color="#3B82F6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.starterTipTitle}>Host Pro Tip</Text>
                            <Text style={styles.starterTipSub}>Add photos & set competitive hourly rates to start getting bookings.</Text>
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
                        <View style={styles.secondaryActionsRow}>
                            <TouchableOpacity
                                style={styles.findParkingBtn}
                                onPress={handleFindParking}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel="Find & Explore Parking"
                                testID="find-explore-parking-button"
                            >
                                <Ionicons name="search-outline" size={18} color={colors.primaryAccent} style={{ marginRight: 6 }} />
                                <Text style={styles.findParkingText}>Find Parking</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.shareListingBtn}
                                onPress={handleShareListing}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel="Share Listing"
                            >
                                <Ionicons name="share-social-outline" size={18} color={colors.primaryAccent} style={{ marginRight: 6 }} />
                                <Text style={styles.shareListingText}>Share Listing</Text>
                            </TouchableOpacity>
                        </View>
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
                                accessibilityRole="button"
                                accessibilityLabel="All Tools"
                            >
                                <Text style={styles.featuresSectionLink}>All Tools →</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.featuresGrid}>
                            {VENDOR_OPERATIONAL_TILES.map((tile) => (
                                <TouchableOpacity
                                    key={tile.id}
                                    style={styles.featureTileCard}
                                    onPress={() => handleFeatureTilePress(tile)}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityLabel={tile.title}
                                >
                                    <View style={[styles.featureTileIconWrap, { backgroundColor: tile.color + '15' }]}>
                                        <Ionicons name={tile.icon} size={20} color={tile.color} />
                                    </View>
                                    <View style={styles.featureTileTextWrap}>
                                        <Text style={styles.featureTileTitle} numberOfLines={1}>{tile.title}</Text>
                                        <Text style={styles.featureTileSubtitle} numberOfLines={1}>{tile.subtitle}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Testing & Simulators Subheader & Grid */}
                        <View style={styles.simulatorSectionHeader}>
                            <Text style={styles.simulatorSectionTitle}>Testing & Simulators</Text>
                        </View>
                        <View style={styles.featuresGrid}>
                            {VENDOR_SIMULATOR_TILES.map((tile) => (
                                <TouchableOpacity
                                    key={tile.id}
                                    style={styles.featureTileCard}
                                    onPress={() => handleFeatureTilePress(tile)}
                                    activeOpacity={0.75}
                                    accessibilityRole="button"
                                    accessibilityLabel={tile.title}
                                >
                                    <View style={[styles.featureTileIconWrap, { backgroundColor: tile.color + '15' }]}>
                                        <Ionicons name={tile.icon} size={20} color={tile.color} />
                                    </View>
                                    <View style={styles.featureTileTextWrap}>
                                        <Text style={styles.featureTileTitle} numberOfLines={1}>{tile.title}</Text>
                                        <Text style={styles.featureTileSubtitle} numberOfLines={1}>{tile.subtitle}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 'recentBookingsHeader':
                return (
                    <View style={styles.recentBookingsHeaderRow}>
                        <Text style={styles.sectionHeader}>Recent Bookings</Text>
                        <TouchableOpacity
                            onPress={() => navigateToBookings({ initialTab: 'all' })}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel="See All Recent Bookings"
                        >
                            <Text style={styles.seeAllLink}>See All →</Text>
                        </TouchableOpacity>
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
                        accessibilityRole="button"
                        accessibilityLabel={`Booking for ${vehiclePlate}`}
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
                                <Badge
                                    status={booking.status}
                                    label={getHostBadgeLabel(booking.status)}
                                />
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
                            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={styles.bookingChevron} />
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

    // Occupancy Indicator
    occupancyBar: {
        marginHorizontal: spacing.screenHorizontal,
        marginTop: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.sm,
    },
    occupancyLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    livePulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
    },
    occupancyText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    occupancyHighlight: {
        fontWeight: '700',
        color: colors.textPrimary,
    },
    occupancyLink: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primaryAccent,
    },

    // Pending Nudge Card
    pendingNudgeCard: {
        marginHorizontal: spacing.screenHorizontal,
        marginTop: spacing.md,
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FDE68A',
        gap: spacing.sm,
        ...shadows.sm,
    },
    pendingNudgeIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingNudgeText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        lineHeight: 18,
    },
    pendingNudgeBold: {
        fontWeight: '700',
        color: '#78350F',
    },

    // Starter Tip Card (All-zero state)
    starterTipCard: {
        marginHorizontal: spacing.screenHorizontal,
        marginTop: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: spacing.base,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
        gap: spacing.sm,
        ...shadows.sm,
    },
    starterTipIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    starterTipTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    starterTipSub: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 16,
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
    secondaryActionsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    findParkingBtn: {
        flex: 1,
        height: 44,
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
        fontSize: 14,
        fontWeight: '600',
        color: colors.primaryAccent,
    },
    shareListingBtn: {
        flex: 1,
        height: 44,
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.primaryAccent,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    shareListingText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primaryAccent,
    },

    // Recent Bookings Section
    recentBookingsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.screenHorizontal,
        marginTop: spacing.lg,
        marginBottom: spacing.xs,
    },
    sectionHeader: {
        ...typography.h4,
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    seeAllLink: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primaryAccent,
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
    bookingChevron: {
        marginLeft: 8,
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
    simulatorSectionHeader: {
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    simulatorSectionTitle: {
        ...typography.label,
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
        paddingVertical: 12,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        ...shadows.card,
    },
    featureTileIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    featureTileTextWrap: {
        flex: 1,
        marginRight: 2,
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
