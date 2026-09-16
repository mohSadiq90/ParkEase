/**
 * LprSimulatorScreen
 * Mobile simulator for Ticketless LPR Entry/Exit events
 * Parity with web frontend /tools/lpr-simulator
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
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

const LprSimulatorScreen = ({ navigation }) => {
    const [licensePlate, setLicensePlate] = useState('');
    const [parkingSpaceId, setParkingSpaceId] = useState('');
    const [direction, setDirection] = useState('Entry'); // 'Entry' | 'Exit'
    const [listings, setListings] = useState([]);
    const [listingsLoading, setListingsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    const loadListings = useCallback(async () => {
        setListingsLoading(true);
        try {
            const response = await apiClient.get(ENDPOINTS.PARKING.MY_LISTINGS);
            const data = response?.data?.data || response?.data || [];
            const list = Array.isArray(data) ? data : [];
            setListings(list);
            if (list.length > 0 && !parkingSpaceId) {
                setParkingSpaceId(list[0].id);
            }
        } catch (err) {
            // Fallback gracefully if vendor listings cannot be retrieved
            setListings([]);
        } finally {
            setListingsLoading(false);
        }
    }, [parkingSpaceId]);

    useEffect(() => {
        loadListings();
    }, [loadListings]);

    const handleSimulate = async () => {
        if (!licensePlate.trim()) {
            Alert.alert('Validation Error', 'Please enter a vehicle license plate.');
            return;
        }
        if (!parkingSpaceId.trim()) {
            Alert.alert('Validation Error', 'Please select or enter a parking space ID.');
            return;
        }

        setIsSubmitting(true);
        setResult(null);

        try {
            const res = await iotService.simulateLprEvent({
                licensePlate: licensePlate.trim().toUpperCase(),
                parkingSpaceId: parkingSpaceId.trim(),
                direction,
            });

            const data = res?.data || res;
            setResult(data);

            if (data?.accessGranted) {
                Alert.alert('Access Granted', res?.message || `Access granted for plate ${licensePlate.trim().toUpperCase()}`);
            } else {
                Alert.alert('Access Denied', data?.denialMessage || res?.message || 'Access denied for this vehicle.');
            }
        } catch (err) {
            const errorMsg = err?.response?.data?.message || err?.message || 'LPR simulation failed.';
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
                    testID="lpr-simulator-back-btn"
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.title}>LPR Simulator</Text>
                    <Text style={styles.subtitle}>Test ticketless barrier entry/exit events</Text>
                </View>
            </View>

            {/* Simulation Form Card */}
            <Card style={styles.formCard}>
                {/* Direction Switcher */}
                <Text style={styles.inputLabel}>Barrier Gate Event</Text>
                <View style={styles.directionToggleRow}>
                    <TouchableOpacity
                        style={[styles.directionBtn, direction === 'Entry' && styles.directionBtnActive]}
                        onPress={() => setDirection('Entry')}
                        testID="direction-entry-btn"
                    >
                        <Ionicons
                            name="arrow-down-circle-outline"
                            size={18}
                            color={direction === 'Entry' ? colors.white : colors.textSecondary}
                        />
                        <Text style={[styles.directionBtnText, direction === 'Entry' && styles.directionBtnTextActive]}>
                            Entry Gate
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.directionBtn, direction === 'Exit' && styles.directionBtnActive]}
                        onPress={() => setDirection('Exit')}
                        testID="direction-exit-btn"
                    >
                        <Ionicons
                            name="arrow-up-circle-outline"
                            size={18}
                            color={direction === 'Exit' ? colors.white : colors.textSecondary}
                        />
                        <Text style={[styles.directionBtnText, direction === 'Exit' && styles.directionBtnTextActive]}>
                            Exit Gate
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* License Plate Input */}
                <Text style={styles.inputLabel}>Vehicle License Plate</Text>
                <View style={styles.plateInputContainer}>
                    <Ionicons name="car-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                        style={styles.plateInput}
                        placeholder="e.g. MH 12 AB 1234"
                        placeholderTextColor={colors.textTertiary}
                        value={licensePlate}
                        onChangeText={setLicensePlate}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        testID="lpr-plate-input"
                    />
                </View>

                {/* Facility Selector */}
                <Text style={styles.inputLabel}>Parking Space ID / Facility</Text>
                {listings.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.facilitiesScroll}>
                        {listings.map((item) => {
                            const isSelected = parkingSpaceId === item.id;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.facilityChip, isSelected && styles.facilityChipSelected]}
                                    onPress={() => setParkingSpaceId(item.id)}
                                >
                                    <Ionicons
                                        name={item.isLprEnabled ? 'scan-circle-outline' : 'business-outline'}
                                        size={14}
                                        color={isSelected ? colors.white : colors.primary}
                                    />
                                    <Text
                                        style={[styles.facilityChipText, isSelected && styles.facilityChipTextSelected]}
                                        numberOfLines={1}
                                    >
                                        {item.title || item.name || item.id}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : null}

                <View style={styles.textInputContainer}>
                    <Ionicons name="location-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                    <TextInput
                        style={styles.textInput}
                        placeholder="Enter Parking Space UUID"
                        placeholderTextColor={colors.textTertiary}
                        value={parkingSpaceId}
                        onChangeText={setParkingSpaceId}
                        autoCapitalize="none"
                        autoCorrect={false}
                        testID="lpr-space-id-input"
                    />
                </View>

                {/* Submit Action */}
                <Button
                    title={isSubmitting ? 'Simulating Event...' : `Simulate ${direction} Event`}
                    onPress={handleSimulate}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                    style={styles.submitBtn}
                    testID="lpr-simulate-submit-btn"
                />
            </Card>

            {/* Results Display */}
            {result && (
                <Card style={[styles.resultCard, result.accessGranted ? styles.resultCardSuccess : styles.resultCardDenied]}>
                    <View style={styles.resultHeaderRow}>
                        <Ionicons
                            name={result.accessGranted ? 'checkmark-circle' : 'close-circle'}
                            size={28}
                            color={result.accessGranted ? colors.success : colors.danger}
                        />
                        <View style={styles.resultHeaderTextWrap}>
                            <Text style={styles.resultTitle}>
                                {result.accessGranted ? 'Access Granted' : 'Access Denied'}
                            </Text>
                            <Text style={styles.resultSubtitle}>
                                {result.accessGranted
                                    ? `Barrier opened for ${direction.toLowerCase()}`
                                    : (result.denialMessage || 'No matching active reservation found')}
                            </Text>
                        </View>
                    </View>

                    {result.booking && (
                        <View style={styles.bookingDetailsBox}>
                            <Text style={styles.bookingDetailTitle}>Booking Match</Text>
                            <Text style={styles.detailRow}>
                                <Text style={styles.detailKey}>Booking ID: </Text>
                                <Text style={styles.detailVal}>{result.booking.id || 'N/A'}</Text>
                            </Text>
                            <Text style={styles.detailRow}>
                                <Text style={styles.detailKey}>User: </Text>
                                <Text style={styles.detailVal}>{result.booking.userName || result.booking.userId || 'N/A'}</Text>
                            </Text>
                            {result.booking.bayNumber ? (
                                <Text style={styles.detailRow}>
                                    <Text style={styles.detailKey}>Assigned Bay: </Text>
                                    <Text style={styles.detailVal}>{result.booking.bayNumber}</Text>
                                </Text>
                            ) : null}
                        </View>
                    )}
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
    directionToggleRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    directionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.md,
        borderRadius: 12,
        backgroundColor: colors.surfaceSecondary || '#F1F5F9',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    directionBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    directionBtnText: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    directionBtnTextActive: {
        color: colors.white,
    },
    plateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.borderLight,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.surface,
        minHeight: 50,
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
        marginTop: spacing.xs,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    plateInput: {
        flex: 1,
        ...typography.body,
        fontWeight: '700',
        fontSize: 18,
        letterSpacing: 1.5,
        color: colors.textPrimary,
    },
    textInput: {
        flex: 1,
        ...typography.body,
        color: colors.textPrimary,
    },
    facilitiesScroll: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    facilityChip: {
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
    facilityChipSelected: {
        backgroundColor: colors.primary,
    },
    facilityChipText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.primary,
        maxWidth: 160,
    },
    facilityChipTextSelected: {
        color: colors.white,
    },
    submitBtn: {
        marginTop: spacing.lg,
    },
    resultCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.xl,
        padding: spacing.lg,
        borderWidth: 1.5,
    },
    resultCardSuccess: {
        borderColor: colors.success,
        backgroundColor: '#F0FDF4',
    },
    resultCardDenied: {
        borderColor: colors.danger,
        backgroundColor: '#FEF2F2',
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
    bookingDetailsBox: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    bookingDetailTitle: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    detailRow: {
        ...typography.caption,
        marginBottom: 4,
    },
    detailKey: {
        fontWeight: '600',
        color: colors.textSecondary,
    },
    detailVal: {
        color: colors.textPrimary,
    },
});

export default LprSimulatorScreen;
