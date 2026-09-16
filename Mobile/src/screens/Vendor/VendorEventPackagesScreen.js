/**
 * VendorEventPackagesScreen
 * Host / Vendor: Manage event parking packages, multi-lot venue zones, and sell-through analytics
 * Parity with web frontend /my/event-packages
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    Alert,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import LoadingScreen from '../../components/Common/LoadingScreen';
import eventPackageService from '../../services/api/eventPackageService';
import apiClient from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const emptyPackageForm = {
    parkingSpaceId: '',
    title: '',
    eventName: '',
    venueName: '',
    zoneName: 'Zone A',
    packagePrice: '500',
    totalSpots: '20',
    earlyEntryMinutes: '30',
    lateExitMinutes: '30',
};

const VendorEventPackagesScreen = ({ navigation }) => {
    const [packages, setPackages] = useState([]);
    const [analytics, setAnalytics] = useState([]);
    const [listings, setListings] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(emptyPackageForm);
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [pkgRes, analyticsRes, listingsRes] = await Promise.all([
                eventPackageService.getMyPackages(),
                eventPackageService.getMyAnalytics(),
                apiClient.get(ENDPOINTS.PARKING.MY_LISTINGS),
            ]);

            const pkgData = pkgRes?.data || pkgRes || [];
            const analyticsData = analyticsRes?.data || analyticsRes || [];
            const listingsData = listingsRes?.data?.data || listingsRes?.data || [];

            setPackages(Array.isArray(pkgData) ? pkgData : []);
            setAnalytics(Array.isArray(analyticsData) ? analyticsData : []);
            const validListings = Array.isArray(listingsData) ? listingsData : [];
            setListings(validListings);

            if (validListings.length > 0 && !form.parkingSpaceId) {
                setForm((f) => ({ ...f, parkingSpaceId: validListings[0].id }));
            }
        } catch (err) {
            setPackages([]);
            setAnalytics([]);
        } finally {
            setIsLoading(false);
        }
    }, [form.parkingSpaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCreatePackage = async () => {
        if (!form.parkingSpaceId || !form.title.trim()) {
            Alert.alert('Validation Error', 'Facility and package title are required.');
            return;
        }

        const price = parseFloat(form.packagePrice) || 0;
        const spots = parseInt(form.totalSpots, 10) || 1;

        setSubmitting(true);
        try {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const eventEnd = new Date(tomorrow.getTime() + 4 * 60 * 60 * 1000);

            const payload = {
                parkingSpaceId: form.parkingSpaceId,
                title: form.title.trim(),
                eventName: form.eventName.trim() || 'Premier Event',
                venueName: form.venueName.trim() || 'City Arena',
                zoneName: form.zoneName.trim() || 'Main Zone',
                eventStartUtc: tomorrow.toISOString(),
                eventEndUtc: eventEnd.toISOString(),
                packagePrice: price,
                totalSpots: spots,
                earlyEntryMinutes: parseInt(form.earlyEntryMinutes, 10) || 0,
                lateExitMinutes: parseInt(form.lateExitMinutes, 10) || 0,
            };

            await eventPackageService.createPackage(payload);
            setModalVisible(false);
            setForm(emptyPackageForm);
            Alert.alert('Success', 'Event parking package created and published on sale.');
            loadData();
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.message || 'Could not create event package.';
            Alert.alert('Create Failed', errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeactivate = (pkg) => {
        Alert.alert(
            'Deactivate Package',
            `Are you sure you want to deactivate "${pkg.title}"? Drivers will no longer be able to purchase tickets.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Deactivate',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await eventPackageService.deactivatePackage(pkg.id);
                            loadData();
                        } catch (err) {
                            Alert.alert('Error', err?.message || 'Failed to deactivate package.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScreenLayout>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation?.goBack?.()}
                    style={styles.backBtn}
                    accessibilityLabel="Go back"
                    testID="vendor-event-pkg-back-btn"
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>Event Packages</Text>
                    <Text style={styles.subtitle}>Multi-lot venue zones & ticket sell-through</Text>
                </View>
                <TouchableOpacity
                    style={styles.addHeaderBtn}
                    onPress={() => setModalVisible(true)}
                    testID="add-event-pkg-header-btn"
                >
                    <Ionicons name="add" size={22} color={colors.white} />
                </TouchableOpacity>
            </View>

            {/* Content List */}
            {isLoading && !packages.length ? (
                <LoadingScreen message="Loading event packages..." />
            ) : (
                <FlatList
                    data={packages}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
                    ListHeaderComponent={
                        analytics.length > 0 ? (
                            <Card style={styles.analyticsCard}>
                                <View style={styles.analyticsHeaderRow}>
                                    <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
                                    <Text style={styles.analyticsTitle}>Sell-Through Performance</Text>
                                </View>
                                <View style={styles.analyticsStatsRow}>
                                    <View style={styles.analyticsStat}>
                                        <Text style={styles.analyticsVal}>{analytics.reduce((acc, a) => acc + (a.totalSold || 0), 0)}</Text>
                                        <Text style={styles.analyticsLbl}>Tickets Sold</Text>
                                    </View>
                                    <View style={styles.analyticsStat}>
                                        <Text style={[styles.analyticsVal, { color: colors.primary }]}>
                                            {formatCurrency(analytics.reduce((acc, a) => acc + (a.totalRevenue || 0), 0))}
                                        </Text>
                                        <Text style={styles.analyticsLbl}>Total Revenue</Text>
                                    </View>
                                    <View style={styles.analyticsStat}>
                                        <Text style={[styles.analyticsVal, { color: colors.success }]}>
                                            {analytics.length}
                                        </Text>
                                        <Text style={styles.analyticsLbl}>Active Venues</Text>
                                    </View>
                                </View>
                            </Card>
                        ) : null
                    }
                    ListEmptyComponent={
                        <Card style={styles.emptyCard}>
                            <Ionicons name="ticket-outline" size={44} color={colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No event packages yet</Text>
                            <Text style={styles.emptySubtitle}>
                                Create targeted parking packages for concerts, games, and stadium events.
                            </Text>
                            <Button
                                title="+ Create Event Package"
                                onPress={() => setModalVisible(true)}
                                style={{ marginTop: spacing.md }}
                            />
                        </Card>
                    }
                    renderItem={({ item }) => (
                        <Card style={styles.packageCard}>
                            <View style={styles.cardHeaderRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.packageTitle}>{item.title}</Text>
                                    <Text style={styles.venueSubtitle}>
                                        {item.eventName || 'Event'} • {item.venueName || 'Venue'}
                                    </Text>
                                </View>
                                <View style={styles.actionRow}>
                                    <Badge
                                        label={item.isActive !== false ? 'On Sale' : 'Closed'}
                                        variant={item.isActive !== false ? 'success' : 'default'}
                                    />
                                    {item.isActive !== false && (
                                        <TouchableOpacity
                                            onPress={() => handleDeactivate(item)}
                                            style={styles.trashBtn}
                                            testID={`deactivate-package-${item.id}`}
                                        >
                                            <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <View style={styles.metricsGrid}>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Price</Text>
                                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                                        {formatCurrency(item.packagePrice || 0)}
                                    </Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Allocated Spots</Text>
                                    <Text style={styles.metricValue}>{item.totalSpots || 0}</Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Early/Late Buffer</Text>
                                    <Text style={styles.metricValue}>
                                        {item.earlyEntryMinutes || 0}m / {item.lateExitMinutes || 0}m
                                    </Text>
                                </View>
                            </View>

                            {item.eventStartUtc && (
                                <Text style={styles.eventTimeText}>
                                    Event Window: {formatDateTime(item.eventStartUtc)}
                                </Text>
                            )}
                        </Card>
                    )}
                />
            )}

            {/* Create Event Package Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Event Package</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} testID="close-package-modal">
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Package Title</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. VIP Concert Parking - Main Deck"
                                placeholderTextColor={colors.textTertiary}
                                value={form.title}
                                onChangeText={(val) => setForm((f) => ({ ...f, title: val }))}
                                testID="event-pkg-title-input"
                            />

                            <View style={styles.twoColumnRow}>
                                <View style={{ flex: 1, marginRight: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Event Name</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="e.g. Rock Festival"
                                        placeholderTextColor={colors.textTertiary}
                                        value={form.eventName}
                                        onChangeText={(val) => setForm((f) => ({ ...f, eventName: val }))}
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Venue Name</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="e.g. Wankhede Stadium"
                                        placeholderTextColor={colors.textTertiary}
                                        value={form.venueName}
                                        onChangeText={(val) => setForm((f) => ({ ...f, venueName: val }))}
                                    />
                                </View>
                            </View>

                            {/* Facility Picker */}
                            <Text style={styles.inputLabel}>Target Parking Facility</Text>
                            {listings.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xs }}>
                                    {listings.map((item) => {
                                        const isSelected = form.parkingSpaceId === item.id;
                                        return (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[styles.facilityChip, isSelected && styles.facilityChipSelected]}
                                                onPress={() => setForm((f) => ({ ...f, parkingSpaceId: item.id }))}
                                            >
                                                <Text
                                                    style={[styles.facilityChipText, isSelected && styles.facilityChipTextSelected]}
                                                    numberOfLines={1}
                                                >
                                                    {item.title || item.id}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            ) : null}

                            <TextInput
                                style={styles.formInput}
                                placeholder="Parking Space UUID"
                                placeholderTextColor={colors.textTertiary}
                                value={form.parkingSpaceId}
                                onChangeText={(val) => setForm((f) => ({ ...f, parkingSpaceId: val }))}
                                testID="event-pkg-space-id-input"
                            />

                            <View style={styles.twoColumnRow}>
                                <View style={{ flex: 1, marginRight: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Package Price (₹)</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={form.packagePrice}
                                        onChangeText={(val) => setForm((f) => ({ ...f, packagePrice: val }))}
                                        keyboardType="decimal-pad"
                                        testID="event-pkg-price-input"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Total Spots</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={form.totalSpots}
                                        onChangeText={(val) => setForm((f) => ({ ...f, totalSpots: val }))}
                                        keyboardType="number-pad"
                                        testID="event-pkg-spots-input"
                                    />
                                </View>
                            </View>

                            <View style={styles.twoColumnRow}>
                                <View style={{ flex: 1, marginRight: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Early Entry (min)</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={form.earlyEntryMinutes}
                                        onChangeText={(val) => setForm((f) => ({ ...f, earlyEntryMinutes: val }))}
                                        keyboardType="number-pad"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Late Exit (min)</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={form.lateExitMinutes}
                                        onChangeText={(val) => setForm((f) => ({ ...f, lateExitMinutes: val }))}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            </View>

                            <Button
                                title={submitting ? 'Publishing Package...' : 'Publish Event Package'}
                                onPress={handleCreatePackage}
                                loading={submitting}
                                disabled={submitting}
                                style={styles.modalSubmitBtn}
                                testID="submit-event-pkg-btn"
                            />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },
    backBtn: {
        padding: spacing.xs,
        marginRight: spacing.sm,
    },
    headerTextWrap: {
        flex: 1,
    },
    title: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    subtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    addHeaderBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    analyticsCard: {
        marginBottom: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.primarySoft || '#EEF2FF',
        borderColor: colors.primary,
        borderWidth: 1,
    },
    analyticsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.sm,
    },
    analyticsTitle: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    analyticsStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    analyticsStat: {
        alignItems: 'center',
    },
    analyticsVal: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    analyticsLbl: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    emptyCard: {
        alignItems: 'center',
        padding: spacing.xl,
        marginTop: spacing.xl,
    },
    emptyTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginTop: spacing.md,
    },
    emptySubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 4,
        textAlign: 'center',
    },
    packageCard: {
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    packageTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    venueSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    trashBtn: {
        padding: 4,
    },
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceSecondary || '#F8FAFC',
        padding: spacing.sm,
        borderRadius: 8,
        marginVertical: spacing.xs,
    },
    metricItem: {
        alignItems: 'center',
    },
    metricLabel: {
        ...typography.caption,
        fontSize: 11,
        color: colors.textSecondary,
    },
    metricValue: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 2,
    },
    eventTimeText: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: spacing.xs,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.lg,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    modalBody: {
        marginTop: spacing.md,
    },
    inputLabel: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 4,
        marginTop: spacing.xs,
    },
    formInput: {
        backgroundColor: colors.surfaceSecondary || '#F8FAFC',
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        height: 44,
        ...typography.body,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    twoColumnRow: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    facilityChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 16,
        backgroundColor: colors.surfaceSecondary || '#F1F5F9',
        marginRight: spacing.xs,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    facilityChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    facilityChipText: {
        ...typography.caption,
        color: colors.textSecondary,
        maxWidth: 160,
    },
    facilityChipTextSelected: {
        color: colors.white,
        fontWeight: '600',
    },
    modalSubmitBtn: {
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
});

export default VendorEventPackagesScreen;
