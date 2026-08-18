/**
 * MyPassesScreen (Mobile)
 * View active parking pass subscriptions and QR entry tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/api/apiClient';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatDate } from '../../utils/formatters';

const MyPassesScreen = ({ navigation }) => {
    const [passes, setPasses] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPasses = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/passes/my');
            if (res.success && res.data) {
                const list = res.data.activePasses || (Array.isArray(res.data) ? res.data : []);
                setPasses(list);
            }
        } catch (err) {
            console.error('Error loading passes:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPasses();
    }, [fetchPasses]);

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>My Passes</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <LoadingScreen />
            ) : passes.length === 0 ? (
                <EmptyState
                    icon="ticket-outline"
                    title="No active passes"
                    message="You don't have any active weekly or monthly parking passes. Visit the web app to subscribe."
                />
            ) : (
                <FlatList
                    data={passes}
                    keyExtractor={(item) => item.id?.toString()}
                    renderItem={({ item }) => {
                        const passTypeName = item.passType === 0 ? 'Monthly Pass' : item.passType === 1 ? 'Weekly Pass' : 'Corporate Pass';
                        return (
                            <Card style={styles.passCard}>
                                <View style={styles.topRow}>
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{passTypeName}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: item.isActive ? colors.successSoft : colors.borderLight }]}>
                                        <Text style={[styles.statusText, { color: item.isActive ? colors.success : colors.textTertiary }]}>
                                            {item.isActive ? 'Active' : 'Expired'}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.facilityTitle}>
                                    {item.parkingSpaceTitle || (item.parkingZoneCode ? `Zone ${item.parkingZoneCode}` : 'All Spaces')}
                                </Text>

                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Valid:</Text>
                                    <Text style={styles.metaValue}>
                                        {formatDate(item.startDateUtc)} – {formatDate(item.endDateUtc)}
                                    </Text>
                                </View>

                                <View style={styles.metaRow}>
                                    <Text style={styles.metaLabel}>Mode:</Text>
                                    <Text style={styles.metaValue}>
                                        {item.usageMode === 0 ? 'Unlimited Access' : `${item.dailyHourLimit || 8}h / Day`}
                                    </Text>
                                </View>

                                <View style={styles.qrSimulation}>
                                    <Ionicons name="qr-code-outline" size={28} color={colors.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.qrTitle}>Digital Gate Token</Text>
                                        <Text style={styles.qrSub} numberOfLines={1}>
                                            {item.id?.substring(0, 18).toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </Card>
                        );
                    }}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: 60,
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    backBtn: { padding: spacing.xs },
    screenTitle: { ...typography.h3, color: colors.textPrimary },
    listContainer: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.xl },
    passCard: { marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    badge: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: spacing.radius.full },
    badgeText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
    statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: spacing.radius.full },
    statusText: { ...typography.caption, fontWeight: '600' },
    facilityTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.xs },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
    metaLabel: { ...typography.caption, color: colors.textTertiary },
    metaValue: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
    qrSimulation: {
        marginTop: spacing.md,
        padding: spacing.sm,
        backgroundColor: colors.background,
        borderRadius: spacing.radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md
    },
    qrTitle: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
    qrSub: { ...typography.caption, color: colors.textTertiary, fontFamily: 'monospace' }
});

export default MyPassesScreen;
