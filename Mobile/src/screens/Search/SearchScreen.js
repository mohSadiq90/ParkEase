/**
 * SearchScreen
 * Displays all available parkings by default, with optional search & filter
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { searchParkingThunk, clearSearch } from '../../store/slices/parkingSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import StarRating from '../../components/Common/StarRating';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import MapViewComponent from './MapViewComponent';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency } from '../../utils/formatters';
import { VehicleTypeLabels, AMENITIES, ListingCategory, ListingCategoryLabels } from '../../utils/constants';

const ParkingCard = ({ parking, onPress }) => {
    const displayRate = parking.effectiveHourlyRate ?? parking.hourlyRate;
    const isDynamic = parking.dynamicPricingApplied || (parking.effectiveHourlyRate && parking.effectiveHourlyRate !== parking.hourlyRate);

    return (
        <Card onPress={onPress} style={cardStyles.card}>
            <View style={cardStyles.imageContainer}>
                <View style={cardStyles.imagePlaceholder}>
                    <Ionicons name="car" size={40} color={colors.lightGray} />
                </View>
                <View style={[cardStyles.priceTag, isDynamic && { backgroundColor: colors.warningDark }]}>
                    <Text style={cardStyles.priceText}>
                        {isDynamic ? '⚡ ' : ''}{formatCurrency(displayRate)}/hr
                    </Text>
                </View>
                <View style={cardStyles.topBadgesRow}>
                    {parking.is24Hours && (
                        <View style={cardStyles.badgePill}>
                            <Text style={cardStyles.badgeText}>24h</Text>
                        </View>
                    )}
                    {parking.instantBook && (
                        <View style={[cardStyles.badgePill, { backgroundColor: colors.successDark }]}>
                            <Text style={cardStyles.badgeText}>Instant</Text>
                        </View>
                    )}
                    {parking.hasEvCharging && (
                        <View style={[cardStyles.badgePill, { backgroundColor: colors.primaryDark }]}>
                            <Text style={cardStyles.badgeText}>EV</Text>
                        </View>
                    )}
                    {parking.isLprEnabled && (
                        <View style={[cardStyles.badgePill, { backgroundColor: colors.accentDark || '#4f46e5' }]}>
                            <Text style={cardStyles.badgeText}>LPR</Text>
                        </View>
                    )}
                </View>
            </View>

            <View style={cardStyles.info}>
                <Text style={cardStyles.title} numberOfLines={1}>{parking.title}</Text>
                <View style={cardStyles.locationRow}>
                    <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
                    <Text style={cardStyles.address} numberOfLines={1}>{parking.address}, {parking.city}</Text>
                </View>
                <View style={cardStyles.metaRow}>
                    <View style={cardStyles.ratingRow}>
                        <StarRating rating={parking.averageRating} size={14} />
                        <Text style={cardStyles.ratingText}>{parking.averageRating?.toFixed(1) || '0.0'}</Text>
                        <Text style={cardStyles.reviewCount}>({parking.totalReviews})</Text>
                    </View>
                    <View style={cardStyles.spotsRow}>
                        <Ionicons name="car-outline" size={14} color={parking.availableSpots > 0 ? colors.success : colors.danger} />
                        <Text style={[cardStyles.spotsText, { color: parking.availableSpots > 0 ? colors.success : colors.danger }]}>
                            {parking.availableSpots} spots
                        </Text>
                    </View>
                </View>
            </View>
        </Card>
    );
};

const cardStyles = StyleSheet.create({
    card: { marginHorizontal: spacing.screenHorizontal, overflow: 'hidden', padding: 0, marginBottom: spacing.md },
    imageContainer: { height: 140, backgroundColor: colors.borderLight, borderTopLeftRadius: spacing.cardRadius, borderTopRightRadius: spacing.cardRadius, position: 'relative' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    priceTag: { position: 'absolute', bottom: 8, right: 8, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: spacing.radius.full },
    priceText: { ...typography.caption, color: colors.white, fontWeight: '700' },
    topBadgesRow: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 4 },
    badgePill: { backgroundColor: colors.accent, paddingHorizontal: 7, paddingVertical: 2, borderRadius: spacing.radius.full },
    badgeText: { ...typography.caption, color: colors.white, fontWeight: '700', fontSize: 10 },
    info: { padding: spacing.cardPadding },
    title: { ...typography.h4, color: colors.textPrimary },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    address: { ...typography.caption, color: colors.textTertiary, flex: 1 },
    metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { ...typography.caption, fontWeight: '600', color: colors.textPrimary },
    reviewCount: { ...typography.caption, color: colors.textTertiary },
    spotsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    spotsText: { ...typography.caption, fontWeight: '600' },
});

const SearchScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { searchResults, searchLoading, searchTotalCount } = useSelector((s) => s.parking);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

    // Advanced Filters
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [maxPrice, setMaxPrice] = useState('');
    const [minRating, setMinRating] = useState(null);
    const [selectedAmenities, setSelectedAmenities] = useState([]);
    const [sortBy, setSortBy] = useState('recommended'); // 'recommended', 'priceAsc', 'priceDesc', 'rating'
    const [hasEvOnly, setHasEvOnly] = useState(false);
    const [instantBookOnly, setInstantBookOnly] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // Load all available parkings on mount
    useEffect(() => {
        loadParkings();
    }, []);

    const loadParkings = useCallback((city, vehicleType, maxRate, evOnly = hasEvOnly, instantOnly = instantBookOnly, cat = selectedCategory) => {
        setHasSearched(true);
        dispatch(searchParkingThunk({
            city: city || undefined,
            vehicleType: vehicleType ?? undefined,
            maxHourlyRate: maxRate ? parseFloat(maxRate) : undefined,
            hasEvCharging: evOnly ? true : undefined,
            instantBook: instantOnly ? true : undefined,
            listingCategory: cat != null ? cat : undefined,
            page: 1,
            pageSize: 30,
        }));
    }, [dispatch, hasEvOnly, instantBookOnly, selectedCategory]);

    const handleSearch = useCallback(() => {
        loadParkings(searchQuery.trim() || undefined, selectedVehicle, maxPrice, hasEvOnly, instantBookOnly, selectedCategory);
    }, [loadParkings, searchQuery, selectedVehicle, maxPrice, hasEvOnly, instantBookOnly, selectedCategory]);

    const handleClearSearch = useCallback(() => {
        setSearchQuery('');
        setSelectedVehicle(null);
        setMaxPrice('');
        setMinRating(null);
        setSelectedAmenities([]);
        setSortBy('recommended');
        setHasEvOnly(false);
        setInstantBookOnly(false);
        setSelectedCategory(null);
        loadParkings(undefined, null, '', false, false, null);
    }, [loadParkings]);

    const toggleVehicleFilter = useCallback((value) => {
        const newValue = selectedVehicle === value ? null : value;
        setSelectedVehicle(newValue);
        loadParkings(searchQuery.trim() || undefined, newValue, maxPrice, hasEvOnly, instantBookOnly, selectedCategory);
    }, [selectedVehicle, searchQuery, maxPrice, hasEvOnly, instantBookOnly, selectedCategory, loadParkings]);

    const toggleAmenity = (amenity) => {
        setSelectedAmenities(prev =>
            prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
        );
    };

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (maxPrice) count += 1;
        if (minRating) count += 1;
        if (selectedAmenities.length > 0) count += selectedAmenities.length;
        if (sortBy !== 'recommended') count += 1;
        if (hasEvOnly) count += 1;
        if (instantBookOnly) count += 1;
        if (selectedCategory != null) count += 1;
        return count;
    }, [maxPrice, minRating, selectedAmenities, sortBy, hasEvOnly, instantBookOnly, selectedCategory]);

    // Client-side filtering & sorting for amenities, rating, and sort order
    const filteredResults = useMemo(() => {
        let list = [...(searchResults || [])];

        if (minRating) {
            list = list.filter(p => (p.averageRating || 0) >= minRating);
        }

        if (selectedAmenities.length > 0) {
            list = list.filter(p => {
                const pAmenities = p.amenities || [];
                return selectedAmenities.every(a => pAmenities.includes(a));
            });
        }

        if (sortBy === 'priceAsc') {
            list.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
        } else if (sortBy === 'priceDesc') {
            list.sort((a, b) => (b.hourlyRate || 0) - (a.hourlyRate || 0));
        } else if (sortBy === 'rating') {
            list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        }

        return list;
    }, [searchResults, minRating, selectedAmenities, sortBy]);

    const vehicleTypes = Object.entries(VehicleTypeLabels);

    return (
        <ScreenLayout>
            {/* Search Header */}
            <View style={styles.searchHeader}>
                <View style={styles.titleRow}>
                    <Text style={styles.screenTitle}>Find Parking</Text>
                    <TouchableOpacity 
                        style={styles.viewToggle}
                        onPress={() => setViewMode(v => v === 'list' ? 'map' : 'list')}
                    >
                        <Ionicons 
                            name={viewMode === 'list' ? 'map-outline' : 'list-outline'} 
                            size={20} 
                            color={colors.primary} 
                        />
                        <Text style={styles.viewToggleText}>
                            {viewMode === 'list' ? 'Map' : 'List'}
                        </Text>
                    </TouchableOpacity>
                </View>
                
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={colors.textTertiary} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search by city or location..."
                            placeholderTextColor={colors.textTertiary}
                            style={styles.searchInput}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {searchQuery ? (
                            <TouchableOpacity onPress={handleClearSearch}>
                                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    {/* Filter Button */}
                    <TouchableOpacity
                        style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <Ionicons name="options-outline" size={22} color={activeFilterCount > 0 ? colors.white : colors.textPrimary} />
                        {activeFilterCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Vehicle Type Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                    {vehicleTypes.map(([value, label]) => (
                        <TouchableOpacity
                            key={value}
                            style={[styles.filterChip, selectedVehicle === Number(value) && styles.filterChipActive]}
                            onPress={() => toggleVehicleFilter(Number(value))}
                        >
                            <Text style={[styles.filterChipText, selectedVehicle === Number(value) && styles.filterChipTextActive]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Results */}
            {searchLoading ? (
                <LoadingScreen message="Loading parking spaces..." />
            ) : viewMode === 'map' ? (
                <View style={{flex: 1}}>
                    <MapViewComponent parkings={filteredResults} />
                </View>
            ) : filteredResults.length > 0 ? (
                <FlatList
                    data={filteredResults}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <ParkingCard parking={item} onPress={() => navigation.navigate('ParkingDetail', { parkingId: item.id })} />
                    )}
                    ListHeaderComponent={
                        <Text style={styles.resultCount}>
                            {filteredResults.length} parking space{filteredResults.length !== 1 ? 's' : ''} available
                        </Text>
                    }
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: spacing['2xl'] }}
                />
            ) : hasSearched ? (
                <EmptyState
                    icon="car-outline"
                    title="No parking spaces found"
                    message="Try a different search or clear filters"
                    buttonTitle="Clear Filters"
                    onButtonPress={handleClearSearch}
                />
            ) : (
                <EmptyState icon="search-outline" title="Find Parking" message="Loading available parking spaces..." />
            )}

            {/* Advanced Filters Modal */}
            <Modal
                visible={filterModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filters & Sort</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                            {/* Sort By */}
                            <Text style={styles.sectionHeading}>Sort By</Text>
                            <View style={styles.sortOptionsRow}>
                                {[
                                    { id: 'recommended', label: 'Recommended' },
                                    { id: 'priceAsc', label: 'Price: Low to High' },
                                    { id: 'priceDesc', label: 'Price: High to Low' },
                                    { id: 'rating', label: 'Highest Rated' },
                                ].map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        onPress={() => setSortBy(item.id)}
                                        style={[styles.sortChip, sortBy === item.id && styles.sortChipActive]}
                                    >
                                        <Text style={[styles.sortChipText, sortBy === item.id && styles.sortChipTextActive]}>
                                            {item.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Listing Category */}
                            <Text style={styles.sectionHeading}>Parking Category</Text>
                            <View style={styles.sortOptionsRow}>
                                {[
                                    { id: null, label: 'All Categories' },
                                    { id: ListingCategory.Commercial, label: 'Commercial' },
                                    { id: ListingCategory.Residential, label: 'Residential' },
                                    { id: ListingCategory.Airport, label: 'Airport' },
                                    { id: ListingCategory.Event, label: 'Event' },
                                ].map((cat) => (
                                    <TouchableOpacity
                                        key={cat.label}
                                        onPress={() => setSelectedCategory(cat.id)}
                                        style={[styles.sortChip, selectedCategory === cat.id && styles.sortChipActive]}
                                    >
                                        <Text style={[styles.sortChipText, selectedCategory === cat.id && styles.sortChipTextActive]}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Smart Capabilities */}
                            <Text style={styles.sectionHeading}>Special Features</Text>
                            <View style={styles.sortOptionsRow}>
                                <TouchableOpacity
                                    onPress={() => setHasEvOnly(!hasEvOnly)}
                                    style={[styles.sortChip, hasEvOnly && styles.sortChipActive]}
                                >
                                    <Ionicons name="flash-outline" size={14} color={hasEvOnly ? colors.white : colors.primary} style={{ marginRight: 4 }} />
                                    <Text style={[styles.sortChipText, hasEvOnly && styles.sortChipTextActive]}>
                                        EV Charging
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setInstantBookOnly(!instantBookOnly)}
                                    style={[styles.sortChip, instantBookOnly && styles.sortChipActive]}
                                >
                                    <Ionicons name="flash" size={14} color={instantBookOnly ? colors.white : colors.success} style={{ marginRight: 4 }} />
                                    <Text style={[styles.sortChipText, instantBookOnly && styles.sortChipTextActive]}>
                                        Instant Book
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Max Hourly Rate */}
                            <Text style={styles.sectionHeading}>Max Hourly Rate (₹)</Text>
                            <TextInput
                                style={styles.priceInput}
                                value={maxPrice}
                                onChangeText={setMaxPrice}
                                placeholder="e.g. 50"
                                keyboardType="numeric"
                                placeholderTextColor={colors.textTertiary}
                            />

                            {/* Minimum Rating */}
                            <Text style={styles.sectionHeading}>Minimum Rating</Text>
                            <View style={styles.ratingFilterRow}>
                                {[3, 4, 4.5].map((rating) => (
                                    <TouchableOpacity
                                        key={rating}
                                        onPress={() => setMinRating(minRating === rating ? null : rating)}
                                        style={[styles.ratingChip, minRating === rating && styles.ratingChipActive]}
                                    >
                                        <Ionicons name="star" size={16} color={minRating === rating ? colors.white : colors.warning} />
                                        <Text style={[styles.ratingChipText, minRating === rating && styles.ratingChipTextActive]}>
                                            {rating}+ Stars
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Amenities */}
                            <Text style={styles.sectionHeading}>Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                {AMENITIES.map((amenity) => {
                                    const active = selectedAmenities.includes(amenity);
                                    return (
                                        <TouchableOpacity
                                            key={amenity}
                                            onPress={() => toggleAmenity(amenity)}
                                            style={[styles.amenityChip, active && styles.amenityChipActive]}
                                        >
                                            <Ionicons
                                                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                                                size={16}
                                                color={active ? colors.primary : colors.textTertiary}
                                            />
                                            <Text style={[styles.amenityText, active && styles.amenityTextActive]}>
                                                {amenity}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>

                        {/* Modal Action Buttons */}
                        <View style={styles.modalActions}>
                            <Button
                                title="Reset All"
                                onPress={() => {
                                    setMaxPrice('');
                                    setMinRating(null);
                                    setSelectedAmenities([]);
                                    setSortBy('recommended');
                                    setHasEvOnly(false);
                                    setInstantBookOnly(false);
                                    setSelectedCategory(null);
                                }}
                                variant="outline"
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Apply Filters"
                                onPress={() => {
                                    setFilterModalVisible(false);
                                    handleSearch();
                                }}
                                variant="primary"
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
    searchHeader: {
        paddingHorizontal: spacing.screenHorizontal,
        paddingTop: 60,
        paddingBottom: spacing.base,
        backgroundColor: colors.surface,
        ...shadows.sm,
        zIndex: 2,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.base,
    },
    screenTitle: { ...typography.h2, color: colors.textPrimary },
    viewToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primarySoft,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: spacing.radius.full,
        gap: 4,
    },
    viewToggleText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: spacing.inputRadius,
        paddingHorizontal: spacing.base,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: { flex: 1, ...typography.body, color: colors.textPrimary, paddingVertical: spacing.inputPaddingV },
    filterBtn: {
        width: 44,
        height: 44,
        borderRadius: spacing.radius.md,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    filterBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: colors.danger,
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterBadgeText: {
        color: colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    filterScroll: { marginTop: spacing.md },
    filterChip: {
        paddingHorizontal: spacing.base,
        paddingVertical: spacing.sm,
        borderRadius: spacing.radius.full,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
    },
    filterChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    filterChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
    filterChipTextActive: { color: colors.primary, fontWeight: '600' },
    resultCount: { ...typography.bodySmall, color: colors.textSecondary, paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.md },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: spacing.radius.xl,
        borderTopRightRadius: spacing.radius.xl,
        padding: spacing.lg,
        ...shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalTitle: { ...typography.h3, color: colors.textPrimary },
    sectionHeading: { ...typography.label, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
    sortOptionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    sortChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: spacing.radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    sortChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    sortChipText: { ...typography.caption, color: colors.textSecondary },
    sortChipTextActive: { color: colors.primary, fontWeight: '700' },
    priceInput: { borderWidth: 1, borderColor: colors.border, borderRadius: spacing.radius.md, padding: spacing.sm, fontSize: 14, color: colors.textPrimary },
    ratingFilterRow: { flexDirection: 'row', gap: spacing.sm },
    ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: spacing.radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    ratingChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    ratingChipText: { ...typography.caption, color: colors.textSecondary },
    ratingChipTextActive: { color: colors.white, fontWeight: '700' },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: spacing.radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    amenityChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    amenityText: { ...typography.caption, color: colors.textSecondary },
    amenityTextActive: { color: colors.primary, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight },
});

export default SearchScreen;
