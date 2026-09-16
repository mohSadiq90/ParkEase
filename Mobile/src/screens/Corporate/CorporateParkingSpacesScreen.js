/**
 * CorporateParkingSpacesScreen
 * Corporate Company Admin: Manage company-owned parking facilities and physical spot inventory
 * Parity with web frontend /corporate/parking-spaces
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
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency } from '../../utils/formatters';

const defaultSpaceForm = {
    title: '',
    address: '',
    city: '',
    totalSpots: '10',
    fourWheelerPhysicalSpots: '8',
    twoWheelerPhysicalSpots: '2',
    hourlyRate: '20',
    monthlyRate: '2500',
    is24Hours: true,
};

const CorporateParkingSpacesScreen = ({ navigation }) => {
    const { activeCompanyId, myCompanies } = useSelector((s) => s.corporate || {});
    const companyId = activeCompanyId || (myCompanies && myCompanies[0]?.id);

    const [spaces, setSpaces] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [form, setForm] = useState(defaultSpaceForm);
    const [submitting, setSubmitting] = useState(false);

    const loadSpaces = useCallback(async () => {
        if (!companyId) return;
        setIsLoading(true);
        try {
            const res = await corporateService.getCompanyParkingSpaces(companyId);
            const data = res?.data || res || [];
            setSpaces(Array.isArray(data) ? data : []);
        } catch (err) {
            setSpaces([]);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        loadSpaces();
    }, [loadSpaces]);

    const handleToggleActive = async (space) => {
        if (!companyId) return;
        try {
            await corporateService.toggleActiveCompanyParkingSpace(companyId, space.id);
            setSpaces((prev) =>
                prev.map((s) => (s.id === space.id ? { ...s, isActive: !s.isActive } : s))
            );
        } catch (err) {
            Alert.alert('Update Failed', err?.message || 'Could not toggle space status.');
        }
    };

    const handleCreateSpace = async () => {
        if (!companyId) {
            Alert.alert('Error', 'No active company selected.');
            return;
        }
        if (!form.title.trim() || !form.address.trim() || !form.city.trim()) {
            Alert.alert('Validation Error', 'Title, address, and city are required.');
            return;
        }

        const total = parseInt(form.totalSpots, 10) || 1;
        const four = parseInt(form.fourWheelerPhysicalSpots, 10) || 0;
        const two = parseInt(form.twoWheelerPhysicalSpots, 10) || 0;

        setSubmitting(true);
        try {
            const payload = {
                title: form.title.trim(),
                address: form.address.trim(),
                city: form.city.trim(),
                state: 'State',
                country: 'India',
                postalCode: '400001',
                parkingType: 0,
                totalSpots: total,
                fourWheelerPhysicalSpots: four,
                twoWheelerPhysicalSpots: two,
                hourlyRate: parseFloat(form.hourlyRate) || 0,
                monthlyRate: parseFloat(form.monthlyRate) || 0,
                openTime: '00:00:00',
                closeTime: '23:59:59',
                is24Hours: form.is24Hours,
            };

            await corporateService.createCompanyParkingSpace(companyId, payload);
            setModalVisible(false);
            setForm(defaultSpaceForm);
            Alert.alert('Success', 'Company parking space added to inventory.');
            loadSpaces();
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.message || 'Failed to create parking space.';
            Alert.alert('Error', errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleRetireSpace = (space) => {
        Alert.alert(
            'Retire Facility',
            `Are you sure you want to retire "${space.title}" from company inventory?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Retire',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await corporateService.retireCompanyParkingSpace(companyId, space.id);
                            loadSpaces();
                        } catch (err) {
                            Alert.alert('Error', err?.message || 'Failed to retire facility.');
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
                    testID="corporate-spaces-back-btn"
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>Parking Inventory</Text>
                    <Text style={styles.subtitle}>Company-owned parking facilities & spot bays</Text>
                </View>
                <TouchableOpacity
                    style={styles.addHeaderBtn}
                    onPress={() => setModalVisible(true)}
                    testID="add-space-header-btn"
                >
                    <Ionicons name="add" size={22} color={colors.white} />
                </TouchableOpacity>
            </View>

            {/* List */}
            {isLoading && !spaces.length ? (
                <LoadingScreen message="Loading company parking spaces..." />
            ) : (
                <FlatList
                    data={spaces}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadSpaces} />}
                    ListEmptyComponent={
                        <Card style={styles.emptyCard}>
                            <Ionicons name="car-outline" size={44} color={colors.textTertiary} />
                            <Text style={styles.emptyTitle}>No company facilities</Text>
                            <Text style={styles.emptySubtitle}>
                                Add your company-owned parking spaces to assign dedicated spots to employees.
                            </Text>
                            <Button
                                title="+ Add Company Space"
                                onPress={() => setModalVisible(true)}
                                style={{ marginTop: spacing.md }}
                            />
                        </Card>
                    }
                    renderItem={({ item }) => (
                        <Card style={styles.spaceCard}>
                            <View style={styles.cardHeaderRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.spaceTitle}>{item.title}</Text>
                                    <Text style={styles.spaceAddress}>{item.address}, {item.city}</Text>
                                </View>
                                <View style={styles.badgeRow}>
                                    <Badge
                                        label={item.isActive !== false ? 'Active' : 'Inactive'}
                                        variant={item.isActive !== false ? 'success' : 'default'}
                                    />
                                    <TouchableOpacity
                                        onPress={() => handleRetireSpace(item)}
                                        style={styles.trashBtn}
                                        testID={`retire-space-${item.id}`}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.metricsBox}>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Total Spots</Text>
                                    <Text style={styles.metricValue}>{item.totalSpots || 0}</Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>4-Wheelers</Text>
                                    <Text style={styles.metricValue}>{item.fourWheelerPhysicalSpots || item.totalSpots || 0}</Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>2-Wheelers</Text>
                                    <Text style={styles.metricValue}>{item.twoWheelerPhysicalSpots || 0}</Text>
                                </View>
                                <View style={styles.metricItem}>
                                    <Text style={styles.metricLabel}>Monthly Rate</Text>
                                    <Text style={[styles.metricValue, { color: colors.primary }]}>
                                        {formatCurrency(item.monthlyRate || 0)}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.activeToggleRow}>
                                <Text style={styles.toggleLabel}>Facility Status</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={styles.toggleStatusText}>
                                        {item.isActive !== false ? 'Open for Bookings' : 'Closed'}
                                    </Text>
                                    <Switch
                                        value={item.isActive !== false}
                                        onValueChange={() => handleToggleActive(item)}
                                        trackColor={{ true: colors.primary }}
                                    />
                                </View>
                            </View>
                        </Card>
                    )}
                />
            )}

            {/* Create Company Space Modal */}
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
                            <Text style={styles.modalTitle}>Add Company Parking Space</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} testID="close-add-space-modal">
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
                            <Text style={styles.inputLabel}>Facility Title</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. Headquarters Underground Lot"
                                placeholderTextColor={colors.textTertiary}
                                value={form.title}
                                onChangeText={(val) => setForm((f) => ({ ...f, title: val }))}
                                testID="create-space-title-input"
                            />

                            <Text style={styles.inputLabel}>Address</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="Street Address"
                                placeholderTextColor={colors.textTertiary}
                                value={form.address}
                                onChangeText={(val) => setForm((f) => ({ ...f, address: val }))}
                                testID="create-space-address-input"
                            />

                            <Text style={styles.inputLabel}>City</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="City"
                                placeholderTextColor={colors.textTertiary}
                                value={form.city}
                                onChangeText={(val) => setForm((f) => ({ ...f, city: val }))}
                                testID="create-space-city-input"
                            />

                            <View style={styles.twoColumnRow}>
                                <View style={{ flex: 1, marginRight: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Total Spots</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={form.totalSpots}
                                        onChangeText={(val) => setForm((f) => ({ ...f, totalSpots: val }))}
                                        keyboardType="number-pad"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                                    <Text style={styles.inputLabel}>Monthly Rate (₹)</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={form.monthlyRate}
                                        onChangeText={(val) => setForm((f) => ({ ...f, monthlyRate: val }))}
                                        keyboardType="decimal-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.twoColumnRow}>
                                <View style={{ flex: 1, marginRight: spacing.xs }}>
                                    <Text style={styles.inputLabel}>4-Wheeler Bays</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={form.fourWheelerPhysicalSpots}
                                        onChangeText={(val) => setForm((f) => ({ ...f, fourWheelerPhysicalSpots: val }))}
                                        keyboardType="number-pad"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: spacing.xs }}>
                                    <Text style={styles.inputLabel}>2-Wheeler Bays</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={form.twoWheelerPhysicalSpots}
                                        onChangeText={(val) => setForm((f) => ({ ...f, twoWheelerPhysicalSpots: val }))}
                                        keyboardType="number-pad"
                                    />
                                </View>
                            </View>

                            <View style={styles.switchRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.switchLabel}>24/7 Access</Text>
                                    <Text style={styles.switchSubtitle}>Open 24 hours round the clock</Text>
                                </View>
                                <Switch
                                    value={form.is24Hours}
                                    onValueChange={(val) => setForm((f) => ({ ...f, is24Hours: val }))}
                                    trackColor={{ true: colors.primary }}
                                />
                            </View>

                            <Button
                                title={submitting ? 'Creating Facility...' : 'Create Parking Facility'}
                                onPress={handleCreateSpace}
                                loading={submitting}
                                disabled={submitting}
                                style={styles.modalSubmitBtn}
                                testID="submit-create-space-btn"
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
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
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
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    trashBtn: {
        padding: 4,
    },
    metricsBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceSecondary || '#F8FAFC',
        padding: spacing.sm,
        borderRadius: 8,
        marginBottom: spacing.sm,
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
    activeToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.xs,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    toggleLabel: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    toggleStatusText: {
        ...typography.caption,
        color: colors.textSecondary,
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

export default CorporateParkingSpacesScreen;
