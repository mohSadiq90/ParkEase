/**
 * MyListingsScreen
 * Host's parking space listings with edit, view, filter, search, and toggle actions
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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyListingsThunk, toggleParkingActiveThunk } from '../../store/slices/parkingSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import StarRating from '../../components/Common/StarRating';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency } from '../../utils/formatters';
import { ParkingTypeLabels } from '../../utils/constants';

const ListingCard = ({ listing, onToggle, onEdit, onView }) => {
    const thumbnail = listing.imageUrl || (Array.isArray(listing.imageUrls) && listing.imageUrls[0]);
    const typeLabel = ParkingTypeLabels[listing.parkingType] || 'Standard';

    return (
        <Card
            onPress={() => onEdit(listing)}
            accessibilityRole="button"
            accessibilityLabel={`Listing: ${listing.title}`}
            testID={`listing-card-${listing.id}`}
        >
            <View style={cardStyles.headerRow}>
                {thumbnail ? (
                    <Image source={{ uri: thumbnail }} style={cardStyles.thumb} resizeMode="cover" />
                ) : (
                    <View style={cardStyles.thumbPlaceholder}>
                        <Ionicons name="car" size={24} color={colors.primary} />
                    </View>
                )}

                <View style={cardStyles.headerInfo}>
                    <Text style={cardStyles.title} numberOfLines={1}>
                        {listing.title}
                    </Text>
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

                    <Switch
                        value={listing.isActive}
                        onValueChange={() => onToggle(listing.id)}
                        trackColor={{ false: colors.lightGray, true: colors.successLight }}
                        thumbColor={listing.isActive ? colors.success : colors.mediumGray}
                        accessibilityRole="switch"
                        accessibilityLabel={`Toggle status for ${listing.title}`}
                        testID={`toggle-switch-${listing.id}`}
                    />
                </View>
            </View>

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

            {/* Metrics Info */}
            <View style={cardStyles.infoRow}>
                <View style={cardStyles.infoItem}>
                    <Text style={cardStyles.infoLabel}>Hourly Rate</Text>
                    <Text style={cardStyles.infoValue}>{formatCurrency(listing.hourlyRate)}/hr</Text>
                </View>
                <View style={cardStyles.infoItem}>
                    <Text style={cardStyles.infoLabel}>Spots</Text>
                    <Text style={cardStyles.infoValue}>
                        {listing.availableSpots ?? listing.totalSpots}/{listing.totalSpots}
                    </Text>
                </View>
                <View style={cardStyles.infoItem}>
                    <Text style={cardStyles.infoLabel}>Status</Text>
                    <View style={cardStyles.statusBadgeInline}>
                        <View
                            style={[
                                cardStyles.statusDot,
                                { backgroundColor: listing.isActive ? colors.success : colors.mediumGray },
                            ]}
                        />
                        <Text
                            style={[
                                cardStyles.statusText,
                                { color: listing.isActive ? colors.success : colors.mediumGray },
                            ]}
                        >
                            {listing.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Rating / Review Summary */}
            <View style={cardStyles.footerRow}>
                <View style={cardStyles.ratingRow}>
                    <StarRating rating={listing.averageRating || 0} size={14} />
                    <Text style={cardStyles.ratingText}>
                        {listing.averageRating ? listing.averageRating.toFixed(1) : 'New'} ({listing.totalReviews || 0})
                    </Text>
                </View>
            </View>

            {/* Action Buttons: View Details & Edit Listing */}
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
                    <Text style={cardStyles.editBtnText}>Edit Listing</Text>
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
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: colors.borderLight,
    },
    thumbPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: colors.primarySoft || '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        ...typography.h4,
        color: colors.textPrimary,
        fontWeight: '600',
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
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
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
        justifyContent: 'space-around',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    infoItem: {
        alignItems: 'center',
    },
    infoLabel: {
        ...typography.caption,
        color: colors.textTertiary,
    },
    infoValue: {
        ...typography.label,
        color: colors.textPrimary,
        fontWeight: '600',
        marginTop: 2,
    },
    statusBadgeInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
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
        gap: 6,
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
        flex: 1.3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
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

    const handleAdd = useCallback(() => {
        navigation.navigate('CreateParking');
    }, [navigation]);

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
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={handleAdd}
                    accessibilityRole="button"
                    accessibilityLabel="Add Parking Space"
                    testID="add-listing-button"
                >
                    <Ionicons name="add" size={18} color={colors.white} />
                    <Text style={styles.addBtnText}>Add Space</Text>
                </TouchableOpacity>
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
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        backgroundColor: colors.primary,
        ...shadows.button,
    },
    addBtnText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 13,
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
        paddingBottom: spacing['2xl'],
    },
});

export default MyListingsScreen;
