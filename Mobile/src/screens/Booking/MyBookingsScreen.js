/**
 * MyBookingsScreen
 * User's bookings list with status filter tabs
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getMyBookingsThunk } from '../../store/slices/bookingSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography } from '../../styles/globalStyles';
import { formatCurrency, formatDate, formatTime, formatTimeRange } from '../../utils/formatters';
import { BookingStatus } from '../../utils/constants';

const FILTERS = [
    { label: 'All', value: null },
    {
        label: 'Pending',
        value: [
            BookingStatus.Pending,
            BookingStatus.AwaitingPayment,
            BookingStatus.PendingExtension,
            BookingStatus.AwaitingExtensionPayment,
        ],
        stringMatches: ['PENDING', 'AWAITING', 'AWAITING_PAYMENT', 'PENDING PAYMENT'],
    },
    {
        label: 'Active',
        value: [BookingStatus.Confirmed, BookingStatus.InProgress],
        stringMatches: ['CONFIRMED', 'ACTIVE', 'INPROGRESS', 'IN_PROGRESS', 'APPROVED'],
    },
    {
        label: 'Completed',
        value: [BookingStatus.Completed],
        stringMatches: ['COMPLETED'],
    },
    {
        label: 'Cancelled / Rejected',
        value: [BookingStatus.Cancelled, BookingStatus.Rejected, BookingStatus.Expired],
        stringMatches: ['CANCELLED', 'CANCELED', 'REJECTED', 'EXPIRED'],
    },
];

const getInitialFilterIndex = (params) => {
    const filterKey = (params?.filter || params?.initialTab || '').toLowerCase();
    if (filterKey === 'pending') return 1;
    if (filterKey === 'active' || filterKey === 'confirmed') return 2;
    if (filterKey === 'completed') return 3;
    if (filterKey === 'cancelled' || filterKey === 'rejected') return 4;
    return 0;
};

const MyBookingsScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { myBookings, myBookingsLoading } = useSelector((s) => s.booking);
    const [activeFilter, setActiveFilter] = useState(() => getInitialFilterIndex(route?.params));
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (route?.params?.filter || route?.params?.initialTab) {
            setActiveFilter(getInitialFilterIndex(route.params));
        }
    }, [route?.params]);

    useEffect(() => {
        dispatch(getMyBookingsThunk());
    }, [dispatch]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(getMyBookingsThunk());
        setRefreshing(false);
    }, [dispatch]);

    const bookingsList = Array.isArray(myBookings) ? myBookings : [];
    const filteredBookings = bookingsList.filter((b) => {
        const filter = FILTERS[activeFilter];
        if (!filter || filter.value == null) return true;
        if (Array.isArray(filter.value) && filter.value.includes(b.status)) {
            return true;
        }
        if (b.status === filter.value) {
            return true;
        }
        if (typeof b.status === 'string' && filter.stringMatches) {
            return filter.stringMatches.includes(b.status.toUpperCase());
        }
        return false;
    });

    const renderBookingItem = ({ item }) => {
        const isDeemphasized = [BookingStatus.Cancelled, BookingStatus.Rejected].includes(item.status);
        return (
            <Card onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })} activeOpacity={0.7} style={[styles.bookingCard, isDeemphasized && { opacity: 0.6 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.bookingTitle} numberOfLines={1}>{item.parkingSpaceTitle}</Text>
                            <Badge status={item.status} />
                        </View>
                        <View style={styles.cardBody}>
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                                <Text style={styles.infoText} numberOfLines={1}>{item.parkingSpaceAddress || 'N/A'}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
                                <Text style={styles.infoText}>{formatDate(item.startDateTime)}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                                <Text style={styles.infoText}>{formatTimeRange(item.startDateTime, item.endDateTime)}</Text>
                            </View>
                        </View>
                        <View style={styles.cardFooter}>
                            <Text style={styles.refCode}>Ref: {item.bookingReference}</Text>
                            <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} style={{ marginLeft: spacing.sm }} />
                </View>
            </Card>
        );
    };

    return (
        <ScreenLayout>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.screenTitle}>My Bookings</Text>
            </View>

            {/* Filter Tabs */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                fadingEdgeLength={50}
                contentContainerStyle={[styles.filterRow, { paddingRight: spacing.screenHorizontal * 3 }]}
                style={styles.filterRowScroll}
            >
                {FILTERS.map((filter, idx) => {
                    const count = filter.value === null ? bookingsList.length : bookingsList.filter(b => {
                        if (Array.isArray(filter.value)) return filter.value.includes(b.status);
                        if (b.status === filter.value) return true;
                        if (typeof b.status === 'string' && filter.stringMatches) return filter.stringMatches.includes(b.status.toUpperCase());
                        return false;
                    }).length;
                    return (
                        <TouchableOpacity
                            key={idx}
                            testID={`filter-tab-${filter.label.toLowerCase()}`}
                            onPress={() => setActiveFilter(idx)}
                            style={[styles.filterTab, activeFilter === idx && styles.filterTabActive]}
                        >
                            <Text style={[styles.filterTabText, activeFilter === idx && styles.filterTabTextActive]}>
                                {filter.label} <Text style={{ color: activeFilter === idx ? colors.primary : colors.textTertiary }}>{count != null ? `(${count})` : ''}</Text>
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* List */}
            {myBookingsLoading && !refreshing ? (
                <LoadingScreen />
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={(item) => item.id}
                    renderItem={renderBookingItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<EmptyState icon="calendar-outline" title="No bookings" message="You don't have any bookings yet" />}
                />
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: { paddingTop: spacing.sm, paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.md },
    screenTitle: { ...typography.h2, color: colors.textPrimary },
    filterRowScroll: { flexGrow: 0, marginBottom: spacing.sm },
    filterRow: { flexDirection: 'row', paddingHorizontal: spacing.screenHorizontal, paddingVertical: 6, gap: spacing.sm, alignItems: 'center' },
    filterTab: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: spacing.radius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    filterTabActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    filterTabText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
    filterTabTextActive: { color: colors.primary, fontWeight: '600' },
    listContent: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing['2xl'] },
    bookingCard: {},
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    bookingTitle: { ...typography.label, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
    cardBody: { gap: spacing.xs },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    infoText: { ...typography.caption, color: colors.textSecondary },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
    refCode: { ...typography.caption, color: colors.textTertiary },
    amount: { ...typography.h4, color: colors.primary },
});

export default MyBookingsScreen;
