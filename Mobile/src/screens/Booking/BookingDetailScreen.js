/**
 * BookingDetailScreen
 * Full booking details with actions: cancel, check-in/out, extend, valet
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, StyleSheet, Modal, Linking } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { 
    getBookingDetailThunk, cancelBookingThunk, checkInThunk, checkOutThunk, extendBookingThunk,
    requestValetThunk, cancelValetThunk, acknowledgeValetThunk, readyValetThunk, completeValetThunk, assignBayThunk,
    getAccessPassThunk, getGoogleWalletPassThunk, getEvSessionThunk
} from '../../store/slices/bookingSlice';
import { createPaymentOrderThunk } from '../../store/slices/paymentSlice';
import environment from '../../config/environment';
import ENDPOINTS from '../../services/api/endpoints';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { BookingStatus, BookingStatusLabels, PricingTypeLabels, VehicleTypeLabels } from '../../utils/constants';

const InfoRow = ({ icon, label, value }) => (
    <View style={styles.infoRow}>
        <View style={styles.infoLeft}>
            <Ionicons name={icon} size={18} color={colors.primary} />
            <Text style={styles.infoLabel}>{label}</Text>
        </View>
        <Text style={styles.infoValue}>{value}</Text>
    </View>
);

const EXTENSION_HOUR_OPTIONS = [1, 2, 3, 4, 6, 12];

const BookingDetailScreen = ({ navigation, route }) => {
    const { bookingId } = route.params;
    const dispatch = useDispatch();
    const { selectedBooking: booking, detailLoading, actionLoading } = useSelector((s) => s.booking);

    const [extendModalVisible, setExtendModalVisible] = useState(false);
    const [extendHours, setExtendHours] = useState(1);
    const [extending, setExtending] = useState(false);
    const [receiptModalVisible, setReceiptModalVisible] = useState(false);

    useEffect(() => {
        dispatch(getBookingDetailThunk(bookingId));
        dispatch(getAccessPassThunk(bookingId));
        dispatch(getEvSessionThunk(bookingId));
    }, [dispatch, bookingId]);

    const handleCancel = useCallback(() => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this booking?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => dispatch(cancelBookingThunk({ id: bookingId, reason: 'Cancelled by user' })),
                },
            ]
        );
    }, [dispatch, bookingId]);

    const handlePayOverstay = useCallback(async () => {
        if (!booking) return;
        const res = await dispatch(createPaymentOrderThunk({ bookingId: booking.id, payOverstayFee: true }));
        if (!res.error) {
            navigation.navigate('PaymentScreen', {
                bookingId: booking.id,
                isOverstay: true,
                amount: booking.overstayFeeOutstanding,
            });
        } else {
            Alert.alert('Payment Initialization Failed', res.payload || 'Could not initiate overstay payment.');
        }
    }, [booking, dispatch, navigation]);

    const handleOpenAppleWallet = useCallback(() => {
        if (!booking) return;
        const url = `${environment.apiUrl}${ENDPOINTS.BOOKINGS.ACCESS_PASS_APPLE(booking.id)}`;
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open Apple Wallet pass.'));
    }, [booking]);

    const handleOpenGoogleWallet = useCallback(async () => {
        if (!booking) return;
        const res = await dispatch(getGoogleWalletPassThunk(booking.id));
        if (res.payload?.saveUrl) {
            Linking.openURL(res.payload.saveUrl).catch(() => Alert.alert('Error', 'Unable to open Google Wallet link.'));
        } else {
            Alert.alert('Google Wallet', res.payload?.message || 'Google Wallet pass is not configured for this facility.');
        }
    }, [booking, dispatch]);

    const handleCheckIn = useCallback(() => {
        Alert.alert(
            'Confirm Check-In',
            'Are you at the parking facility ready to park?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Check In Now',
                    onPress: () => dispatch(checkInThunk(bookingId)),
                },
            ]
        );
    }, [dispatch, bookingId]);

    const handleCheckOut = useCallback(() => {
        Alert.alert(
            'Confirm Check-Out',
            'Are you leaving the parking space?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Check Out Now',
                    onPress: () => dispatch(checkOutThunk(bookingId)),
                },
            ]
        );
    }, [dispatch, bookingId]);

    const handleConfirmExtend = async () => {
        if (!booking) return;
        setExtending(true);
        const currentEnd = new Date(booking.endDateTime);
        const newEnd = new Date(currentEnd.getTime() + extendHours * 3600000);
        const res = await dispatch(extendBookingThunk({
            id: bookingId,
            data: {
                newEndDateTime: newEnd.toISOString(),
                pricingType: booking.pricingType || 0,
            },
        }));
        setExtending(false);
        if (!res.error) {
            setExtendModalVisible(false);
            Alert.alert('Extension Requested', `Requested +${extendHours} hour(s). Waiting for host confirmation.`);
        } else {
            Alert.alert('Extension Failed', res.payload || 'Could not process extension request.');
        }
    };

    const handleValetAction = (actionType) => {
        switch(actionType) {
            case 'request': dispatch(requestValetThunk({ id: bookingId, data: {} })); break;
            case 'cancel': dispatch(cancelValetThunk(bookingId)); break;
            case 'acknowledge': dispatch(acknowledgeValetThunk(bookingId)); break;
            case 'ready': dispatch(readyValetThunk(bookingId)); break;
            case 'complete': dispatch(completeValetThunk(bookingId)); break;
        }
    };

    const handleAssignBay = () => {
        dispatch(assignBayThunk({ id: bookingId, data: { bayNumber: 'A1-001' } }));
    };

    if (detailLoading || !booking) return <LoadingScreen />;

    const canCancel = [BookingStatus.Pending, BookingStatus.Confirmed, BookingStatus.AwaitingPayment].includes(booking.status);
    const isConfirmed = booking.status === BookingStatus.Confirmed;
    const isInProgress = booking.status === BookingStatus.InProgress;
    const canExtend = isConfirmed || isInProgress;
    const hasPendingExtension = booking.hasPendingExtension || booking.extensionStatus === 'Pending' || booking.pendingExtension;

    const currentEnd = new Date(booking.endDateTime);
    const extendedEndDate = new Date(currentEnd.getTime() + extendHours * 3600000);

    return (
        <ScreenLayout>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Booking Details</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    {/* Status Banner */}
                    <Card style={styles.statusCard}>
                        <Badge status={booking.status} />
                        <Text style={styles.refCode}>Ref: {booking.bookingReference}</Text>
                    </Card>

                    {/* Pending Extension Notice */}
                    {hasPendingExtension && (
                        <Card style={{ backgroundColor: colors.warningSoft, borderLeftWidth: 4, borderLeftColor: colors.warning }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="hourglass-outline" size={20} color={colors.warningDark} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ ...typography.bodySmall, color: colors.warningDark, fontWeight: '700' }}>
                                        Extension Pending Host Approval
                                    </Text>
                                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                                        Requested new end: {booking.pendingEndDateTime ? formatDateTime(booking.pendingEndDateTime) : 'Extension in review'}
                                    </Text>
                                </View>
                            </View>
                        </Card>
                    )}

                    {/* Refund Notice if Cancelled or Rejected */}
                    {[BookingStatus.Cancelled, BookingStatus.Rejected].includes(booking.status) && (
                        <Card style={{ backgroundColor: colors.dangerSoft, borderLeftWidth: 3, borderLeftColor: colors.danger }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Ionicons name="information-circle" size={18} color={colors.danger} />
                                <Text style={{ ...typography.caption, color: colors.danger, fontWeight: '700' }}>
                                    Refund Status: {booking.totalAmount > 0 ? 'Automatic refund initiated (3-5 business days)' : 'No charges incurred'}
                                </Text>
                            </View>
                        </Card>
                    )}

                    {/* Outstanding Overstay Fee */}
                    {booking.overstayFeeOutstanding > 0 && (
                        <Card style={{ backgroundColor: colors.dangerSoft, borderLeftWidth: 4, borderLeftColor: colors.danger }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="alert-circle" size={24} color={colors.danger} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ ...typography.label, color: colors.dangerDark, fontWeight: '700' }}>
                                        Outstanding Overstay Fee
                                    </Text>
                                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                                        Vehicle stayed past booked window. Settle balance of {formatCurrency(booking.overstayFeeOutstanding)}.
                                    </Text>
                                </View>
                            </View>
                            <Button
                                title={`Pay Overstay Fee (${formatCurrency(booking.overstayFeeOutstanding)})`}
                                onPress={handlePayOverstay}
                                variant="danger"
                                loading={actionLoading}
                                style={{ marginTop: spacing.md }}
                                icon={<Ionicons name="card-outline" size={18} color={colors.white} />}
                            />
                        </Card>
                    )}

                    {/* Digital Gate Access Token for Confirmed/Active Bookings */}
                    {[BookingStatus.Confirmed, BookingStatus.InProgress, BookingStatus.Completed].includes(booking.status) && (
                        <Card style={{ backgroundColor: colors.primarySoft, borderLeftWidth: 4, borderLeftColor: colors.primary }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' }}>Digital Gate Token</Text>
                                    <Text style={{ ...typography.label, color: colors.textPrimary, fontFamily: 'monospace', marginTop: 2 }}>
                                        {booking.id?.substring(0, 18).toUpperCase()}
                                    </Text>
                                    <Text style={{ ...typography.caption, color: colors.success, marginTop: 2 }}>✓ Verified Paid & Active</Text>
                                </View>
                                <Ionicons name="qr-code-outline" size={32} color={colors.primary} />
                            </View>
                            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                                <TouchableOpacity style={styles.walletBtn} onPress={handleOpenAppleWallet}>
                                    <Ionicons name="logo-apple" size={16} color={colors.white} />
                                    <Text style={styles.walletBtnText}>Apple Wallet</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.walletBtn, { backgroundColor: '#4285F4' }]} onPress={handleOpenGoogleWallet}>
                                    <Ionicons name="wallet-outline" size={16} color={colors.white} />
                                    <Text style={styles.walletBtnText}>Google Wallet</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    )}

                    {/* Parking Info */}
                    <Card>
                        <Text style={styles.sectionTitle}>Parking Location</Text>
                        <Text style={styles.parkingTitle}>{booking.parkingSpaceTitle}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                            <Text style={styles.parkingAddress}>{booking.parkingSpaceAddress || 'N/A'}</Text>
                        </View>
                        {booking.slotNumber && (
                            <View style={{ marginTop: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: spacing.radius.full }}>
                                <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '700' }}>🅿️ Slot P{booking.slotNumber}</Text>
                            </View>
                        )}
                    </Card>

                    {/* Booking Details */}
                    <Card>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <InfoRow icon="calendar-outline" label="Start" value={formatDateTime(booking.startDateTime)} />
                        <InfoRow icon="calendar-outline" label="End" value={formatDateTime(booking.endDateTime)} />
                        <InfoRow icon="pricetag-outline" label="Pricing" value={PricingTypeLabels[booking.pricingType]} />
                        <InfoRow icon="car-outline" label="Vehicle" value={booking.vehicleNumber ? `${booking.vehicleNumber} (${VehicleTypeLabels[booking.vehicleType] || 'Vehicle'})` : (VehicleTypeLabels[booking.vehicleType] || 'N/A')} />
                        {booking.assignedBay && (
                            <InfoRow icon="grid-outline" label="Assigned Bay" value={booking.assignedBay} />
                        )}
                        {booking.valetStatus && (
                            <InfoRow icon="key-outline" label="Valet Status" value={booking.valetStatus} />
                        )}
                    </Card>

                    {/* EV Charging Session */}
                    {booking.includeEvCharging && (
                        <Card>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                <Text style={styles.sectionTitle}>⚡ EV Charging Session</Text>
                                <Badge status={booking.evSessionStatus ? 1 : 0} />
                            </View>
                            <InfoRow icon="flash-outline" label="Energy Delivered" value={`${booking.evEnergyDeliveredKwh || 0} kWh`} />
                            <InfoRow icon="cash-outline" label="Charging Fee" value={formatCurrency(booking.evChargingFeeAmount || 0)} />
                            {booking.evIdleFeeAmount > 0 && (
                                <InfoRow icon="timer-outline" label="Idle Fee" value={formatCurrency(booking.evIdleFeeAmount)} />
                            )}
                        </Card>
                    )}

                    {/* Payment */}
                    <Card style={styles.paymentCard}>
                        <Text style={styles.sectionTitle}>Payment</Text>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total Amount</Text>
                            <Text style={styles.totalValue}>{formatCurrency(booking.totalAmount)}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.receiptBtn}
                            onPress={() => setReceiptModalVisible(true)}
                        >
                            <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                            <Text style={styles.receiptBtnText}>View Itemized Tax Receipt</Text>
                        </TouchableOpacity>
                    </Card>

                    {/* Primary Lifecycle Actions */}
                    <View style={styles.actions}>
                        {/* 1. Check-In Action */}
                        {isConfirmed && (
                            <Button
                                title="Check In"
                                onPress={handleCheckIn}
                                variant="primary"
                                loading={actionLoading}
                                icon={<Ionicons name="log-in-outline" size={20} color={colors.white} />}
                            />
                        )}

                        {/* 2. Check-Out Action */}
                        {isInProgress && (
                            <Button
                                title="Check Out"
                                onPress={handleCheckOut}
                                variant="primary"
                                loading={actionLoading}
                                icon={<Ionicons name="log-out-outline" size={20} color={colors.white} />}
                            />
                        )}

                        {/* 3. Extend Booking Action */}
                        {canExtend && (
                            <Button
                                title="Extend Booking"
                                onPress={() => setExtendModalVisible(true)}
                                variant="outline"
                                loading={actionLoading}
                                icon={<Ionicons name="time-outline" size={20} color={colors.primary} />}
                            />
                        )}

                        {/* 4. Cancel Action */}
                        {canCancel && (
                            <Button
                                title="Cancel Booking"
                                onPress={handleCancel}
                                variant="danger"
                                loading={actionLoading}
                                icon={<Ionicons name="close-circle" size={20} color={colors.white} />}
                            />
                        )}
                        
                        {/* Member Valet Actions */}
                        {!booking.valetStatus && (
                            <Button title="Request Valet" onPress={() => handleValetAction('request')} variant="secondary" loading={actionLoading} />
                        )}
                        {booking.valetStatus === 'Requested' && (
                            <Button title="Cancel Valet Request" onPress={() => handleValetAction('cancel')} variant="secondary" loading={actionLoading} />
                        )}
                        
                        {/* Vendor Valet & Bay Actions */}
                        {booking.valetStatus === 'Requested' && (
                            <Button title="Acknowledge Valet (Vendor)" onPress={() => handleValetAction('acknowledge')} variant="outline" loading={actionLoading} />
                        )}
                        {booking.valetStatus === 'Acknowledged' && (
                            <Button title="Mark Valet Ready (Vendor)" onPress={() => handleValetAction('ready')} variant="outline" loading={actionLoading} />
                        )}
                        {booking.valetStatus === 'Ready' && (
                            <Button title="Complete Valet (Vendor)" onPress={() => handleValetAction('complete')} variant="primary" loading={actionLoading} />
                        )}
                        
                        <Button title="Assign Bay (Vendor)" onPress={() => handleAssignBay()} variant="outline" loading={actionLoading} />

                        {booking.status === BookingStatus.Completed && (
                            <Button
                                title="Write Review"
                                onPress={() => navigation.navigate('CreateReview', { parkingSpaceId: booking.parkingSpaceId })}
                                variant="secondary"
                                icon={<Ionicons name="star" size={20} color={colors.primary} />}
                            />
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Extension Request Modal */}
            <Modal
                visible={extendModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setExtendModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Extend Booking</Text>
                            <TouchableOpacity onPress={() => setExtendModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Select additional parking time to extend your current session:
                        </Text>

                        {/* Quick hour selection chips */}
                        <View style={styles.chipRow}>
                            {EXTENSION_HOUR_OPTIONS.map((hrs) => (
                                <TouchableOpacity
                                    key={hrs}
                                    onPress={() => setExtendHours(hrs)}
                                    style={[
                                        styles.hourChip,
                                        extendHours === hrs && styles.hourChipSelected,
                                    ]}
                                >
                                    <Text style={[styles.hourChipText, extendHours === hrs && styles.hourChipTextSelected]}>
                                        +{hrs} hr{hrs > 1 ? 's' : ''}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Summary Box */}
                        <View style={styles.extendSummaryBox}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Current End Time:</Text>
                                <Text style={styles.summaryVal}>{formatDateTime(booking.endDateTime)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>New End Time:</Text>
                                <Text style={[styles.summaryVal, { color: colors.primary, fontWeight: '700' }]}>
                                    {formatDateTime(extendedEndDate.toISOString())}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={() => setExtendModalVisible(false)}
                                variant="outline"
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Request Extension"
                                onPress={handleConfirmExtend}
                                variant="primary"
                                loading={extending}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Digital Tax Invoice & Receipt Modal */}
            <Modal
                visible={receiptModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReceiptModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tax Invoice & Receipt</Text>
                            <TouchableOpacity onPress={() => setReceiptModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.md }}>
                            Receipt Ref: RCP-{booking.id?.substring(0, 8).toUpperCase() || 'REF001'}
                        </Text>

                        {/* Receipt itemized table */}
                        <View style={styles.receiptBox}>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Parking Location</Text>
                                <Text style={styles.receiptVal} numberOfLines={1}>{booking.parkingSpaceTitle}</Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Base Parking Fee</Text>
                                <Text style={styles.receiptVal}>{formatCurrency(Math.max(0, (booking.totalAmount || 0) * 0.82))}</Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>CGST (9%)</Text>
                                <Text style={styles.receiptVal}>{formatCurrency((booking.totalAmount || 0) * 0.09)}</Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>SGST (9%)</Text>
                                <Text style={styles.receiptVal}>{formatCurrency((booking.totalAmount || 0) * 0.09)}</Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Convenience / Platform Fee</Text>
                                <Text style={styles.receiptVal}>{formatCurrency(0)}</Text>
                            </View>
                            <View style={styles.receiptDivider} />
                            <View style={styles.receiptRow}>
                                <Text style={[styles.receiptLabel, { fontWeight: '700', color: colors.textPrimary }]}>Total Paid (Incl. GST)</Text>
                                <Text style={[styles.receiptVal, { fontWeight: '700', color: colors.primary, fontSize: 16 }]}>
                                    {formatCurrency(booking.totalAmount)}
                                </Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Payment Status</Text>
                                <Text style={[styles.receiptVal, { color: colors.success, fontWeight: '700' }]}>Paid ✅</Text>
                            </View>
                        </View>

                        <Button
                            title="Done"
                            onPress={() => setReceiptModalVisible(false)}
                            variant="primary"
                            style={{ marginTop: spacing.lg }}
                        />
                    </View>
                </View>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.base },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing['3xl'] },
    statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    refCode: { ...typography.bodySmall, color: colors.textTertiary },
    sectionTitle: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.md },
    parkingTitle: { ...typography.h4, color: colors.textPrimary },
    parkingAddress: { ...typography.caption, color: colors.textTertiary },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    infoLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    infoLabel: { ...typography.bodySmall, color: colors.textSecondary },
    infoValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
    paymentCard: { backgroundColor: colors.primarySoft },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { ...typography.body, color: colors.primary },
    totalValue: { ...typography.h3, color: colors.primary },
    receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, alignSelf: 'flex-start' },
    receiptBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
    actions: { gap: spacing.md, marginTop: spacing.lg },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: colors.surface, borderTopLeftRadius: spacing.radius.xl, borderTopRightRadius: spacing.radius.xl, padding: spacing.screenHorizontal, paddingBottom: spacing['2xl'] },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.textPrimary },
    modalCloseBtn: { padding: spacing.xs },
    modalSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    hourChip: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: spacing.radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    hourChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    hourChipText: { ...typography.label, color: colors.textPrimary },
    hourChipTextSelected: { color: colors.white, fontWeight: '700' },
    extendSummaryBox: { backgroundColor: colors.background, padding: spacing.base, borderRadius: spacing.radius.md, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.xl, gap: spacing.sm },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { ...typography.caption, color: colors.textSecondary },
    summaryVal: { ...typography.caption, color: colors.textPrimary, fontWeight: '500' },
    modalActions: { flexDirection: 'row', gap: spacing.md },
    receiptBox: { backgroundColor: colors.background, padding: spacing.base, borderRadius: spacing.radius.md, borderWidth: 1, borderColor: colors.borderLight, gap: spacing.sm },
    receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    receiptLabel: { ...typography.caption, color: colors.textSecondary },
    receiptVal: { ...typography.caption, color: colors.textPrimary, fontWeight: '600' },
    receiptDivider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.xs },
    walletBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#000',
        paddingVertical: 8,
        borderRadius: spacing.radius.md,
    },
    walletBtnText: {
        ...typography.caption,
        color: colors.white,
        fontWeight: '700',
    },
});

export default BookingDetailScreen;
