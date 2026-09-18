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
    ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createParkingThunk, updateParkingThunk, deleteParkingThunk } from '../../store/slices/parkingSlice';
import { fileUploadService } from '../../services/api/fileUploadService';
import logger from '../../utils/logger';
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
    const stepOffsets = useRef({ 1: 0, 2: 0, 3: 0, 4: 0 });

    const [activeStep, setActiveStep] = useState(route?.params?.initialStep || 1);
    const [viewMode, setViewMode] = useState(route?.params?.initialViewMode || 'all'); // 'steps' | 'all'

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        postalCode: '',
        zipCode: '',
        latitude: 0,
        longitude: 0,
        totalSpots: '',
        parkingType: ParkingType.Open,
        listingCategory: ListingCategory.Standard ?? 0,
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

    const [errors, setErrors] = useState({});
    const [validationSummary, setValidationSummary] = useState([]);
    const [photoInput, setPhotoInput] = useState('');
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    useEffect(() => {
        if (editData) {
            setFormData({
                title: editData.title || '',
                description: editData.description || '',
                address: editData.address || '',
                city: editData.city || '',
                state: editData.state || '',
                country: editData.country || 'India',
                postalCode: editData.postalCode || editData.zipCode || '',
                zipCode: editData.postalCode || editData.zipCode || '',
                latitude: editData.latitude || 0,
                longitude: editData.longitude || 0,
                totalSpots: editData.totalSpots ? editData.totalSpots.toString() : '',
                parkingType: editData.parkingType ?? ParkingType.Open,
                listingCategory: editData.listingCategory ?? (ListingCategory.Standard ?? 0),
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
        setFormData((prev) => {
            const next = { ...prev, [field]: value };
            if (field === 'zipCode') next.postalCode = value;
            if (field === 'postalCode') next.zipCode = value;
            return next;
        });
        if (errors[field] || (field === 'zipCode' && errors.postalCode) || (field === 'postalCode' && errors.zipCode)) {
            setErrors((prev) => {
                const nextErrors = { ...prev };
                delete nextErrors[field];
                if (field === 'zipCode') delete nextErrors.postalCode;
                if (field === 'postalCode') delete nextErrors.zipCode;
                return nextErrors;
            });
            setValidationSummary((prev) =>
                prev.filter((e) => e.field !== field && !(field === 'zipCode' && e.field === 'postalCode') && !(field === 'postalCode' && e.field === 'zipCode'))
            );
        }
    };

    const toggleAmenity = (amenity) => {
        setFormData((prev) => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter((a) => a !== amenity)
                : [...prev.amenities, amenity],
        }));
    };

    const handlePickFromLibrary = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Permission to access your photo library is required to upload listing photos.'
                );
                return;
            }

            setIsUploadingPhoto(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ['images'],
                allowsMultipleSelection: true,
                selectionLimit: 10,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newUris = result.assets
                    .map((asset) => asset.uri)
                    .filter(Boolean);
                if (newUris.length > 0) {
                    setFormData((prev) => ({
                        ...prev,
                        imageUrls: [...prev.imageUrls, ...newUris],
                    }));
                }
            }
        } catch (error) {
            logger.warn('CreateParkingScreen', 'Photo library pick error', error);
            Alert.alert('Upload Error', 'Failed to pick photos from your library. Please try again.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleTakePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Camera permission is required to take photos of your parking space.'
                );
                return;
            }

            setIsUploadingPhoto(true);
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? ['images'],
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const newUri = result.assets[0]?.uri;
                if (newUri) {
                    setFormData((prev) => ({
                        ...prev,
                        imageUrls: [...prev.imageUrls, newUri],
                    }));
                }
            }
        } catch (error) {
            logger.warn('CreateParkingScreen', 'Camera capture error', error);
            Alert.alert('Camera Error', 'Failed to take photo. Please try again.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleUploadPrompt = () => {
        Alert.alert(
            'Upload Listing Photos',
            'Choose how you would like to upload photos for your parking space:',
            [
                { text: 'Take Photo', onPress: handleTakePhoto },
                { text: 'Choose from Library', onPress: handlePickFromLibrary },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
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

    const handleStepLayout = (stepId) => (event) => {
        const layout = event?.nativeEvent?.layout;
        if (layout && typeof layout.y === 'number') {
            stepOffsets.current[stepId] = layout.y;
        }
    };

    const handleStepChange = (stepId) => {
        setActiveStep(stepId);
        if (viewMode === 'all') {
            const targetY = (stepOffsets.current && stepOffsets.current[stepId]) || 0;
            scrollViewRef.current?.scrollTo?.({ y: Math.max(0, targetY - 12), animated: true });
        } else {
            scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
        }
    };

    const handleToggleViewMode = (newMode) => {
        if (newMode === viewMode) return;
        setViewMode(newMode);
        if (newMode === 'all') {
            setTimeout(() => {
                const targetY = (stepOffsets.current && stepOffsets.current[activeStep]) || 0;
                scrollViewRef.current?.scrollTo?.({ y: Math.max(0, targetY - 12), animated: true });
            }, 60);
        } else {
            scrollViewRef.current?.scrollTo?.({ y: 0, animated: false });
        }
    };

    const handleScroll = (event) => {
        if (viewMode !== 'all') return;
        const scrollY = event?.nativeEvent?.contentOffset?.y;
        if (typeof scrollY !== 'number') return;

        const s2 = stepOffsets.current[2] || 999999;
        const s3 = stepOffsets.current[3] || 999999;
        const s4 = stepOffsets.current[4] || 999999;

        let currentStep = 1;
        if (scrollY >= s4 - 120) {
            currentStep = 4;
        } else if (scrollY >= s3 - 120) {
            currentStep = 3;
        } else if (scrollY >= s2 - 120) {
            currentStep = 2;
        }

        if (currentStep !== activeStep) {
            setActiveStep(currentStep);
        }
    };

    const validateForm = useCallback((data) => {
        const newErrors = {};
        const errorDetails = [];

        // Step 1: Basics & Location
        if (!data.title?.trim()) {
            const msg = 'Title is required';
            newErrors.title = msg;
            errorDetails.push({ step: 1, field: 'title', message: msg, label: 'Title' });
        }

        if (!data.description?.trim()) {
            const msg = 'Description is required';
            newErrors.description = msg;
            errorDetails.push({ step: 1, field: 'description', message: msg, label: 'Description' });
        } else if (data.description.length > 2000) {
            const msg = 'Description cannot exceed 2,000 characters';
            newErrors.description = msg;
            errorDetails.push({ step: 1, field: 'description', message: msg, label: 'Description' });
        }

        const spotsNum = parseInt(data.totalSpots, 10);
        const isResidential = data.listingCategory === 1 || data.listingCategory === ListingCategory.ResidentialDriveway;
        if (!data.totalSpots || isNaN(spotsNum) || spotsNum < 1) {
            const msg = 'Total spots must be at least 1';
            newErrors.totalSpots = msg;
            errorDetails.push({ step: 1, field: 'totalSpots', message: msg, label: 'Total Spots' });
        } else if (spotsNum > 1000) {
            const msg = 'Total spots cannot exceed 1,000';
            newErrors.totalSpots = msg;
            errorDetails.push({ step: 1, field: 'totalSpots', message: msg, label: 'Total Spots' });
        } else if (isResidential && spotsNum > 10) {
            const msg = 'Residential driveway listings support a maximum of 10 spots';
            newErrors.totalSpots = msg;
            errorDetails.push({ step: 1, field: 'totalSpots', message: msg, label: 'Total Spots' });
        }

        if (!data.address?.trim()) {
            const msg = 'Street address is required';
            newErrors.address = msg;
            errorDetails.push({ step: 1, field: 'address', message: msg, label: 'Street Address' });
        }

        if (!data.city?.trim()) {
            const msg = 'City is required';
            newErrors.city = msg;
            errorDetails.push({ step: 1, field: 'city', message: msg, label: 'City' });
        }

        if (!data.state?.trim()) {
            const msg = 'State is required';
            newErrors.state = msg;
            errorDetails.push({ step: 1, field: 'state', message: msg, label: 'State' });
        }

        const postalVal = (data.postalCode || data.zipCode || '').trim();
        if (!postalVal) {
            const msg = 'Postal / Zip code is required';
            newErrors.postalCode = msg;
            newErrors.zipCode = msg;
            errorDetails.push({ step: 1, field: 'postalCode', message: msg, label: 'Postal / Zip Code' });
        }

        if (!data.country?.trim()) {
            const msg = 'Country is required';
            newErrors.country = msg;
            errorDetails.push({ step: 1, field: 'country', message: msg, label: 'Country' });
        }

        // Step 2: Access & Features
        if (data.hasEvCharging) {
            const bays = parseInt(data.evChargerCount, 10);
            if (data.evChargerCount && (isNaN(bays) || bays < 1)) {
                const msg = 'EV charger count must be at least 1';
                newErrors.evChargerCount = msg;
                errorDetails.push({ step: 2, field: 'evChargerCount', message: msg, label: 'EV Charger Bays' });
            }
            if (data.evRatePerKwh && (isNaN(parseFloat(data.evRatePerKwh)) || parseFloat(data.evRatePerKwh) < 0)) {
                const msg = 'EV rate per kWh cannot be negative';
                newErrors.evRatePerKwh = msg;
                errorDetails.push({ step: 2, field: 'evRatePerKwh', message: msg, label: 'EV Rate / kWh' });
            }
            if (data.evChargingRatePerHour && (isNaN(parseFloat(data.evChargingRatePerHour)) || parseFloat(data.evChargingRatePerHour) < 0)) {
                const msg = 'EV charging rate cannot be negative';
                newErrors.evChargingRatePerHour = msg;
                errorDetails.push({ step: 2, field: 'evChargingRatePerHour', message: msg, label: 'EV Rate / Hour' });
            }
            if (data.evIdleRatePerHour && (isNaN(parseFloat(data.evIdleRatePerHour)) || parseFloat(data.evIdleRatePerHour) < 0)) {
                const msg = 'EV idle rate cannot be negative';
                newErrors.evIdleRatePerHour = msg;
                errorDetails.push({ step: 2, field: 'evIdleRatePerHour', message: msg, label: 'EV Idle Fee' });
            }
            if (data.evIdleGraceMinutes && (isNaN(parseInt(data.evIdleGraceMinutes, 10)) || parseInt(data.evIdleGraceMinutes, 10) < 0 || parseInt(data.evIdleGraceMinutes, 10) > 1440)) {
                const msg = 'EV idle grace must be between 0 and 1,440 minutes';
                newErrors.evIdleGraceMinutes = msg;
                errorDetails.push({ step: 2, field: 'evIdleGraceMinutes', message: msg, label: 'EV Idle Grace' });
            }
        }

        if (data.isBayGuidanceEnabled) {
            if (data.defaultFacilityLevel && data.defaultFacilityLevel.length > 32) {
                const msg = 'Facility level cannot exceed 32 characters';
                newErrors.defaultFacilityLevel = msg;
                errorDetails.push({ step: 2, field: 'defaultFacilityLevel', message: msg, label: 'Default Level' });
            }
            if (data.defaultFacilityZone && data.defaultFacilityZone.length > 64) {
                const msg = 'Facility zone cannot exceed 64 characters';
                newErrors.defaultFacilityZone = msg;
                errorDetails.push({ step: 2, field: 'defaultFacilityZone', message: msg, label: 'Default Zone' });
            }
            if (data.indoorGuidanceNotes && data.indoorGuidanceNotes.length > 2000) {
                const msg = 'Guidance notes cannot exceed 2,000 characters';
                newErrors.indoorGuidanceNotes = msg;
                errorDetails.push({ step: 2, field: 'indoorGuidanceNotes', message: msg, label: 'Guidance Notes' });
            }
        }

        if (data.isValetEnabled) {
            if (data.valetFee && (isNaN(parseFloat(data.valetFee)) || parseFloat(data.valetFee) < 0)) {
                const msg = 'Valet fee cannot be negative';
                newErrors.valetFee = msg;
                errorDetails.push({ step: 2, field: 'valetFee', message: msg, label: 'Valet Fee' });
            }
        }

        // Step 3: Pricing
        const rateNum = parseFloat(data.hourlyRate);
        if (!data.hourlyRate || isNaN(rateNum)) {
            const msg = 'Hourly rate is required';
            newErrors.hourlyRate = msg;
            errorDetails.push({ step: 3, field: 'hourlyRate', message: msg, label: 'Hourly Rate' });
        } else if (rateNum < 0) {
            const msg = 'Hourly rate cannot be negative';
            newErrors.hourlyRate = msg;
            errorDetails.push({ step: 3, field: 'hourlyRate', message: msg, label: 'Hourly Rate' });
        }

        if (data.dailyRate && (isNaN(parseFloat(data.dailyRate)) || parseFloat(data.dailyRate) < 0)) {
            const msg = 'Daily rate cannot be negative';
            newErrors.dailyRate = msg;
            errorDetails.push({ step: 3, field: 'dailyRate', message: msg, label: 'Daily Rate' });
        }
        if (data.weeklyRate && (isNaN(parseFloat(data.weeklyRate)) || parseFloat(data.weeklyRate) < 0)) {
            const msg = 'Weekly rate cannot be negative';
            newErrors.weeklyRate = msg;
            errorDetails.push({ step: 3, field: 'weeklyRate', message: msg, label: 'Weekly Rate' });
        }
        if (data.monthlyRate && (isNaN(parseFloat(data.monthlyRate)) || parseFloat(data.monthlyRate) < 0)) {
            const msg = 'Monthly rate cannot be negative';
            newErrors.monthlyRate = msg;
            errorDetails.push({ step: 3, field: 'monthlyRate', message: msg, label: 'Monthly Rate' });
        }

        if (data.isDynamicPricingEnabled) {
            const minMul = parseFloat(data.dynamicMinMultiplier);
            const maxMul = parseFloat(data.dynamicMaxMultiplier);
            if (data.dynamicMinMultiplier && (isNaN(minMul) || minMul < 0.1 || minMul > 1.0)) {
                const msg = 'Min multiplier must be between 0.10 and 1.0';
                newErrors.dynamicMinMultiplier = msg;
                errorDetails.push({ step: 3, field: 'dynamicMinMultiplier', message: msg, label: 'Min Multiplier' });
            }
            if (data.dynamicMaxMultiplier && (isNaN(maxMul) || maxMul < 1.0 || maxMul > 5.0)) {
                const msg = 'Max multiplier must be between 1.0 and 5.0';
                newErrors.dynamicMaxMultiplier = msg;
                errorDetails.push({ step: 3, field: 'dynamicMaxMultiplier', message: msg, label: 'Max Multiplier' });
            } else if (!isNaN(minMul) && !isNaN(maxMul) && maxMul < minMul) {
                const msg = 'Max multiplier must be greater than or equal to min multiplier';
                newErrors.dynamicMaxMultiplier = msg;
                errorDetails.push({ step: 3, field: 'dynamicMaxMultiplier', message: msg, label: 'Max Multiplier' });
            }
            const peakMul = parseFloat(data.peakHourMultiplier);
            if (data.peakHourMultiplier && (isNaN(peakMul) || peakMul < 1.0 || peakMul > 3.0)) {
                const msg = 'Peak hour multiplier must be between 1.0 and 3.0';
                newErrors.peakHourMultiplier = msg;
                errorDetails.push({ step: 3, field: 'peakHourMultiplier', message: msg, label: 'Peak Hour Multiplier' });
            }
            const weekendMul = parseFloat(data.weekendMultiplier);
            if (data.weekendMultiplier && (isNaN(weekendMul) || weekendMul < 1.0 || weekendMul > 3.0)) {
                const msg = 'Weekend multiplier must be between 1.0 and 3.0';
                newErrors.weekendMultiplier = msg;
                errorDetails.push({ step: 3, field: 'weekendMultiplier', message: msg, label: 'Weekend Multiplier' });
            }
        }

        const firstInvalidStep = errorDetails.length > 0 ? errorDetails[0].step : null;

        return {
            isValid: errorDetails.length === 0,
            errors: newErrors,
            errorDetails,
            errorList: errorDetails.map((e) => `Step ${e.step} (${STEPS[e.step - 1]?.label}): ${e.message}`),
            firstInvalidStep,
        };
    }, []);

    const parseServerValidationErrors = useCallback((rawMessage) => {
        if (!rawMessage || typeof rawMessage !== 'string') return;
        const serverErrors = {};
        const errorDetails = [];

        const lines = rawMessage.split('\n').map((l) => l.trim().replace(/^•\s*/, '')).filter(Boolean);

        lines.forEach((line) => {
            const lower = line.toLowerCase();
            if (lower.includes('validation failed') || lower.includes('server error') || lower.includes('one or more')) {
                return;
            }
            if (lower.includes('title')) {
                serverErrors.title = line;
                errorDetails.push({ step: 1, field: 'title', message: line, label: 'Title' });
            } else if (lower.includes('description')) {
                serverErrors.description = line;
                errorDetails.push({ step: 1, field: 'description', message: line, label: 'Description' });
            } else if (lower.includes('spots') || lower.includes('spot')) {
                serverErrors.totalSpots = line;
                errorDetails.push({ step: 1, field: 'totalSpots', message: line, label: 'Total Spots' });
            } else if (lower.includes('address') || lower.includes('street')) {
                serverErrors.address = line;
                errorDetails.push({ step: 1, field: 'address', message: line, label: 'Street Address' });
            } else if (lower.includes('city')) {
                serverErrors.city = line;
                errorDetails.push({ step: 1, field: 'city', message: line, label: 'City' });
            } else if (lower.includes('state')) {
                serverErrors.state = line;
                errorDetails.push({ step: 1, field: 'state', message: line, label: 'State' });
            } else if (lower.includes('postal') || lower.includes('zip')) {
                serverErrors.postalCode = line;
                serverErrors.zipCode = line;
                errorDetails.push({ step: 1, field: 'postalCode', message: line, label: 'Postal / Zip Code' });
            } else if (lower.includes('country')) {
                serverErrors.country = line;
                errorDetails.push({ step: 1, field: 'country', message: line, label: 'Country' });
            } else if (lower.includes('rate') || lower.includes('hourly')) {
                serverErrors.hourlyRate = line;
                errorDetails.push({ step: 3, field: 'hourlyRate', message: line, label: 'Hourly Rate' });
            } else {
                errorDetails.push({ step: 1, field: 'general', message: line, label: 'General' });
            }
        });

        if (errorDetails.length > 0) {
            setErrors((prev) => ({ ...prev, ...serverErrors }));
            setValidationSummary(errorDetails);
            const targetStep = errorDetails[0]?.step || 1;
            setActiveStep(targetStep);
            if (viewMode === 'all') {
                const targetY = stepOffsets.current[targetStep] || 0;
                scrollViewRef.current?.scrollTo?.({ y: Math.max(0, targetY - 12), animated: true });
            } else {
                scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
            }
        }
    }, [viewMode]);

    const isStepComplete = (stepId) => {
        switch (stepId) {
            case 1:
                return Boolean(
                    formData.title?.trim() &&
                    formData.description?.trim() &&
                    formData.totalSpots &&
                    parseInt(formData.totalSpots, 10) >= 1 &&
                    formData.address?.trim() &&
                    formData.city?.trim() &&
                    formData.state?.trim() &&
                    (formData.postalCode || formData.zipCode || '').trim() &&
                    formData.country?.trim()
                );
            case 2:
                if (formData.hasEvCharging && formData.evChargerCount && parseInt(formData.evChargerCount, 10) < 1) return false;
                return true;
            case 3:
                return Boolean(formData.hourlyRate && !isNaN(parseFloat(formData.hourlyRate)) && parseFloat(formData.hourlyRate) >= 0);
            case 4:
                return formData.imageUrls.length > 0 || formData.amenities.length > 0;
            default:
                return false;
        }
    };

    const handleSubmit = useCallback(async () => {
        const validation = validateForm(formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            setValidationSummary(validation.errorDetails);
            if (validation.firstInvalidStep) {
                setActiveStep(validation.firstInvalidStep);
                if (viewMode === 'all') {
                    const targetY = stepOffsets.current[validation.firstInvalidStep] || 0;
                    scrollViewRef.current?.scrollTo?.({ y: Math.max(0, targetY - 12), animated: true });
                } else {
                    scrollViewRef.current?.scrollTo?.({ y: 0, animated: true });
                }
            }
            Alert.alert(
                'Required Fields',
                `Please fill in all required fields:\n\n• ${validation.errorList.join('\n• ')}`
            );
            return;
        }

        setErrors({});
        setValidationSummary([]);

        const payload = {
            ...formData,
            title: formData.title.trim(),
            description: formData.description.trim(),
            address: formData.address.trim(),
            city: formData.city.trim(),
            state: formData.state.trim(),
            country: formData.country?.trim() || 'India',
            postalCode: (formData.postalCode || formData.zipCode || '').trim(),
            zipCode: (formData.postalCode || formData.zipCode || '').trim(),
            latitude: Number(formData.latitude) || 0,
            longitude: Number(formData.longitude) || 0,
            parkingType: Number(formData.parkingType) || 0,
            listingCategory: (formData.listingCategory === 1 || formData.listingCategory === ListingCategory.ResidentialDriveway) ? 1 : 0,
            totalSpots: parseInt(formData.totalSpots, 10),
            hourlyRate: parseFloat(formData.hourlyRate),
            dailyRate: parseFloat(formData.dailyRate) || 0,
            weeklyRate: parseFloat(formData.weeklyRate) || 0,
            monthlyRate: parseFloat(formData.monthlyRate) || 0,
            is24Hours: Boolean(formData.is24Hours),
            instantBook: Boolean(formData.instantBook),
            isLprEnabled: Boolean(formData.isLprEnabled),
            hasEvCharging: Boolean(formData.hasEvCharging),
            evChargerCount: formData.hasEvCharging ? Math.max(1, parseInt(formData.evChargerCount, 10) || 1) : undefined,
            evPricingMode: formData.hasEvCharging ? (formData.evPricingMode ?? EvPricingMode.PerHour) : undefined,
            evRatePerKwh: formData.hasEvCharging ? Math.max(0, parseFloat(formData.evRatePerKwh) || 0) : undefined,
            evChargingRatePerHour: formData.hasEvCharging ? Math.max(0, parseFloat(formData.evChargingRatePerHour) || 0) : undefined,
            evIdleRatePerHour: formData.hasEvCharging ? Math.max(0, parseFloat(formData.evIdleRatePerHour) || 0) : undefined,
            evIdleGraceMinutes: formData.hasEvCharging ? Math.max(0, parseInt(formData.evIdleGraceMinutes, 10) || 15) : undefined,
            isDynamicPricingEnabled: Boolean(formData.isDynamicPricingEnabled),
            dynamicMinMultiplier: formData.isDynamicPricingEnabled ? parseFloat(formData.dynamicMinMultiplier) || 0.8 : undefined,
            dynamicMaxMultiplier: formData.isDynamicPricingEnabled ? parseFloat(formData.dynamicMaxMultiplier) || 1.75 : undefined,
            peakHourMultiplier: formData.isDynamicPricingEnabled ? parseFloat(formData.peakHourMultiplier) || 1.25 : undefined,
            weekendMultiplier: formData.isDynamicPricingEnabled ? parseFloat(formData.weekendMultiplier) || 1.15 : undefined,
            isBayGuidanceEnabled: Boolean(formData.isBayGuidanceEnabled),
            defaultFacilityLevel: formData.isBayGuidanceEnabled ? (formData.defaultFacilityLevel?.trim() || null) : null,
            defaultFacilityZone: formData.isBayGuidanceEnabled ? (formData.defaultFacilityZone?.trim() || null) : null,
            indoorGuidanceNotes: formData.isBayGuidanceEnabled ? (formData.indoorGuidanceNotes?.trim() || null) : null,
            isValetEnabled: Boolean(formData.isValetEnabled),
            valetFee: formData.isValetEnabled ? Math.max(0, parseFloat(formData.valetFee) || 0) : undefined,
            amenities: Array.isArray(formData.amenities) ? formData.amenities : [],
            imageUrls: Array.isArray(formData.imageUrls) ? formData.imageUrls : [],
            imageUrl: (Array.isArray(formData.imageUrls) && formData.imageUrls[0]) || formData.imageUrl || '',
        };

        const localFiles = (formData.imageUrls || [])
            .filter((uri) => typeof uri === 'string' && (uri.startsWith('file:') || uri.startsWith('content:') || uri.startsWith('ph:') || uri.startsWith('blob:')))
            .map((uri, index) => ({
                uri,
                name: `parking_space_${Date.now()}_${index}.jpg`,
                type: 'image/jpeg',
            }));

        if (isEditing) {
            if (localFiles.length > 0 && editData?.id) {
                try {
                    await fileUploadService.uploadMultipart(editData.id, localFiles);
                } catch (uploadErr) {
                    logger.warn('CreateParkingScreen', 'Multipart upload during edit failed/deferred', uploadErr);
                }
            }
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
                const errorMsg = result.payload || 'Failed to update space';
                parseServerValidationErrors(errorMsg);
                Alert.alert('Error', errorMsg);
            }
        } else {
            const result = await dispatch(createParkingThunk(payload));
            if (!result.error) {
                const newSpaceId = result.payload?.id || result.payload?.data?.id;
                if (localFiles.length > 0 && newSpaceId) {
                    try {
                        await fileUploadService.uploadMultipart(newSpaceId, localFiles);
                    } catch (uploadErr) {
                        logger.warn('CreateParkingScreen', 'Multipart upload after create failed/deferred', uploadErr);
                    }
                }
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
                const errorMsg = result.payload || 'Failed to create space';
                parseServerValidationErrors(errorMsg);
                Alert.alert('Error', errorMsg);
            }
        }
    }, [dispatch, formData, isEditing, editData, navigation, validateForm, parseServerValidationErrors, viewMode]);

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
                                {
                                    text: 'OK',
                                    onPress: () => {
                                        if (navigation?.canGoBack?.()) {
                                            navigation.goBack();
                                        } else {
                                            navigation.navigate('MyListings');
                                        }
                                    },
                                },
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
                            {viewMode === 'steps'
                                ? `Step ${activeStep} of 4 • ${STEPS[activeStep - 1]?.label}`
                                : `All Sections • Step ${activeStep} of 4 (${STEPS[activeStep - 1]?.label})`}
                        </Text>
                    </View>
                    <View style={styles.headerRightActions}>
                        {/* Segmented Mode Toggle: Steps vs All */}
                        <View style={styles.segmentedToggleContainer} testID="view-mode-toggle">
                            <TouchableOpacity
                                onPress={() => handleToggleViewMode('steps')}
                                style={[styles.segmentedToggleBtn, viewMode === 'steps' && styles.segmentedToggleBtnActive]}
                                accessibilityRole="button"
                                accessibilityLabel="Steps view mode"
                                accessibilityState={{ selected: viewMode === 'steps' }}
                                testID="view-mode-steps-btn"
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="albums-outline"
                                    size={13}
                                    color={viewMode === 'steps' ? colors.white : colors.textSecondary}
                                />
                                <Text style={[styles.segmentedToggleText, viewMode === 'steps' && styles.segmentedToggleTextActive]}>
                                    Steps
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleToggleViewMode('all')}
                                style={[styles.segmentedToggleBtn, viewMode === 'all' && styles.segmentedToggleBtnActive]}
                                accessibilityRole="button"
                                accessibilityLabel="All sections view mode"
                                accessibilityState={{ selected: viewMode === 'all' }}
                                testID="view-mode-all-btn"
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="list-outline"
                                    size={13}
                                    color={viewMode === 'all' ? colors.white : colors.textSecondary}
                                />
                                <Text style={[styles.segmentedToggleText, viewMode === 'all' && styles.segmentedToggleTextActive]}>
                                    All
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {isEditing && (
                            <TouchableOpacity
                                onPress={handleDelete}
                                style={styles.headerDeleteBtn}
                                accessibilityRole="button"
                                accessibilityLabel="Delete Parking Space"
                                testID="header-delete-listing-btn"
                            >
                                <Ionicons name="trash-outline" size={18} color={colors.error || '#EF4444'} />
                            </TouchableOpacity>
                        )}
                    </View>
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
                            const stepHasError = validationSummary.some((e) => e.step === step.id);
                            return (
                                <TouchableOpacity
                                    key={step.id}
                                    onPress={() => handleStepChange(step.id)}
                                    style={[styles.stepTab, isActive && styles.stepTabActive]}
                                    activeOpacity={0.7}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${step.label} step`}
                                    testID={`step-tab-${step.id}`}
                                >
                                    <View style={[
                                        styles.stepTabIconContainer,
                                        isActive && styles.stepTabIconActive,
                                        isComplete && !isActive && !stepHasError && styles.stepTabIconComplete,
                                        stepHasError && styles.stepTabIconError,
                                    ]}>
                                        <Ionicons
                                            name={stepHasError ? 'alert-circle' : isComplete && !isActive ? 'checkmark' : step.icon}
                                            size={14}
                                            color={stepHasError ? colors.white : isActive ? colors.white : isComplete ? colors.success : colors.textTertiary}
                                        />
                                    </View>
                                    <Text style={[styles.stepTabText, isActive && styles.stepTabTextActive, stepHasError && styles.stepTabTextError]}>
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
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: viewMode === 'steps' ? 140 : 60 }}
                >
                    <View style={styles.content}>
                        {/* ========================================================= */}
                        {/* VALIDATION ERROR SUMMARY BANNER */}
                        {/* ========================================================= */}
                        {validationSummary.length > 0 && (
                            <View style={styles.validationBanner} testID="validation-error-banner">
                                <View style={styles.validationBannerHeader}>
                                    <View style={styles.validationBannerTitleRow}>
                                        <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                                        <Text style={styles.validationBannerTitle}>
                                            {validationSummary.length} {validationSummary.length === 1 ? 'Validation Issue' : 'Validation Issues'} Found
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setValidationSummary([])}
                                        style={styles.validationBannerDismiss}
                                        accessibilityRole="button"
                                        accessibilityLabel="Dismiss validation errors"
                                        testID="dismiss-validation-banner-btn"
                                    >
                                        <Ionicons name="close" size={16} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.validationBannerSubtitle}>
                                    Please resolve the highlighted fields below to create your space:
                                </Text>
                                <View style={styles.validationList}>
                                    {validationSummary.map((err, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                handleStepChange(err.step);
                                            }}
                                            style={styles.validationListItem}
                                            testID={`validation-error-item-${idx}`}
                                        >
                                            <Ionicons name="warning-outline" size={14} color="#DC2626" style={{ marginRight: 6, marginTop: 2 }} />
                                            <Text style={styles.validationListText}>
                                                <Text style={styles.validationStepBadgeText}>[Step {err.step}: {STEPS[err.step - 1]?.label}] </Text>
                                                <Text style={styles.validationFieldLabelText}>{err.label}: </Text>
                                                {err.message}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* ========================================================= */}
                        {/* STEP 1: PROPERTY BASICS & LOCATION */}
                        {/* ========================================================= */}
                        <View
                            onLayout={handleStepLayout(1)}
                            style={viewMode === 'all' || activeStep === 1 ? styles.stepVisible : styles.stepHidden}
                            testID="step-1-section"
                        >
                            {viewMode === 'all' && (
                                <View style={styles.sectionDividerHeader}>
                                    <View style={styles.sectionNumberBadge}>
                                        <Text style={styles.sectionNumberText}>1</Text>
                                    </View>
                                    <Text style={styles.sectionHeaderTitle}>{STEPS[0].fullLabel}</Text>
                                </View>
                            )}
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
                                    error={errors.title}
                                />

                                <Input
                                    label="Total Spots *"
                                    value={formData.totalSpots}
                                    onChangeText={updateField('totalSpots')}
                                    placeholder="Number of spots"
                                    keyboardType="numeric"
                                    leftIcon="grid-outline"
                                    error={errors.totalSpots}
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
                                    label="Description *"
                                    value={formData.description}
                                    onChangeText={updateField('description')}
                                    placeholder="Describe your parking space, clearance height, gate access rules, etc."
                                    multiline
                                    numberOfLines={3}
                                    error={errors.description}
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
                                    error={errors.address}
                                />

                                <View style={styles.row}>
                                    <Input
                                        label="City *"
                                        value={formData.city}
                                        onChangeText={updateField('city')}
                                        placeholder="City"
                                        error={errors.city}
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                    <Input
                                        label="State *"
                                        value={formData.state}
                                        onChangeText={updateField('state')}
                                        placeholder="State"
                                        error={errors.state}
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                </View>

                                <View style={styles.row}>
                                    <Input
                                        label="Postal / Zip Code *"
                                        value={formData.postalCode || formData.zipCode}
                                        onChangeText={updateField('postalCode')}
                                        placeholder="Zip code"
                                        keyboardType="numeric"
                                        error={errors.postalCode || errors.zipCode}
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                    <Input
                                        label="Country *"
                                        value={formData.country}
                                        onChangeText={updateField('country')}
                                        placeholder="Country"
                                        error={errors.country}
                                        style={styles.halfInput}
                                        containerStyle={styles.halfInput}
                                    />
                                </View>
                            </Card>
                        </View>

                        {/* ========================================================= */}
                        {/* STEP 2: CATEGORY & SMART ACCESS FEATURES */}
                        {/* ========================================================= */}
                        <View
                            onLayout={handleStepLayout(2)}
                            style={viewMode === 'all' || activeStep === 2 ? styles.stepVisible : styles.stepHidden}
                            testID="step-2-section"
                        >
                            {viewMode === 'all' && (
                                <View style={styles.sectionDividerHeader}>
                                    <View style={styles.sectionNumberBadge}>
                                        <Text style={styles.sectionNumberText}>2</Text>
                                    </View>
                                    <Text style={styles.sectionHeaderTitle}>{STEPS[1].fullLabel}</Text>
                                </View>
                            )}
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
                                            error={errors.evChargerCount}
                                        />
                                        <View style={styles.row}>
                                            <Input
                                                label="Rate / kWh (₹)"
                                                value={formData.evRatePerKwh}
                                                onChangeText={updateField('evRatePerKwh')}
                                                keyboardType="decimal-pad"
                                                prefix="₹"
                                                error={errors.evRatePerKwh}
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Rate / Hour (₹)"
                                                value={formData.evChargingRatePerHour}
                                                onChangeText={updateField('evChargingRatePerHour')}
                                                keyboardType="decimal-pad"
                                                prefix="₹"
                                                error={errors.evChargingRatePerHour}
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
                                                error={errors.evIdleRatePerHour}
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Idle Grace (mins)"
                                                value={formData.evIdleGraceMinutes}
                                                onChangeText={updateField('evIdleGraceMinutes')}
                                                keyboardType="numeric"
                                                error={errors.evIdleGraceMinutes}
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
                                                error={errors.defaultFacilityLevel}
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Default Zone"
                                                value={formData.defaultFacilityZone}
                                                onChangeText={updateField('defaultFacilityZone')}
                                                placeholder="e.g. Blue"
                                                error={errors.defaultFacilityZone}
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                        </View>
                                        <Input
                                            label="Guidance Notes"
                                            value={formData.indoorGuidanceNotes}
                                            onChangeText={updateField('indoorGuidanceNotes')}
                                            placeholder="e.g. Enter ramp 2, follow blue signs"
                                            error={errors.indoorGuidanceNotes}
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
                                            error={errors.valetFee}
                                        />
                                    </View>
                                )}
                            </Card>
                        </View>

                        {/* ========================================================= */}
                        {/* STEP 3: PRICING & REVENUE */}
                        {/* ========================================================= */}
                        <View
                            onLayout={handleStepLayout(3)}
                            style={viewMode === 'all' || activeStep === 3 ? styles.stepVisible : styles.stepHidden}
                            testID="step-3-section"
                        >
                            {viewMode === 'all' && (
                                <View style={styles.sectionDividerHeader}>
                                    <View style={styles.sectionNumberBadge}>
                                        <Text style={styles.sectionNumberText}>3</Text>
                                    </View>
                                    <Text style={styles.sectionHeaderTitle}>{STEPS[2].fullLabel}</Text>
                                </View>
                            )}
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
                                        error={errors.hourlyRate}
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
                                        error={errors.dailyRate}
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
                                        error={errors.weeklyRate}
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
                                        error={errors.monthlyRate}
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
                                                error={errors.dynamicMinMultiplier}
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Max Multiplier"
                                                value={formData.dynamicMaxMultiplier}
                                                onChangeText={updateField('dynamicMaxMultiplier')}
                                                keyboardType="decimal-pad"
                                                placeholder="1.75"
                                                error={errors.dynamicMaxMultiplier}
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
                                                error={errors.peakHourMultiplier}
                                                style={styles.halfInput}
                                                containerStyle={styles.halfInput}
                                            />
                                            <Input
                                                label="Weekend Multiplier"
                                                value={formData.weekendMultiplier}
                                                onChangeText={updateField('weekendMultiplier')}
                                                keyboardType="decimal-pad"
                                                placeholder="1.15"
                                                error={errors.weekendMultiplier}
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
                        <View
                            onLayout={handleStepLayout(4)}
                            style={viewMode === 'all' || activeStep === 4 ? styles.stepVisible : styles.stepHidden}
                            testID="step-4-section"
                        >
                            {viewMode === 'all' && (
                                <View style={styles.sectionDividerHeader}>
                                    <View style={styles.sectionNumberBadge}>
                                        <Text style={styles.sectionNumberText}>4</Text>
                                    </View>
                                    <Text style={styles.sectionHeaderTitle}>{STEPS[3].fullLabel}</Text>
                                </View>
                            )}
                            {/* Listing Photos */}
                            <Card>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.cardHeaderIcon, { backgroundColor: '#EFF6FF' }]}>
                                        <Ionicons name="images-outline" size={20} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={styles.sectionTitle}>Listing Photos</Text>
                                            {formData.imageUrls.length > 0 && (
                                                <View style={styles.photoCountBadge}>
                                                    <Text style={styles.photoCountBadgeText}>
                                                        {formData.imageUrls.length} {formData.imageUrls.length === 1 ? 'photo' : 'photos'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.sectionSubtitle}>Add high-resolution photos so drivers can locate your space</Text>
                                    </View>
                                </View>

                                {/* Action Buttons for Photo Upload */}
                                <View style={styles.photoActionsRow}>
                                    <TouchableOpacity
                                        testID="upload-photos-btn"
                                        style={styles.photoUploadPrimaryBtn}
                                        onPress={handleUploadPrompt}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="cloud-upload-outline" size={18} color={colors.white} style={{ marginRight: 6 }} />
                                        <Text style={styles.photoUploadPrimaryBtnText}>Upload Photos</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        testID="choose-from-library-btn"
                                        style={styles.photoUploadSecondaryBtn}
                                        onPress={handlePickFromLibrary}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="images-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                                        <Text style={styles.photoUploadSecondaryBtnText}>Gallery</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        testID="take-photo-btn"
                                        style={styles.photoUploadSecondaryBtn}
                                        onPress={handleTakePhoto}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons name="camera-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                                        <Text style={styles.photoUploadSecondaryBtnText}>Camera</Text>
                                    </TouchableOpacity>
                                </View>

                                {isUploadingPhoto && (
                                    <View style={styles.photoLoadingIndicator}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                        <Text style={styles.photoLoadingText}>Processing photos...</Text>
                                    </View>
                                )}

                                {formData.imageUrls.length > 0 ? (
                                    <View style={{ marginTop: spacing.md }}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                                            {formData.imageUrls.map((url, idx) => (
                                                <View key={idx} testID={`photo-preview-item-${idx}`} style={styles.photoThumbContainer}>
                                                    <Image
                                                        testID={`photo-preview-${idx}`}
                                                        source={{ uri: url }}
                                                        style={styles.photoThumb}
                                                    />
                                                    {idx === 0 && (
                                                        <View style={styles.coverBadge}>
                                                            <Ionicons name="star" size={10} color={colors.white} />
                                                            <Text style={styles.coverBadgeText}>Cover</Text>
                                                        </View>
                                                    )}
                                                    <TouchableOpacity
                                                        testID={`remove-photo-btn-${idx}`}
                                                        onPress={() => handleRemovePhoto(idx)}
                                                        style={styles.photoDeleteBtn}
                                                        accessibilityLabel={`Remove photo ${idx + 1}`}
                                                    >
                                                        <Ionicons name="close" size={14} color={colors.white} />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </ScrollView>
                                        <Text style={styles.photoTipText}>
                                            Tip: The first photo will be used as the primary cover photo in search listings.
                                        </Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        testID="empty-photo-upload-box"
                                        style={styles.emptyPhotoBox}
                                        onPress={handleUploadPrompt}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.emptyPhotoIconCircle}>
                                            <Ionicons name="camera-outline" size={28} color={colors.primary} />
                                        </View>
                                        <Text style={styles.emptyPhotoHeading}>Upload photos of your parking space</Text>
                                        <Text style={styles.emptyPhotoText}>
                                            Tap to take a photo or select from your gallery. Listings with photos receive 3x more bookings!
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* Subtle secondary option for URL if needed */}
                                <View style={styles.photoUrlToggleContainer}>
                                    <TouchableOpacity
                                        testID="toggle-url-input-btn"
                                        onPress={() => setShowUrlInput(!showUrlInput)}
                                        style={styles.photoUrlToggleBtn}
                                    >
                                        <Ionicons
                                            name={showUrlInput ? 'chevron-up-outline' : 'link-outline'}
                                            size={14}
                                            color={colors.textSecondary}
                                        />
                                        <Text style={styles.photoUrlToggleText}>
                                            {showUrlInput ? 'Hide photo URL input' : 'Or add via photo URL'}
                                        </Text>
                                    </TouchableOpacity>

                                    {showUrlInput && (
                                        <View style={styles.urlInputRow}>
                                            <Input
                                                testID="photo-url-input"
                                                value={photoInput}
                                                onChangeText={setPhotoInput}
                                                placeholder="Paste image URL (https://...)"
                                                style={{ flex: 1, marginBottom: 0 }}
                                            />
                                            <Button
                                                testID="add-photo-url-btn"
                                                title="Add"
                                                onPress={handleAddPhoto}
                                                size="sm"
                                                variant="secondary"
                                            />
                                        </View>
                                    )}
                                </View>
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
                            {viewMode === 'all' && (
                                <Button
                                    title={isEditing ? 'Save Changes' : 'Create Space'}
                                    onPress={handleSubmit}
                                    loading={createLoading || parkingLoading}
                                    style={styles.submitBtn}
                                    testID="submit-parking-button"
                                    icon={<Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={colors.white} />}
                                />
                            )}

                            {isEditing && (
                                <Button
                                    title="Delete Parking Space"
                                    onPress={handleDelete}
                                    variant="danger"
                                    style={{ marginTop: spacing.sm }}
                                    icon={<Ionicons name="trash-outline" size={20} color={colors.white} />}
                                    testID="delete-parking-space-button"
                                />
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Sticky Navigation Bar (When in Steps Mode) */}
                {viewMode === 'steps' && (
                    <View style={styles.stickyFooter} testID="sticky-stepper-footer">
                        {activeStep > 1 && (
                            <Button
                                title="Back"
                                variant="outline"
                                onPress={() => handleStepChange(activeStep - 1)}
                                style={styles.navBackBtn}
                                icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />}
                                testID="stepper-back-btn"
                            />
                        )}
                        {activeStep < 4 ? (
                            <Button
                                title={`Next: ${STEPS[activeStep]?.label}`}
                                onPress={() => handleStepChange(activeStep + 1)}
                                style={activeStep === 1 ? styles.navSingleNextBtn : styles.navNextBtn}
                                icon={<Ionicons name="arrow-forward" size={18} color={colors.white} />}
                                testID="stepper-next-btn"
                            />
                        ) : (
                            <Button
                                title={isEditing ? 'Save Changes' : 'Create Space'}
                                onPress={handleSubmit}
                                loading={createLoading || parkingLoading}
                                style={styles.navNextBtn}
                                icon={<Ionicons name={isEditing ? 'save-outline' : 'add-circle-outline'} size={20} color={colors.white} />}
                                testID="submit-parking-button"
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
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    headerDeleteBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    // Segmented Toggle
    segmentedToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: spacing.radius.full,
        padding: 3,
        borderWidth: 1,
        borderColor: colors.border,
    },
    segmentedToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: spacing.radius.full,
    },
    segmentedToggleBtnActive: {
        backgroundColor: colors.primary,
        ...shadows.sm,
    },
    segmentedToggleText: {
        ...typography.caption,
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    segmentedToggleTextActive: {
        color: colors.white,
        fontWeight: '700',
    },
    viewModeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    viewModeText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.primary,
    },

    // Section Divider Headers in 'All' Mode
    sectionDividerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        paddingHorizontal: 2,
    },
    sectionNumberBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionNumberText: {
        ...typography.caption,
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
    },
    sectionHeaderTitle: {
        ...typography.label,
        fontSize: 13,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    stepTabIconError: {
        backgroundColor: '#DC2626',
    },
    stepTabTextError: {
        color: '#DC2626',
        fontWeight: '700',
    },

    // Validation Summary Banner
    validationBanner: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: spacing.radius.lg,
        padding: spacing.md,
        marginBottom: spacing.base,
        ...shadows.card,
    },
    validationBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    validationBannerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    validationBannerTitle: {
        ...typography.body,
        fontWeight: '700',
        color: '#991B1B',
    },
    validationBannerDismiss: {
        padding: 4,
    },
    validationBannerSubtitle: {
        ...typography.caption,
        color: '#B91C1C',
        marginBottom: spacing.sm,
    },
    validationList: {
        gap: 6,
    },
    validationListItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#FFFFFF',
        paddingVertical: 6,
        paddingHorizontal: spacing.sm,
        borderRadius: spacing.radius.sm,
        borderWidth: 1,
        borderColor: '#FEE2E2',
    },
    validationListText: {
        ...typography.caption,
        color: '#7F1D1D',
        flex: 1,
        lineHeight: 18,
    },
    validationStepBadgeText: {
        fontWeight: '700',
        color: '#DC2626',
    },
    validationFieldLabelText: {
        fontWeight: '600',
        color: colors.textPrimary,
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
    photoCountBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: spacing.radius.full,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    photoCountBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
    },
    photoActionsRow: {
        flexDirection: 'row',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    photoUploadPrimaryBtn: {
        flex: 1.3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm + 2,
        borderRadius: spacing.radius.md,
        ...shadows.sm,
    },
    photoUploadPrimaryBtnText: {
        ...typography.button,
        fontSize: 13,
        color: colors.white,
        fontWeight: '600',
    },
    photoUploadSecondaryBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: colors.borderLight,
        paddingVertical: spacing.sm + 2,
        borderRadius: spacing.radius.md,
    },
    photoUploadSecondaryBtnText: {
        ...typography.caption,
        fontSize: 13,
        color: colors.primaryDark,
        fontWeight: '600',
    },
    photoLoadingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    photoLoadingText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
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
    coverBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: 'rgba(0,0,0,0.65)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    coverBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.white,
    },
    photoTipText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 11,
        marginTop: spacing.xs,
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
        backgroundColor: '#F8FAFC',
    },
    emptyPhotoIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
    },
    emptyPhotoHeading: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 2,
        textAlign: 'center',
    },
    emptyPhotoText: {
        ...typography.caption,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
    },
    photoUrlToggleContainer: {
        marginTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        paddingTop: spacing.xs,
    },
    photoUrlToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 4,
    },
    photoUrlToggleText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontSize: 12,
    },
    urlInputRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        marginTop: spacing.xs,
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
    navSingleNextBtn: {
        flex: 1,
    },
});

export default CreateParkingScreen;
