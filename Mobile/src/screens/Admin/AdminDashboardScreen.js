/**
 * Platform Admin Dashboard Screen
 * Platform metrics, user oversight, listing verification, outbox management
 * Matches API_ENDPOINTS_MOBILE.md Section 21
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { 
    getAdminDashboardThunk, 
    getAdminUsersThunk,
    getAdminListingsThunk, 
    verifyListingThunk,
    unverifyListingThunk,
    processOutboxBatchThunk,
    getAdminAuditLogsThunk
} from '../../store/slices/adminSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const MetricBox = ({ icon, label, value, color, bg }) => (
    <View style={[styles.metricCard, { backgroundColor: bg }]}>
        <View style={[styles.metricIcon, { backgroundColor: color }]}>
            <Ionicons name={icon} size={20} color={colors.white} />
        </View>
        <Text style={styles.metricVal}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
    </View>
);

const AdminDashboardScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { 
        dashboard, 
        dashboardLoading, 
        listings, 
        users,
        outboxLoading 
    } = useSelector((state) => state.admin);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        await Promise.all([
            dispatch(getAdminDashboardThunk()),
            dispatch(getAdminListingsThunk({ pageSize: 10 })),
            dispatch(getAdminUsersThunk({ pageSize: 10 })),
            dispatch(getAdminAuditLogsThunk({ pageSize: 5 })),
        ]);
    }, [dispatch]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleToggleVerify = async (listing) => {
        const action = listing.isVerified ? unverifyListingThunk : verifyListingThunk;
        const promptText = listing.isVerified ? 'Unverify Listing' : 'Verify Listing';
        Alert.alert(
            promptText,
            `Are you sure you want to ${listing.isVerified ? 'remove verification from' : 'verify'} "${listing.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        await dispatch(action({ id: listing.id, reason: 'Admin oversight review' }));
                    },
                },
            ]
        );
    };

    const handleProcessOutbox = async () => {
        Alert.alert(
            'Process Outbox Batch',
            'Trigger background event dispatcher immediately?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Process Now',
                    onPress: async () => {
                        const res = await dispatch(processOutboxBatchThunk(50));
                        if (!res.error) {
                            Alert.alert('Outbox Processed', 'Outbox batch executed successfully.');
                        } else {
                            Alert.alert('Outbox Failed', res.payload || 'Failed to dispatch outbox batch.');
                        }
                    },
                },
            ]
        );
    };

    if (dashboardLoading && !dashboard) return <LoadingScreen message="Loading Admin Dashboard..." />;

    return (
        <ScreenLayout>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.container}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Platform Admin</Text>
                        <Text style={styles.subtitle}>System oversight, verification & outbox</Text>
                    </View>
                    <TouchableOpacity onPress={handleProcessOutbox} style={styles.outboxBtn}>
                        <Ionicons name="flash-outline" size={18} color={colors.primary} />
                        <Text style={styles.outboxBtnText}>Process Outbox</Text>
                    </TouchableOpacity>
                </View>

                {/* Metrics */}
                <View style={styles.metricsGrid}>
                    <MetricBox
                        icon="people"
                        label="Users"
                        value={dashboard?.totalUsers || users?.length || 0}
                        color={colors.primary}
                        bg={colors.primarySoft}
                    />
                    <MetricBox
                        icon="business"
                        label="Listings"
                        value={dashboard?.totalListings || listings?.length || 0}
                        color={colors.success}
                        bg={colors.successSoft}
                    />
                    <MetricBox
                        icon="calendar"
                        label="Bookings"
                        value={dashboard?.totalBookings || 0}
                        color={colors.accent}
                        bg={colors.accentSoft}
                    />
                    <MetricBox
                        icon="wallet"
                        label="Revenue"
                        value={formatCurrency(dashboard?.totalRevenue || 0)}
                        color="#8B5CF6"
                        bg="#EDE9FE"
                    />
                </View>

                {/* Listing Oversight Section */}
                <Text style={styles.sectionTitle}>Listing Verification & Oversight</Text>
                {listings && listings.length > 0 ? (
                    listings.slice(0, 5).map((item) => (
                        <Card key={item.id} style={styles.listingCard}>
                            <View style={styles.listingRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.listingTitle}>{item.title}</Text>
                                    <Text style={styles.listingCity}>{item.city || item.address}</Text>
                                    <Text style={styles.listingRate}>
                                        {formatCurrency(item.hourlyRate || 0)} / hr
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.verifyBtn,
                                        item.isVerified ? styles.unverifyBtn : styles.verifyBtnActive,
                                    ]}
                                    onPress={() => handleToggleVerify(item)}
                                >
                                    <Ionicons
                                        name={item.isVerified ? 'checkmark-circle' : 'shield-outline'}
                                        size={16}
                                        color={colors.white}
                                    />
                                    <Text style={styles.verifyBtnText}>
                                        {item.isVerified ? 'Verified' : 'Verify'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    ))
                ) : (
                    <Card style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No facilities loaded for verification.</Text>
                    </Card>
                )}

                {/* Quick Outbox Status Card */}
                <Card style={styles.systemCard}>
                    <View style={styles.systemRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.systemTitle}>Event Outbox Worker</Text>
                            <Text style={styles.systemSub}>Reliable async integration messaging</Text>
                        </View>
                        <Button
                            title="Trigger Dispatch"
                            onPress={handleProcessOutbox}
                            variant="primary"
                            loading={outboxLoading}
                            style={{ paddingHorizontal: spacing.md }}
                        />
                    </View>
                </Card>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: spacing['3xl'],
        paddingTop: spacing.base,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    title: {
        ...typography.h2,
        color: colors.textPrimary,
    },
    subtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    outboxBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primarySoft,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: spacing.radius.full,
    },
    outboxBtnText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    metricCard: {
        width: '48%',
        borderRadius: spacing.radius.lg,
        padding: spacing.md,
        alignItems: 'center',
    },
    metricIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    metricVal: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    metricLabel: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    sectionTitle: {
        ...typography.label,
        color: colors.textPrimary,
        marginBottom: spacing.md,
        fontSize: 16,
    },
    listingCard: {
        marginBottom: spacing.sm,
    },
    listingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    listingTitle: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    listingCity: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    listingRate: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    verifyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: spacing.radius.md,
    },
    verifyBtnActive: {
        backgroundColor: colors.primary,
    },
    unverifyBtn: {
        backgroundColor: colors.success,
    },
    verifyBtnText: {
        ...typography.caption,
        color: colors.white,
        fontWeight: '700',
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    emptyText: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    systemCard: {
        marginTop: spacing.md,
        backgroundColor: colors.surfaceVariant,
    },
    systemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    systemTitle: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    systemSub: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
});

export default AdminDashboardScreen;
