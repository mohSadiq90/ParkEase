/**
 * Badge Component
 * Status badge for booking/payment statuses
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles/globalStyles';
import { BookingStatusLabels, PaymentStatusLabels } from '../../utils/constants';

const statusConfig = {
    // Numeric BookingStatus
    0: { ...colors.statusSemantic.pending, icon: 'time-outline' },
    1: { ...colors.statusSemantic.approved, icon: 'checkmark-circle-outline' },
    2: { ...colors.statusSemantic.active, icon: 'flash-outline' },
    3: { ...colors.statusSemantic.completed, icon: 'checkmark-done-circle-outline' },
    4: { ...colors.statusSemantic.cancelled, icon: 'close-circle-outline' },
    5: { ...colors.statusSemantic.expired, icon: 'time-outline' },
    6: { ...colors.statusSemantic.awaiting, icon: 'hourglass-outline' },
    7: { ...colors.statusSemantic.rejected, icon: 'ban-outline' },
    8: { ...colors.statusSemantic.pending, icon: 'time-outline' },
    9: { ...colors.statusSemantic.awaiting, icon: 'hourglass-outline' },
    // String status mappings
    PENDING: { ...colors.statusSemantic.pending, icon: 'time-outline' },
    AWAITING: { ...colors.statusSemantic.awaiting, icon: 'hourglass-outline' },
    AWAITING_PAYMENT: { ...colors.statusSemantic.awaiting, icon: 'hourglass-outline' },
    'PENDING PAYMENT': { ...colors.statusSemantic.awaiting, icon: 'hourglass-outline' },
    CONFIRMED: { ...colors.statusSemantic.approved, icon: 'checkmark-circle-outline' },
    APPROVED: { ...colors.statusSemantic.approved, icon: 'checkmark-circle-outline' },
    ACTIVE: { ...colors.statusSemantic.active, icon: 'flash-outline' },
    INPROGRESS: { ...colors.statusSemantic.active, icon: 'flash-outline' },
    IN_PROGRESS: { ...colors.statusSemantic.active, icon: 'flash-outline' },
    COMPLETED: { ...colors.statusSemantic.completed, icon: 'checkmark-done-circle-outline' },
    CANCELLED: { ...colors.statusSemantic.cancelled, icon: 'close-circle-outline' },
    CANCELED: { ...colors.statusSemantic.cancelled, icon: 'close-circle-outline' },
    REJECTED: { ...colors.statusSemantic.rejected, icon: 'ban-outline' },
    EXPIRED: { ...colors.statusSemantic.expired, icon: 'time-outline' },
};

const Badge = ({ status, type = 'booking', label, showIcon = true, style }) => {
    const labels = type === 'payment' ? PaymentStatusLabels : BookingStatusLabels;
    const normalizedKey = typeof status === 'string' ? status.toUpperCase() : status;
    const displayLabel = label || (typeof status === 'string' ? status : labels[status]) || 'Unknown';
    const config = statusConfig[normalizedKey] || statusConfig[status] || { ...colors.statusSemantic.pending, icon: 'ellipse-outline' };

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: config.bg },
                config.border && { borderWidth: 1, borderColor: config.border },
                style,
            ]}
        >
            {showIcon && config.icon && (
                <Ionicons
                    name={config.icon}
                    size={12}
                    color={config.text}
                    style={styles.icon}
                />
            )}
            <Text style={[styles.text, { color: config.text }]}>{displayLabel}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: 12, // 12pt corner radius
        alignSelf: 'flex-start',
        gap: 4,
    },
    icon: {
        marginRight: 1,
    },
    text: {
        ...typography.caption,
        fontWeight: typography.weight.semibold,
    },
});

export default Badge;
