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

const MetricCard = ({ icon, label, value, isCurrency = false }) => (
    <View style={styles.metricCard}>
        <View style={styles.metricIconBox}>
            <Ionicons name={icon} size={22} color={colors.primaryAccent} />
        </View>
        <Text style={[styles.metricValue, isCurrency && styles.currencyValue]} numberOfLines={1}>
            {value}
        </Text>
        <Text style={styles.metricLabel} numberOfLines={1}>
            {label}
        </Text>
    </View>
);

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

    if (loading && !data) return <LoadingScreen />;

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
        ...(data?.recentBookings?.length ? [{ type: 'sectionTitle', title: 'Recent Bookings' }] : []),
        ...(data?.recentBookings || []).map((b) => ({ type: 'booking', data: b })),
        ...(!data?.recentBookings?.length ? [{ type: 'empty' }] : []),
    ];

    const hostName =
        user?.firstName ||
        (user?.fullName ? user.fullName.split(' ')[0] : null) ||
        (user?.name ? user.name.split(' ')[0] : null) ||
        (user ? 'Partner' : 'Sadiq');

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
                            />
                            <MetricCard
                                icon="calendar-outline"
                                label="Today's Bookings"
                                value={data?.todayBookings ?? data?.activeBookings ?? data?.totalBookings ?? 0}
                            />
                        </View>
                        <View style={styles.metricsRow}>
                            <MetricCard
                                icon="trending-up-outline"
                                label="Monthly Revenue"
                                value={formatCurrency(data?.monthlyEarnings ?? data?.totalEarnings ?? 0)}
                                isCurrency
                            />
                            <MetricCard
                                icon="time-outline"
                                label="Pending Approvals"
                                value={pendingApprovalsCount}
                            />
                        </View>
                    </View>
                );

            case 'gateScanner':
                return (
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={styles.gateScannerBtn}
                            onPress={() => navigation.navigate('AccessPassScanner')}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="qr-code-outline" size={22} color={colors.white} style={{ marginRight: 8 }} />
                            <Text style={styles.gateScannerText}>Gate Access Scanner</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.findParkingBtn}
                            onPress={() => {
                                try {
                                    navigation.navigate('SearchTab', { screen: 'Search' });
                                } catch (_) {
                                    navigation.navigate('Search');
                                }
                            }}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="search-outline" size={20} color={colors.primaryAccent} style={{ marginRight: 8 }} />
                            <Text style={styles.findParkingText}>Find & Explore Parking</Text>
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
                        onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
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
});

export default VendorDashboardScreen;
