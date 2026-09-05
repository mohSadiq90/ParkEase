/**
 * BookingScreen
 * Create a booking with start/end date-time pickers, vehicle type, and price calculation
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { calculatePriceThunk, createBookingThunk, clearPriceBreakdown } from '../../store/slices/bookingSlice';
import apiClient from '../../services/api/apiClient';
import ENDPOINTS from '../../services/api/endpoints';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Input from '../../components/Common/Input';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDate, formatTime } from '../../utils/formatters';
import { PricingType, PricingTypeLabels, VehicleType, VehicleTypeLabels } from '../../utils/constants';

const BookingScreen = ({ navigation, route }) => {
    const { parkingId } = route.params;
    const dispatch = useDispatch();
    const { priceBreakdown, priceLoading, createLoading } = useSelector((s) => s.booking);
    const { selectedParking: parking } = useSelector((s) => s.parking);

    // Start time: next full hour
    const getInitialStart = () => {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        d.setHours(d.getHours() + 1);
        return d;
    };
    // End time: start + 2 hours
    const getInitialEnd = (start) => {
        const d = new Date(start);
        d.setHours(d.getHours() + 2);
        return d;
    };

    const [startDate, setStartDate] = useState(getInitialStart());
    const [endDate, setEndDate] = useState(getInitialEnd(getInitialStart()));
    const [pricingType, setPricingType] = useState(PricingType.Hourly);
    const [vehicleType, setVehicleType] = useState(VehicleType.Car);
    const [discountCode, setDiscountCode] = useState('');

    // Ancillary Add-on Services (API_ENDPOINTS_MOBILE Section 12)
    const [ancillaryServices, setAncillaryServices] = useState([]);
    const [selectedAncillaryIds, setSelectedAncillaryIds] = useState([]);

    // Garage vehicles
    const [garageVehicles, setGarageVehicles] = useState([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleModel, setVehicleModel] = useState('');
    const [vehicleColor, setVehicleColor] = useState('');
    const [slotNumber, setSlotNumber] = useState('');

    // Picker visibility (iOS uses modal, Android uses inline)
    const [showPicker, setShowPicker] = useState(null); // 'startDate' | 'startTime' | 'endDate' | 'endTime' | null

    useEffect(() => {
        const loadVehicles = async () => {
            try {
                const res = await apiClient.get(ENDPOINTS.VEHICLES.BASE);
                const items = res.data?.data || res.data || [];
                if (Array.isArray(items) && items.length > 0) {
                    setGarageVehicles(items);
                    const defaultV = items[0];
                    setSelectedVehicleId(defaultV.id);
                    setVehicleNumber(defaultV.licensePlate || defaultV.plateNumber || '');
                    setVehicleModel(`${defaultV.make || ''} ${defaultV.model || ''}`.trim());
                    setVehicleColor(defaultV.color || '');
                }
            } catch (e) {
                // Ignore fallback
            }
        };

        const loadAncillary = async () => {
            try {
                const res = await apiClient.get(ENDPOINTS.ANCILLARY_SERVICES.BY_PARKING(parkingId));
                const items = res.data?.data || res.data || [];
                if (Array.isArray(items)) {
                    setAncillaryServices(items.filter((item) => item.isActive !== false));
                }
            } catch (e) {
                // Ignore fallback
            }
        };

        loadVehicles();
        loadAncillary();
    }, [parkingId]);

    // Calculate price whenever dates, pricing type, discount or ancillary add-ons change
    useEffect(() => {
        if (startDate < endDate) {
            dispatch(calculatePriceThunk({
                parkingSpaceId: parkingId,
                startDateTime: startDate.toISOString(),
                endDateTime: endDate.toISOString(),
                pricingType,
                discountCode: discountCode || undefined,
                ancillaryServiceIds: selectedAncillaryIds.length > 0 ? selectedAncillaryIds : undefined,
            }));
        }
    }, [startDate, endDate, pricingType, selectedAncillaryIds, discountCode]);

    useEffect(() => {
        return () => { dispatch(clearPriceBreakdown()); };
    }, []);

    const toggleAncillaryService = (serviceId) => {
        setSelectedAncillaryIds((prev) =>
            prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
        );
    };

    const handleSelectVehicle = (v) => {
        if (v === 'custom') {
            setSelectedVehicleId('custom');
            setVehicleNumber('');
            setVehicleModel('');
            setVehicleColor('');
        } else {
            setSelectedVehicleId(v.id);
            setVehicleNumber(v.licensePlate || v.plateNumber || '');
            setVehicleModel(`${v.make || ''} ${v.model || ''}`.trim());
            setVehicleColor(v.color || '');
        }
    };

    const handlePickerChange = (pickerType) => (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowPicker(null);
        }
        if (event.type === 'dismissed') return;
        if (!selectedDate) return;

        if (pickerType === 'startDate') {
            const updated = new Date(startDate);
            updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setStartDate(updated);
            // Ensure end is after start
            if (updated >= endDate) {
                const newEnd = new Date(updated);
                newEnd.setHours(newEnd.getHours() + 2);
                setEndDate(newEnd);
            }
        } else if (pickerType === 'startTime') {
            const updated = new Date(startDate);
            updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
            setStartDate(updated);
            if (updated >= endDate) {
                const newEnd = new Date(updated);
                newEnd.setHours(newEnd.getHours() + 2);
                setEndDate(newEnd);
            }
        } else if (pickerType === 'endDate') {
            const updated = new Date(endDate);
            updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            if (updated > startDate) setEndDate(updated);
        } else if (pickerType === 'endTime') {
            const updated = new Date(endDate);
            updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
            if (updated > startDate) setEndDate(updated);
        }
    };

    const handleConfirmBooking = async () => {
        if (startDate >= endDate) return;
        const result = await dispatch(createBookingThunk({
            parkingSpaceId: parkingId,
            startDateTime: startDate.toISOString(),
            endDateTime: endDate.toISOString(),
            pricingType,
            vehicleType,
            vehicleNumber: vehicleNumber || undefined,
            vehicleModel: vehicleModel || undefined,
            vehicleColor: vehicleColor || undefined,
            slotNumber: slotNumber ? parseInt(slotNumber, 10) : undefined,
            discountCode: discountCode || undefined,
            ancillaryServiceIds: selectedAncillaryIds.length > 0 ? selectedAncillaryIds : undefined,
        }));
        if (!result.error) {
            navigation.goBack();
        } else {
            Alert.alert('Booking Failed', result.payload || 'A network error occurred. Please try again.');
        }
    };

    const getDurationText = () => {
        const diffMs = endDate - startDate;
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours === 0) return `${minutes}m`;
        if (minutes === 0) return `${hours}h`;
        return `${hours}h ${minutes}m`;
    };

    const isValidRange = startDate < endDate && startDate >= new Date(Date.now() - 60000);

    // Date-time selector button
    const DateTimeButton = ({ label, dateText, timeText, onDatePress, onTimePress }) => (
        <View style={styles.dtGroup}>
            <Text style={styles.dtLabel}>{label}</Text>
            <View style={styles.dtRow}>
                <TouchableOpacity style={styles.dtButton} onPress={onDatePress}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={styles.dtButtonText}>{dateText}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dtButton} onPress={onTimePress}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                    <Text style={styles.dtButtonText}>{timeText}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderPicker = () => {
        if (!showPicker) return null;
        const isDate = showPicker === 'startDate' || showPicker === 'endDate';
        const isStart = showPicker === 'startDate' || showPicker === 'startTime';
        const currentValue = isStart ? startDate : endDate;

        if (Platform.OS === 'ios') {
            return (
                <Modal visible={true} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>
                                    {isStart ? 'Start' : 'End'} {isDate ? 'Date' : 'Time'}
                                </Text>
                                <TouchableOpacity onPress={() => setShowPicker(null)}>
                                    <Text style={styles.modalDone}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={currentValue}
                                mode={isDate ? 'date' : 'time'}
                                display="spinner"
                                onChange={handlePickerChange(showPicker)}
                                minimumDate={isStart ? new Date() : startDate}
                                minuteInterval={15}
                                textColor={colors.textPrimary}
                            />
                        </View>
                    </View>
                </Modal>
            );
        }

        // Android inline
        return (
            <DateTimePicker
                value={currentValue}
                mode={isDate ? 'date' : 'time'}
                display="default"
                onChange={handlePickerChange(showPicker)}
                minimumDate={isStart ? new Date() : startDate}
                minuteInterval={15}
            />
        );
    };

    return (
        <ScreenLayout>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Book Parking</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    {/* Parking Info */}
                    <Card>
                        <Text style={styles.parkingTitle}>{parking?.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                            <Text style={styles.parkingAddress}>{parking?.address}</Text>
                        </View>
                    </Card>

                    {/* Instant Confirmation Banner */}
                    {parking?.instantBook && (
                        <Card style={{ backgroundColor: `${colors.success}15`, borderColor: colors.success, borderWidth: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="flash" size={20} color={colors.successDark || '#059669'} />
                                <View style={{ flex: 1 }}>
                                    <Text style={{ ...typography.bodySmall, fontWeight: '700', color: colors.successDark || '#059669' }}>
                                        Instant Confirmation
                                    </Text>
                                    <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                                        Your spot will be confirmed immediately without waiting for host review.
                                    </Text>
                                </View>
                            </View>
                        </Card>
                    )}

                    {/* Date & Time Selection */}
                    <Card>
                        <Text style={styles.sectionTitle}>When do you need parking?</Text>

                        <DateTimeButton
                            label="Start"
                            dateText={formatDate(startDate)}
                            timeText={formatTime(startDate)}
                            onDatePress={() => setShowPicker('startDate')}
                            onTimePress={() => setShowPicker('startTime')}
                        />

                        <View style={styles.dtDivider}>
                            <View style={styles.dtDividerLine} />
                            <View style={styles.durationBadge}>
                                <Ionicons name="time-outline" size={14} color={colors.white} />
                                <Text style={styles.durationBadgeText}>{getDurationText()}</Text>
                            </View>
                            <View style={styles.dtDividerLine} />
                        </View>

                        <DateTimeButton
                            label="End"
                            dateText={formatDate(endDate)}
                            timeText={formatTime(endDate)}
                            onDatePress={() => setShowPicker('endDate')}
                            onTimePress={() => setShowPicker('endTime')}
                        />

                        {!isValidRange && (
                            <View style={styles.warningBanner}>
                                <Ionicons name="warning-outline" size={16} color={colors.accent} />
                                <Text style={styles.warningText}>End time must be after start time</Text>
                            </View>
                        )}
                    </Card>

                    {/* Vehicle Selection from Garage */}
                    <Card>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                            <Text style={styles.sectionTitle}>Select Vehicle</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Vehicles')}>
                                <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '600' }}>Manage Garage</Text>
                            </TouchableOpacity>
                        </View>

                        {garageVehicles.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}>
                                {garageVehicles.map((v) => (
                                    <TouchableOpacity
                                        key={v.id}
                                        onPress={() => handleSelectVehicle(v)}
                                        style={[
                                            styles.vehicleChip,
                                            selectedVehicleId === v.id && styles.vehicleChipActive,
                                        ]}
                                    >
                                        <Ionicons
                                            name="car"
                                            size={16}
                                            color={selectedVehicleId === v.id ? colors.primary : colors.textSecondary}
                                        />
                                        <View>
                                            <Text style={[styles.vehicleChipPlate, selectedVehicleId === v.id && styles.vehicleChipPlateActive]}>
                                                {v.licensePlate || v.plateNumber || 'No Plate'}
                                            </Text>
                                            <Text style={styles.vehicleChipModel}>
                                                {v.make} {v.model}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    onPress={() => handleSelectVehicle('custom')}
                                    style={[
                                        styles.vehicleChip,
                                        selectedVehicleId === 'custom' && styles.vehicleChipActive,
                                    ]}
                                >
                                    <Ionicons name="create-outline" size={16} color={selectedVehicleId === 'custom' ? colors.primary : colors.textSecondary} />
                                    <Text style={[styles.vehicleChipPlate, selectedVehicleId === 'custom' && styles.vehicleChipPlateActive]}>
                                        Custom / Other
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        ) : null}

                        {/* Vehicle text inputs */}
                        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                            <Input
                                label="License Plate Number"
                                value={vehicleNumber}
                                onChangeText={setVehicleNumber}
                                placeholder="e.g. ABC-1234"
                                leftIcon="car-outline"
                            />
                            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                                <Input
                                    label="Make & Model"
                                    value={vehicleModel}
                                    onChangeText={setVehicleModel}
                                    placeholder="e.g. Tesla Model 3"
                                    style={{ flex: 1 }}
                                />
                                <Input
                                    label="Slot (Optional)"
                                    value={slotNumber}
                                    onChangeText={setSlotNumber}
                                    placeholder="e.g. 12"
                                    keyboardType="numeric"
                                    style={{ width: 100 }}
                                />
                            </View>
                        </View>
                    </Card>

                    {/* Pricing Type */}
                    <Card>
                        <Text style={styles.sectionTitle}>Pricing Type</Text>
                        <View style={styles.chipRow}>
                            {Object.entries(PricingTypeLabels).map(([value, label]) => (
                                <TouchableOpacity
                                    key={value}
                                    onPress={() => setPricingType(Number(value))}
                                    style={[styles.chip, pricingType === Number(value) && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, pricingType === Number(value) && styles.chipTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    {/* Vehicle Type */}
                    <Card>
                        <Text style={styles.sectionTitle}>Vehicle Category</Text>
                        <View style={styles.chipRow}>
                            {Object.entries(VehicleTypeLabels).map(([value, label]) => (
                                <TouchableOpacity
                                    key={value}
                                    onPress={() => setVehicleType(Number(value))}
                                    style={[styles.chip, vehicleType === Number(value) && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, vehicleType === Number(value) && styles.chipTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    {/* Add-on Services (Ancillary Catalog) */}
                    {ancillaryServices.length > 0 && (
                        <Card>
                            <Text style={styles.sectionTitle}>Add-on Services</Text>
                            <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.sm }]}>
                                Enhance your booking with host-provided services
                            </Text>
                            {ancillaryServices.map((service) => {
                                const isSelected = selectedAncillaryIds.includes(service.id);
                                return (
                                    <TouchableOpacity
                                        key={service.id}
                                        onPress={() => toggleAncillaryService(service.id)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingVertical: spacing.sm,
                                            borderBottomWidth: 1,
                                            borderBottomColor: colors.borderLight,
                                        }}
                                    >
                                        <View style={{ flex: 1, marginRight: spacing.sm }}>
                                            <Text style={[typography.bodySmall, { fontWeight: '600', color: colors.textPrimary }]}>
                                                {service.name}
                                            </Text>
                                            {service.description ? (
                                                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2 }]}>
                                                    {service.description}
                                                </Text>
                                            ) : null}
                                            {service.durationMinutes ? (
                                                <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                                                    ⏱️ ~{service.durationMinutes} mins
                                                </Text>
                                            ) : null}
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                            <Text style={[typography.bodySmall, { fontWeight: '700', color: colors.primary }]}>
                                                +{formatCurrency(service.price)}
                                            </Text>
                                            <Ionicons
                                                name={isSelected ? 'checkbox' : 'square-outline'}
                                                size={20}
                                                color={isSelected ? colors.primary : colors.textTertiary}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </Card>
                    )}

                    {/* Discount */}
                    <Card>
                        <Input
                            label="Discount Code (optional)"
                            value={discountCode}
                            onChangeText={setDiscountCode}
                            placeholder="Enter code"
                            leftIcon="pricetag-outline"
                            style={{ marginBottom: 0 }}
                        />
                    </Card>

                    {/* Price Breakdown */}
                    <Card style={styles.priceCard}>
                        <Text style={styles.sectionTitle}>Price Summary</Text>
                        {priceLoading ? (
                            <Text style={styles.calculating}>Calculating...</Text>
                        ) : priceBreakdown ? (
                            <View>
                                <View style={styles.priceRow}>
                                    <Text style={styles.priceLabel}>Base price</Text>
                                    <Text style={styles.priceValue}>{formatCurrency(priceBreakdown.basePrice)}</Text>
                                </View>
                                {priceBreakdown.discount > 0 && (
                                    <View style={styles.priceRow}>
                                        <Text style={[styles.priceLabel, { color: colors.success }]}>Discount</Text>
                                        <Text style={[styles.priceValue, { color: colors.success }]}>-{formatCurrency(priceBreakdown.discount)}</Text>
                                    </View>
                                )}
                                <View style={[styles.priceRow, styles.totalRow]}>
                                    <Text style={styles.totalLabel}>Total</Text>
                                    <Text style={styles.totalValue}>{formatCurrency(priceBreakdown.totalPrice)}</Text>
                                </View>
                            </View>
                        ) : !isValidRange ? (
                            <Text style={styles.calculating}>Select valid date range to see price</Text>
                        ) : null}
                    </Card>

                    {/* Confirm */}
                    <Button
                        title="Confirm Booking"
                        onPress={handleConfirmBooking}
                        loading={createLoading}
                        disabled={!isValidRange}
                        style={[styles.confirmBtn, !isValidRange && { opacity: 0.5 }]}
                        icon={<Ionicons name="checkmark-circle" size={20} color={colors.white} />}
                    />
                </View>
            </ScrollView>

            {/* Date/Time Picker */}
            {renderPicker()}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.base },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing['3xl'] },
    parkingTitle: { ...typography.h4, color: colors.textPrimary },
    parkingAddress: { ...typography.caption, color: colors.textTertiary },
    sectionTitle: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.md },

    // Date-time picker styles
    dtGroup: { marginBottom: spacing.sm },
    dtLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
    dtRow: { flexDirection: 'row', gap: spacing.sm },
    dtButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.background, borderRadius: spacing.radius.lg,
        paddingHorizontal: spacing.base, paddingVertical: spacing.md,
        borderWidth: 1, borderColor: colors.border,
    },
    dtButtonText: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
    dtDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.md },
    dtDividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
    durationBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: colors.primary, borderRadius: spacing.radius.full,
        paddingHorizontal: spacing.base, paddingVertical: 4,
        marginHorizontal: spacing.sm,
    },
    durationBadgeText: { ...typography.caption, color: colors.white, fontWeight: '700' },
    warningBanner: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.accentSoft, padding: spacing.sm,
        borderRadius: spacing.radius.md, marginTop: spacing.sm,
    },
    warningText: { ...typography.caption, color: colors.accentDark },

    // Modal picker (iOS)
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.base, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { ...typography.h4, color: colors.textPrimary },
    modalDone: { ...typography.body, color: colors.primary, fontWeight: '600' },

    // Chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: spacing.radius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
    chipTextActive: { color: colors.primary, fontWeight: '600' },

    // Vehicle Chips
    vehicleChip: {
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
        borderRadius: spacing.radius.lg, backgroundColor: colors.background,
        borderWidth: 1, borderColor: colors.border,
    },
    vehicleChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    vehicleChipPlate: { ...typography.label, color: colors.textPrimary, fontSize: 13 },
    vehicleChipPlateActive: { color: colors.primary, fontWeight: '700' },
    vehicleChipModel: { ...typography.caption, color: colors.textSecondary, fontSize: 11 },

    // Price
    priceCard: { backgroundColor: colors.primarySoft },
    calculating: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
    priceLabel: { ...typography.bodySmall, color: colors.textSecondary },
    priceValue: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
    totalRow: { borderTopWidth: 1, borderTopColor: colors.primary, marginTop: spacing.sm, paddingTop: spacing.sm },
    totalLabel: { ...typography.h4, color: colors.primary },
    totalValue: { ...typography.h3, color: colors.primary },
    confirmBtn: { marginTop: spacing.base },
});

export default BookingScreen;
