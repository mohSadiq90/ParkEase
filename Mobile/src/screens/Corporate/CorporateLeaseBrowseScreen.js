/**
 * CorporateLeaseBrowseScreen
 * Corporate Company Admin: browse marketplace parking spaces to request bulk leases & allocations
 * Parity with web frontend /corporate/lease-browse
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
    Switch,
    Alert,
    RefreshControl,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import LoadingScreen from '../../components/Common/LoadingScreen';
import corporateService from '../../services/api/corporateService';
import apiClient from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency } from '../../utils/formatters';

const CorporateLeaseBrowseScreen = ({ navigation }) => {
    const { activeCompanyId, myCompanies } = useSelector((s) => s.corporate || {});
    const companyId = activeCompanyId || (myCompanies && myCompanies[0]?.id);

    const [city, setCity] = useState('');
    const [spaces, setSpaces] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Allocation Request Form State
    const [fourWheelerTotal, setFourWheelerTotal] = useState('5');
    const [twoWheelerTotal, setTwoWheelerTotal] = useState('0');
    const [monthlyRate, setMonthlyRate] = useState('1500');
    const [maxPerDay, setMaxPerDay] = useState('1');
    const [maxPerWeek, setMaxPerWeek] = useState('5');
    const [allowWeekends, setAllowWeekends] = useState(false);

    const searchParking = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = { pageSize: 20 };
            if (city.trim()) params.city = city.trim();

            const res = await apiClient.get(ENDPOINTS.PARKING.SEARCH, { params });
            const data = res?.data?.data?.parkingSpaces || res?.data?.data || res?.data?.parkingSpaces || res?.data || [];
            setSpaces(Array.isArray(data) ? data : []);
        } catch (err) {
            setSpaces([]);
        } finally {
            setIsLoading(false);
        }
    }, [city]);

    useEffect(() => {
        searchParking();
    }, [searchParking]);

    const openLeaseModal = (space) => {
        setSelectedSpace(space);
        const fourTotal = Math.min(space.totalSpots || 5, 10);
        setFourWheelerTotal(String(fourTotal));
        setTwoWheelerTotal('0');
        setMonthlyRate(String(space.monthlyRate || space.hourlyRate ? space.hourlyRate * 160 : 2000));
        setModalVisible(true);
    };

    const handleRequestLease = async () => {
        if (!companyId) {
            Alert.alert('Error', 'No active company selected.');
            return;
        }
        if (!selectedSpace) return;

        const fourTotal = parseInt(fourWheelerTotal, 10) || 0;
        const twoTotal = parseInt(twoWheelerTotal, 10) || 0;
        const rate = parseFloat(monthlyRate) || 0;

        if (fourTotal + twoTotal <= 0) {
            Alert.alert('Validation Error', 'Please specify at least 1 spot for lease allocation.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                parkingSpaceId: selectedSpace.id,
                totalSpots: fourTotal + twoTotal,
                fourWheeler: {
                    totalSlots: fourTotal,
                    fixedSlots: 0,
                    sharedSlots: fourTotal,
                },
                twoWheeler: {
                    totalSlots: twoTotal,
                    fixedSlots: 0,
                    sharedSlots: twoTotal,
                },
                monthlyRate: rate,
                policy: {
                    maxBookingsPerEmployeePerDay: parseInt(maxPerDay, 10) || 1,
                    maxBookingsPerEmployeePerWeek: parseInt(maxPerWeek, 10) || 5,
                    priorityThreshold: 1,
                    allowedStartTime: '07:00:00',
                    allowedEndTime: '22:00:00',
                    allowWeekends,
                },
            };

            await corporateService.requestAllocation(companyId, payload);
            setModalVisible(false);
            Alert.alert(
                'Allocation Requested',
                `Lease request of ${fourTotal + twoTotal} spots sent to facility owner for approval.`
            );
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.message || 'Could not submit lease allocation request.';
            Alert.alert('Request Failed', errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScreenLayout>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation?.goBack?.()}
                    style={styles.backBtn}
                    accessibilityLabel="Go back"
                    testID="corporate-lease-back-btn"
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>Lease Browse</Text>
                    <Text style={styles.subtitle}>Discover & request corporate parking allocations</Text>
                </View>
            </View>

            {/* City Search Bar */}
            <View style={styles.searchBarContainer}>
                <Ionicons name="search-outline" size={20} color={colors.textTertiary} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Filter by city (e.g. Mumbai, Bangalore)"
                    placeholderTextColor={colors.textTertiary}
                    value={city}
                    onChangeText={setCity}
                    onSubmitEditing={searchParking}
                    returnKeyType="search"
                    testID="lease-city-search-input"
                />
                {city ? (
                    <TouchableOpacity onPress={() => { setCity(''); searchParking(); }}>
                        <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Parking Spaces List */}
            {isLoading && !spaces.length ? (
                <LoadingScreen message="Searching parking facilities..." />
            ) : (
                <FlatList
                    data={spaces}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={searchParking} />}
                    ListEmptyComponent={
                        <Card style={styles.emptyCard}>
                            <Ionicons name="business-outline" size={40} color={colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No facilities found</Text>
                            <Text style={styles.emptySubtitle}>Try searching in another city or clearing filters.</Text>
                        </Card>
                    }
                    renderItem={({ item }) => (
                        <Card style={styles.spaceCard}>
                            <View style={styles.cardTopRow}>
                                <View style={styles.spaceTitleWrap}>
                                    <Text style={styles.spaceTitle}>{item.title}</Text>
                                    <Text style={styles.spaceAddress}>{item.address}, {item.city}</Text>
                                </View>
                                <Badge
                                    label={item.isVerified ? 'Verified' : 'Active'}
                                    variant={item.isVerified ? 'success' : 'default'}
                                />
                            </View>

                            <View style={styles.cardMetricsRow}>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Total Capacity</Text>
                                    <Text style={styles.metricValue}>{item.totalSpots || 0} spots</Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Base Rate</Text>
                                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                                        {formatCurrency(item.monthlyRate || item.hourlyRate || 0)}/mo
                                    </Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Type</Text>
                                    <Text style={styles.metricValue}>
                                        {item.parkingType === 1 ? 'Covered' : item.parkingType === 2 ? 'Garage' : 'Standard'}
                                    </Text>
                                </View>
                            </View>

                            <Button
                                title="Request Lease Allocation"
                                onPress={() => openLeaseModal(item)}
                                style={styles.requestBtn}
                                icon={<Ionicons name="business-outline" size={16} color={colors.white} style={{ marginRight: 6 }} />}
                                testID={`request-lease-btn-${item.id}`}
                            />
                        </Card>
                    )}
                />
            )}

            {/* Lease Request Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Corporate Lease</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} testID="close-lease-modal-btn">
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.modalBody}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            <Text style={styles.modalFacilityTitle}>{selectedSpace?.title}</Text>
                            <Text style={styles.modalFacilitySubtitle}>{selectedSpace?.address}, {selectedSpace?.city}</Text>

                            {/* Spot Allocations */}
                            <Text style={styles.formSectionHeader}>Slot Allocation Pools</Text>
                            <View style={styles.twoColumnRow}>
                                <View style={{ flex: 1, marginRight: spacing.xs }}>
                                    <Text style={styles.inputLabel}>4-Wheeler Spots</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={fourWheelerTotal}
                                        onChangeText={setFourWheelerTotal}
                                        keyboardType="number-pad"
                                        testID="lease-4w-spots-input"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                                    <Text style={styles.inputLabel}>2-Wheeler Spots</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={twoWheelerTotal}
                                        onChangeText={setTwoWheelerTotal}
                                        keyboardType="number-pad"
                                        testID="lease-2w-spots-input"
                                    />
                                </View>
                            </View>

                            {/* Proposed Monthly Rate */}
                            <Text style={styles.inputLabel}>Proposed Monthly Rate (₹)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={monthlyRate}
                                onChangeText={setMonthlyRate}
                                keyboardType="decimal-pad"
                                testID="lease-monthly-rate-input"
                            />

                            {/* Policy Configuration */}
                            <Text style={styles.formSectionHeader}>Employee Booking Policy</Text>
                            <View style={styles.twoColumnRow}>
                                <View style={{ flex: 1, marginRight: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Max/Employee/Day</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={maxPerDay}
                                        onChangeText={setMaxPerDay}
                                        keyboardType="number-pad"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Max/Employee/Week</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={maxPerWeek}
                                        onChangeText={setMaxPerWeek}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.switchLabel}>Allow Weekend Reservations</Text>
                                    <Text style={styles.switchSubtitle}>Allow employees to book slots on Saturday/Sunday</Text>
                                </View>
                                <Switch
                                    value={allowWeekends}
                                    onValueChange={setAllowWeekends}
                                    trackColor={{ true: colors.primary }}
                                />
                            </View>

                            <Button
                                title={submitting ? 'Submitting Request...' : 'Submit Allocation Request'}
                                onPress={handleRequestLease}
                                loading={submitting}
                                disabled={submitting}
                                style={styles.modalSubmitBtn}
                                testID="submit-allocation-request-btn"
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
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
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        height: 48,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
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
    spaceCard: {
        marginBottom: spacing.md,
        padding: spacing.md,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    spaceTitleWrap: {
        flex: 1,
        marginRight: spacing.sm,
    },
    spaceTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    spaceAddress: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    cardMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceSecondary || '#F8FAFC',
        padding: spacing.sm,
        borderRadius: 8,
        marginBottom: spacing.md,
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
    requestBtn: {
        height: 44,
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
    modalFacilityTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    modalFacilitySubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    formSectionHeader: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: spacing.sm,
        marginBottom: spacing.xs,
    },
    twoColumnRow: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    inputLabel: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 4,
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
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        marginTop: spacing.xs,
        marginBottom: spacing.md,
    },
    switchLabel: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    switchSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    modalSubmitBtn: {
        marginTop: spacing.sm,
        marginBottom: spacing.xl,
    },
});

export default CorporateLeaseBrowseScreen;
