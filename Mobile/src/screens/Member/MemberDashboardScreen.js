/**
 * MemberDashboardScreen
 * Stats cards, upcoming bookings, recent bookings
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getMemberDashboardThunk } from '../../store/slices/dashboardSlice';
import { useAuth } from '../../hooks/useAuth';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDate, formatTime, truncateText } from '../../utils/formatters';

const StatCard = ({ icon, label, value, color, onPress }) => (
    <TouchableOpacity
        style={[statStyles.card, { borderLeftColor: color }]}
        onPress={onPress}
        activeOpacity={onPress ? 0.75 : 1}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
    >
        <View style={statStyles.topRow}>
            <Ionicons name={icon} size={22} color={color} />
            {onPress && <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />}
        </View>
        <Text style={statStyles.value}>{value}</Text>
        <Text style={statStyles.label}>{label}</Text>
    </TouchableOpacity>
);

const statStyles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: spacing.radius.md,
        padding: spacing.md,
        borderLeftWidth: 3,
        ...shadows.sm,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    value: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.xs },
    label: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
});

const BookingItem = ({ booking, onPress }) => (
    <Card onPress={onPress} style={bookingStyles.card}>
        <View style={bookingStyles.row}>
            <View style={{ flex: 1 }}>
                <Text style={bookingStyles.title} numberOfLines={1}>{booking.parkingSpaceTitle}</Text>
                <Text style={bookingStyles.address} numberOfLines={1}>{booking.parkingSpaceAddress}</Text>
                <Text style={bookingStyles.time}>
                    {formatDate(booking.startDateTime)} · {formatTime(booking.startDateTime)}
                </Text>
            </View>
            <View style={bookingStyles.right}>
                <Badge status={booking.status} />
                <Text style={bookingStyles.amount}>{formatCurrency(booking.totalAmount)}</Text>
            </View>
        </View>
    </Card>
);

const bookingStyles = StyleSheet.create({
    card: { marginHorizontal: spacing.screenHorizontal },
    row: { flexDirection: 'row', alignItems: 'center' },
    title: { ...typography.label, color: colors.textPrimary },
    address: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    time: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
    right: { alignItems: 'flex-end', gap: spacing.xs },
    amount: { ...typography.label, color: colors.textPrimary },
});

export const MEMBER_FEATURE_TILES = [
    {
        id: 'search',
        title: 'Find Parking',
        subtitle: 'Explore spots & rates',
        icon: 'search',
        color: colors.primary,
        screen: 'Search',
        params: { focusSearch: true },
    },
    {
        id: 'bookings',
        title: 'Reservations',
        subtitle: 'Driver bookings & passes',
        icon: 'calendar',
        color: '#2563EB',
        screen: 'MyBookings',
        params: { initialTab: 'all' },
    },
    {
        id: 'vehicles',
        title: 'My Garage',
        subtitle: 'Vehicles & plates',
        icon: 'car-sport',
        color: '#7C3AED',
        screen: 'Vehicles',
        params: { returnScreen: 'MemberDashboard' },
    },
    {
        id: 'favorites',
        title: 'Favorites',
        subtitle: 'Saved parking lots',
        icon: 'heart',
        color: '#EF4444',
        screen: 'Favorites',
        params: { returnScreen: 'MemberDashboard' },
    },
    {
        id: 'passes',
        title: 'Digital Passes',
        subtitle: 'Passes & subscriptions',
        icon: 'ticket',
        color: '#059669',
        screen: 'MyPasses',
        params: { returnScreen: 'MemberDashboard' },
    },
    {
        id: 'events',
        title: 'Event Passes',
        subtitle: 'Concert & stadium parking',
        icon: 'flame',
        color: '#D97706',
        screen: 'EventPackages',
        params: { returnScreen: 'MemberDashboard' },
    },
    {
        id: 'chat',
        title: 'Messages',
        subtitle: 'Host chat inquiries',
        icon: 'chatbubbles',
        color: '#0284C7',
        screen: 'ConversationList',
        params: { returnScreen: 'MemberDashboard' },
    },
    {
        id: 'scanner',
        title: 'Gate Pass QR',
        subtitle: 'Scan access ticket',
        icon: 'qr-code',
        color: '#4F46E5',
        screen: 'AccessPassScanner',
        params: { returnScreen: 'MemberDashboard' },
    },
    {
        id: 'ev',
        title: 'EV Charging',
        subtitle: 'Simulate charging',
        icon: 'flash',
        color: '#10B981',
        screen: 'EvChargeSimulator',
        params: { returnScreen: 'MemberDashboard' },
    },
    {
        id: 'lpr',
        title: 'LPR Simulator',
        subtitle: 'Barrier entry/exit',
        icon: 'scan-circle',
        color: '#6366F1',
        screen: 'LprSimulator',
        params: { returnScreen: 'MemberDashboard' },
    },
];

const MemberDashboardScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { user } = useAuth();
    const { memberDashboard, loading } = useSelector((state) => state.dashboard);
    const [refreshing, setRefreshing] = React.useState(false);

    useEffect(() => {
        dispatch(getMemberDashboardThunk());
    }, [dispatch]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(getMemberDashboardThunk());
        setRefreshing(false);
    }, [dispatch]);

    if (loading && !memberDashboard) {
        return <LoadingScreen />;
    }

    const data = memberDashboard;

    const sections = [
        { type: 'header' },
        { type: 'stats' },
        { type: 'features' },
        ...(data?.upcomingBookings?.length ? [{ type: 'sectionTitle', title: 'Upcoming Bookings' }] : []),
        ...(data?.upcomingBookings || []).map((b) => ({ type: 'booking', data: b })),
        ...(data?.recentBookings?.length ? [{ type: 'sectionTitle', title: 'Recent Bookings' }] : []),
        ...(data?.recentBookings || []).map((b) => ({ type: 'booking', data: b })),
        ...(!data?.upcomingBookings?.length && !data?.recentBookings?.length ? [{ type: 'empty' }] : []),
    ];

    const navigateToSearch = () => {
        try {
            const parent = navigation.getParent?.();
            if (parent) {
                parent.navigate('SearchTab', { screen: 'Search' });
                return;
            }
        } catch (_) {}
        try {
            navigation.navigate('SearchTab', { screen: 'Search' });
            return;
        } catch (_) {}
        try {
            navigation.navigate('Search');
            return;
        } catch (_) {}
    };

    const navigateToBookings = (initialTab = 'all') => {
        try {
            const parent = navigation.getParent?.();
            if (parent) {
                parent.navigate('BookingsTab', { screen: 'MyBookings', params: { initialTab } });
                return;
            }
        } catch (_) {}
        try {
            navigation.navigate('BookingsTab', { screen: 'MyBookings', params: { initialTab } });
            return;
        } catch (_) {}
        try {
            navigation.navigate('MyBookings', { initialTab });
            return;
        } catch (_) {}
    };

    const handleFeatureTilePress = (tile) => {
        if (tile.id === 'search') {
            navigateToSearch();
            return;
        }
        if (tile.id === 'bookings') {
            navigateToBookings(tile.params?.initialTab || 'all');
            return;
        }
        try {
            navigation.navigate(tile.screen, tile.params || {});
        } catch (_) {
            try {
                navigation.navigate('MenuTab', { screen: tile.screen, params: tile.params || {} });
            } catch (err) {
                console.warn('Navigation failed for tile:', tile.screen, err);
            }
        }
    };

    const memberName =
        user?.firstName ||
        (user?.fullName ? user.fullName.split(' ')[0] : null) ||
        (user?.name ? user.name.split(' ')[0] : null) ||
        (user?.email ? user.email.split('@')[0] : null) ||
        'there';

    const renderItem = ({ item }) => {
        switch (item.type) {
            case 'header':
                return (
                    <LinearGradient colors={colors.gradients.hero} style={styles.heroGradient}>
                        <View style={styles.heroContent}>
                            <Text style={styles.greeting}>Hello, {memberName} 👋</Text>
                            <Text style={styles.heroSubtitle}>Find your perfect parking spot</Text>

                            <TouchableOpacity
                                style={styles.searchBarCta}
                                onPress={navigateToSearch}
                                activeOpacity={0.85}
                                accessibilityRole="button"
                                accessibilityLabel="Find parking spaces"
                            >
                                <Ionicons name="search" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                                <Text style={styles.searchBarPlaceholder}>Find & book parking spaces...</Text>
                                <View style={styles.searchActionBtn}>
                                    <Text style={styles.searchActionText}>Find Parking</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                );
            case 'stats':
                return (
                    <View style={styles.statsRow}>
                        <StatCard
                            icon="calendar"
                            label="Total"
                            value={data?.totalBookings || 0}
                            color={colors.primary}
                            onPress={() => navigateToBookings('all')}
                        />
                        <StatCard
                            icon="time"
                            label="Active"
                            value={data?.activeBookings || 0}
                            color={colors.success}
                            onPress={() => navigateToBookings('active')}
                        />
                        <StatCard
                            icon="wallet"
                            label="Spent"
                            value={formatCurrency(data?.totalSpent || 0)}
                            color={colors.accent}
                            onPress={() => navigateToBookings('completed')}
                        />
                    </View>
                );
            case 'features':
                return (
                    <View style={styles.featuresSection}>
                        <View style={styles.featuresSectionHeader}>
                            <Text style={styles.featuresSectionTitle}>Features & Quick Access</Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('MenuTab', { screen: 'MenuHome' })}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.featuresSectionLink}>View Menu →</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.featuresGrid}>
                            {MEMBER_FEATURE_TILES.map((tile) => (
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
                return <Text style={styles.sectionTitle}>{item.title}</Text>;
            case 'booking':
                return (
                    <BookingItem
                        booking={item.data}
                        onPress={() => navigation.navigate('BookingDetail', {
                            bookingId: item.data.id,
                            id: item.data.id,
                            booking: item.data,
                        })}
                    />
                );
            case 'empty':
                return (
                    <EmptyState
                        icon="car-outline"
                        title="No bookings yet"
                        message="Search for parking spaces and book your first spot!"
                        actionLabel="Find Parking"
                        onAction={navigateToSearch}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <ScreenLayout>
            <FlatList
                data={sections}
                renderItem={renderItem}
                keyExtractor={(item, index) => `${item.type}-${index}`}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            />
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    heroGradient: {
        paddingTop: spacing.md,
        paddingBottom: spacing['2xl'],
        paddingHorizontal: spacing.screenHorizontal,
        borderBottomLeftRadius: spacing.radius.xl,
        borderBottomRightRadius: spacing.radius.xl,
    },
    heroContent: {},
    greeting: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.white,
    },
    heroSubtitle: {
        ...typography.body,
        color: 'rgba(255,255,255,0.8)',
        marginTop: spacing.xs,
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.screenHorizontal,
        marginTop: -spacing.lg,
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        paddingHorizontal: spacing.screenHorizontal,
        marginTop: spacing.base,
        marginBottom: spacing.md,
    },
    searchBarCta: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: 10,
        marginTop: spacing.md,
        ...shadows.card,
    },
    searchBarPlaceholder: {
        flex: 1,
        ...typography.body,
        color: colors.textTertiary,
        fontSize: 14,
    },
    searchActionBtn: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    searchActionText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '600',
    },
});

export default MemberDashboardScreen;
