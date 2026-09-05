/**
 * MyPassesScreen
 * Active parking passes for the signed-in user
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getMyPassesThunk, createPassThunk } from '../../store/slices/passSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import EmptyState from '../../components/Common/EmptyState';
import EnhancedRefreshControl, { useEnhancedRefresh } from '../../components/Common/EnhancedRefreshControl';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatDate, formatCurrency } from '../../utils/formatters';

const PASS_TYPE_LABELS = {
    0: 'Monthly',
    1: 'Weekly',
    2: 'Corporate',
    Monthly: 'Monthly',
    Weekly: 'Weekly',
    Corporate: 'Corporate',
};

const USAGE_MODE_LABELS = {
    0: 'Unlimited entries',
    1: 'Limited daily hours',
    UnlimitedEntries: 'Unlimited entries',
    LimitedHoursPerDay: 'Limited daily hours',
};

const getPassTypeLabel = (pass) => PASS_TYPE_LABELS[pass.passType ?? pass.type ?? pass.passTypeKind] || 'Parking pass';
const getUsageLabel = (pass) => USAGE_MODE_LABELS[pass.usageMode] || 'Standard access';
const getStartDate = (pass) => pass.startDateUtc || pass.startDate || pass.validFrom || pass.validFromUtc;
const getEndDate = (pass) => pass.endDateUtc || pass.endDate || pass.validUntil || pass.validUntilUtc;
const getLocation = (pass) =>
    pass.parkingSpaceTitle ||
    pass.parkingTitle ||
    pass.parkingSpaceName ||
    pass.parkingZoneCode ||
    pass.zoneCode ||
    'All eligible spaces';

const getStatus = (pass) => {
    const rawStatus = pass.statusLabel || pass.status;
    if (rawStatus != null) {
        return String(rawStatus);
    }

    const endDate = getEndDate(pass);
    if (endDate && new Date(endDate) < new Date()) {
        return 'Expired';
    }

    return pass.isActive === false ? 'Inactive' : 'Active';
};

const getStatusColor = (status) => {
    const normalized = String(status).toLowerCase();
    if (normalized.includes('expired') || normalized.includes('inactive')) return colors.textTertiary;
    if (normalized.includes('active')) return colors.success;
    return colors.primary;
};

const PassCard = ({ pass }) => {
    const status = getStatus(pass);
    const statusColor = getStatusColor(status);
    const price = pass.price ?? pass.amount ?? pass.totalAmount ?? pass.discountedAmount;
    const dailyHourLimit = pass.dailyHourLimit ?? pass.hoursPerDay;

    return (
        <Card style={styles.passCard}>
            <View style={styles.passHeader}>
                <View style={styles.iconWrap}>
                    <Ionicons name="ticket-outline" size={24} color={colors.primary} />
                </View>
                <View style={styles.passTitleWrap}>
                    <Text style={styles.passTitle}>{getPassTypeLabel(pass)}</Text>
                    <Text style={styles.passLocation} numberOfLines={1}>{getLocation(pass)}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: `${statusColor}1A` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Valid from</Text>
                    <Text style={styles.detailValue}>{formatDate(getStartDate(pass)) || 'Not set'}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Valid until</Text>
                    <Text style={styles.detailValue}>{formatDate(getEndDate(pass)) || 'Not set'}</Text>
                </View>
            </View>

            <View style={styles.metaRow}>
                <Ionicons name="repeat-outline" size={16} color={colors.textTertiary} />
                <Text style={styles.metaText}>
                    {dailyHourLimit ? `${dailyHourLimit} hrs/day` : getUsageLabel(pass)}
                </Text>
            </View>

            {price != null && (
                <View style={styles.metaRow}>
                    <Ionicons name="card-outline" size={16} color={colors.textTertiary} />
                    <Text style={styles.metaText}>{formatCurrency(price)}</Text>
                </View>
            )}
        </Card>
    );
};

const MyPassesScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { passes, loading, createLoading, error } = useSelector((state) => state.pass);

    const [buyModalVisible, setBuyModalVisible] = useState(false);
    const [selectedType, setSelectedType] = useState(0); // 0: Monthly, 1: Weekly
    const [zoneCode, setZoneCode] = useState('');
    const [licensePlate, setLicensePlate] = useState('');

    const loadPasses = useCallback(async () => {
        await dispatch(getMyPassesThunk());
    }, [dispatch]);

    const { refreshing, onRefresh, lastRefreshed } = useEnhancedRefresh(loadPasses);

    useEffect(() => {
        loadPasses();
    }, [loadPasses]);

    const handleBuyPass = async () => {
        const startDate = new Date();
        const durationDays = selectedType === 1 ? 7 : 30;
        const endDate = new Date(startDate.getTime() + durationDays * 86400000);

        const res = await dispatch(createPassThunk({
            passType: selectedType,
            startDateUtc: startDate.toISOString(),
            endDateUtc: endDate.toISOString(),
            zoneCode: zoneCode || undefined,
            licensePlate: licensePlate || undefined,
            usageMode: 0, // Unlimited
        }));

        if (!res.error) {
            setBuyModalVisible(false);
            setZoneCode('');
            setLicensePlate('');
            Alert.alert('Pass Purchased', `Your ${selectedType === 1 ? 'Weekly' : 'Monthly'} pass is active!`);
        } else {
            Alert.alert('Purchase Failed', res.payload || 'Could not process pass purchase.');
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.title}>My Passes</Text>
                <TouchableOpacity onPress={() => setBuyModalVisible(true)} style={styles.getPassBtn}>
                    <Text style={styles.getPassBtnText}>+ Get Pass</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={passes}
                keyExtractor={(item, index) => String(item.id || item.passId || index)}
                renderItem={({ item }) => <PassCard pass={item} />}
                ListEmptyComponent={
                    <EmptyState
                        icon={error ? 'alert-circle-outline' : 'ticket-outline'}
                        title={error ? 'Could not load passes' : 'No active passes'}
                        message={error ? 'We are experiencing temporary issues. Please try again later.' : 'Get a weekly or monthly pass for unlimited parking access.'}
                        actionLabel="+ Purchase Pass"
                        onAction={() => setBuyModalVisible(true)}
                    />
                }
                refreshControl={
                    <EnhancedRefreshControl refreshing={refreshing} onRefresh={onRefresh} lastRefreshed={lastRefreshed} />
                }
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={styles.listContent}
            />

            {/* Purchase Pass Modal */}
            <Modal
                visible={buyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setBuyModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: spacing.sm }}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Purchase Parking Pass</Text>
                                <TouchableOpacity onPress={() => setBuyModalVisible(false)}>
                                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm }}>
                                Select pass duration for unlimited zone access:
                            </Text>

                            {/* Type chips */}
                            <View style={styles.typeChipRow}>
                                <TouchableOpacity
                                    onPress={() => setSelectedType(0)}
                                    style={[styles.typeChip, selectedType === 0 && styles.typeChipActive]}
                                >
                                    <Text style={[styles.typeChipTitle, selectedType === 0 && styles.typeChipTitleActive]}>
                                        Monthly Pass (30 Days)
                                    </Text>
                                    <Text style={styles.typeChipPrice}>₹2,999</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setSelectedType(1)}
                                    style={[styles.typeChip, selectedType === 1 && styles.typeChipActive]}
                                >
                                    <Text style={[styles.typeChipTitle, selectedType === 1 && styles.typeChipTitleActive]}>
                                        Weekly Pass (7 Days)
                                    </Text>
                                    <Text style={styles.typeChipPrice}>₹899</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Inputs */}
                            <View style={{ gap: spacing.sm, marginVertical: spacing.md }}>
                                <Card style={{ backgroundColor: colors.background, padding: spacing.sm }}>
                                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 2 }}>Vehicle License Plate (Optional)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={licensePlate}
                                        onChangeText={setLicensePlate}
                                        placeholder="e.g. MH01CD5678"
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </Card>
                                <Card style={{ backgroundColor: colors.background, padding: spacing.sm }}>
                                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 2 }}>Zone / Facility Code (Optional)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        value={zoneCode}
                                        onChangeText={setZoneCode}
                                        placeholder="e.g. ZONE-NORTH"
                                        placeholderTextColor={colors.textTertiary}
                                    />
                                </Card>
                            </View>

                            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
                                <Button
                                    title="Cancel"
                                    onPress={() => setBuyModalVisible(false)}
                                    variant="outline"
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    title="Confirm & Pay"
                                    onPress={handleBuyPass}
                                    variant="primary"
                                    loading={createLoading}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {loading && passes.length > 0 && (
                <View style={styles.loadingStrip}>
                    <Text style={styles.loadingText}>Refreshing passes...</Text>
                </View>
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        paddingHorizontal: spacing.screenHorizontal,
    },
    title: { ...typography.h3, color: colors.textPrimary },
    listContent: {
        paddingBottom: spacing['3xl'],
    },
    passCard: {
        marginHorizontal: spacing.screenHorizontal,
    },
    passHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    passTitleWrap: {
        flex: 1,
        minWidth: 0,
    },
    passTitle: {
        ...typography.label,
        color: colors.textPrimary,
    },
    passLocation: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    statusPill: {
        borderRadius: spacing.radius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    statusText: {
        ...typography.caption,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.md,
    },
    detailGrid: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    detailItem: {
        flex: 1,
    },
    detailLabel: {
        ...typography.caption,
        color: colors.textTertiary,
        marginBottom: 2,
    },
    detailValue: {
        ...typography.bodySmall,
        color: colors.textPrimary,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    metaText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    loadingStrip: {
        position: 'absolute',
        left: spacing.screenHorizontal,
        right: spacing.screenHorizontal,
        bottom: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: spacing.radius.md,
        backgroundColor: colors.surface,
        alignItems: 'center',
    },
    loadingText: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.sm,
    },
    getPassBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: spacing.radius.full,
    },
    getPassBtnText: {
        ...typography.caption,
        color: colors.white,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.screenHorizontal,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: spacing.radius.lg,
        padding: spacing.lg,
        ...shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    typeChipRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginVertical: spacing.xs,
    },
    typeChip: {
        flex: 1,
        padding: spacing.sm,
        borderRadius: spacing.radius.md,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    typeChipActive: {
        backgroundColor: colors.primarySoft,
        borderColor: colors.primary,
    },
    typeChipTitle: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '500',
        textAlign: 'center',
    },
    typeChipTitleActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    typeChipPrice: {
        ...typography.label,
        color: colors.primary,
        marginTop: 4,
        fontWeight: '700',
    },
    textInput: {
        fontSize: 14,
        color: colors.textPrimary,
        paddingVertical: 4,
    },
});

export default MyPassesScreen;
