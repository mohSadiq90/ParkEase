/**
 * AccessPassScannerScreen
 * Gate attendant & Host QR verification screen
 * Implements POST /api/bookings/access-pass/verify matching API_ENDPOINTS_MOBILE.md Section 6 & 23
 */

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import apiClient from '../../services/api/apiClient';
import ENDPOINTS from '../../services/api/endpoints';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatDateTime } from '../../utils/formatters';
import posthogService, { AnalyticsEvents } from '../../services/analytics/posthogService';

const AccessPassScannerScreen = ({ navigation }) => {
    const [tokenInput, setTokenInput] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState(null);
    const [history, setHistory] = useState([]);

    const handleVerify = useCallback(async (tokenToVerify) => {
        const token = (tokenToVerify || tokenInput).trim();
        if (!token) {
            Alert.alert('Required', 'Please enter or scan an access pass token.');
            return;
        }

        setVerifying(true);
        setVerifyResult(null);
        try {
            const res = await apiClient.post(ENDPOINTS.BOOKINGS.ACCESS_PASS_VERIFY, { token });
            const data = res.data?.data || res.data || {};
            setVerifyResult(data);
            posthogService.trackEvent(AnalyticsEvents.ACCESS_PASS_VERIFIED, {
                granted: Boolean(data.accessGranted ?? data.isSuccess ?? false),
                decision: data.decision || (data.accessGranted ? 'Granted' : 'Denied'),
                scannerMode: tokenToVerify ? 'camera' : 'manual',
            });
            setHistory((prev) => [
                {
                    token,
                    timestamp: new Date().toISOString(),
                    granted: data.accessGranted ?? data.isSuccess ?? false,
                    decision: data.decision || (data.accessGranted ? 'Granted' : 'Denied'),
                },
                ...prev.slice(0, 9),
            ]);
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Access token verification failed.';
            setVerifyResult({
                accessGranted: false,
                decision: 'Denied',
                denialReason: errorMsg,
            });
        } finally {
            setVerifying(false);
        }
    }, [tokenInput]);

    const handleClear = () => {
        setTokenInput('');
        setVerifyResult(null);
    };

    return (
        <ScreenLayout scrollable>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gate Pass Verifier</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                {/* Scanner / Token Input Card */}
                <Card>
                    <View style={styles.scannerHeader}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Scan or Enter Access Token</Text>
                            <Text style={styles.cardSubtitle}>Validate driver QR pass at parking gate</Text>
                        </View>
                    </View>

                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.tokenInput}
                            placeholder="Paste token or enter pass code..."
                            placeholderTextColor={colors.textTertiary}
                            value={tokenInput}
                            onChangeText={setTokenInput}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {tokenInput.length > 0 && (
                            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Button
                        title={verifying ? 'Verifying...' : 'Verify Pass Clearance'}
                        onPress={() => handleVerify()}
                        loading={verifying}
                        style={styles.verifyBtn}
                        icon={<Ionicons name="shield-checkmark-outline" size={20} color={colors.white} />}
                    />
                </Card>

                {/* Verification Result Card */}
                {verifyResult && (
                    <Card
                        style={[
                            styles.resultCard,
                            {
                                borderColor: verifyResult.accessGranted ? colors.success : colors.danger,
                                backgroundColor: verifyResult.accessGranted ? `${colors.success}10` : `${colors.danger}10`,
                            },
                        ]}
                    >
                        <View style={styles.resultHeader}>
                            <Ionicons
                                name={verifyResult.accessGranted ? 'checkmark-circle' : 'close-circle'}
                                size={36}
                                color={verifyResult.accessGranted ? colors.success : colors.danger}
                            />
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={[
                                        styles.resultTitle,
                                        { color: verifyResult.accessGranted ? colors.successDark || '#059669' : colors.danger },
                                    ]}
                                >
                                    {verifyResult.accessGranted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                                </Text>
                                <Text style={styles.resultDecision}>
                                    Decision: {verifyResult.decision || (verifyResult.accessGranted ? 'Permitted entry' : 'Unauthorized pass')}
                                </Text>
                            </View>
                        </View>

                        {verifyResult.denialReason && (
                            <View style={styles.denialBox}>
                                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                                <Text style={styles.denialText}>{verifyResult.denialReason}</Text>
                            </View>
                        )}

                        {verifyResult.booking && (
                            <View style={styles.bookingDetails}>
                                <Text style={styles.detailsHeading}>Booking Details</Text>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Driver:</Text>
                                    <Text style={styles.detailValue}>{verifyResult.booking.userName || 'Verified Guest'}</Text>
                                </View>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Vehicle Plate:</Text>
                                    <Text style={styles.detailValue}>{verifyResult.booking.vehicleNumber || 'Registered'}</Text>
                                </View>
                                {verifyResult.booking.bayNumber && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Assigned Bay:</Text>
                                        <Text style={[styles.detailValue, { fontWeight: '700', color: colors.primary }]}>
                                            {verifyResult.booking.bayNumber}
                                        </Text>
                                    </View>
                                )}
                                {verifyResult.booking.startDateTime && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Validity Window:</Text>
                                        <Text style={styles.detailValue}>
                                            {formatDateTime(verifyResult.booking.startDateTime)} - {formatDateTime(verifyResult.booking.endDateTime)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </Card>
                )}

                {/* Recent Verification History */}
                {history.length > 0 && (
                    <Card style={{ marginTop: spacing.md }}>
                        <Text style={styles.cardTitle}>Recent Scans</Text>
                        {history.map((item, index) => (
                            <View key={index} style={styles.historyItem}>
                                <Ionicons
                                    name={item.granted ? 'checkmark-circle-outline' : 'close-circle-outline'}
                                    size={20}
                                    color={item.granted ? colors.success : colors.danger}
                                />
                                <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
                                    <Text style={styles.historyToken} numberOfLines={1}>
                                        {item.token}
                                    </Text>
                                    <Text style={styles.historyTime}>{formatDateTime(item.timestamp)}</Text>
                                </View>
                                <Text style={[styles.historyBadge, { color: item.granted ? colors.success : colors.danger }]}>
                                    {item.decision}
                                </Text>
                            </View>
                        ))}
                    </Card>
                )}
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: spacing.base,
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
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing['3xl'] },
    scannerHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.base },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
    cardSubtitle: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    inputRow: {
        position: 'relative',
        justifyContent: 'center',
        marginBottom: spacing.base,
    },
    tokenInput: {
        backgroundColor: colors.background,
        borderRadius: spacing.inputRadius,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.md,
        paddingRight: 40,
        ...typography.bodySmall,
        color: colors.textPrimary,
    },
    clearBtn: { position: 'absolute', right: 12 },
    verifyBtn: { marginTop: spacing.xs },
    resultCard: {
        borderWidth: 2,
        marginTop: spacing.md,
    },
    resultHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    resultTitle: { ...typography.h4, fontWeight: '800' },
    resultDecision: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    denialBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.surface,
        padding: spacing.sm,
        borderRadius: spacing.radius.sm,
        marginTop: spacing.sm,
    },
    denialText: { ...typography.caption, color: colors.danger, fontWeight: '600', flex: 1 },
    bookingDetails: {
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        gap: spacing.xs,
    },
    detailsHeading: { ...typography.label, color: colors.textPrimary, marginBottom: 4 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { ...typography.caption, color: colors.textTertiary },
    detailValue: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    historyToken: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '500' },
    historyTime: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
    historyBadge: { ...typography.caption, fontWeight: '700' },
});

export default AccessPassScannerScreen;
