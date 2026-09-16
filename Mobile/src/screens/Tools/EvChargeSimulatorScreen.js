/**
 * EvChargeSimulatorScreen
 * Mobile simulator for EV Charging OCPP transaction pipeline & energy fee settlement
 * Parity with web frontend /tools/ev-charge-simulator
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import iotService from '../../services/api/iotService';
import apiClient from '../../services/api/apiClient';
import { ENDPOINTS } from '../../services/api/endpoints';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency } from '../../utils/formatters';

const EvChargeSimulatorScreen = ({ navigation }) => {
    const [bookingId, setBookingId] = useState('');
    const [energyKwh, setEnergyKwh] = useState('14.5');
    const [stationId, setStationId] = useState('MOCK-OCPP-01');
    const [connectorId, setConnectorId] = useState('1');
    const [activeBookings, setActiveBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    const loadBookings = useCallback(async () => {
        setBookingsLoading(true);
        try {
            const response = await apiClient.get(ENDPOINTS.BOOKINGS.MY_BOOKINGS);
            const data = response?.data?.data || response?.data || [];
            const list = Array.isArray(data) ? data : [];
            setActiveBookings(list);
            if (list.length > 0 && !bookingId) {
                setBookingId(list[0].id);
            }
        } catch (err) {
            setActiveBookings([]);
        } finally {
            setBookingsLoading(false);
        }
    }, [bookingId]);

    useEffect(() => {
        loadBookings();
    }, [loadBookings]);

    const handleSimulate = async () => {
        if (!bookingId.trim()) {
            Alert.alert('Validation Error', 'Please enter or select a confirmed booking ID.');
            return;
        }
        const kwh = parseFloat(energyKwh);
        if (!(kwh > 0)) {
            Alert.alert('Validation Error', 'Please enter a valid positive energy amount in kWh.');
            return;
        }

        setIsSubmitting(true);
        setResult(null);

        try {
            const res = await iotService.simulateEvSession({
                bookingId: bookingId.trim(),
                energyKwh: kwh,
                stationId: stationId.trim() || 'MOCK-OCPP-01',
                connectorId: parseInt(connectorId, 10) || 1,
            });

            const data = res?.data || res;
            setResult(data);

            if (res?.success || data?.status === 'Completed' || data?.energyDeliveredKwh) {
                Alert.alert(
                    'EV Session Completed',
                    res?.message || `Successfully charged ${kwh} kWh. Energy fee has been settled on booking.`
                );
            } else {
                Alert.alert('Simulator Result', res?.message || 'EV charge session simulated.');
            }
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.message || 'EV charge simulation failed.';
            Alert.alert('Simulation Error', errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScreenLayout scrollable>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation?.goBack?.()}
                    style={styles.backBtn}
                    accessibilityLabel="Go back"
                    testID="ev-simulator-back-btn"
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>EV Charge Simulator</Text>
                    <Text style={styles.subtitle}>OCPP Start → Meter → Stop & Energy Fee Settlement</Text>
                </View>
            </View>

            {/* Form Card */}
            <Card style={styles.formCard}>
                <Text style={styles.inputLabel}>Booking ID</Text>

                {activeBookings.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bookingsScroll}>
                        {activeBookings.slice(0, 5).map((item) => {
                            const isSelected = bookingId === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.bookingChip, isSelected && styles.bookingChipSelected]}
                                    onPress={() => setBookingId(item.id)}
                                >
                                    <Ionicons
                                        name="flash-outline"
                                        size={14}
                                        color={isSelected ? colors.white : colors.primary}
                                    />
                                    <Text
                                        style={[styles.bookingChipText, isSelected && styles.bookingChipTextSelected]}
                                        numberOfLines={1}
                                    >
                                        {item.parkingSpaceTitle || item.id?.slice(0, 8)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : null}

                <View style={styles.textInputContainer}>
                    <Ionicons name="receipt-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Enter Booking UUID"
                        placeholderTextColor={colors.textTertiary}
                        value={bookingId}
                        onChangeText={setBookingId}
                        autoCapitalize="none"
                        autoCorrect={false}
                        testID="ev-booking-id-input"
                    />
                </View>

                {/* Energy kWh */}
                <Text style={styles.inputLabel}>Energy Delivered (kWh)</Text>
                <View style={styles.textInputContainer}>
                    <Ionicons name="battery-charging-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 14.5"
                        placeholderTextColor={colors.textTertiary}
                        value={energyKwh}
                        onChangeText={setEnergyKwh}
                        keyboardType="decimal-pad"
                        testID="ev-kwh-input"
                    />
                    <Text style={styles.inputSuffix}>kWh</Text>
                </View>

                {/* Station & Connector */}
                <View style={styles.rowInputs}>
                    <View style={{ flex: 2 }}>
                        <Text style={styles.inputLabel}>Station ID</Text>
                        <View style={styles.textInputContainer}>
                            <Ionicons name="hardware-chip-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Station ID"
                                placeholderTextColor={colors.textTertiary}
                                value={stationId}
                                onChangeText={setStationId}
                                autoCapitalize="none"
                                testID="ev-station-id-input"
                            />
                        </View>
                    </View>

                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={styles.inputLabel}>Port</Text>
                        <View style={styles.textInputContainer}>
                            <TextInput
                                style={[styles.textInput, { textAlign: 'center' }]}
                                placeholder="1"
                                placeholderTextColor={colors.textTertiary}
                                value={connectorId}
                                onChangeText={setConnectorId}
                                keyboardType="number-pad"
                                testID="ev-connector-input"
                            />
                        </View>
                    </View>
                </View>

                {/* Submit Action */}
                <Button
                    title={isSubmitting ? 'Simulating OCPP Pipeline...' : 'Simulate Charging Session'}
                    onPress={handleSimulate}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.submitBtn}
                    testID="ev-simulate-submit-btn"
                />
            </Card>

            {/* Result Display */}
            {result && (
                <Card style={styles.resultCard}>
                    <View style={styles.resultHeaderRow}>
                        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                        <View style={styles.resultHeaderTextWrap}>
                            <Text style={styles.resultTitle}>OCPP Session Completed</Text>
                            <Text style={styles.resultSubtitle}>Energy fee settled on booking ledger</Text>
                        </View>
                    </View>

                    <View style={styles.sessionDetailsBox}>
                        <View style={styles.metricRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Energy</Text>
                                <Text style={styles.metricValue}>
                                    {result.energyDeliveredKwh || energyKwh} kWh
                                </Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Total Fee</Text>
                                <Text style={[styles.metricValue, { color: colors.primary }]}>
                                    {formatCurrency(result.totalFee || result.energyFee || 0)}
                                </Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricLabel}>Status</Text>
                                <Text style={[styles.metricValue, { color: colors.success }]}>
                                    {result.status || 'Settled'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Card>
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.md,
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
    formCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.lg,
        padding: spacing.lg,
    },
    inputLabel: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        marginTop: spacing.sm,
    },
    bookingsScroll: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    bookingChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: 20,
        backgroundColor: colors.primarySoft || '#EEF2FF',
        marginRight: spacing.xs,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    bookingChipSelected: {
        backgroundColor: colors.primary,
    },
    bookingChipText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.primary,
        maxWidth: 160,
    },
    bookingChipTextSelected: {
        color: colors.white,
    },
    textInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        minHeight: 50,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    textInput: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
    },
    inputSuffix: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textSecondary,
        marginLeft: spacing.xs,
    },
    rowInputs: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    submitBtn: {
        marginTop: spacing.lg,
    },
    resultCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.xl,
        padding: spacing.lg,
        borderWidth: 1.5,
        borderColor: colors.success,
        backgroundColor: '#F0FDF4',
    },
    resultHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    resultHeaderTextWrap: {
        flex: 1,
    },
    resultTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    resultSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    sessionDetailsBox: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    metricItem: {
        alignItems: 'center',
    },
    metricLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    metricValue: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
    },
});

export default EvChargeSimulatorScreen;
