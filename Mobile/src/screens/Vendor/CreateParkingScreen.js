/**
 * CreateParkingScreen
 * Modern Apple HIG-compliant multi-step wizard to create or edit a parking space.
 * Features progressive disclosure, native toggles, guaranteed tap targets, and real-time preview.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    Image,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { createParkingThunk, updateParkingThunk, deleteParkingThunk } from '../../store/slices/parkingSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Input from '../../components/Common/Input';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import {
    ParkingType,
    ParkingTypeLabels,
    AMENITIES,
    ListingCategory,
    ListingCategoryLabels,
    EvPricingMode,
} from '../../utils/constants';
import posthogService, { AnalyticsEvents } from '../../services/analytics/posthogService';

const STEPS = [
    { id: 1, label: 'Basics', fullLabel: 'Property & Location', icon: 'location-outline' },
    { id: 2, label: 'Access', fullLabel: 'Smart Access & Specs', icon: 'key-outline' },
    { id: 3, label: 'Pricing', fullLabel: 'Pricing & Rates', icon: 'cash-outline' },
    { id: 4, label: 'Review', fullLabel: 'Photos & Amenities', icon: 'images-outline' },
];

const PARKING_TYPE_ICONS = {
    [ParkingType.Open]: 'sunny-outline',
    [ParkingType.Covered]: 'umbrella-outline',
    [ParkingType.Garage]: 'business-outline',
    [ParkingType.Street]: 'car-outline',
    [ParkingType.Underground]: 'arrow-down-circle-outline',
};

const CATEGORY_ICONS = {
    [ListingCategory.Standard]: 'business-outline',
    [ListingCategory.ResidentialDriveway]: 'home-outline',
    [ListingCategory.GatedSociety]: 'shield-outline',
    [ListingCategory.DedicatedCommercial]: 'briefcase-outline',
    [ListingCategory.EventLot]: 'ticket-outline',
};

const AMENITY_ICONS = {
    'CCTV': 'videocam-outline',
    'Security Guard': 'shield-checkmark-outline',
    'EV Charging': 'flash-outline',
    'Covered Parking': 'umbrella-outline',
    'Wheelchair Accessible': 'accessibility-outline',
    'Restroom': 'water-outline',
    'Lighting': 'bulb-outline',
    'Valet': 'car-sport-outline',
    'Car Wash': 'sparkles-outline',
    'Air Pump': 'speedometer-outline',
};

const QUICK_SPOTS = ['1', '2', '5', '10', '25', '50'];

const CreateParkingScreen = ({ navigation, route }) => {
    const editData = route?.params?.editData;
    const isEditing = !!editData;

    const dispatch = useDispatch();
    const { createLoading, loading: parkingLoading } = useSelector((s) => s.parking);
    const scrollViewRef = useRef(null);

    const [activeStep, setActiveStep] = useState(1);
    const [viewMode, setViewMode] = useState('all'); // 'steps' | 'all'

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

    const handleStepChange = (stepId) => {
        setActiveStep(stepId);
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const isStepComplete = (stepId) => {
        switch (stepId) {
            case 1:
                return Boolean(formData.title.trim() && formData.totalSpots && formData.address.trim() && formData.city.trim());
            case 2:
                return true;
            case 3:
                return Boolean(formData.hourlyRate);
            case 4:
                return formData.imageUrls.length > 0 || formData.amenities.length > 0;
            default:
                return false;
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!formData.title || !formData.address || !formData.city || !formData.totalSpots || !formData.hourlyRate) {
            if (!formData.title || !formData.address || !formData.city || !formData.totalSpots) {
                setActiveStep(1);
            } else if (!formData.hourlyRate) {
                setActiveStep(3);
            }
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>{isEditing ? 'Edit Parking Space' : 'New Parking Space'}</Text>
                        <Text style={styles.headerSubtitle}>
                            Step {activeStep} of 4 • {STEPS[activeStep - 1]?.label}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setViewMode((m) => (m === 'steps' ? 'all' : 'steps'))}
                        style={styles.viewModeToggle}
                    >
                        <Ionicons
                            name={viewMode === 'steps' ? 'list-outline' : 'albums-outline'}
                            size={18}
                            color={colors.primary}
                        />
                        <Text style={styles.viewModeText}>{viewMode === 'steps' ? 'All' : 'Steps'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Apple HIG Segmented Step Bar */}
                <View style={styles.stepperContainer}>
                    <View style={styles.progressBarBackground}>
                        <View style={[styles.progressBarFill, { width: `${(activeStep / 4) * 100}%` }]} />
                    </View>
                    <View style={styles.stepTabsRow}>
                        {STEPS.map((step) => {
                            const isActive = activeStep === step.id;
                            const isComplete = isStepComplete(step.id);
                            return (
                                <TouchableOpacity
                                    key={step.id}
                                    onPress={() => handleStepChange(step.id)}
                                    style={[styles.stepTab, isActive && styles.stepTabActive]}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.stepTabIconContainer, isActive && styles.stepTabIconActive, isComplete && !isActive && styles.stepTabIconComplete]}>
                                        <Ionicons
                                            name={isComplete && !isActive ? 'checkmark' : step.icon}
                                            size={14}
                                            color={isActive ? colors.white : isComplete ? colors.success : colors.textTertiary}
                                        />
                                    </View>
                                    <Text style={[styles.stepTabText, isActive && styles.stepTabTextActive]}>
                                        {step.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                <ScrollView
                    ref={scrollViewRef}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 140 }}
                >
                    <View style={styles.content}>
                        {/* ========================================================= */}
                        {/* STEP 1: PROPERTY BASICS & LOCATION */}
                        {/* ========================================================= */}
                        <View style={viewMode === 'all' || activeStep === 1 ? styles.stepVisible : styles.stepHidden}>
                            {/* Basic Info */}
                            <Card>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardHeaderIcon, { backgroundColor: '#EFF6FF' }]}>
                                        <Ionicons name="business-outline" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sectionTitle}>Property Basics</Text>
                                        <Text style={styles.sectionSubtitle}>Essential details about your parking facility</Text>
                                    </View>
                                </View>

                                <Input
                                    label="Title *"
                                    value={formData.title}
                                    onChangeText={updateField('title')}
                                    placeholder="e.g. Downtown Parking Garage"
                                    leftIcon="car-sport-outline"
                                />

                                <Input
                                    label="Total Spots *"
                                    value={formData.totalSpots}
                                    onChangeText={updateField('totalSpots')}
                                    placeholder="Number of spots"
                                    keyboardType="numeric"
                                    leftIcon="grid-outline"
                                />

                                {/* Quick Spots Selector */}
                                <View style={styles.quickSpotsRow}>
                                    <Text style={styles.quickLabel}>Quick spots:</Text>
                                    {QUICK_SPOTS.map((num) => (
                                        <TouchableOpacity
                                            key={num}
                                            onPress={() => updateField('totalSpots')(num)}
                                            style={[styles.quickSpotChip, formData.totalSpots === num && styles.quickSpotChipActive]}
                                        >
                                            <Text style={[styles.quickSpotText, formData.totalSpots === num && styles.quickSpotTextActive]}>
                                                {num}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.sm }]}>
                                    Parking Type
                                </Text>
                                <View style={styles.typeGrid}>
                                    {Object.entries(ParkingTypeLabels).map(([value, label]) => {
                                        const isSelected = formData.parkingType === Number(value);
                                        const iconName = PARKING_TYPE_ICONS[Number(value)] || 'car-outline';
                                        return (
                                            <TouchableOpacity
                                                key={value}
                                                onPress={() => setFormData((prev) => ({ ...prev, parkingType: Number(value) }))}
                                                style={[styles.typeCard, isSelected && styles.typeCardActive]}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={iconName}
                                                    size={18}
                                                    color={isSelected ? colors.primary : colors.textSecondary}
                                                />
                                                <Text style={[styles.typeCardText, isSelected && styles.typeCardTextActive]}>
                                                    {label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Input
                                    label="Description"
                                    value={formData.description}
                                    onChangeText={updateField('description')}
                                    placeholder="Describe your parking space, clearance height, gate access rules, etc."
                                    multiline
                                    numberOfLines={3}
                                    style={{ marginTop: spacing.sm }}
                                />
                            </Card>

                            {/* Location */}
                            <Card>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardHeaderIcon, { backgroundColor: '#F0FDF4' }]}>
                                        <Ionicons name="location-outline" size={20} color={colors.success} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sectionTitle}>Location & Address</Text>
                                        <Text style={styles.sectionSubtitle}>Where drivers will park their vehicles</Text>
                                    </View>
                                </View>

                                <Input
                                    label="Address *"
                                    value={formData.address}
                                    onChangeText={updateField('address')}
                                    placeholder="Street address"
                                    leftIcon="location-outline"
                                />

                                <View style={styles.row}>
                                    <Input
                                        label="City *"
                                        value={formData.city}
                                        onChangeText={updateField('city')}
                                        placeholder="City"
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                    <Input
                                        label="State"
                                        value={formData.state}
                                        onChangeText={updateField('state')}
                                        placeholder="State"
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                </View>

                                <Input
                                    label="Zip Code"
                                    value={formData.zipCode}
                                    onChangeText={updateField('zipCode')}
                                    placeholder="Zip code"
                                    keyboardType="numeric"
                                />
                            </Card>
                        </View>

                        {/* ========================================================= */}
                        {/* STEP 2: CATEGORY & SMART ACCESS FEATURES */}
                        {/* ========================================================= */}
                        <View style={viewMode === 'all' || activeStep === 2 ? styles.stepVisible : styles.stepHidden}>
                            {/* Category & Smart Access Policy */}
                            <Card>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardHeaderIcon, { backgroundColor: '#FDF2F8' }]}>
                                        <Ionicons name="key-outline" size={20} color="#DB2777" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sectionTitle}>Category & Smart Access</Text>
                                        <Text style={styles.sectionSubtitle}>Listing classification and entry policies</Text>
                                    </View>
                                </View>

                                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
                                    Listing Category
                                </Text>
                                <View style={styles.categoryRow}>
                                    {Object.entries(ListingCategoryLabels).map(([value, label]) => {
                                        const isSelected = formData.listingCategory === Number(value);
                                        const iconName = CATEGORY_ICONS[Number(value)] || 'business-outline';
                                        return (
                                            <TouchableOpacity
                                                key={value}
                                                onPress={() => setFormData((prev) => ({ ...prev, listingCategory: Number(value) }))}
                                                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={iconName}
                                                    size={16}
                                                    color={isSelected ? colors.primary : colors.textSecondary}
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                                                    {label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <View style={styles.toggleCardList}>
                                    <View style={styles.toggleCardRow}>
                                        <View style={[styles.toggleIconBadge, { backgroundColor: '#FEF3C7' }]}>
                                            <Ionicons name="flash-outline" size={18} color="#D97706" />
                                        </View>
                                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                                            <Text style={styles.toggleTitle}>⚡ Instant Booking</Text>
                                            <Text style={styles.toggleSubtitle}>Drivers confirm reservations immediately without host approval</Text>
                                        </View>
                                        <Switch
                                            value={formData.instantBook}
                                            onValueChange={(val) => setFormData((prev) => ({ ...prev, instantBook: val }))}
                                            trackColor={{ false: colors.border, true: colors.primaryLight }}
                                            thumbColor={formData.instantBook ? colors.primary : colors.surface}
                                        />
                                    </View>

                                    <View style={styles.divider} />

                                    <View style={styles.toggleCardRow}>
                                        <View style={[styles.toggleIconBadge, { backgroundColor: '#E0E7FF' }]}>
                                            <Ionicons name="camera-outline" size={18} color="#4338CA" />
                                        </View>
                                        <View style={{ flex: 1, paddingRight: spacing.sm }}>
                                            <Text style={styles.toggleTitle}>📷 Ticketless LPR Access</Text>
                                            <Text style={styles.toggleSubtitle}>Barrier camera validates registered license plates automatically</Text>
                                        </View>
                                        <Switch
                                            value={formData.isLprEnabled}
                                            onValueChange={(val) => setFormData((prev) => ({ ...prev, isLprEnabled: val }))}
                                            trackColor={{ false: colors.border, true: colors.primaryLight }}
                                            thumbColor={formData.isLprEnabled ? colors.primary : colors.surface}
                                        />
                                    </View>
                                </View>
                            </Card>

                            {/* EV Charging Station Configuration */}
                            <Card>
                                <View style={styles.toggleCardRow}>
                                    <View style={[styles.toggleIconBadge, { backgroundColor: '#DCFCE7' }]}>
                                        <Ionicons name="battery-charging-outline" size={20} color={colors.success} />
                                    </View>
                                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                                        <Text style={styles.sectionTitle}>⚡ Electric Vehicle (EV) Charging</Text>
                                        <Text style={styles.toggleSubtitle}>Enable fast charging equipment for EV motorists</Text>
                                    </View>
                                    <Switch
                                        value={formData.hasEvCharging}
                                        onValueChange={(val) => setFormData((prev) => ({ ...prev, hasEvCharging: val }))}
                                        trackColor={{ false: colors.border, true: colors.primaryLight }}
                                        thumbColor={formData.hasEvCharging ? colors.primary : colors.surface}
                                    />
                                </View>

                                {formData.hasEvCharging && (
                                    <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md }}>
                                        <Input
                                            label="Charger Bays Count"
                                            value={formData.evChargerCount}
                                            onChangeText={updateField('evChargerCount')}
                                            keyboardType="numeric"
                                            placeholder="e.g. 2"
                                        />
                                        <View style={styles.row}>
                                            <Input
                                                label="Rate / kWh (₹)"
                                                value={formData.evRatePerKwh}
                                                onChangeText={updateField('evRatePerKwh')}
                                                keyboardType="decimal-pad"
                                                prefix="₹"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Rate / Hour (₹)"
                                                value={formData.evChargingRatePerHour}
                                                onChangeText={updateField('evChargingRatePerHour')}
                                                keyboardType="decimal-pad"
                                                prefix="₹"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                        </View>
                                        <View style={styles.row}>
                                            <Input
                                                label="Idle Fee / hr (₹)"
                                                value={formData.evIdleRatePerHour}
                                                onChangeText={updateField('evIdleRatePerHour')}
                                                keyboardType="decimal-pad"
                                                prefix="₹"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Idle Grace (mins)"
                                                value={formData.evIdleGraceMinutes}
                                                onChangeText={updateField('evIdleGraceMinutes')}
                                                keyboardType="numeric"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                        </View>
                                    </View>
                                )}
                            </Card>

                            {/* Indoor Bay Guidance & Valet */}
                            <Card>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardHeaderIcon, { backgroundColor: '#FEF3C7' }]}>
                                        <Ionicons name="navigate-outline" size={20} color="#B45309" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sectionTitle}>Facility Guidance & Valet</Text>
                                        <Text style={styles.sectionSubtitle}>Indoor wayfinding and premium vehicle handling</Text>
                                    </View>
                                </View>

                                <View style={styles.toggleCardRow}>
                                    <View style={[styles.toggleIconBadge, { backgroundColor: '#EFF6FF' }]}>
                                        <Ionicons name="pin-outline" size={18} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                                        <Text style={styles.toggleTitle}>📍 Indoor Bay Guidance</Text>
                                        <Text style={styles.toggleSubtitle}>Provide drivers floor level and zone navigation</Text>
                                    </View>
                                    <Switch
                                        value={formData.isBayGuidanceEnabled}
                                        onValueChange={(val) => setFormData((prev) => ({ ...prev, isBayGuidanceEnabled: val }))}
                                        trackColor={{ false: colors.border, true: colors.primaryLight }}
                                        thumbColor={formData.isBayGuidanceEnabled ? colors.primary : colors.surface}
                                    />
                                </View>

                                {formData.isBayGuidanceEnabled && (
                                    <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md }}>
                                        <View style={styles.row}>
                                            <Input
                                                label="Default Level"
                                                value={formData.defaultFacilityLevel}
                                                onChangeText={updateField('defaultFacilityLevel')}
                                                placeholder="e.g. B2"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Default Zone"
                                                value={formData.defaultFacilityZone}
                                                onChangeText={updateField('defaultFacilityZone')}
                                                placeholder="e.g. Blue"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                        </View>
                                        <Input
                                            label="Guidance Notes"
                                            value={formData.indoorGuidanceNotes}
                                            onChangeText={updateField('indoorGuidanceNotes')}
                                            placeholder="e.g. Enter ramp 2, follow blue signs"
                                        />
                                    </View>
                                )}

                                <View style={styles.divider} />

                                <View style={styles.toggleCardRow}>
                                    <View style={[styles.toggleIconBadge, { backgroundColor: '#F3E8FF' }]}>
                                        <Ionicons name="car-sport-outline" size={18} color="#9333EA" />
                                    </View>
                                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                                        <Text style={styles.toggleTitle}>👔 Valet Service</Text>
                                        <Text style={styles.toggleSubtitle}>Provide attendant curbside vehicle retrieval</Text>
                                    </View>
                                    <Switch
                                        value={formData.isValetEnabled}
                                        onValueChange={(val) => setFormData((prev) => ({ ...prev, isValetEnabled: val }))}
                                        trackColor={{ false: colors.border, true: colors.primaryLight }}
                                        thumbColor={formData.isValetEnabled ? colors.primary : colors.surface}
                                    />
                                </View>

                                {formData.isValetEnabled && (
                                    <View style={{ marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm }}>
                                        <Input
                                            label="Valet Fee (₹)"
                                            value={formData.valetFee}
                                            onChangeText={updateField('valetFee')}
                                            keyboardType="decimal-pad"
                                            prefix="₹"
                                            placeholder="0.00 for free"
                                        />
                                    </View>
                                )}
                            </Card>
                        </View>

                        {/* ========================================================= */}
                        {/* STEP 3: PRICING & REVENUE */}
                        {/* ========================================================= */}
                        <View style={viewMode === 'all' || activeStep === 3 ? styles.stepVisible : styles.stepHidden}>
                            {/* Pricing */}
                            <Card>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardHeaderIcon, { backgroundColor: '#EFF6FF' }]}>
                                        <Ionicons name="cash-outline" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sectionTitle}>Pricing (₹)</Text>
                                        <Text style={styles.sectionSubtitle}>Hourly rate is required. Set tiered rates for longer bookings.</Text>
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <Input
                                        label="Hourly Rate *"
                                        value={formData.hourlyRate}
                                        onChangeText={updateField('hourlyRate')}
                                        placeholder="0.00"
                                        keyboardType="decimal-pad"
                                        leftIcon="time-outline"
                                        prefix="₹"
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                    <Input
                                        label="Daily Rate"
                                        value={formData.dailyRate}
                                        onChangeText={updateField('dailyRate')}
                                        placeholder="0.00"
                                        keyboardType="decimal-pad"
                                        leftIcon="calendar-outline"
                                        prefix="₹"
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                </View>

                                <View style={styles.row}>
                                    <Input
                                        label="Weekly Rate"
                                        value={formData.weeklyRate}
                                        onChangeText={updateField('weeklyRate')}
                                        placeholder="0.00"
                                        keyboardType="decimal-pad"
                                        prefix="₹"
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                    <Input
                                        label="Monthly Rate"
                                        value={formData.monthlyRate}
                                        onChangeText={updateField('monthlyRate')}
                                        placeholder="0.00"
                                        keyboardType="decimal-pad"
                                        prefix="₹"
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                </View>

                                <View style={styles.pricingHintBox}>
                                    <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                                    <Text style={styles.pricingHintText}>
                                        Drivers prefer clear hourly rates. Daily rates are automatically suggested at 8× hourly rate if unconfigured.
                                    </Text>
                                </View>
                            </Card>

                            {/* Dynamic Pricing Setup */}
                            <Card>
                                <View style={styles.toggleCardRow}>
                                    <View style={[styles.toggleIconBadge, { backgroundColor: '#FEF3C7' }]}>
                                        <Ionicons name="trending-up-outline" size={20} color="#D97706" />
                                    </View>
                                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                                        <Text style={styles.sectionTitle}>📈 Dynamic Smart Pricing</Text>
                                        <Text style={styles.toggleSubtitle}>Automatically scale hourly price according to demand and peak hours</Text>
                                    </View>
                                    <Switch
                                        value={formData.isDynamicPricingEnabled}
                                        onValueChange={(val) => setFormData((prev) => ({ ...prev, isDynamicPricingEnabled: val }))}
                                        trackColor={{ false: colors.border, true: colors.primaryLight }}
                                        thumbColor={formData.isDynamicPricingEnabled ? colors.primary : colors.surface}
                                    />
                                </View>

                                {formData.isDynamicPricingEnabled && (
                                    <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md }}>
                                        <View style={styles.row}>
                                            <Input
                                                label="Min Multiplier"
                                                value={formData.dynamicMinMultiplier}
                                                onChangeText={updateField('dynamicMinMultiplier')}
                                                keyboardType="decimal-pad"
                                                placeholder="0.8"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Max Multiplier"
                                                value={formData.dynamicMaxMultiplier}
                                                onChangeText={updateField('dynamicMaxMultiplier')}
                                                keyboardType="decimal-pad"
                                                placeholder="1.75"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                        </View>
                                        <View style={styles.row}>
                                            <Input
                                                label="Peak Hour Multiplier"
                                                value={formData.peakHourMultiplier}
                                                onChangeText={updateField('peakHourMultiplier')}
                                                keyboardType="decimal-pad"
                                                placeholder="1.25"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Weekend Multiplier"
                                                value={formData.weekendMultiplier}
                                                onChangeText={updateField('weekendMultiplier')}
                                                keyboardType="decimal-pad"
                                                placeholder="1.15"
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                        </View>
                                    </View>
                                )}
                            </Card>
                        </View>

                        {/* ========================================================= */}
                        {/* STEP 4: PHOTOS, AMENITIES & REVIEW */}
                        {/* ========================================================= */}
                        <View style={viewMode === 'all' || activeStep === 4 ? styles.stepVisible : styles.stepHidden}>
                            {/* Listing Photos */}
                            <Card>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardHeaderIcon, { backgroundColor: '#EFF6FF' }]}>
                                        <Ionicons name="images-outline" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sectionTitle}>Listing Photos</Text>
                                        <Text style={styles.sectionSubtitle}>Add high-resolution photos so drivers can locate your space</Text>
                                    </View>
                                </View>

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
                                    <View style={styles.emptyPhotoBox}>
                                        <Ionicons name="camera-outline" size={28} color={colors.textTertiary} />
                                        <Text style={styles.emptyPhotoText}>
                                            No photos added yet. Listings with photos receive 3x more bookings!
                                        </Text>
                                    </View>
                                )}
                            </Card>

                            {/* Amenities */}
                            <Card>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardHeaderIcon, { backgroundColor: '#F0FDF4' }]}>
                                        <Ionicons name="sparkles-outline" size={20} color={colors.success} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.sectionTitle}>Amenities</Text>
                                        <Text style={styles.sectionSubtitle}>Select all facilities available on-site</Text>
                                    </View>
                                </View>

                                <View style={styles.amenityGrid}>
                                    {AMENITIES.map((amenity) => {
                                        const active = formData.amenities.includes(amenity);
                                        const iconName = AMENITY_ICONS[amenity] || 'checkmark-circle-outline';
                                        return (
                                            <TouchableOpacity
                                                key={amenity}
                                                onPress={() => toggleAmenity(amenity)}
                                                style={[styles.amenityChip, active && styles.amenityChipActive]}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons
                                                    name={iconName}
                                                    size={16}
                                                    color={active ? colors.primary : colors.textSecondary}
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text style={[styles.amenityChipText, active && styles.amenityChipTextActive]}>
                                                    {amenity}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </Card>

                            {/* Live Listing Preview Card */}
                            <Card style={styles.previewCard}>
                                <View style={styles.previewHeader}>
                                    <Ionicons name="eye-outline" size={18} color={colors.primary} />
                                    <Text style={styles.previewHeaderTitle}>Listing Summary Preview</Text>
                                </View>
                                <View style={styles.previewBody}>
                                    <Text style={styles.previewTitle}>{formData.title || 'Untitled Space'}</Text>
                                    <Text style={styles.previewAddress}>
                                        <Ionicons name="location-sharp" size={13} color={colors.textSecondary} />{' '}
                                        {[formData.address, formData.city, formData.state].filter(Boolean).join(', ') || 'Address not specified'}
                                    </Text>
                                    <View style={styles.previewBadgesRow}>
                                        <View style={styles.previewPill}>
                                            <Text style={styles.previewPillText}>{ParkingTypeLabels[formData.parkingType] || 'Open'}</Text>
                                        </View>
                                        <View style={styles.previewPill}>
                                            <Text style={styles.previewPillText}>{formData.totalSpots || 0} spots</Text>
                                        </View>
                                        {formData.hourlyRate ? (
                                            <View style={[styles.previewPill, { backgroundColor: '#DCFCE7' }]}>
                                                <Text style={[styles.previewPillText, { color: '#15803D' }]}>
                                                    ₹{formData.hourlyRate}/hr
                                                </Text>
                                            </View>
                                        ) : null}
                                        {formData.instantBook && (
                                            <View style={[styles.previewPill, { backgroundColor: '#FEF3C7' }]}>
                                                <Text style={[styles.previewPillText, { color: '#B45309' }]}>⚡ Instant Book</Text>
                                            </View>
                                        )}
                                        {formData.hasEvCharging && (
                                            <View style={[styles.previewPill, { backgroundColor: '#CFFAFE' }]}>
                                                <Text style={[styles.previewPillText, { color: '#0369A1' }]}>⚡ EV Ready</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </Card>

                            {/* Submit and Delete Actions */}
                            <Button
                                title={isEditing ? 'Save Changes' : 'Create Space'}
                                onPress={handleSubmit}
                                loading={createLoading || parkingLoading}
                                style={styles.submitBtn}
                                icon={<Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={colors.white} />}
                            />

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
                    </View>
                </ScrollView>

                {/* Bottom Sticky Navigation Bar (When in Steps Mode) */}
                {viewMode === 'steps' && (
                    <View style={styles.stickyFooter}>
                        {activeStep > 1 && (
                            <Button
                                title="Back"
                                variant="outline"
                                onPress={() => handleStepChange(activeStep - 1)}
                                style={styles.navBackBtn}
                                icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />}
                            />
                        )}
                        {activeStep < 4 ? (
                            <Button
                                title={`Next: ${STEPS[activeStep]?.label}`}
                                onPress={() => handleStepChange(activeStep + 1)}
                                style={styles.navNextBtn}
                                icon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
                            />
                        ) : (
                            <Button
                                title={isEditing ? 'Save Changes' : 'Create Space'}
                                onPress={handleSubmit}
                                loading={createLoading || parkingLoading}
                                style={styles.navNextBtn}
                                icon={<Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={colors.white} />}
                            />
                        )}
                    </View>
                )}
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.sm,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: spacing.xs,
    },
    headerTitle: {
        ...typography.h3,
        fontSize: 18,
        color: colors.textPrimary,
    },
    headerSubtitle: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    viewModeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: spacing.radius.full,
        backgroundColor: colors.primarySoft,
    },
    viewModeText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.primary,
    },

    // Stepper
    stepperContainer: {
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.screenHorizontal,
        paddingTop: spacing.xs,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        ...shadows.sm,
    },
    progressBarBackground: {
        height: 4,
        backgroundColor: colors.borderLight,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: spacing.xs,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    stepTabsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stepTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: spacing.radius.full,
    },
    stepTabActive: {
        backgroundColor: colors.primarySoft,
    },
    stepTabIconContainer: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    stepTabIconActive: {
        backgroundColor: colors.primary,
    },
    stepTabIconComplete: {
        backgroundColor: '#DCFCE7',
    },
    stepTabText: {
        ...typography.caption,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    stepTabTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },

    // Content
    content: {
        paddingHorizontal: spacing.screenHorizontal,
        paddingTop: spacing.md,
    },
    stepVisible: {
        width: '100%',
    },
    stepHidden: {
        display: 'none',
    },

    // Card Header
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    cardHeaderIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        ...typography.label,
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    sectionSubtitle: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 1,
    },

    // Rows and Inputs
    row: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    halfInput: {
        flex: 1,
        minWidth: 0,
    },

    // Quick Spots
    quickSpotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: -spacing.xs,
        marginBottom: spacing.md,
        flexWrap: 'wrap',
    },
    quickLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginRight: 4,
    },
    quickSpotChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: spacing.radius.sm,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    quickSpotChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    quickSpotText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    quickSpotTextActive: {
        color: colors.white,
    },

    // Parking Types Grid
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    typeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: spacing.sm,
        paddingVertical: 10,
        borderRadius: spacing.radius.md,
        backgroundColor: colors.background,
        borderWidth: 1.5,
        borderColor: colors.border,
    },
    typeCardActive: {
        backgroundColor: colors.primarySoft,
        borderColor: colors.primary,
    },
    typeCardText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    typeCardTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },

    // Listing Categories
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: 8,
        borderRadius: spacing.radius.full,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryChipActive: {
        backgroundColor: colors.primarySoft,
        borderColor: colors.primary,
    },
    categoryChipText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    categoryChipTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },

    // Toggle Rows
    toggleCardList: {
        marginTop: spacing.sm,
    },
    toggleCardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    toggleIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    toggleTitle: {
        ...typography.bodySmall,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    toggleSubtitle: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: spacing.sm,
    },

    // Pricing Hints
    pricingHintBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.xs,
        backgroundColor: colors.primarySoft,
        padding: spacing.sm,
        borderRadius: spacing.radius.md,
        marginTop: spacing.xs,
    },
    pricingHintText: {
        ...typography.caption,
        color: colors.primaryDark,
        flex: 1,
        lineHeight: 18,
    },

    // Photos
    photoThumbContainer: {
        position: 'relative',
        marginRight: spacing.sm,
    },
    photoThumb: {
        width: 80,
        height: 80,
        borderRadius: spacing.radius.md,
        backgroundColor: colors.borderLight,
    },
    photoDeleteBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyPhotoBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.base,
        borderWidth: 1.5,
        borderColor: colors.border,
        borderStyle: 'dashed',
        borderRadius: spacing.radius.lg,
        marginTop: spacing.md,
    },
    emptyPhotoText: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.xs,
        lineHeight: 18,
    },

    // Amenities
    amenityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    amenityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderRadius: spacing.radius.full,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    amenityChipActive: {
        backgroundColor: colors.primarySoft,
        borderColor: colors.primary,
    },
    amenityChipText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    amenityChipTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },

    // Live Preview Card
    previewCard: {
        backgroundColor: '#F8FAFC',
        borderColor: colors.primaryLight,
        borderWidth: 1,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: spacing.xs,
    },
    previewHeaderTitle: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    previewBody: {
        marginTop: 2,
    },
    previewTitle: {
        ...typography.h3,
        fontSize: 18,
        color: colors.textPrimary,
    },
    previewAddress: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 4,
    },
    previewBadgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: spacing.sm,
    },
    previewPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: spacing.radius.full,
        backgroundColor: colors.borderLight,
    },
    previewPillText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '600',
        color: colors.textSecondary,
    },

    // Actions
    submitBtn: {
        marginTop: spacing.base,
    },

    // Bottom Sticky Navigation Footer
    stickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        flexDirection: 'row',
        gap: spacing.md,
        paddingHorizontal: spacing.screenHorizontal,
        paddingTop: spacing.sm,
        paddingBottom: Platform.OS === 'ios' ? 34 : spacing.base,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        ...shadows.card,
    },
    navBackBtn: {
        flex: 1,
    },
    navNextBtn: {
        flex: 2,
    },
});

export default CreateParkingScreen;
