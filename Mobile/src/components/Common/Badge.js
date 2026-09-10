/**
 * Badge Component
 * Status badge for booking/payment statuses
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/globalStyles';
import { BookingStatusLabels, PaymentStatusLabels } from '../../utils/constants';

const statusColors = {
    // Numeric BookingStatus
    0: colors.statusSemantic.pending,       // Pending (#FEF3C7 / #92400E)
    1: colors.statusSemantic.approved,      // Confirmed/Approved (#D1FAE5 / #065F46)
    2: colors.statusSemantic.active,        // InProgress/Active (#D1FAE5 / #065F46)
    3: colors.statusSemantic.approved,      // Completed (#D1FAE5 / #065F46)
    4: colors.statusSemantic.cancelled,     // Cancelled (#FEE2E2 / #991B1B)
    5: { bg: '#F1F5F9', text: colors.textSecondary }, // Expired
    6: colors.statusSemantic.awaiting,      // AwaitingPayment (#FEF3C7 / #92400E)
    7: colors.statusSemantic.rejected,      // Rejected (#FEE2E2 / #991B1B)
    // String status mappings
    PENDING: colors.statusSemantic.pending,
    AWAITING: colors.statusSemantic.awaiting,
    CONFIRMED: colors.statusSemantic.approved,
    APPROVED: colors.statusSemantic.approved,
    ACTIVE: colors.statusSemantic.active,
    INPROGRESS: colors.statusSemantic.active,
    COMPLETED: colors.statusSemantic.approved,
    CANCELLED: colors.statusSemantic.cancelled,
    CANCELED: colors.statusSemantic.cancelled,
    REJECTED: colors.statusSemantic.rejected,
};

const Badge = ({ status, type = 'booking', label, style }) => {
    const labels = type === 'payment' ? PaymentStatusLabels : BookingStatusLabels;
    const normalizedKey = typeof status === 'string' ? status.toUpperCase() : status;
    const displayLabel = label || (typeof status === 'string' ? status : labels[status]) || 'Unknown';
    const colorScheme = statusColors[normalizedKey] || statusColors[status] || colors.statusSemantic.pending;

    return (
        <View style={[styles.badge, { backgroundColor: colorScheme.bg }, style]}>
            <Text style={[styles.text, { color: colorScheme.text }]}>{displayLabel}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
        borderRadius: 12, // 12pt corner radius
        alignSelf: 'flex-start',
    },
    text: {
        ...typography.caption,
        fontWeight: typography.weight.semibold,
    },
});

export default Badge;
