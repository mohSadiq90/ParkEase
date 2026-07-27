import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getMemberDashboardThunk } from '../../store/slices/dashboardSlice';
import { useAuth } from '../../hooks/useAuth';
import Badge from '../../components/Common/Badge';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';

const { width } = Dimensions.get('window');

const ActionCard = ({ icon, label, onPress }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.actionCardWrapper}>
        <BlurView intensity={20} tint="light" style={styles.actionCardBlur}>
            <View style={styles.actionIconContainer}>
                <Ionicons name={icon} size={28} color={colors.white} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
        </BlurView>
    </TouchableOpacity>
);

const UpcomingBookingCard = ({ booking, onPress }) => (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
            colors={['#1a1f3c', '#2d3359']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upcomingCard}
        >
            <View style={styles.upcomingHeader}>
                <Text style={styles.upcomingTitle} numberOfLines={1}>{booking.parkingSpaceTitle}</Text>
                <View style={styles.qrContainer}>
                    <Ionicons name="qr-code-outline" size={32} color={colors.white} />
                </View>
            </View>
            <View style={styles.upcomingDetails}>
                <View style={styles.upcomingDetailRow}>
                    <Text style={styles.upcomingLabel}>Date:</Text>
                    <Text style={styles.upcomingValue}>{formatDate(booking.startDateTime)}</Text>
                </View>
                <View style={styles.upcomingDetailRow}>
                    <Text style={styles.upcomingLabel}>Time:</Text>
                    <Text style={styles.upcomingValue}>{formatTime(booking.startDateTime)} - {formatTime(booking.endDateTime)}</Text>
                </View>
                <View style={styles.upcomingDetailRow}>
                    <Text style={styles.upcomingLabel}>Status:</Text>
                    <Badge status={booking.status} />
                </View>
                <View style={styles.upcomingDetailRow}>
                    <Text style={styles.upcomingLabel}>Vehicle:</Text>
                    <Text style={styles.upcomingValue}>{booking.vehicleNumber || 'N/A'}</Text>
                </View>
            </View>
        </LinearGradient>
    </TouchableOpacity>
);

const RecentBookingItem = ({ booking, onPress }) => (
    <TouchableOpacity style={styles.recentItem} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.recentIconBox}>
            <Ionicons name="car-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.recentInfo}>
            <Text style={styles.recentTitle} numberOfLines={1}>{booking.parkingSpaceTitle}</Text>
            <Text style={styles.recentTime}>
                {formatDate(booking.startDateTime)}, {formatTime(booking.startDateTime)}
            </Text>
        </View>
        <View style={styles.recentRight}>
            <Text style={styles.recentAmount}>{formatCurrency(booking.totalAmount)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
    </TouchableOpacity>
);

const MemberDashboardScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
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

    if (loading && !memberDashboard && !refreshing) {
        return <LoadingScreen />;
    }

    const data = memberDashboard || {};
    const upcoming = data.upcomingBookings?.[0]; // Show only the most immediate upcoming

    return (
        <ScrollView 
            style={styles.container}
            bounces={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
            showsVerticalScrollIndicator={false}
        >
            <LinearGradient
                colors={['#4F29FA', '#2575FC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 20) }]}
            >
                <View style={styles.headerTop}>
                    <View>
                        <Text style={styles.greeting}>Hello, {user?.firstName || 'User'}</Text>
                        <Text style={styles.subGreeting}>Welcome back!</Text>
                    </View>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>{user?.firstName?.[0] || 'U'}</Text>
                        <View style={styles.onlineBadge} />
                    </View>
                </View>

                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.actionsScroll}
                >
                    <ActionCard icon="search-outline" label="Search" onPress={() => navigation.navigate('SearchTab')} />
                    <ActionCard icon="ticket-outline" label="Passes" onPress={() => navigation.navigate('ProfileTab', { screen: 'MyPasses' })} />
                    <ActionCard icon="business-outline" label="Corporate" onPress={() => navigation.navigate('CorporateTab')} />
                    <ActionCard icon="car-outline" label="Vehicles" onPress={() => navigation.navigate('ProfileTab', { screen: 'Vehicles' })} />
                </ScrollView>
            </LinearGradient>

            <View style={styles.contentBody}>
                {upcoming ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Upcoming Booking</Text>
                        <UpcomingBookingCard 
                            booking={upcoming}
                            onPress={() => navigation.navigate('BookingDetail', { id: upcoming.id })}
                        />
                    </View>
                ) : null}

                {data.recentBookings && data.recentBookings.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Bookings</Text>
                        <View style={styles.recentListContainer}>
                            {data.recentBookings.map((b) => (
                                <RecentBookingItem 
                                    key={b.id} 
                                    booking={b} 
                                    onPress={() => navigation.navigate('BookingDetail', { id: b.id })} 
                                />
                            ))}
                        </View>
                    </View>
                ) : null}

                {!upcoming && (!data.recentBookings || data.recentBookings.length === 0) ? (
                    <View style={styles.emptyStateContainer}>
                        <Ionicons name="calendar-outline" size={64} color={colors.borderLight} />
                        <Text style={styles.emptyStateTitle}>No Bookings Yet</Text>
                        <Text style={styles.emptyStateText}>Your upcoming and recent bookings will appear here.</Text>
                    </View>
                ) : null}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    headerGradient: {
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 30,
    },
    greeting: {
        ...typography.h2,
        color: colors.white,
        fontWeight: '700',
    },
    subGreeting: {
        ...typography.body1,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarText: {
        ...typography.h3,
        color: colors.white,
    },
    onlineBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.success,
        borderWidth: 2,
        borderColor: '#2575FC',
    },
    actionsScroll: {
        paddingHorizontal: 16,
        gap: 12,
    },
    actionCardWrapper: {
        width: 100,
        height: 110,
        borderRadius: 20,
        overflow: 'hidden',
    },
    actionCardBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        ...typography.caption,
        color: colors.white,
        fontWeight: '600',
    },
    contentBody: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: 16,
        fontWeight: '700',
    },
    upcomingCard: {
        borderRadius: 20,
        padding: 20,
        ...shadows.md,
        shadowColor: '#1a1f3c',
    },
    upcomingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    upcomingTitle: {
        ...typography.h4,
        color: colors.white,
        flex: 1,
        marginRight: 12,
    },
    qrContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    upcomingDetails: {
        gap: 12,
    },
    upcomingDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    upcomingLabel: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.6)',
        width: 60,
    },
    upcomingValue: {
        ...typography.body2,
        color: colors.white,
        fontWeight: '500',
        flex: 1,
    },
    recentListContainer: {
        backgroundColor: colors.white,
        borderRadius: 20,
        padding: 8,
        ...shadows.sm,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: colors.white,
    },
    recentIconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    recentInfo: {
        flex: 1,
    },
    recentTitle: {
        ...typography.body2,
        color: colors.textPrimary,
        fontWeight: '600',
        marginBottom: 2,
    },
    recentTime: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    recentRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recentAmount: {
        ...typography.body2,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateTitle: {
        ...typography.h4,
        color: colors.textSecondary,
        marginTop: 16,
    },
    emptyStateText: {
        ...typography.body2,
        color: colors.textTertiary,
        marginTop: 8,
        textAlign: 'center',
    },
});

export default MemberDashboardScreen;
