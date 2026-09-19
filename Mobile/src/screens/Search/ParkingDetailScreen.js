/**
 * ParkingDetailScreen
 * Hero image design with sticky Book Now bar
 * Ownership-aware: own listings show manage options
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { EventBus } from '../../utils/EventBus';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Dimensions, Share,
    ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getParkingDetailThunk, getParkingForecastThunk, deleteParkingThunk, toggleParkingActiveThunk } from '../../store/slices/parkingSlice';
import { getReviewsThunk, respondToReviewThunk } from '../../store/slices/reviewSlice';
import { toggleFavoriteThunk } from '../../store/slices/favoriteSlice';
import { useAuth } from '../../hooks/useAuth';
import StarRating from '../../components/Common/StarRating';
import { DetailSkeleton } from '../../components/Common/ShimmerPlaceholder';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDate, formatTime, getParkingImageUrls } from '../../utils/formatters';
import { ParkingTypeLabels, PricingTypeLabels } from '../../utils/constants';
import chatService from '../../services/chat/chatService';
import posthogService, { AnalyticsEvents } from '../../services/analytics/posthogService';
import locationAutocompleteService, { toTitleCase } from '../../services/location/locationAutocompleteService';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 300;

const normalizeLocationText = (address, city) => {
    const rawAddress = (address || '').trim();
    const rawCity = (city || '').trim();

    const resolvedAddress = locationAutocompleteService.resolveStandardizedPlace(rawAddress);
    const resolvedCity = locationAutocompleteService.resolveStandardizedPlace(rawCity);

    const normAddress = resolvedAddress ? resolvedAddress.primaryText : toTitleCase(rawAddress);
    const normCity = resolvedCity ? (resolvedCity.city || resolvedCity.primaryText) : toTitleCase(rawCity);

    if (normAddress && normCity && !normAddress.toLowerCase().includes(normCity.toLowerCase())) {
        return `${normAddress}, ${normCity}`;
    }
    return normAddress || normCity || 'Location not specified';
};

const getForecastBuckets = (forecast) => {
    const buckets = forecast?.buckets || forecast?.forecast || forecast?.items || forecast;
    return Array.isArray(buckets) ? buckets : [];
};

const getBucketStart = (bucket) =>
    bucket.startDateTime || bucket.startTime || bucket.startsAt || bucket.startUtc;

const getBucketAvailability = (bucket) =>
    bucket.availableSpots ?? bucket.availableSlots ?? bucket.availableCount ?? bucket.remainingSpots;

const ParkingDetailScreen = ({ navigation, route }) => {
    const parkingId = route?.params?.parkingId || route?.params?.id;
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const { user } = useAuth();
    const {
        selectedParking: parking,
        detailLoading,
        forecast,
        forecastLoading,
        togglingListingIds = [],
    } = useSelector((s) => s.parking);
    const { reviews } = useSelector((s) => s.review);
    const [chatLoading, setChatLoading] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const heroScrollRef = useRef(null);

    // Host reply state
    const [replyModalVisible, setReplyModalVisible] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    // Owner Kebab Menu & Preview state
    const [kebabMenuVisible, setKebabMenuVisible] = useState(false);
    const [previewAsRenter, setPreviewAsRenter] = useState(false);

    const handleSendReply = async () => {
        if (!selectedReview || !replyText.trim()) return;
        setSubmittingReply(true);
        const res = await dispatch(respondToReviewThunk({ reviewId: selectedReview.id, responseText: replyText.trim() }));
        setSubmittingReply(false);
        if (!res.error) {
            setReplyModalVisible(false);
            setReplyText('');
            setSelectedReview(null);
        } else {
            Alert.alert('Error', res.payload || 'Failed to submit host response.');
        }
    };

    useEffect(() => {
        dispatch(getParkingDetailThunk(parkingId));
        dispatch(getReviewsThunk(parkingId));
        dispatch(getParkingForecastThunk({ parkingSpaceId: parkingId }));
    }, [dispatch, parkingId]);

    useEffect(() => {
        if (parking?.isFavorited !== undefined) setIsFavorited(parking.isFavorited);
    }, [parking?.isFavorited]);

    const imageUrls = useMemo(() => getParkingImageUrls(parking), [parking]);

    useEffect(() => {
        setActiveImageIndex(0);
        if (parking?.id) {
            posthogService.trackEvent(AnalyticsEvents.VIEW_PARKING_DETAIL, {
                parkingSpaceId: parking.id,
                title: parking.title,
                city: parking.city,
                hourlyRate: parking.hourlyRate,
                effectiveRate: parking.effectiveHourlyRate ?? parking.hourlyRate,
                hasEvCharging: Boolean(parking.hasEvCharging),
                instantBook: Boolean(parking.instantBook),
            });
        }
    }, [parking?.id]);

    useEffect(() => {
        if (imageUrls.length <= 1) {
            return undefined;
        }

        const intervalId = setInterval(() => {
            setActiveImageIndex((currentIndex) => {
                const nextIndex = (currentIndex + 1) % imageUrls.length;
                heroScrollRef.current?.scrollTo({
                    x: nextIndex * width,
                    animated: true,
                });
                return nextIndex;
            });
        }, 3500);

        return () => clearInterval(intervalId);
    }, [imageUrls]);

    const isOwnListingReal = Boolean(
        route?.params?.isOwnListing ||
        (user?.id && (
            (parking?.ownerId && String(parking.ownerId).trim().toLowerCase() === String(user.id).trim().toLowerCase()) ||
            (parking?.userId && String(parking.userId).trim().toLowerCase() === String(user.id).trim().toLowerCase()) ||
            (parking?.vendorId && String(parking.vendorId).trim().toLowerCase() === String(user.id).trim().toLowerCase())
        ))
    );
    const isOwnListing = isOwnListingReal && !previewAsRenter;

    const isListingActive = parking?.isActive !== undefined ? Boolean(parking.isActive) : true;
    const isTogglingActive = Boolean(togglingListingIds?.includes(parking?.id));

    const handleToggleActive = useCallback(async () => {
        if (!parking?.id || isTogglingActive) return;
        try {
            await dispatch(toggleParkingActiveThunk(parking.id)).unwrap();
        } catch (error) {
            EventBus.emit('SHOW_ERROR_BANNER', {
                title: 'Error',
                message: error || 'Failed to update listing status.',
            });
        }
    }, [dispatch, parking?.id, isTogglingActive]);

    const handleDeleteListing = useCallback(() => {
        if (!parking?.id) return;
        Alert.alert(
            `Delete "${parking.title}"?`,
            "This can't be undone.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const res = await dispatch(deleteParkingThunk(parking.id));
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
    }, [dispatch, parking, navigation]);

    const handleToggleFavorite = useCallback(async () => {
        setFavLoading(true);
        try {
            const result = await dispatch(toggleFavoriteThunk(parkingId)).unwrap();
            const nextFav = result.isFavorited ?? !isFavorited;
            setIsFavorited(nextFav);
            posthogService.trackEvent(AnalyticsEvents.TOGGLE_FAVORITE, {
                parkingSpaceId: parkingId,
                isFavorited: nextFav,
            });
        } catch {
            EventBus.emit('SHOW_ERROR_BANNER', { title: 'Error', message: 'Could not update favorite.' });
        } finally {
            setFavLoading(false);
        }
    }, [dispatch, parkingId, isFavorited]);

    const handleChatWithOwner = useCallback(async () => {
        if (!user) {
            Alert.alert('Sign In Required', 'Please sign in to chat with the parking space owner.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
            ]);
            return;
        }

        if (isOwnListing) {
            Alert.alert('Own Listing', 'You cannot start a chat with yourself on your own listing.');
            return;
        }

        setChatLoading(true);
        try {
            let existing = null;
            try {
                existing = await chatService.findConversationByParkingSpace(parkingId);
            } catch (_) {
                // Graceful fallback
            }

            const convId = existing?.id || existing?.Id || existing?._id || null;
            const participantName = existing?.otherParticipantName || existing?.OtherParticipantName || parking?.ownerName || 'Space Owner';
            const spaceTitle = existing?.parkingSpaceTitle || existing?.ParkingSpaceTitle || parking?.title || 'Parking Space';

            navigation.navigate('ChatScreen', {
                conversationId: convId,
                parkingSpaceId: parkingId,
                parkingId,
                participantName,
                parkingTitle: spaceTitle,
            });
        } catch {
            navigation.navigate('ChatScreen', {
                conversationId: null,
                parkingSpaceId: parkingId,
                parkingId,
                participantName: parking?.ownerName || 'Space Owner',
                parkingTitle: parking?.title || 'Parking Space',
            });
        } finally {
            setChatLoading(false);
        }
    }, [parkingId, parking, navigation, user, isOwnListing]);

    const handleShare = useCallback(async () => {
        try {
            await Share.share({
                message: `Check out "${parking?.title}" on ParkEase!\n📍 ${parking?.address}, ${parking?.city}\n💰 ${formatCurrency(parking?.hourlyRate)}/hr\n\nDownload ParkEase to book this spot.`,
                title: parking?.title || 'ParkEase Parking Spot',
            });
        } catch (error) {
            // User cancelled or error
        }
    }, [parking]);

    // Improve UI stability: Only show detail if it matches the requested ID and isn't loading
    if (detailLoading || !parking || parking.id !== parkingId) {
        return (
            <View style={styles.screen}>
                <TouchableOpacity
                    style={[styles.heroBtn, styles.backBtn, { top: insets.top + 8, zIndex: 10 }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="chevron-back" size={22} color={colors.white} />
                </TouchableOpacity>
                <DetailSkeleton />
            </View>
        );
    }

    const hasImage = imageUrls.length > 0;
    const typeLabel = ParkingTypeLabels[parking.parkingType] || 'Parking';
    const forecastBuckets = getForecastBuckets(forecast).slice(0, 6);

    return (
        <View style={styles.screen}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Hero Image */}
                <View style={styles.heroContainer}>
                    {hasImage ? (
                        <>
                            <ScrollView
                                ref={heroScrollRef}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onMomentumScrollEnd={(event) => {
                                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                                    setActiveImageIndex(nextIndex);
                                }}
                            >
                                {imageUrls.map((imageUrl) => (
                                    <Image key={imageUrl} source={{ uri: imageUrl }} style={styles.heroImage} />
                                ))}
                            </ScrollView>
                            {imageUrls.length > 1 && (
                                <View style={styles.pagination}>
                                    {imageUrls.map((imageUrl, index) => (
                                        <View
                                            key={`${imageUrl}-${index}`}
                                            style={[
                                                styles.paginationDot,
                                                index === activeImageIndex && styles.paginationDotActive,
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}
                            {imageUrls.length > 1 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.thumbnailRail}
                                    style={styles.thumbnailRailWrapper}
                                >
                                    {imageUrls.map((imageUrl, index) => (
                                        <TouchableOpacity
                                            key={`thumb-${imageUrl}-${index}`}
                                            activeOpacity={0.9}
                                            onPress={() => {
                                                setActiveImageIndex(index);
                                                heroScrollRef.current?.scrollTo({
                                                    x: index * width,
                                                    animated: true,
                                                });
                                            }}
                                            style={[
                                                styles.thumbnailButton,
                                                index === activeImageIndex && styles.thumbnailButtonActive,
                                            ]}
                                        >
                                            <Image source={{ uri: imageUrl }} style={styles.thumbnailImage} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </>
                    ) : (
                        <View style={styles.neutralHeroContainer} testID="neutral-parking-graphic">
                            <View style={styles.neutralHeroBackdrop}>
                                <View style={styles.neutralHeroLot}>
                                    <View style={styles.neutralLotLine} />
                                    <View style={styles.neutralLotBay}>
                                        <View style={styles.neutralLotPill}>
                                            <Text style={styles.neutralLotPillText}>PARKEASE BAY</Text>
                                        </View>
                                        <View style={styles.neutralCarCircle}>
                                            <Ionicons name="car-sport" size={54} color={colors.primary} />
                                        </View>
                                        <View style={styles.neutralLotBadge}>
                                            <Ionicons name="shield-checkmark" size={14} color="#059669" />
                                            <Text style={styles.neutralLotBadgeText}>Verified Facility</Text>
                                        </View>
                                    </View>
                                    <View style={styles.neutralLotLine} />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Overlay Buttons */}
                    <TouchableOpacity
                        style={[styles.heroBtn, styles.backBtn, { top: insets.top + 8 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="chevron-back" size={22} color={colors.white} />
                    </TouchableOpacity>

                    <View style={[styles.heroTopRight, { top: insets.top + 8 }]}>
                        <TouchableOpacity
                            style={styles.heroBtn}
                            onPress={handleShare}
                            accessibilityRole="button"
                            accessibilityLabel="Share Parking Spot"
                            testID="hero-share-btn"
                        >
                            <Ionicons name="share-outline" size={20} color={colors.white} />
                        </TouchableOpacity>
                        {isOwnListing ? (
                            <TouchableOpacity
                                style={styles.heroBtn}
                                onPress={() => setKebabMenuVisible(true)}
                                accessibilityRole="button"
                                accessibilityLabel="Listing Options"
                                testID="hero-kebab-btn"
                            >
                                <Ionicons name="ellipsis-vertical" size={20} color={colors.white} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.heroBtn}
                                onPress={handleToggleFavorite}
                                disabled={favLoading}
                                accessibilityRole="button"
                                accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                                testID="hero-favorite-btn"
                            >
                                <Ionicons
                                    name={isFavorited ? 'heart' : 'heart-outline'}
                                    size={20}
                                    color={isFavorited ? '#EF4444' : colors.white}
                                />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Price Badge */}
                    <View style={styles.heroPriceBadge}>
                        {!isOwnListing && <Text style={styles.heroPriceLabel}>STARTING FROM</Text>}
                        <View style={styles.heroPriceRow}>
                            <Text style={styles.heroPriceValue}>
                                {formatCurrency(parking.hourlyRate)}
                            </Text>
                            <Text style={styles.heroPriceUnit}>/hr</Text>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {previewAsRenter && (
                        <View style={styles.previewRenterBanner} testID="preview-renter-banner">
                            <Ionicons name="eye-outline" size={16} color={colors.white} />
                            <Text style={styles.previewRenterText}>Viewing as renter</Text>
                            <TouchableOpacity
                                style={styles.previewRenterExitBtn}
                                onPress={() => setPreviewAsRenter(false)}
                                testID="exit-preview-btn"
                            >
                                <Text style={styles.previewRenterExitText}>Exit Preview</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Type + Status Badge + Rating */}
                    <View style={styles.typeRatingRow}>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{typeLabel.toUpperCase()}</Text>
                        </View>
                        {isOwnListing && (
                            <View
                                style={[
                                    styles.statusBadge,
                                    isListingActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
                                ]}
                                testID="listing-status-badge"
                            >
                                <View
                                    style={[
                                        styles.statusDot,
                                        isListingActive ? styles.statusDotActive : styles.statusDotInactive,
                                    ]}
                                />
                                <Text
                                    style={[
                                        styles.statusBadgeText,
                                        isListingActive ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                                    ]}
                                >
                                    {isListingActive ? 'ACTIVE' : 'INACTIVE'}
                                </Text>
                            </View>
                        )}
                        <View style={styles.ratingRow}>
                            {parking.totalReviews > 0 ? (
                                <>
                                    <Ionicons name="star" size={16} color="#F59E0B" />
                                    <Text style={styles.ratingText}>
                                        {parking.averageRating?.toFixed(1) || '0.0'}
                                    </Text>
                                    <Text style={styles.ratingCount}>({parking.totalReviews})</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="star-outline" size={15} color={colors.textTertiary} />
                                    <Text style={[styles.ratingCount, { fontSize: 13, color: colors.textTertiary }]}>No reviews</Text>
                                </>
                            )}
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title} testID="parking-title">{parking.title}</Text>

                    {/* Address */}
                    <View style={styles.addressRow}>
                        <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
                        <Text style={styles.addressText} testID="parking-address-text">
                            {normalizeLocationText(parking.address, parking.city)}
                        </Text>
                    </View>

                    {/* Location Map Preview */}
                    <View style={styles.mapSection} testID="map-preview-section">
                        <View style={styles.mapCard}>
                            <View style={styles.mapVisualContainer}>
                                <View style={styles.mapPlaceholderBg}>
                                    <View style={styles.mapRoadHorizontal} />
                                    <View style={styles.mapRoadVertical} />
                                    <View style={styles.mapPinContainer}>
                                        <View style={styles.mapPinPulse} />
                                        <Ionicons name="location" size={28} color={colors.primary} />
                                    </View>
                                    <View style={styles.mapPinBadge}>
                                        <Text style={styles.mapPinBadgeText} numberOfLines={1}>
                                            Entrance Pin
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.mapFooter}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.mapFooterAddress} numberOfLines={1}>
                                        {normalizeLocationText(parking.address, parking.city)}
                                    </Text>
                                    <Text style={styles.mapFooterHint}>
                                        {isOwnListing ? 'Precise entrance pin visible to renters' : 'Tap to open directions in maps'}
                                    </Text>
                                </View>
                                {isOwnListing ? (
                                    <TouchableOpacity
                                        style={styles.mapActionBtn}
                                        onPress={() => {
                                            Alert.alert(
                                                'Verify Pin Location',
                                                `Pin coordinates: ${parking.latitude || 18.4575}, ${parking.longitude || 73.8677}\n\nAddress: ${normalizeLocationText(parking.address, parking.city)}\n\nWould you like to edit your listing to adjust the map pin?`,
                                                [
                                                    { text: 'Looks Good', style: 'cancel' },
                                                    {
                                                        text: 'Adjust Pin',
                                                        onPress: () => navigation.navigate('CreateParking', { editData: parking }),
                                                    },
                                                ]
                                            );
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Verify pin location"
                                        testID="verify-pin-btn"
                                    >
                                        <Ionicons name="navigate-circle-outline" size={16} color={colors.primary} />
                                        <Text style={styles.mapActionBtnText}>Verify pin location</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.mapActionBtn}
                                        onPress={handleShare}
                                        accessibilityRole="button"
                                        accessibilityLabel="Get Directions"
                                        testID="get-directions-btn"
                                    >
                                        <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                                        <Text style={styles.mapActionBtnText}>Directions</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Own listing banner with Status Toggle */}
                    {isOwnListing && (
                        <View style={styles.ownerBanner} testID="owner-listing-banner">
                            <View style={styles.ownerBannerInfo}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
                                    <Text style={styles.ownerBannerText}>This is your listing</Text>
                                </View>
                                <Text style={styles.ownerBannerStatusText}>
                                    Status: <Text style={{ fontWeight: '700', color: isListingActive ? '#059669' : '#64748B' }}>
                                        {isListingActive ? 'Active (Visible to renters)' : 'Inactive (Hidden from search)'}
                                    </Text>
                                </Text>
                            </View>
                            <View style={styles.ownerBannerControls}>
                                {isTogglingActive && (
                                    <ActivityIndicator
                                        size="small"
                                        color={colors.primary}
                                        style={{ marginRight: 6 }}
                                        testID="toggle-active-spinner"
                                    />
                                )}
                                <Switch
                                    value={isListingActive}
                                    onValueChange={handleToggleActive}
                                    disabled={isTogglingActive}
                                    trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                                    thumbColor={isListingActive ? '#10B981' : '#94A3B8'}
                                    accessibilityRole="switch"
                                    accessibilityLabel={`Toggle listing status. Currently ${isListingActive ? 'Active' : 'Inactive'}`}
                                    testID="owner-status-toggle"
                                />
                            </View>
                        </View>
                    )}

                    {/* Photo Trust & Quality Callout for Owners */}
                    {isOwnListing && (
                        <View style={styles.photoTrustBanner} testID="photo-trust-banner">
                            <Ionicons name="camera-outline" size={20} color="#0D9488" style={{ marginTop: 2 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.photoTrustTitle}>Upload Real Photos for Trust</Text>
                                <Text style={styles.photoTrustSubtitle}>
                                    Please ensure you upload actual photos of your parking spot, entrance, and signage. Real photos build trust with drivers and increase bookings by 3x compared to illustrations or memes.
                                </Text>
                                <TouchableOpacity
                                    style={styles.photoTrustActionBtn}
                                    onPress={() => navigation.navigate('CreateParking', { editData: parking })}
                                    accessibilityRole="button"
                                    accessibilityLabel="Update Listing Photos"
                                    testID="update-photos-btn"
                                >
                                    <Ionicons name="images-outline" size={14} color="#0F766E" />
                                    <Text style={styles.photoTrustActionBtnText}>Update Photos</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Owner Card */}
                    {!isOwnListing && (
                        <TouchableOpacity style={styles.ownerCard} onPress={handleChatWithOwner}>
                            <View style={styles.ownerAvatar}>
                                <Ionicons name="person" size={20} color={colors.white} />
                            </View>
                            <View style={styles.ownerInfo}>
                                <Text style={styles.ownerName}>
                                    {parking.ownerName || 'Space Owner'}
                                </Text>
                                <Text style={styles.ownerSince}>
                                    Lister since {parking.createdAt ? new Date(parking.createdAt).getFullYear() : '2024'}
                                </Text>
                            </View>
                            <View style={styles.chatActionBtn}>
                                {chatLoading ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <>
                                        <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                                        <Text style={styles.chatActionText}>Chat</Text>
                                    </>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Description */}
                    {parking.description && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>About this space</Text>
                            <Text style={styles.description}>{parking.description}</Text>
                        </View>
                    )}

                    {/* Features & Amenities */}
                    {parking.amenities?.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Features & Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                {parking.amenities.map((amenity, idx) => (
                                    <View key={idx} style={styles.amenityChip}>
                                        <Ionicons name="checkmark" size={16} color={colors.primary} />
                                        <Text style={styles.amenityText}>{amenity}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Quick Info */}
                    <View style={styles.quickInfoRow}>
                        <View style={styles.quickInfoItem}>
                            <Ionicons name="car-outline" size={18} color={colors.primary} />
                            <Text style={styles.quickInfoText}>
                                {`${parking.totalSpots || 1} ${parking.totalSpots === 1 ? 'spot' : 'spots'} · ${Math.max(0, (parking.totalSpots || 0) - (parking.availableSpots ?? parking.totalSpots ?? 0))} occupied`}
                            </Text>
                        </View>
                        <View style={styles.quickInfoItem}>
                            <Ionicons name="time-outline" size={18} color={colors.primary} />
                            <Text style={styles.quickInfoText}>
                                {parking.is24Hours ? '24/7' : 'Limited hours'}
                            </Text>
                        </View>
                    </View>

                    {/* EV Charging Capabilities */}
                    {parking.hasEvCharging && (
                        <View style={[styles.section, { backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primaryDark || '#059669', marginBottom: 16 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <Ionicons name="flash" size={18} color={colors.primary} />
                                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Electric Vehicle (EV) Charging Station</Text>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                <Text style={styles.description}>
                                    ⚡ <Text style={{ fontWeight: '600' }}>Chargers:</Text> {parking.evChargerCount || 1} {(parking.evChargerCount || 1) === 1 ? 'bay' : 'bays'}
                                </Text>
                                <Text style={styles.description}>
                                    💰 <Text style={{ fontWeight: '600' }}>EV Charging:</Text> {parking.evPricingMode === 1 ? `${formatCurrency(parking.evRatePerKwh || 18)}/kWh (in addition to parking)` : `${formatCurrency(parking.evChargingRatePerHour || 30)}/hr (in addition to parking)`}
                                </Text>
                                {parking.evIdleRatePerHour > 0 && (
                                    <Text style={styles.description}>
                                        ⏱️ <Text style={{ fontWeight: '600' }}>Idle fee:</Text> {formatCurrency(parking.evIdleRatePerHour)}/hr (after {parking.evIdleGraceMinutes || 15}m grace)
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Indoor Bay Guidance & Valet */}
                    {(parking.isBayGuidanceEnabled || parking.isValetEnabled || parking.isLprEnabled) && (
                        <View style={[styles.section, { backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: 16 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                <Ionicons name="navigate-circle-outline" size={18} color={colors.primary} />
                                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.textPrimary }}>Smart Facility & Access</Text>
                            </View>
                            {parking.isLprEnabled && (
                                <Text style={[styles.description, { marginBottom: 4 }]}>
                                    📷 <Text style={{ fontWeight: '600' }}>Ticketless LPR Entry:</Text> License plate camera recognition active at barrier.
                                </Text>
                            )}
                            {parking.isBayGuidanceEnabled && (
                                <Text style={[styles.description, { marginBottom: 4 }]}>
                                    📍 <Text style={{ fontWeight: '600' }}>Indoor Bay Guidance:</Text> {parking.defaultFacilityLevel ? `Level ${parking.defaultFacilityLevel}` : ''} {parking.defaultFacilityZone ? `Zone ${parking.defaultFacilityZone}` : ''} {parking.indoorGuidanceNotes ? `— ${parking.indoorGuidanceNotes}` : ''}
                                </Text>
                            )}
                            {parking.isValetEnabled && (
                                <Text style={styles.description}>
                                    👔 <Text style={{ fontWeight: '600' }}>Valet Service Available:</Text> {parking.valetFee ? `${formatCurrency(parking.valetFee)} service fee` : 'Complimentary upon arrival'}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* Spot Availability Prediction & Forecast */}
                    {forecast && (forecast.currentAvailabilityBand || forecast.CurrentAvailabilityBand) && (
                        <View style={[styles.section, { backgroundColor: colors.surface, padding: 14, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: 16 }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="sparkles" size={18} color={colors.primary} />
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>Availability Forecast</Text>
                                </View>
                                <View style={{ backgroundColor: colors.successSoft, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                                    <Text style={{ fontSize: 12, color: colors.successDark, fontWeight: '700' }}>
                                        {forecast.currentAvailabilityBand || forecast.CurrentAvailabilityBand || 'High'} Demand
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.description}>
                                Predicted free spots: <Text style={{ fontWeight: '700', color: colors.primary }}>{forecast.currentPredictedAvailableSpots ?? forecast.CurrentPredictedAvailableSpots ?? parking.availableSpots}</Text> / {parking.totalSpots} spots · Confidence: {Math.round((forecast.currentConfidenceScore ?? forecast.CurrentConfidenceScore ?? 0.85) * 100)}%
                            </Text>
                        </View>
                    )}

                    {/* Availability forecast */}
                    {(forecastLoading || forecastBuckets.length > 0) && (
                        <View style={styles.section}>
                            <View style={styles.sectionRow}>
                                <Text style={styles.sectionTitle}>Next availability</Text>
                                <Text style={styles.forecastCaption}>Next 24 hours</Text>
                            </View>
                            {forecastLoading && forecastBuckets.length === 0 ? (
                                <ActivityIndicator color={colors.primary} />
                            ) : (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.forecastRail}>
                                    {forecastBuckets.map((bucket, index) => {
                                        const start = getBucketStart(bucket);
                                        const availability = getBucketAvailability(bucket);
                                        return (
                                            <View key={`${start || 'bucket'}-${index}`} style={styles.forecastBucket}>
                                                <Text style={styles.forecastTime}>{start ? formatTime(start) : 'Upcoming'}</Text>
                                                <Text style={styles.forecastSpots}>
                                                    {availability ?? '—'} spots
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>
                    )}

                    {/* Reviews */}
                    <View style={styles.section}>
                        <View style={styles.sectionRow}>
                            <Text style={styles.sectionTitle}>
                                Reviews ({reviews.length})
                            </Text>
                            {reviews.length > 0 && (
                                <TouchableOpacity onPress={() => navigation.navigate('ReviewsList', {
                                    parkingSpaceId: parkingId,
                                    parkingTitle: parking?.title,
                                })}>
                                    <Text style={styles.seeAllText}>See All</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {reviews.length > 0 ? (
                            reviews.slice(0, 2).map((review) => (
                                <View key={review.id} style={styles.reviewItem}>
                                    <View style={styles.reviewHeader}>
                                        <Text style={styles.reviewerName}>{review.userName}</Text>
                                        <StarRating rating={review.rating} size={14} />
                                    </View>
                                    {review.comment && (
                                        <Text style={styles.reviewComment}>{review.comment}</Text>
                                    )}
                                    {review.ownerResponse && (
                                        <View style={styles.ownerReplyBox}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                                <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                                                <Text style={styles.ownerReplyHeader}>Response from Host</Text>
                                            </View>
                                            <Text style={styles.ownerReplyText}>{review.ownerResponse}</Text>
                                        </View>
                                    )}
                                    {isOwnListing && !review.ownerResponse && (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedReview(review);
                                                setReplyText('');
                                                setReplyModalVisible(true);
                                            }}
                                            style={{ marginTop: 6, alignSelf: 'flex-start' }}
                                        >
                                            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                                                💬 Reply as Host
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))
                        ) : (
                            <Text style={{ fontSize: 14, color: colors.textTertiary, marginTop: 4 }}>
                                {isOwnListing
                                    ? 'No reviews yet — share your listing to get bookings.'
                                    : 'No reviews yet. Be the first to book!'}
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Bottom Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                {isOwnListing ? (
                    <>
                        <View style={styles.bottomPriceCol}>
                            <Text style={styles.bottomPriceLabel}>Your Listing</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Text style={styles.bottomPriceValue}>
                                    {formatCurrency(parking.hourlyRate)}
                                </Text>
                                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '500', marginLeft: 2 }}>/hr</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.bottomShareBtn}
                            onPress={handleShare}
                            accessibilityRole="button"
                            accessibilityLabel="Share Listing"
                            testID="share-listing-bottom-button"
                        >
                            <Ionicons name="share-outline" size={18} color={colors.textPrimary} style={{ marginRight: 6 }} />
                            <Text style={styles.bottomShareBtnText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.bookBtn, styles.bottomEditBtn]}
                            onPress={() => navigation.navigate('CreateParking', { editData: parking })}
                            accessibilityRole="button"
                            accessibilityLabel="Edit Listing"
                            testID="edit-listing-bottom-button"
                        >
                            <Ionicons name="create-outline" size={18} color={colors.white} style={{ marginRight: 6 }} />
                            <Text style={styles.bookBtnText}>Edit Space</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.bottomPriceCol}>
                            <Text style={styles.bottomPriceLabel}>Total Price</Text>
                            <Text style={styles.bottomPriceValue}>
                                {formatCurrency(parking.hourlyRate)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.bookBtn}
                            onPress={() => navigation.navigate('BookParking', { parkingId: parking.id })}
                        >
                            <Text style={styles.bookBtnText}>Book Now</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* Host Review Response Modal */}
            {/* Host Reply Modal */}
            <Modal
                visible={replyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setReplyModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            contentContainerStyle={{ paddingBottom: 16 }}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Reply as Host</Text>
                                <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm }}>
                                Responding to {selectedReview?.userName || 'customer'}:
                            </Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Write your official response..."
                                placeholderTextColor={colors.textTertiary}
                                multiline
                                numberOfLines={4}
                                value={replyText}
                                onChangeText={setReplyText}
                                textAlignVertical="top"
                            />
                            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
                                    onPress={() => setReplyModalVisible(false)}
                                >
                                    <Text style={{ ...typography.label, color: colors.textPrimary }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                                    onPress={handleSendReply}
                                    disabled={submittingReply || !replyText.trim()}
                                >
                                    {submittingReply ? (
                                        <ActivityIndicator size="small" color={colors.white} />
                                    ) : (
                                        <Text style={{ ...typography.label, color: colors.white, fontWeight: '700' }}>Send Reply</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Owner Kebab Menu Modal */}
            <Modal
                visible={kebabMenuVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setKebabMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.kebabModalOverlay}
                    activeOpacity={1}
                    onPress={() => setKebabMenuVisible(false)}
                    testID="kebab-modal-backdrop"
                >
                    <View style={styles.kebabModalContent}>
                        <View style={styles.kebabModalHeader}>
                            <Text style={styles.kebabModalTitle}>Listing Options</Text>
                            <TouchableOpacity onPress={() => setKebabMenuVisible(false)} testID="close-kebab-btn">
                                <Ionicons name="close" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.kebabMenuItem}
                            onPress={() => {
                                setKebabMenuVisible(false);
                                handleShare();
                            }}
                            testID="kebab-share-option"
                        >
                            <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
                            <Text style={styles.kebabMenuItemText}>Share Listing</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.kebabMenuItem}
                            onPress={() => {
                                setKebabMenuVisible(false);
                                setPreviewAsRenter((prev) => !prev);
                            }}
                            testID="kebab-preview-option"
                        >
                            <Ionicons name={previewAsRenter ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textPrimary} />
                            <Text style={styles.kebabMenuItemText}>
                                {previewAsRenter ? 'Exit Renter Preview' : 'Preview as Renter'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.kebabMenuDivider} />

                        <TouchableOpacity
                            style={[styles.kebabMenuItem, styles.kebabMenuItemDestructive]}
                            onPress={() => {
                                setKebabMenuVisible(false);
                                handleDeleteListing();
                            }}
                            testID="kebab-delete-option"
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.error || '#EF4444'} />
                            <Text style={styles.kebabMenuItemTextDestructive}>Delete Parking Space</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.white,
    },
    // Hero
    heroContainer: {
        height: HERO_HEIGHT,
        position: 'relative',
    },
    heroImage: {
        width,
        height: '100%',
        resizeMode: 'cover',
    },
    heroPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#E2E8F0',
    },
    heroBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backBtn: {
        position: 'absolute',
        left: 16,
    },
    heroTopRight: {
        position: 'absolute',
        right: 16,
        flexDirection: 'row',
        gap: 8,
    },
    heroPriceBadge: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        backgroundColor: colors.white,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 8,
        ...shadows.md,
    },
    ownerReplyBox: { marginTop: 8, padding: 10, backgroundColor: colors.primarySoft, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.primary },
    ownerReplyHeader: { fontSize: 12, color: colors.primary, fontWeight: '700' },
    ownerReplyText: { fontSize: 13, color: colors.textPrimary, marginTop: 2 },
    pagination: {
        position: 'absolute',
        bottom: 18,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.55)',
    },
    paginationDotActive: {
        width: 22,
        backgroundColor: colors.white,
    },
    thumbnailRailWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 44,
    },
    thumbnailRail: {
        paddingHorizontal: 16,
        gap: 10,
    },
    thumbnailButton: {
        width: 58,
        height: 58,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.45)',
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    thumbnailButtonActive: {
        borderColor: colors.white,
        transform: [{ scale: 1.04 }],
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    heroPriceLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textTertiary,
        letterSpacing: 0.5,
    },
    heroPriceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    heroPriceValue: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    heroPriceUnit: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textTertiary,
        marginLeft: 2,
    },
    // Content
    content: {
        padding: 20,
    },
    typeRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    typeBadge: {
        backgroundColor: '#EBF5FF',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
    },
    typeBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    ratingCount: {
        fontSize: 14,
        color: colors.textTertiary,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: colors.textPrimary,
        lineHeight: 32,
        marginBottom: 8,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 20,
    },
    addressText: {
        fontSize: 14,
        color: colors.textSecondary,
        flex: 1,
    },
    ownerBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#DBEAFE',
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    ownerBannerInfo: {
        flex: 1,
        marginRight: 12,
    },
    ownerBannerText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
    },
    ownerBannerStatusText: {
        fontSize: 12,
        color: '#475569',
        marginTop: 4,
    },
    ownerBannerControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Status Badge in Type/Rating row
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadgeActive: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    statusBadgeInactive: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusDotActive: {
        backgroundColor: '#10B981',
    },
    statusDotInactive: {
        backgroundColor: '#64748B',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statusBadgeTextActive: {
        color: '#047857',
    },
    statusBadgeTextInactive: {
        color: '#475569',
    },
    // Photo Trust Banner
    photoTrustBanner: {
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: 10,
        backgroundColor: '#F0FDFA',
        borderWidth: 1,
        borderColor: '#CCFBF1',
        marginBottom: 16,
    },
    photoTrustTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F766E',
        marginBottom: 2,
    },
    photoTrustSubtitle: {
        fontSize: 12,
        color: '#115E59',
        lineHeight: 17,
        marginBottom: 8,
    },
    photoTrustActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#CCFBF1',
        borderRadius: 6,
    },
    photoTrustActionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0F766E',
    },
    // Owner Card
    ownerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: 14,
        padding: 14,
        marginBottom: 24,
    },
    ownerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    ownerName: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    ownerSince: {
        fontSize: 13,
        color: colors.textTertiary,
        marginTop: 2,
    },
    chatActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: colors.primarySoft, borderRadius: 16,
    },
    chatActionText: { fontSize: 13, fontWeight: '600', color: colors.primary },
    // Sections
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 12,
    },
    sectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    description: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    // Amenities
    amenitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    amenityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    amenityText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    // Quick Info
    quickInfoRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    quickInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.background,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
    },
    quickInfoText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    forecastCaption: {
        fontSize: 12,
        color: colors.textTertiary,
    },
    forecastRail: {
        gap: 8,
        paddingTop: 2,
    },
    forecastBucket: {
        minWidth: 92,
        backgroundColor: colors.background,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    forecastTime: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    forecastSpots: {
        fontSize: 12,
        color: colors.primary,
        marginTop: 4,
    },
    // Reviews
    reviewItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reviewerName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    reviewComment: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 6,
        lineHeight: 20,
    },
    // Bottom Bar
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingHorizontal: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
        ...shadows.lg,
    },
    bottomPriceCol: {
        flex: 1,
    },
    bottomPriceLabel: {
        fontSize: 12,
        color: '#334155', // Darkened for accessibility & contrast ratio (WCAG AA)
        fontWeight: '600',
    },
    bottomPriceValue: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.primary,
    },
    bookBtn: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 40,
    },
    bottomEditBtn: {
        backgroundColor: colors.textPrimary,
        paddingHorizontal: 24,
    },
    bottomShareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 14,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: 16,
        marginRight: spacing.sm,
    },
    bottomShareBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    bottomDeleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 14,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        paddingHorizontal: 16,
        marginLeft: spacing.sm,
    },
    bottomDeleteBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.error || '#EF4444',
    },
    bookBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
    // Neutral Illustrated Parking Graphic
    neutralHeroContainer: {
        width,
        height: HERO_HEIGHT,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    neutralHeroBackdrop: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    neutralHeroLot: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '85%',
        height: '70%',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#CBD5E1',
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        padding: 16,
        ...shadows.sm,
    },
    neutralLotLine: {
        width: 4,
        height: '80%',
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
    },
    neutralLotBay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    neutralLotPill: {
        backgroundColor: '#E0F2FE',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 10,
    },
    neutralLotPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 0.8,
    },
    neutralCarCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EFF6FF',
        borderWidth: 2,
        borderColor: '#BFDBFE',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        ...shadows.sm,
    },
    neutralLotBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
    },
    neutralLotBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#065F46',
    },
    // Preview Renter Banner
    previewRenterBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1E293B',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        marginBottom: 16,
    },
    previewRenterText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.white,
        marginLeft: 8,
        flex: 1,
    },
    previewRenterExitBtn: {
        backgroundColor: '#334155',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },
    previewRenterExitText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.white,
    },
    // Map Preview Section
    mapSection: {
        marginBottom: 20,
    },
    mapCard: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.borderLight,
        overflow: 'hidden',
        ...shadows.sm,
    },
    mapVisualContainer: {
        height: 120,
        backgroundColor: '#E2E8F0',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapPlaceholderBg: {
        width: '100%',
        height: '100%',
        backgroundColor: '#E2E8F0',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapRoadHorizontal: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 24,
        backgroundColor: '#CBD5E1',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#94A3B8',
    },
    mapRoadVertical: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 24,
        backgroundColor: '#CBD5E1',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#94A3B8',
    },
    mapPinContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    mapPinPulse: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(2, 132, 199, 0.25)',
    },
    mapPinBadge: {
        position: 'absolute',
        top: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        zIndex: 2,
        ...shadows.xs,
    },
    mapPinBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    mapFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: colors.white,
    },
    mapFooterAddress: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    mapFooterHint: {
        fontSize: 11,
        color: colors.textTertiary,
        marginTop: 2,
    },
    mapActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        backgroundColor: colors.primarySoft,
        borderRadius: 8,
    },
    mapActionBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    // Kebab Menu Modal
    kebabModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    kebabModalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.lg,
        paddingBottom: 36,
        ...shadows.lg,
    },
    kebabModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    kebabModalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    kebabMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 14,
    },
    kebabMenuItemText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    kebabMenuDivider: {
        height: 1,
        backgroundColor: colors.borderLight,
        marginVertical: 4,
    },
    kebabMenuItemDestructive: {
        marginTop: 2,
    },
    kebabMenuItemTextDestructive: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.error || '#EF4444',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: spacing.screenHorizontal,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: spacing.radius.lg,
        padding: spacing.lg,
        maxHeight: '90%',
        ...shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    modalInput: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: spacing.radius.md,
        padding: spacing.md,
        fontSize: 14,
        color: colors.textPrimary,
        height: 100,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: spacing.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default ParkingDetailScreen;
