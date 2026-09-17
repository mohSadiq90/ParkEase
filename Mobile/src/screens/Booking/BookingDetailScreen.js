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
import Input from '../../components/Common/Input';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDateTime, formatTime } from '../../utils/formatters';
import { BookingStatus, BookingStatusLabels, PricingTypeLabels, VehicleTypeLabels, UserRole, ValetStatus } from '../../utils/constants';

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
const VALET_LEAD_OPTIONS = [5, 10, 15, 20, 30];

const getValetStatusInfo = (status) => {
    const s = typeof status === 'string' ? status.toLowerCase() : status;
    if (s === 1 || s === 'requested') return { code: 1, label: 'Requested (Awaiting Staff)', isRequested: true };
    if (s === 2 || s === 'inprogress' || s === 'acknowledged') return { code: 2, label: 'In Progress (Retrieval underway)', isInProgress: true };
    if (s === 3 || s === 'ready' || s === 'readyforpickup') return { code: 3, label: 'Ready for Pickup', isReady: true };
    if (s === 4 || s === 'completed') return { code: 4, label: 'Completed', isCompleted: true };
    if (s === 5 || s === 'cancelled') return { code: 5, label: 'Cancelled', isCancelled: true };
    return { code: 0, label: 'None', isNone: true };
};

const BookingDetailScreen = ({ navigation, route }) => {
    const { bookingId } = route.params;
    const dispatch = useDispatch();
    const { user } = useSelector((s) => s.auth);
    const { selectedBooking: booking, detailLoading, actionLoading } = useSelector((s) => s.booking);

    const [extendModalVisible, setExtendModalVisible] = useState(false);
    const [extendHours, setExtendHours] = useState(1);
    const [extending, setExtending] = useState(false);
    const [receiptModalVisible, setReceiptModalVisible] = useState(false);

    // Valet Modal State
    const [valetModalVisible, setValetModalVisible] = useState(false);
    const [valetNotes, setValetNotes] = useState('');
    const [valetLeadMinutes, setValetLeadMinutes] = useState(10);
    const [requestingValet, setRequestingValet] = useState(false);

    // Bay Assignment Modal State
    const [assignBayModalVisible, setAssignBayModalVisible] = useState(false);
    const [bayLabel, setBayLabel] = useState('');
    const [facilityLevel, setFacilityLevel] = useState('');
    const [facilityZone, setFacilityZone] = useState('');
    const [slotNumber, setSlotNumber] = useState('');
    const [assigningBay, setAssigningBay] = useState(false);

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

    const openValetModal = () => {
        if (booking?.isValetEnabled === false) {
            Alert.alert('Valet Unavailable', 'Valet service is not enabled for this parking facility.');
            return;
        }
        setValetNotes('');
        setValetLeadMinutes(10);
        setValetModalVisible(true);
    };

    const handleConfirmRequestValet = async () => {
        if (!booking) return;
        setRequestingValet(true);
        const res = await dispatch(requestValetThunk({
            id: bookingId,
            data: {
                notes: valetNotes.trim() || undefined,
                leadMinutes: valetLeadMinutes,
            },
        }));
        setRequestingValet(false);
        if (!res.error) {
            setValetModalVisible(false);
            Alert.alert('Valet Requested', `Staff has been notified. Estimated retrieval time: ~${valetLeadMinutes} minutes.`);
        } else {
            const errorMsg = typeof res.payload === 'string' ? res.payload : (res.error?.message || 'Could not request valet.');
            Alert.alert('Valet Request Failed', errorMsg);
        }
    };

    const handleCancelValet = () => {
        Alert.alert(
            'Cancel Valet Request',
            'Are you sure you want to cancel your vehicle retrieval request?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        const res = await dispatch(cancelValetThunk(bookingId));
                        if (!res.error) {
                            Alert.alert('Valet Cancelled', 'Your valet retrieval request has been cancelled.');
                        } else {
                            Alert.alert('Action Failed', res.payload || 'Unable to cancel valet request.');
                        }
                    },
                },
            ]
        );
    };

    const handleVendorValetAction = async (actionType) => {
        let res;
        switch (actionType) {
            case 'acknowledge':
                res = await dispatch(acknowledgeValetThunk(bookingId));
                if (!res.error) {
                    Alert.alert('Valet Acknowledged', 'Vehicle retrieval is now marked as in progress.');
                }
                break;
            case 'ready':
                res = await dispatch(readyValetThunk(bookingId));
                if (!res.error) {
                    Alert.alert('Vehicle Ready', 'Guest has been notified that the vehicle is ready for pickup.');
                }
                break;
            case 'complete':
                res = await dispatch(completeValetThunk(bookingId));
                if (!res.error) {
                    Alert.alert('Valet Completed', 'Valet vehicle handoff completed successfully.');
                }
                break;
        }
        if (res?.error) {
            const errorMsg = typeof res.payload === 'string' ? res.payload : (res.error?.message || 'Action failed');
            if (errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('forbidden')) {
                Alert.alert(
                    'Host Authorization Required',
                    'Only the facility owner or designated valet staff can manage valet operations for this booking.'
                );
            } else {
                Alert.alert('Valet Action Failed', errorMsg);
            }
        }
    };

    const handleValetAction = (actionType) => {
        if (actionType === 'request') {
            openValetModal();
        } else if (actionType === 'cancel') {
            handleCancelValet();
        } else {
            handleVendorValetAction(actionType);
        }
    };

    const openAssignBayModal = () => {
        setBayLabel(booking?.bayLabel || booking?.assignedBay || '');
        setFacilityLevel(booking?.facilityLevel || '');
        setFacilityZone(booking?.facilityZone || '');
        setSlotNumber(booking?.slotNumber ? String(booking.slotNumber) : '');
        setAssignBayModalVisible(true);
    };

    const handleConfirmAssignBay = async () => {
        if (!booking) return;
        const trimmedBay = bayLabel.trim();
        const trimmedLevel = facilityLevel.trim();
        const trimmedZone = facilityZone.trim();
        const trimmedSlot = slotNumber.trim();

        if (!trimmedBay && !trimmedLevel && !trimmedZone && !trimmedSlot) {
            Alert.alert('Input Required', 'Please provide a bay identifier, level, zone, or slot number.');
            return;
        }

        let parsedSlot = undefined;
        if (trimmedSlot) {
            parsedSlot = parseInt(trimmedSlot, 10);
            if (isNaN(parsedSlot) || parsedSlot <= 0) {
                Alert.alert('Invalid Slot', 'Slot number must be a valid positive integer.');
                return;
            }
        }

        setAssigningBay(true);
        const res = await dispatch(assignBayThunk({
            id: bookingId,
            data: {
                bayLabel: trimmedBay || undefined,
                facilityLevel: trimmedLevel || undefined,
                facilityZone: trimmedZone || undefined,
                slotNumber: parsedSlot,
            },
        }));
        setAssigningBay(false);

        if (!res.error) {
            setAssignBayModalVisible(false);
            const assignedInfo = trimmedBay || (parsedSlot ? `Slot ${parsedSlot}` : 'Guidance updated');
            Alert.alert('Bay Assigned', `Parking bay (${assignedInfo}) has been assigned successfully.`);
        } else {
            const errorMsg = typeof res.payload === 'string' ? res.payload : (res.error?.message || 'Could not assign bay.');
            if (errorMsg.toLowerCase().includes('unauthorized') || errorMsg.toLowerCase().includes('forbidden')) {
                Alert.alert(
                    'Host Authorization Required',
                    'Only the facility owner or vendor can assign bays for this booking.'
                );
            } else {
                Alert.alert('Bay Assignment Failed', errorMsg);
            }
        }
    };

    const handleAssignBay = () => {
        openAssignBayModal();
    };

    if (detailLoading || !booking) return <LoadingScreen />;

    const canCancel = [BookingStatus.Pending, BookingStatus.Confirmed, BookingStatus.AwaitingPayment].includes(booking.status);
    const isConfirmed = booking.status === BookingStatus.Confirmed;
    const isInProgress = booking.status === BookingStatus.InProgress;
    const canExtend = isConfirmed || isInProgress;
    const hasPendingExtension = booking.hasPendingExtension || booking.extensionStatus === 'Pending' || booking.pendingExtension;

    const isVendorUser = user?.role === UserRole.Vendor || user?.role === UserRole.Admin || user?.role === 'Vendor' || user?.role === 'Admin';
    const isFacilityHost = Boolean(route.params?.isVendor || isVendorUser || (user && booking.userId && user.id !== booking.userId));
    const valetInfo = getValetStatusInfo(booking.valetStatus);

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

                    {/* Active Valet Notice */}
                    {(valetInfo.isRequested || valetInfo.isInProgress || valetInfo.isReady) && (
                        <Card style={{
                            backgroundColor: valetInfo.isReady ? colors.successSoft : colors.primarySoft,
                            borderLeftWidth: 4,
                            borderLeftColor: valetInfo.isReady ? colors.success : colors.primary,
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Ionicons
                                    name={valetInfo.isReady ? 'car-sport-outline' : 'key-outline'}
                                    size={24}
                                    color={valetInfo.isReady ? colors.success : colors.primary}
                                />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ ...typography.label, color: colors.textPrimary, fontWeight: '700' }}>
                                        Valet: {valetInfo.label}
                                    </Text>
                                    {booking.valetTargetReadyAt && (
                                        <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                                            Target Ready: {formatTime(booking.valetTargetReadyAt)}
                                        </Text>
                                    )}
                                    {booking.valetNotes ? (
                                        <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: 2 }}>
                                            Notes: {booking.valetNotes}
                                        </Text>
                                    ) : null}
                                </View>
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
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
                            {booking.slotNumber && (
                                <View style={{ backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: spacing.radius.full }}>
                                    <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '700' }}>🅿️ Slot P{booking.slotNumber}</Text>
                                </View>
                            )}
                            {(booking.bayLabel || booking.assignedBay) && (
                                <View style={{ backgroundColor: colors.successSoft, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: spacing.radius.full }}>
                                    <Text style={{ ...typography.caption, color: colors.success, fontWeight: '700' }}>📍 Bay {booking.bayLabel || booking.assignedBay}</Text>
                                </View>
                            )}
                            {booking.facilityLevel && (
                                <View style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: spacing.radius.full }}>
                                    <Text style={{ ...typography.caption, color: colors.textSecondary, fontWeight: '600' }}>Level {booking.facilityLevel}</Text>
                                </View>
                            )}
                        </View>
                    </Card>

                    {/* Booking Details */}
                    <Card>
                        <Text style={styles.sectionTitle}>Details</Text>
                        <InfoRow icon="calendar-outline" label="Start" value={formatDateTime(booking.startDateTime)} />
                        <InfoRow icon="calendar-outline" label="End" value={formatDateTime(booking.endDateTime)} />
                        <InfoRow icon="pricetag-outline" label="Pricing" value={PricingTypeLabels[booking.pricingType]} />
                        <InfoRow icon="car-outline" label="Vehicle" value={booking.vehicleNumber ? `${booking.vehicleNumber} (${VehicleTypeLabels[booking.vehicleType] || 'Vehicle'})` : (VehicleTypeLabels[booking.vehicleType] || 'N/A')} />
                        {(booking.bayLabel || booking.assignedBay || booking.facilityLevel || booking.facilityZone) && (
                            <InfoRow
                                icon="grid-outline"
                                label="Assigned Bay"
                                value={[
                                    booking.bayLabel || booking.assignedBay ? `${booking.bayLabel || booking.assignedBay}` : null,
                                    booking.facilityLevel ? `Lvl ${booking.facilityLevel}` : null,
                                    booking.facilityZone ? `Zone ${booking.facilityZone}` : null,
                                ].filter(Boolean).join(' • ')}
                            />
                        )}
                        {!valetInfo.isNone && (
                            <InfoRow icon="key-outline" label="Valet Status" value={valetInfo.label} />
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
                        {(isConfirmed || isInProgress) && (valetInfo.isNone || valetInfo.isCancelled || valetInfo.isCompleted) && (
                            <Button
                                title="Request Valet"
                                testID="request-valet-btn"
                                onPress={openValetModal}
                                variant="secondary"
                                loading={actionLoading}
                                icon={<Ionicons name="key-outline" size={20} color={colors.primary} />}
                            />
                        )}
                        {valetInfo.isRequested && (
                            <Button
                                title="Cancel Valet Request"
                                testID="cancel-valet-btn"
                                onPress={handleCancelValet}
                                variant="secondary"
                                loading={actionLoading}
                                icon={<Ionicons name="close-circle-outline" size={20} color={colors.primary} />}
                            />
                        )}

                        {booking.status === BookingStatus.Completed && (
                            <Button
                                title="Write Review"
                                onPress={() => navigation.navigate('CreateReview', { parkingSpaceId: booking.parkingSpaceId })}
                                variant="secondary"
                                icon={<Ionicons name="star" size={20} color={colors.primary} />}
                            />
                        )}
                    </View>

                    {/* Vendor Operations Section */}
                    <Card style={styles.vendorCard}>
                        <View style={styles.vendorHeader}>
                            <Ionicons name="business-outline" size={20} color={colors.primary} />
                            <Text style={styles.vendorHeaderTitle}>Host & Vendor Controls</Text>
                        </View>
                        <Text style={styles.vendorHeaderSubtitle}>
                            Manage indoor bay assignment and valet retrieval operations.
                        </Text>
                        <View style={styles.vendorBtnGroup}>
                            <Button
                                title="Assign Bay"
                                testID="assign-bay-btn"
                                onPress={openAssignBayModal}
                                variant="outline"
                                loading={actionLoading}
                                icon={<Ionicons name="grid-outline" size={18} color={colors.primary} />}
                            />
                            {valetInfo.isRequested && (
                                <Button
                                    title="Acknowledge Valet (Vendor)"
                                    testID="valet-acknowledge-btn"
                                    onPress={() => handleVendorValetAction('acknowledge')}
                                    variant="outline"
                                    loading={actionLoading}
                                    icon={<Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />}
                                />
                            )}
                            {valetInfo.isInProgress && (
                                <Button
                                    title="Mark Valet Ready (Vendor)"
                                    testID="valet-ready-btn"
                                    onPress={() => handleVendorValetAction('ready')}
                                    variant="outline"
                                    loading={actionLoading}
                                    icon={<Ionicons name="car-sport-outline" size={18} color={colors.primary} />}
                                />
                            )}
                            {valetInfo.isReady && (
                                <Button
                                    title="Complete Valet (Vendor)"
                                    testID="valet-complete-btn"
                                    onPress={() => handleVendorValetAction('complete')}
                                    variant="primary"
                                    loading={actionLoading}
                                    icon={<Ionicons name="checkmark-done-outline" size={18} color={colors.white} />}
                                />
                            )}
                        </View>
                    </Card>
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
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipRow}
                            style={styles.chipRowScroll}
                        >
                            {EXTENSION_HOUR_OPTIONS.map((hrs) => (
                                <TouchableOpacity
                                    key={hrs}
                                    testID={`extension-hour-pill-${hrs}`}
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
                        </ScrollView>

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

            {/* Request Valet Modal */}
            <Modal
                visible={valetModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setValetModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Valet Retrieval</Text>
                            <TouchableOpacity onPress={() => setValetModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Request parking staff to retrieve your vehicle to the pickup bay.
                        </Text>

                        <Text style={styles.modalInputLabel}>Lead Time (Minutes)</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipRow}
                            style={styles.chipRowScroll}
                        >
                            {VALET_LEAD_OPTIONS.map((mins) => (
                                <TouchableOpacity
                                    key={mins}
                                    testID={`valet-lead-pill-${mins}`}
                                    onPress={() => setValetLeadMinutes(mins)}
                                    style={[
                                        styles.hourChip,
                                        valetLeadMinutes === mins && styles.hourChipSelected,
                                    ]}
                                >
                                    <Text style={[styles.hourChipText, valetLeadMinutes === mins && styles.hourChipTextSelected]}>
                                        {mins} mins
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Input
                            label="Pickup Notes / Car Location (Optional)"
                            placeholder="e.g. Near Pillar B2, key with front desk"
                            value={valetNotes}
                            onChangeText={setValetNotes}
                            multiline
                            numberOfLines={3}
                            leftIcon="document-text-outline"
                            containerStyle={{ marginBottom: spacing.lg }}
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={() => setValetModalVisible(false)}
                                variant="outline"
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Submit Request"
                                onPress={handleConfirmRequestValet}
                                variant="primary"
                                loading={requestingValet}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Assign Parking Bay Modal */}
            <Modal
                visible={assignBayModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAssignBayModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Assign Parking Bay</Text>
                            <TouchableOpacity onPress={() => setAssignBayModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Assign or update indoor bay guidance and designated spot for this booking.
                        </Text>

                        <Input
                            label="Bay Identifier / Label"
                            placeholder="e.g. Bay A-14, A1-001"
                            value={bayLabel}
                            onChangeText={setBayLabel}
                            leftIcon="grid-outline"
                            containerStyle={{ marginBottom: spacing.sm }}
                        />

                        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm }}>
                            <Input
                                label="Level / Floor"
                                placeholder="e.g. B1, L2"
                                value={facilityLevel}
                                onChangeText={setFacilityLevel}
                                leftIcon="layers-outline"
                                containerStyle={{ flex: 1 }}
                            />
                            <Input
                                label="Zone"
                                placeholder="e.g. North, Blue"
                                value={facilityZone}
                                onChangeText={setFacilityZone}
                                leftIcon="navigate-outline"
                                containerStyle={{ flex: 1 }}
                            />
                        </View>

                        <Input
                            label="Slot Number"
                            placeholder="e.g. 14"
                            value={slotNumber}
                            onChangeText={setSlotNumber}
                            keyboardType="numeric"
                            leftIcon="car-outline"
                            containerStyle={{ marginBottom: spacing.lg }}
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                onPress={() => setAssignBayModalVisible(false)}
                                variant="outline"
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Save Bay Assignment"
                                onPress={handleConfirmAssignBay}
                                variant="primary"
                                loading={assigningBay}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.base },
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
    vendorCard: { marginTop: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary, backgroundColor: colors.surface },
    vendorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    vendorHeaderTitle: { ...typography.h4, color: colors.textPrimary },
    vendorHeaderSubtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
    vendorBtnGroup: { gap: spacing.sm },
    modalInputLabel: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.xs },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: colors.surface, borderTopLeftRadius: spacing.radius.xl, borderTopRightRadius: spacing.radius.xl, padding: spacing.screenHorizontal, paddingBottom: spacing['2xl'] },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    modalTitle: { ...typography.h3, color: colors.textPrimary },
    modalCloseBtn: { padding: spacing.xs },
    modalSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.md },
    chipRowScroll: { flexGrow: 0, marginBottom: spacing.lg },
    chipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
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
