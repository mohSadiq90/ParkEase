/**
 * MyListingsScreen
 * Host's parking space listings with quick edit, deep edit, view, filter, search, FAB, and toggle actions
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Switch,
    StyleSheet,
    RefreshControl,
    TextInput,
    Image,
    Platform,
    Alert,
    Modal,
    KeyboardAvoidingView,
    ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
    getMyListingsThunk,
    toggleParkingActiveThunk,
    deleteParkingThunk,
    updateParkingThunk,
} from '../../store/slices/parkingSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import StarRating from '../../components/Common/StarRating';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency } from '../../utils/formatters';
import { ParkingTypeLabels } from '../../utils/constants';

const ListingCard = ({ listing, onToggle, onEdit, onView, onDelete, onQuickEdit }) => {
    const thumbnailUri =
        (typeof listing.imageUrl === 'string' && listing.imageUrl.trim() !== '') ? listing.imageUrl.trim() :
        (Array.isArray(listing.imageUrls) && listing.imageUrls.length > 0 && typeof listing.imageUrls[0] === 'string') ? listing.imageUrls[0] :
        (Array.isArray(listing.images) && listing.images.length > 0 && typeof listing.images[0] === 'string') ? listing.images[0] :
        null;

    const typeLabel = ParkingTypeLabels[listing.parkingType] || 'Standard';

    // Third backend state indicators (e.g. pending approval or suspended)
    const isPendingApproval = listing.status === 'PendingApproval' || listing.approvalStatus === 'Pending';
    const isSuspended = listing.status === 'Suspended' || Boolean(listing.isSuspended);
    const isToggleDisabled = isPendingApproval || isSuspended;

    const hasReviews = Boolean(listing.totalReviews && listing.totalReviews > 0 && listing.averageRating);

    return (
        <Card
            onPress={() => onEdit(listing)}
            accessibilityRole="button"
            accessibilityLabel={`Listing: ${listing.title}. Tap to edit listing.`}
            testID={`listing-card-${listing.id}`}
        >
            <View style={cardStyles.headerRow}>
                {thumbnailUri ? (
                    <Image
                        source={{ uri: thumbnailUri }}
                        style={cardStyles.thumb}
                        resizeMode="cover"
                        testID={`listing-thumb-${listing.id}`}
                    />
                ) : (
                    <View style={cardStyles.thumbPlaceholder} testID={`listing-thumb-placeholder-${listing.id}`}>
                        <Ionicons name="car-outline" size={24} color={colors.primary} />
                    </View>
                )}

                <View style={cardStyles.headerInfo}>
                    <View style={cardStyles.titleChevronRow}>
                        <Text style={cardStyles.title} numberOfLines={1}>
                            {listing.title}
                        </Text>
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={colors.textTertiary}
                            style={cardStyles.chevron}
                            testID={`edit-chevron-${listing.id}`}
                        />
                    </View>
                    <View style={cardStyles.locationRow}>
                        <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
                        <Text style={cardStyles.address} numberOfLines={1}>
                            {listing.address}, {listing.city}
                        </Text>
                    </View>
                </View>

                <View style={cardStyles.headerControls}>
                    <TouchableOpacity
                        style={cardStyles.quickEditBtn}
                        onPress={(e) => {
                            e?.stopPropagation?.();
                            onEdit(listing);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Quick edit ${listing.title}`}
                        testID={`quick-edit-${listing.id}`}
                    >
                        <Ionicons name="pencil" size={15} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={cardStyles.quickDeleteBtn}
                        onPress={(e) => {
                            e?.stopPropagation?.();
                            onDelete(listing);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${listing.title}`}
                        testID={`quick-delete-${listing.id}`}
                    >
                        <Ionicons name="trash-outline" size={15} color={colors.error || '#EF4444'} />
                    </TouchableOpacity>

                    <Switch
                        value={Boolean(listing.isActive)}
                        disabled={isToggleDisabled}
                        onValueChange={() => {
                            if (!isToggleDisabled) {
                                onToggle(listing.id);
                            }
                        }}
                        trackColor={{ false: colors.lightGray, true: colors.successLight }}
                        thumbColor={listing.isActive ? colors.success : colors.mediumGray}
                        accessibilityRole="switch"
                        accessibilityLabel={
                            isPendingApproval
                                ? `Listing ${listing.title} is pending approval and cannot be toggled`
                                : isSuspended
                                ? `Listing ${listing.title} is suspended and cannot be toggled`
                                : `Toggle active status for ${listing.title}`
                        }
                        testID={`toggle-switch-${listing.id}`}
                        style={isToggleDisabled ? { opacity: 0.45 } : null}
                    />
                </View>
            </View>

            {/* Third Backend State Clarification Banners */}
            {isPendingApproval && (
                <View style={cardStyles.pendingBanner} testID={`pending-approval-banner-${listing.id}`}>
                    <Ionicons name="time-outline" size={13} color="#B45309" />
                    <Text style={cardStyles.pendingBannerText}>Pending Approval • Toggle locked while under review</Text>
                </View>
            )}
            {isSuspended && (
                <View style={cardStyles.suspendedBanner} testID={`suspended-banner-${listing.id}`}>
                    <Ionicons name="alert-circle-outline" size={13} color="#B91C1C" />
                    <Text style={cardStyles.suspendedBannerText}>Suspended • Contact support to re-activate</Text>
                </View>
            )}

            {/* Badges / Features */}
            <View style={cardStyles.badgesRow}>
                <View style={cardStyles.chip}>
                    <Text style={cardStyles.chipText}>{typeLabel}</Text>
                </View>
                {Boolean(listing.hasEvCharging) && (
                    <View style={[cardStyles.chip, cardStyles.evChip]}>
                        <Ionicons name="flash" size={11} color="#10B981" />
                        <Text style={[cardStyles.chipText, { color: '#10B981' }]}>EV</Text>
                    </View>
                )}
                {Boolean(listing.isLprEnabled) && (
                    <View style={[cardStyles.chip, cardStyles.lprChip]}>
                        <Ionicons name="camera-outline" size={11} color="#6366F1" />
                        <Text style={[cardStyles.chipText, { color: '#6366F1' }]}>LPR</Text>
                    </View>
                )}
                {Boolean(listing.instantBook) && (
                    <View style={[cardStyles.chip, cardStyles.instantChip]}>
                        <Ionicons name="flash-outline" size={11} color="#F59E0B" />
                        <Text style={[cardStyles.chipText, { color: '#F59E0B' }]}>Instant</Text>
                    </View>
                )}
            </View>

            {/* Interactive Pricing & Availability Surface (Quick-Edit on Tap) */}
            <View style={cardStyles.infoRow}>
                <TouchableOpacity
                    style={cardStyles.infoCard}
                    onPress={(e) => {
                        e?.stopPropagation?.();
                        onQuickEdit(listing, 'rate');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Quick edit hourly rate for ${listing.title}, currently ${formatCurrency(listing.hourlyRate)} per hour`}
                    testID={`quick-edit-rate-${listing.id}`}
                    activeOpacity={0.7}
                >
                    <View style={cardStyles.infoCardHeader}>
                        <Text style={cardStyles.infoLabel}>Hourly Rate</Text>
                        <Ionicons name="pencil" size={11} color={colors.primary} />
                    </View>
                    <Text style={cardStyles.infoValue}>{formatCurrency(listing.hourlyRate)}/hr</Text>
                    <Text style={cardStyles.infoTapHint}>Tap to edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={cardStyles.infoCard}
                    onPress={(e) => {
                        e?.stopPropagation?.();
                        onQuickEdit(listing, 'spots');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Quick edit spots for ${listing.title}, currently ${listing.availableSpots ?? listing.totalSpots} of ${listing.totalSpots} spots`}
                    testID={`quick-edit-spots-${listing.id}`}
                    activeOpacity={0.7}
                >
                    <View style={cardStyles.infoCardHeader}>
                        <Text style={cardStyles.infoLabel}>Capacity</Text>
                        <Ionicons name="pencil" size={11} color={colors.primary} />
                    </View>
                    <Text style={cardStyles.infoValue}>
                        {listing.availableSpots ?? listing.totalSpots}/{listing.totalSpots} spots
                    </Text>
                    <Text style={cardStyles.infoTapHint}>Tap to edit</Text>
                </TouchableOpacity>
            </View>

            {/* Rating / Review Summary: Clean empty state replaces 0.0 rating */}
            <View style={cardStyles.footerRow}>
                {hasReviews ? (
                    <View style={cardStyles.ratingRow} testID={`rating-summary-${listing.id}`}>
                        <StarRating rating={listing.averageRating} size={14} />
                        <Text style={cardStyles.ratingText}>
                            {listing.averageRating.toFixed(1)} ({listing.totalReviews})
                        </Text>
                    </View>
                ) : (
                    <View style={cardStyles.noReviewsRow} testID={`no-reviews-${listing.id}`}>
                        <Ionicons name="chatbubble-outline" size={13} color={colors.textTertiary} />
                        <Text style={cardStyles.noReviewsText}>No reviews yet</Text>
                    </View>
                )}
            </View>

            {/* Action Buttons: View Details, Edit Listing & Delete Listing */}
            <View style={cardStyles.actionRow}>
                <TouchableOpacity
                    style={cardStyles.viewBtn}
                    onPress={(e) => {
                        e?.stopPropagation?.();
                        onView(listing);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${listing.title}`}
                    testID={`view-listing-btn-${listing.id}`}
                >
                    <Ionicons name="eye-outline" size={16} color={colors.textSecondary} />
                    <Text style={cardStyles.viewBtnText}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={cardStyles.editBtn}
                    onPress={(e) => {
                        e?.stopPropagation?.();
                        onEdit(listing);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${listing.title}`}
                    testID={`edit-listing-btn-${listing.id}`}
                >
                    <Ionicons name="create-outline" size={16} color={colors.white} />
                    <Text style={cardStyles.editBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={cardStyles.deleteBtn}
                    onPress={(e) => {
                        e?.stopPropagation?.();
                        onDelete(listing);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${listing.title}`}
                    testID={`delete-listing-btn-${listing.id}`}
                >
                    <Ionicons name="trash-outline" size={16} color={colors.error || '#EF4444'} />
                    <Text style={cardStyles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </Card>
    );
};

const cardStyles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    thumb: {
        width: 52,
        height: 52,
        borderRadius: 10,
        backgroundColor: colors.borderLight,
    },
    thumbPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 10,
        backgroundColor: colors.primarySoft || '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    titleChevronRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    title: {
        ...typography.h4,
        color: colors.textPrimary,
        fontWeight: '600',
        flexShrink: 1,
    },
    chevron: {
        marginTop: 1,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    address: {
        ...typography.caption,
        color: colors.textTertiary,
        flex: 1,
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quickEditBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primarySoft || '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickDeleteBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.xs,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: '#FEF3C7',
    },
    pendingBannerText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#92400E',
    },
    suspendedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: spacing.xs,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: '#FEE2E2',
    },
    suspendedBannerText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#991B1B',
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
    },
    chipText: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    evChip: {
        backgroundColor: '#ECFDF5',
    },
    lprChip: {
        backgroundColor: '#EEF2FF',
    },
    instantChip: {
        backgroundColor: '#FFFBEB',
    },
    infoRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    infoCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    infoLabel: {
        ...typography.caption,
        color: colors.textTertiary,
        fontSize: 11,
    },
    infoValue: {
        ...typography.label,
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: 14,
    },
    infoTapHint: {
        fontSize: 10,
        color: colors.primary,
        fontWeight: '500',
        marginTop: 2,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.sm,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    noReviewsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 2,
    },
    noReviewsText: {
        ...typography.caption,
        color: colors.textTertiary,
        fontSize: 12,
        fontStyle: 'italic',
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    viewBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surface,
    },
    viewBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    editBtn: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: colors.primary,
        ...shadows.button,
    },
    editBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.white,
    },
    deleteBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FECACA',
        backgroundColor: '#FEF2F2',
    },
    deleteBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.error || '#EF4444',
    },
});

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
];

const MyListingsScreen = ({ navigation, route }) => {
    const dispatch = useDispatch();
    const { myListings, listingsLoading } = useSelector((s) => s.parking);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const initialFilter = route?.params?.filter || route?.params?.initialFilter || 'all';
    const [activeFilter, setActiveFilter] = useState(initialFilter);

    // Quick Edit modal states
    const [quickEditModalVisible, setQuickEditModalVisible] = useState(false);
    const [quickEditTarget, setQuickEditTarget] = useState(null);
    const [quickRate, setQuickRate] = useState('');
    const [quickTotalSpots, setQuickTotalSpots] = useState('');
    const [quickAvailableSpots, setQuickAvailableSpots] = useState('');
    const [savingQuickEdit, setSavingQuickEdit] = useState(false);

    useEffect(() => {
        if (route?.params?.filter || route?.params?.initialFilter) {
            setActiveFilter(route?.params?.filter || route?.params?.initialFilter);
        }
    }, [route?.params?.filter, route?.params?.initialFilter]);

    // Refresh listings on screen focus so returned edits appear immediately
    useFocusEffect(
        useCallback(() => {
            dispatch(getMyListingsThunk());
        }, [dispatch])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(getMyListingsThunk());
        setRefreshing(false);
    }, [dispatch]);

    const handleToggle = useCallback(
        (id) => {
            dispatch(toggleParkingActiveThunk(id));
        },
        [dispatch]
    );

    const handleEdit = useCallback(
        (listing) => {
            navigation.navigate('CreateParking', { editData: listing });
        },
        [navigation]
    );

    const handleView = useCallback(
        (listing) => {
            navigation.navigate('ParkingDetail', { parkingId: listing.id, isOwnListing: true });
        },
        [navigation]
    );

    const handleDelete = useCallback(
        (listing) => {
            Alert.alert(
                'Delete Parking Space',
                `Are you sure you want to permanently delete "${listing.title}"?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            const res = await dispatch(deleteParkingThunk(listing.id));
                            if (!res.error) {
                                Alert.alert('Deleted', 'Parking space has been deleted.');
                            } else {
                                Alert.alert('Error', res.payload || 'Failed to delete listing.');
                            }
                        },
                    },
                ]
            );
        },
        [dispatch]
    );

    const handleAdd = useCallback(() => {
        navigation.navigate('CreateParking');
    }, [navigation]);

    // Quick edit handler
    const handleOpenQuickEdit = useCallback((listing) => {
        setQuickEditTarget(listing);
        setQuickRate(String(listing.hourlyRate ?? ''));
        setQuickTotalSpots(String(listing.totalSpots ?? ''));
        setQuickAvailableSpots(String(listing.availableSpots ?? listing.totalSpots ?? ''));
        setQuickEditModalVisible(true);
    }, []);

    const handleSaveQuickEdit = useCallback(async () => {
        if (!quickEditTarget) return;

        const rateNum = parseFloat(quickRate);
        const totalNum = parseInt(quickTotalSpots, 10);
        const availableNum = parseInt(quickAvailableSpots, 10);

        if (isNaN(rateNum) || rateNum < 0) {
            Alert.alert('Invalid Rate', 'Please enter a valid hourly rate (>= 0).');
            return;
        }
        if (isNaN(totalNum) || totalNum <= 0) {
            Alert.alert('Invalid Spots', 'Total spots must be at least 1.');
            return;
        }
        if (isNaN(availableNum) || availableNum < 0 || availableNum > totalNum) {
            Alert.alert('Invalid Availability', `Available spots must be between 0 and total spots (${totalNum}).`);
            return;
        }

        setSavingQuickEdit(true);
        try {
            const updatePayload = {
                ...quickEditTarget,
                hourlyRate: rateNum,
                totalSpots: totalNum,
                availableSpots: availableNum,
            };

            const result = await dispatch(
                updateParkingThunk({
                    id: quickEditTarget.id,
                    data: updatePayload,
                })
            );

            if (!result.error) {
                Alert.alert('Updated', 'Pricing & availability updated successfully.');
                setQuickEditModalVisible(false);
                setQuickEditTarget(null);
            } else {
                Alert.alert('Error', result.payload || 'Failed to update listing.');
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred while saving.');
        } finally {
            setSavingQuickEdit(false);
        }
    }, [quickEditTarget, quickRate, quickTotalSpots, quickAvailableSpots, dispatch]);

    const totalCount = myListings?.length || 0;
    const activeCount = myListings?.filter((l) => l.isActive !== false).length || 0;
    const inactiveCount = myListings?.filter((l) => l.isActive === false).length || 0;

    const filteredListings = useMemo(() => {
        let list = Array.isArray(myListings) ? myListings : [];
        if (activeFilter === 'active') {
            list = list.filter((item) => item.isActive !== false);
        } else if (activeFilter === 'inactive') {
            list = list.filter((item) => item.isActive === false);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (item) =>
                    (item.title && item.title.toLowerCase().includes(q)) ||
                    (item.address && item.address.toLowerCase().includes(q)) ||
                    (item.city && item.city.toLowerCase().includes(q))
            );
        }
        return list;
    }, [myListings, activeFilter, searchQuery]);

    const getFilterBadgeCount = (filterId) => {
        if (filterId === 'active') return activeCount;
        if (filterId === 'inactive') return inactiveCount;
        return totalCount;
    };

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <View style={styles.titleGroup}>
                    <Text style={styles.screenTitle}>My Listings</Text>
                    <Text style={styles.screenSubtitle}>
                        {totalCount} {totalCount === 1 ? 'parking space' : 'parking spaces'} listed
                    </Text>
                </View>
            </View>

            {/* Quick Search Bar */}
            {totalCount > 0 && (
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search your listings..."
                        placeholderTextColor={colors.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        testID="search-listings-input"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Filter Tabs */}
            {totalCount > 0 && (
                <View style={styles.filterTabsContainer}>
                    {FILTERS.map((f) => {
                        const isSelected = activeFilter === f.id;
                        const count = getFilterBadgeCount(f.id);
                        return (
                            <TouchableOpacity
                                key={f.id}
                                style={[styles.filterTab, isSelected && styles.filterTabActive]}
                                onPress={() => setActiveFilter(f.id)}
                                accessibilityRole="button"
                                accessibilityLabel={`Filter by ${f.label}`}
                                testID={`filter-tab-${f.id}`}
                            >
                                <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                                    {f.label} ({count})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            )}

            {listingsLoading && !refreshing && totalCount === 0 ? (
                <LoadingScreen />
            ) : (
                <FlatList
                    data={filteredListings}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => (
                        <ListingCard
                            listing={item}
                            onToggle={handleToggle}
                            onEdit={handleEdit}
                            onView={handleView}
                            onDelete={handleDelete}
                            onQuickEdit={handleOpenQuickEdit}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        totalCount === 0 ? (
                            <EmptyState
                                icon="location-outline"
                                title="No listings yet"
                                message="Add your first parking space to start earning"
                                actionLabel="Add Parking Space"
                                onAction={handleAdd}
                            />
                        ) : (
                            <EmptyState
                                icon="search-outline"
                                title="No matching listings"
                                message="Try adjusting your filter or search term"
                                actionLabel="Show All Listings"
                                onAction={() => {
                                    setActiveFilter('all');
                                    setSearchQuery('');
                                }}
                            />
                        )
                    }
                />
            )}

            {/* Floating Action Button (FAB) - Ergonomic Thumb Reach */}
            <TouchableOpacity
                style={styles.fab}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel="Add Parking Space"
                testID="add-listing-button"
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={24} color={colors.white} />
                <Text style={styles.fabText}>Add Space</Text>
            </TouchableOpacity>

            {/* On-Surface Quick-Edit Modal for Direct Price & Availability Management */}
            <Modal
                visible={quickEditModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setQuickEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalBackdrop}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            onPress={() => setQuickEditModalVisible(false)}
                        />
                        <View style={styles.modalCard} testID="quick-edit-modal">
                            <View style={styles.modalHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalTitle}>Quick Edit Inventory</Text>
                                    <Text style={styles.modalSubtitle} numberOfLines={1}>
                                        {quickEditTarget?.title}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setQuickEditModalVisible(false)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    testID="quick-edit-close-x"
                                >
                                    <Ionicons name="close-circle-outline" size={24} color={colors.textTertiary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.modalBody}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Hourly Rate (₹/hr)</Text>
                                    <View style={styles.stepperRow}>
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() => {
                                                const val = Math.max(0, (parseFloat(quickRate) || 0) - 5);
                                                setQuickRate(String(val));
                                            }}
                                            testID="quick-edit-rate-minus-btn"
                                        >
                                            <Ionicons name="remove" size={18} color={colors.textPrimary} />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.stepperInput}
                                            keyboardType="numeric"
                                            value={quickRate}
                                            onChangeText={setQuickRate}
                                            placeholder="0"
                                            placeholderTextColor={colors.textTertiary}
                                            testID="quick-edit-rate-input"
                                        />
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() => {
                                                const val = (parseFloat(quickRate) || 0) + 5;
                                                setQuickRate(String(val));
                                            }}
                                            testID="quick-edit-rate-plus-btn"
                                        >
                                            <Ionicons name="add" size={18} color={colors.textPrimary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Total Spots</Text>
                                    <View style={styles.stepperRow}>
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() => {
                                                const val = Math.max(1, (parseInt(quickTotalSpots, 10) || 1) - 1);
                                                setQuickTotalSpots(String(val));
                                                if ((parseInt(quickAvailableSpots, 10) || 0) > val) {
                                                    setQuickAvailableSpots(String(val));
                                                }
                                            }}
                                            testID="quick-edit-total-minus-btn"
                                        >
                                            <Ionicons name="remove" size={18} color={colors.textPrimary} />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.stepperInput}
                                            keyboardType="numeric"
                                            value={quickTotalSpots}
                                            onChangeText={setQuickTotalSpots}
                                            placeholder="1"
                                            placeholderTextColor={colors.textTertiary}
                                            testID="quick-edit-total-spots-input"
                                        />
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() => {
                                                const val = (parseInt(quickTotalSpots, 10) || 0) + 1;
                                                setQuickTotalSpots(String(val));
                                            }}
                                            testID="quick-edit-total-plus-btn"
                                        >
                                            <Ionicons name="add" size={18} color={colors.textPrimary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Available Spots</Text>
                                    <View style={styles.stepperRow}>
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() => {
                                                const val = Math.max(0, (parseInt(quickAvailableSpots, 10) || 0) - 1);
                                                setQuickAvailableSpots(String(val));
                                            }}
                                            testID="quick-edit-available-minus-btn"
                                        >
                                            <Ionicons name="remove" size={18} color={colors.textPrimary} />
                                        </TouchableOpacity>
                                        <TextInput
                                            style={styles.stepperInput}
                                            keyboardType="numeric"
                                            value={quickAvailableSpots}
                                            onChangeText={setQuickAvailableSpots}
                                            placeholder="0"
                                            placeholderTextColor={colors.textTertiary}
                                            testID="quick-edit-available-spots-input"
                                        />
                                        <TouchableOpacity
                                            style={styles.stepperBtn}
                                            onPress={() => {
                                                const maxVal = parseInt(quickTotalSpots, 10) || 999;
                                                const val = Math.min(maxVal, (parseInt(quickAvailableSpots, 10) || 0) + 1);
                                                setQuickAvailableSpots(String(val));
                                            }}
                                            testID="quick-edit-available-plus-btn"
                                        >
                                            <Ionicons name="add" size={18} color={colors.textPrimary} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.modalCancelBtn}
                                    onPress={() => setQuickEditModalVisible(false)}
                                    accessibilityRole="button"
                                    testID="quick-edit-cancel-button"
                                >
                                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalSaveBtn, savingQuickEdit && { opacity: 0.7 }]}
                                    onPress={handleSaveQuickEdit}
                                    disabled={savingQuickEdit}
                                    accessibilityRole="button"
                                    testID="quick-edit-save-button"
                                >
                                    {savingQuickEdit ? (
                                        <ActivityIndicator size="small" color={colors.white} />
                                    ) : (
                                        <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    },
    titleGroup: {
        flex: 1,
    },
    screenTitle: {
        ...typography.h2,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    screenSubtitle: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginHorizontal: spacing.screenHorizontal,
        paddingHorizontal: spacing.sm,
        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
        marginTop: spacing.xs,
        marginBottom: spacing.sm,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.textPrimary,
        padding: 0,
    },
    filterTabsContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.screenHorizontal,
        marginBottom: spacing.md,
        gap: spacing.xs,
    },
    filterTab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
    },
    filterTabActive: {
        backgroundColor: colors.primary,
    },
    filterTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterTabTextActive: {
        color: colors.white,
    },
    listContent: {
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: 100,
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 28,
        backgroundColor: colors.primary,
        ...shadows.elevated,
        zIndex: 99,
        elevation: 8,
    },
    fabText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: spacing.md,
    },
    modalBackdrop: {
        width: '100%',
        maxWidth: 420,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.lg,
        ...shadows.elevated,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.textPrimary,
        fontWeight: '700',
    },
    modalSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    modalBody: {
        gap: spacing.md,
        marginVertical: spacing.xs,
    },
    inputGroup: {
        gap: 6,
    },
    inputLabel: {
        ...typography.label,
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: 13,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    stepperBtn: {
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    stepperInput: {
        flex: 1,
        height: 42,
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
        backgroundColor: '#FAFAFA',
        textAlign: 'center',
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    modalSaveBtn: {
        flex: 1.4,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.button,
    },
    modalSaveBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.white,
    },
});

export default MyListingsScreen;
