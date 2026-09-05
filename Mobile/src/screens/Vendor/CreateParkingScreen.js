/**
 * CreateParkingScreen
 * Multi-section form to create or edit a parking space, with photo URL support and deletion
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { createParkingThunk, updateParkingThunk, deleteParkingThunk } from '../../store/slices/parkingSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Input from '../../components/Common/Input';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { ParkingType, ParkingTypeLabels, AMENITIES, ListingCategory, ListingCategoryLabels, EvPricingMode } from '../../utils/constants';
import { fileUploadService } from '../../services/api/fileUploadService';
import posthogService, { AnalyticsEvents } from '../../services/analytics/posthogService';

const CreateParkingScreen = ({ navigation, route }) => {
    const editData = route?.params?.editData;
    const isEditing = !!editData;

    const dispatch = useDispatch();
    const { createLoading, loading: parkingLoading } = useSelector((s) => s.parking);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        latitude: 0,
        longitude: 0,
        totalSpots: '',
        parkingType: ParkingType.Open,
        listingCategory: ListingCategory.Commercial,
        hourlyRate: '',
        dailyRate: '',
        weeklyRate: '',
        monthlyRate: '',
        is24Hours: true,
        instantBook: false,
        isLprEnabled: false,
        hasEvCharging: false,
        evChargerCount: '1',
        evPricingMode: EvPricingMode.PerHour,
        evRatePerKwh: '18',
        evChargingRatePerHour: '30',
        evIdleRatePerHour: '0',
        evIdleGraceMinutes: '15',
        isDynamicPricingEnabled: false,
        dynamicMinMultiplier: '0.8',
        dynamicMaxMultiplier: '1.75',
        peakHourMultiplier: '1.25',
        weekendMultiplier: '1.15',
        isBayGuidanceEnabled: false,
        defaultFacilityLevel: '',
        defaultFacilityZone: '',
        indoorGuidanceNotes: '',
        isValetEnabled: false,
        valetFee: '',
        amenities: [],
        imageUrls: [],
    });

    const [photoInput, setPhotoInput] = useState('');

    useEffect(() => {
        if (editData) {
            setFormData({
                title: editData.title || '',
                description: editData.description || '',
                address: editData.address || '',
                city: editData.city || '',
                state: editData.state || '',
                zipCode: editData.zipCode || '',
                latitude: editData.latitude || 0,
                longitude: editData.longitude || 0,
                totalSpots: editData.totalSpots ? editData.totalSpots.toString() : '',
                parkingType: editData.parkingType ?? ParkingType.Open,
                listingCategory: editData.listingCategory ?? ListingCategory.Commercial,
                hourlyRate: editData.hourlyRate ? editData.hourlyRate.toString() : '',
                dailyRate: editData.dailyRate ? editData.dailyRate.toString() : '',
                weeklyRate: editData.weeklyRate ? editData.weeklyRate.toString() : '',
                monthlyRate: editData.monthlyRate ? editData.monthlyRate.toString() : '',
                is24Hours: editData.is24Hours ?? true,
                instantBook: editData.instantBook ?? false,
                isLprEnabled: editData.isLprEnabled ?? false,
                hasEvCharging: editData.hasEvCharging ?? false,
                evChargerCount: editData.evChargerCount ? editData.evChargerCount.toString() : '1',
                evPricingMode: editData.evPricingMode ?? EvPricingMode.PerHour,
                evRatePerKwh: editData.evRatePerKwh ? editData.evRatePerKwh.toString() : '18',
                evChargingRatePerHour: editData.evChargingRatePerHour ? editData.evChargingRatePerHour.toString() : '30',
                evIdleRatePerHour: editData.evIdleRatePerHour ? editData.evIdleRatePerHour.toString() : '0',
                evIdleGraceMinutes: editData.evIdleGraceMinutes ? editData.evIdleGraceMinutes.toString() : '15',
                isDynamicPricingEnabled: editData.isDynamicPricingEnabled ?? false,
                dynamicMinMultiplier: editData.dynamicMinMultiplier ? editData.dynamicMinMultiplier.toString() : '0.8',
                dynamicMaxMultiplier: editData.dynamicMaxMultiplier ? editData.dynamicMaxMultiplier.toString() : '1.75',
                peakHourMultiplier: editData.peakHourMultiplier ? editData.peakHourMultiplier.toString() : '1.25',
                weekendMultiplier: editData.weekendMultiplier ? editData.weekendMultiplier.toString() : '1.15',
                isBayGuidanceEnabled: editData.isBayGuidanceEnabled ?? false,
                defaultFacilityLevel: editData.defaultFacilityLevel || '',
                defaultFacilityZone: editData.defaultFacilityZone || '',
                indoorGuidanceNotes: editData.indoorGuidanceNotes || '',
                isValetEnabled: editData.isValetEnabled ?? false,
                valetFee: editData.valetFee ? editData.valetFee.toString() : '',
                amenities: editData.amenities || [],
                imageUrls: editData.imageUrls || (editData.imageUrl ? [editData.imageUrl] : []),
            });
        }
    }, [editData]);

    const updateField = (field) => (value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const toggleAmenity = (amenity) => {
        setFormData((prev) => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter((a) => a !== amenity)
                : [...prev.amenities, amenity],
        }));
    };

    const handleAddPhoto = () => {
        if (!photoInput.trim()) return;
        setFormData((prev) => ({
            ...prev,
            imageUrls: [...prev.imageUrls, photoInput.trim()],
        }));
        setPhotoInput('');
    };

    const handleRemovePhoto = (index) => {
        setFormData((prev) => ({
            ...prev,
            imageUrls: prev.imageUrls.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = useCallback(async () => {
        if (!formData.title || !formData.address || !formData.city || !formData.totalSpots || !formData.hourlyRate) {
            Alert.alert('Required Fields', 'Please fill in all required fields');
            return;
        }

        const payload = {
            ...formData,
            totalSpots: parseInt(formData.totalSpots, 10),
            hourlyRate: parseFloat(formData.hourlyRate),
            dailyRate: parseFloat(formData.dailyRate) || 0,
            weeklyRate: parseFloat(formData.weeklyRate) || 0,
            monthlyRate: parseFloat(formData.monthlyRate) || 0,
            evChargerCount: formData.hasEvCharging ? parseInt(formData.evChargerCount, 10) || 1 : undefined,
            evRatePerKwh: formData.hasEvCharging ? parseFloat(formData.evRatePerKwh) || 0 : undefined,
            evChargingRatePerHour: formData.hasEvCharging ? parseFloat(formData.evChargingRatePerHour) || 0 : undefined,
            evIdleRatePerHour: formData.hasEvCharging ? parseFloat(formData.evIdleRatePerHour) || 0 : undefined,
            evIdleGraceMinutes: formData.hasEvCharging ? parseInt(formData.evIdleGraceMinutes, 10) || 15 : undefined,
            dynamicMinMultiplier: formData.isDynamicPricingEnabled ? parseFloat(formData.dynamicMinMultiplier) || 0.8 : undefined,
            dynamicMaxMultiplier: formData.isDynamicPricingEnabled ? parseFloat(formData.dynamicMaxMultiplier) || 1.75 : undefined,
            peakHourMultiplier: formData.isDynamicPricingEnabled ? parseFloat(formData.peakHourMultiplier) || 1.25 : undefined,
            weekendMultiplier: formData.isDynamicPricingEnabled ? parseFloat(formData.weekendMultiplier) || 1.15 : undefined,
            valetFee: formData.isValetEnabled ? parseFloat(formData.valetFee) || 0 : undefined,
        };

        if (isEditing) {
            const result = await dispatch(updateParkingThunk({ id: editData.id, data: payload }));
            if (!result.error) {
                posthogService.trackEvent(AnalyticsEvents.LISTING_UPDATED, {
                    id: editData.id,
                    title: payload.title,
                });
                Alert.alert('Success', 'Parking space updated!', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert('Error', result.payload || 'Failed to update space');
            }
        } else {
            const result = await dispatch(createParkingThunk(payload));
            if (!result.error) {
                posthogService.trackEvent(AnalyticsEvents.LISTING_CREATED, {
                    title: payload.title,
                    city: payload.city,
                    totalSpots: payload.totalSpots,
                    hourlyRate: payload.hourlyRate,
                    hasEvCharging: Boolean(payload.hasEvCharging),
                    instantBook: Boolean(payload.instantBook),
                    isLprEnabled: Boolean(payload.isLprEnabled),
                });
                Alert.alert('Success', 'Parking space created!', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                Alert.alert('Error', result.payload || 'Failed to create space');
            }
        }
    }, [dispatch, formData, isEditing, editData, navigation]);

    const handleDelete = () => {
        if (!editData) return;
        Alert.alert(
            'Delete Parking Space',
            'Are you sure you want to permanently delete this parking space?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const res = await dispatch(deleteParkingThunk(editData.id));
                        if (!res.error) {
                            Alert.alert('Deleted', 'Parking space has been deleted.', [
                                { text: 'OK', onPress: () => navigation.navigate('VendorDashboard') }
                            ]);
                        } else {
                            Alert.alert('Error', res.payload || 'Failed to delete listing.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScreenLayout keyboardAvoiding={false}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 120 }}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{isEditing ? 'Edit Parking Space' : 'New Parking Space'}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                <View style={styles.content}>
                    {/* Basic Info */}
                    <Card>
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                        <Input label="Title *" value={formData.title} onChangeText={updateField('title')} placeholder="e.g. Downtown Parking Garage" leftIcon="car-sport-outline" />
                        <Input label="Description" value={formData.description} onChangeText={updateField('description')} placeholder="Describe your parking space" multiline numberOfLines={3} />
                        <Input label="Total Spots *" value={formData.totalSpots} onChangeText={updateField('totalSpots')} placeholder="Number of spots" keyboardType="numeric" leftIcon="grid-outline" />
                    </Card>

                    {/* Location */}
                    <Card>
                        <Text style={styles.sectionTitle}>Location</Text>
                        <Input label="Address *" value={formData.address} onChangeText={updateField('address')} placeholder="Street address" leftIcon="location-outline" />
                        <View style={styles.row}>
                            <Input label="City *" value={formData.city} onChangeText={updateField('city')} placeholder="City" containerStyle={styles.halfInput} />
                            <Input label="State" value={formData.state} onChangeText={updateField('state')} placeholder="State" containerStyle={styles.halfInput} />
                        </View>
                        <Input label="Zip Code" value={formData.zipCode} onChangeText={updateField('zipCode')} placeholder="Zip code" keyboardType="numeric" />
                    </Card>

                    {/* Type */}
                    <Card>
                        <Text style={styles.sectionTitle}>Parking Type</Text>
                        <View style={styles.chipRow}>
                            {Object.entries(ParkingTypeLabels).map(([value, label]) => (
                                <TouchableOpacity
                                    key={value}
                                    onPress={() => setFormData((prev) => ({ ...prev, parkingType: Number(value) }))}
                                    style={[styles.chip, formData.parkingType === Number(value) && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, formData.parkingType === Number(value) && styles.chipTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    {/* Category & Smart Access Policy */}
                    <Card>
                        <Text style={styles.sectionTitle}>Category & Smart Access</Text>
                        <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Listing Category</Text>
                        <View style={styles.chipRow}>
                            {Object.entries(ListingCategoryLabels).map(([value, label]) => (
                                <TouchableOpacity
                                    key={value}
                                    onPress={() => setFormData((prev) => ({ ...prev, listingCategory: Number(value) }))}
                                    style={[styles.chip, formData.listingCategory === Number(value) && styles.chipActive]}
                                >
                                    <Text style={[styles.chipText, formData.listingCategory === Number(value) && styles.chipTextActive]}>{label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                            <TouchableOpacity
                                style={styles.toggleRow}
                                onPress={() => setFormData((prev) => ({ ...prev, instantBook: !prev.instantBook }))}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.toggleTitle}>⚡ Instant Booking</Text>
                                    <Text style={styles.toggleSubtitle}>Drivers confirm reservations immediately without host approval</Text>
                                </View>
                                <Ionicons name={formData.instantBook ? 'checkbox' : 'square-outline'} size={24} color={formData.instantBook ? colors.primary : colors.textTertiary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.toggleRow}
                                onPress={() => setFormData((prev) => ({ ...prev, isLprEnabled: !prev.isLprEnabled }))}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.toggleTitle}>📷 Ticketless LPR Access</Text>
                                    <Text style={styles.toggleSubtitle}>Barrier camera validates registered license plates automatically</Text>
                                </View>
                                <Ionicons name={formData.isLprEnabled ? 'checkbox' : 'square-outline'} size={24} color={formData.isLprEnabled ? colors.primary : colors.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    </Card>

                    {/* EV Charging Station Configuration */}
                    <Card>
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => setFormData((prev) => ({ ...prev, hasEvCharging: !prev.hasEvCharging }))}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>⚡ Electric Vehicle (EV) Charging</Text>
                                <Text style={styles.toggleSubtitle}>Enable fast charging equipment for EV motorists</Text>
                            </View>
                            <Ionicons name={formData.hasEvCharging ? 'checkbox' : 'square-outline'} size={24} color={formData.hasEvCharging ? colors.primary : colors.textTertiary} />
                        </TouchableOpacity>

                        {formData.hasEvCharging && (
                            <View style={{ marginTop: spacing.md }}>
                                <Input label="Charger Bays Count" value={formData.evChargerCount} onChangeText={updateField('evChargerCount')} keyboardType="numeric" placeholder="e.g. 2" />
                                <View style={styles.row}>
                                    <Input label="Rate / kWh (₹)" value={formData.evRatePerKwh} onChangeText={updateField('evRatePerKwh')} keyboardType="decimal-pad" containerStyle={styles.halfInput} />
                                    <Input label="Rate / Hour (₹)" value={formData.evChargingRatePerHour} onChangeText={updateField('evChargingRatePerHour')} keyboardType="decimal-pad" containerStyle={styles.halfInput} />
                                </View>
                                <View style={styles.row}>
                                    <Input label="Idle Fee / hr (₹)" value={formData.evIdleRatePerHour} onChangeText={updateField('evIdleRatePerHour')} keyboardType="decimal-pad" containerStyle={styles.halfInput} />
                                    <Input label="Idle Grace (mins)" value={formData.evIdleGraceMinutes} onChangeText={updateField('evIdleGraceMinutes')} keyboardType="numeric" containerStyle={styles.halfInput} />
                                </View>
                            </View>
                        )}
                    </Card>

                    {/* Dynamic Pricing Setup */}
                    <Card>
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => setFormData((prev) => ({ ...prev, isDynamicPricingEnabled: !prev.isDynamicPricingEnabled }))}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>📈 Dynamic Smart Pricing</Text>
                                <Text style={styles.toggleSubtitle}>Automatically scale hourly price according to demand and peak hours</Text>
                            </View>
                            <Ionicons name={formData.isDynamicPricingEnabled ? 'checkbox' : 'square-outline'} size={24} color={formData.isDynamicPricingEnabled ? colors.primary : colors.textTertiary} />
                        </TouchableOpacity>

                        {formData.isDynamicPricingEnabled && (
                            <View style={{ marginTop: spacing.md }}>
                                <View style={styles.row}>
                                    <Input label="Min Multiplier" value={formData.dynamicMinMultiplier} onChangeText={updateField('dynamicMinMultiplier')} keyboardType="decimal-pad" placeholder="0.8" containerStyle={styles.halfInput} />
                                    <Input label="Max Multiplier" value={formData.dynamicMaxMultiplier} onChangeText={updateField('dynamicMaxMultiplier')} keyboardType="decimal-pad" placeholder="1.75" containerStyle={styles.halfInput} />
                                </View>
                                <View style={styles.row}>
                                    <Input label="Peak Hour Multiplier" value={formData.peakHourMultiplier} onChangeText={updateField('peakHourMultiplier')} keyboardType="decimal-pad" placeholder="1.25" containerStyle={styles.halfInput} />
                                    <Input label="Weekend Multiplier" value={formData.weekendMultiplier} onChangeText={updateField('weekendMultiplier')} keyboardType="decimal-pad" placeholder="1.15" containerStyle={styles.halfInput} />
                                </View>
                            </View>
                        )}
                    </Card>

                    {/* Indoor Bay Guidance & Valet */}
                    <Card>
                        <Text style={styles.sectionTitle}>Facility Guidance & Valet</Text>
                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => setFormData((prev) => ({ ...prev, isBayGuidanceEnabled: !prev.isBayGuidanceEnabled }))}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleTitle}>📍 Indoor Bay Guidance</Text>
                                <Text style={styles.toggleSubtitle}>Provide drivers floor level and zone navigation</Text>
                            </View>
                            <Ionicons name={formData.isBayGuidanceEnabled ? 'checkbox' : 'square-outline'} size={24} color={formData.isBayGuidanceEnabled ? colors.primary : colors.textTertiary} />
                        </TouchableOpacity>

                        {formData.isBayGuidanceEnabled && (
                            <View style={{ marginTop: spacing.md }}>
                                <View style={styles.row}>
                                    <Input label="Default Level" value={formData.defaultFacilityLevel} onChangeText={updateField('defaultFacilityLevel')} placeholder="e.g. B2" containerStyle={styles.halfInput} />
                                    <Input label="Default Zone" value={formData.defaultFacilityZone} onChangeText={updateField('defaultFacilityZone')} placeholder="e.g. Blue" containerStyle={styles.halfInput} />
                                </View>
                                <Input label="Guidance Notes" value={formData.indoorGuidanceNotes} onChangeText={updateField('indoorGuidanceNotes')} placeholder="e.g. Enter ramp 2, follow blue signs" />
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.toggleRow, { marginTop: spacing.md }]}
                            onPress={() => setFormData((prev) => ({ ...prev, isValetEnabled: !prev.isValetEnabled }))}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.toggleTitle}>👔 Valet Service</Text>
                                <Text style={styles.toggleSubtitle}>Provide attendant curbside vehicle retrieval</Text>
                            </View>
                            <Ionicons name={formData.isValetEnabled ? 'checkbox' : 'square-outline'} size={24} color={formData.isValetEnabled ? colors.primary : colors.textTertiary} />
                        </TouchableOpacity>

                        {formData.isValetEnabled && (
                            <View style={{ marginTop: spacing.sm }}>
                                <Input label="Valet Fee (₹)" value={formData.valetFee} onChangeText={updateField('valetFee')} keyboardType="decimal-pad" placeholder="0.00 for free" />
                            </View>
                        )}
                    </Card>

                    {/* Pricing */}
                    <Card>
                        <Text style={styles.sectionTitle}>Pricing (₹)</Text>
                        <View style={styles.row}>
                            <Input label="Hourly Rate *" value={formData.hourlyRate} onChangeText={updateField('hourlyRate')} placeholder="0.00" keyboardType="decimal-pad" leftIcon="time-outline" containerStyle={styles.halfInput} />
                            <Input label="Daily Rate" value={formData.dailyRate} onChangeText={updateField('dailyRate')} placeholder="0.00" keyboardType="decimal-pad" leftIcon="calendar-outline" containerStyle={styles.halfInput} />
                        </View>
                        <View style={styles.row}>
                            <Input label="Weekly Rate" value={formData.weeklyRate} onChangeText={updateField('weeklyRate')} placeholder="0.00" keyboardType="decimal-pad" containerStyle={styles.halfInput} />
                            <Input label="Monthly Rate" value={formData.monthlyRate} onChangeText={updateField('monthlyRate')} placeholder="0.00" keyboardType="decimal-pad" containerStyle={styles.halfInput} />
                        </View>
                    </Card>

                    {/* Listing Photos */}
                    <Card>
                        <Text style={styles.sectionTitle}>Listing Photos</Text>
                        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                            <Input
                                value={photoInput}
                                onChangeText={setPhotoInput}
                                placeholder="Paste image URL (https://...)"
                                style={{ flex: 1, marginBottom: 0 }}
                            />
                            <Button
                                title="Add"
                                onPress={handleAddPhoto}
                                size="sm"
                                variant="secondary"
                            />
                        </View>
                        {formData.imageUrls.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
                                {formData.imageUrls.map((url, idx) => (
                                    <View key={idx} style={styles.photoThumbContainer}>
                                        <Image source={{ uri: url }} style={styles.photoThumb} />
                                        <TouchableOpacity
                                            onPress={() => handleRemovePhoto(idx)}
                                            style={styles.photoDeleteBtn}
                                        >
                                            <Ionicons name="close" size={14} color={colors.white} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs }}>
                                Add high-resolution photos so drivers can find your parking facility.
                            </Text>
                        )}
                    </Card>

                    {/* Amenities */}
                    <Card>
                        <Text style={styles.sectionTitle}>Amenities</Text>
                        <View style={styles.chipRow}>
                            {AMENITIES.map((amenity) => {
                                const active = formData.amenities.includes(amenity);
                                return (
                                    <TouchableOpacity
                                        key={amenity}
                                        onPress={() => toggleAmenity(amenity)}
                                        style={[styles.chip, active && styles.chipActive]}
                                    >
                                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{amenity}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Card>

                    {/* Submit */}
                    <Button
                        title={isEditing ? 'Save Changes' : 'Create Space'}
                        onPress={handleSubmit}
                        loading={createLoading || parkingLoading}
                        style={styles.submitBtn}
                        icon={<Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={colors.white} />}
                    />

                    {/* Delete Space Button if editing */}
                    {isEditing && (
                        <Button
                            title="Delete Parking Space"
                            onPress={handleDelete}
                            variant="danger"
                            style={{ marginTop: spacing.sm }}
                            icon={<Ionicons name="trash-outline" size={20} color={colors.white} />}
                        />
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.base },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', ...shadows.sm },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing['3xl'] },
    sectionTitle: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.md },
    row: { flexDirection: 'row', gap: spacing.md },
    halfInput: { flex: 1 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: spacing.radius.full, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
    chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
    chipTextActive: { color: colors.primary, fontWeight: '600' },
    photoThumbContainer: { position: 'relative', marginRight: spacing.sm },
    photoThumb: { width: 80, height: 80, borderRadius: spacing.radius.md, backgroundColor: colors.borderLight },
    photoDeleteBtn: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center' },
    submitBtn: { marginTop: spacing.base },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
    toggleTitle: { ...typography.bodySmall, fontWeight: '600', color: colors.textPrimary },
    toggleSubtitle: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
});

export default CreateParkingScreen;
