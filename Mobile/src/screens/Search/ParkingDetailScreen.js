/**
 * ParkingDetailScreen
 * Full parking space details: images, amenities, pricing, reviews
 */

import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getParkingDetailThunk } from '../../store/slices/parkingSlice';
import { getReviewsThunk } from '../../store/slices/reviewSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import StarRating from '../../components/Common/StarRating';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ParkingTypeLabels, PricingTypeLabels } from '../../utils/constants';
import apiClient from '../../services/api/apiClient';

const ParkingDetailScreen = ({ navigation, route }) => {
    const { parkingId } = route.params;
    const dispatch = useDispatch();
    const { selectedParking: parking, detailLoading } = useSelector((s) => s.parking);
    const { reviews } = useSelector((s) => s.review);
    const [forecast, setForecast] = React.useState(null);

    useEffect(() => {
        dispatch(getParkingDetailThunk(parkingId));
        dispatch(getReviewsThunk(parkingId));

        apiClient.get(`/parking-availability/${parkingId}/forecast?horizonHours=12`)
            .then(res => {
                if (res.success && res.data) setForecast(res.data);
            })
            .catch(() => {});
    }, [dispatch, parkingId]);

    if (detailLoading || !parking) return <LoadingScreen />;

    return (
        <ScreenLayout>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Image */}
                <View style={styles.imageSection}>
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="car" size={60} color={colors.lightGray} />
                        <Text style={styles.imageText}>Parking Space</Text>
                    </View>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {/* Title & Rating */}
                    <View style={styles.titleSection}>
                        <Text style={styles.title}>{parking.title}</Text>
                        <View style={styles.ratingRow}>
                            <StarRating rating={parking.averageRating} size={18} />
                            <Text style={styles.ratingText}>{parking.averageRating?.toFixed(1)}</Text>
                            <Text style={styles.reviewCount}>({parking.totalReviews} reviews)</Text>
                        </View>
                        <View style={styles.locationRow}>
                            <Ionicons name="location" size={16} color={colors.primary} />
                            <Text style={styles.address}>{parking.address}, {parking.city}, {parking.state}</Text>
                        </View>
                    </View>

                    {/* Quick Info */}
                    <View style={styles.quickInfo}>
                        <View style={styles.infoItem}>
                            <Ionicons name="cube-outline" size={20} color={colors.primary} />
                            <Text style={styles.infoLabel}>{ParkingTypeLabels[parking.parkingType]}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="car-outline" size={20} color={colors.success} />
                            <Text style={styles.infoLabel}>{parking.availableSpots}/{parking.totalSpots} spots</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Ionicons name="time-outline" size={20} color={colors.accent} />
                            <Text style={styles.infoLabel}>{parking.is24Hours ? '24 Hours' : 'Limited'}</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <Card style={styles.section}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={styles.description}>{parking.description}</Text>
                    </Card>

                    {/* Pricing */}
                    <Card style={styles.section}>
                        <Text style={styles.sectionTitle}>Pricing</Text>
                        <View style={styles.priceGrid}>
                            <View style={styles.priceItem}>
                                <Text style={styles.priceLabel}>Hourly</Text>
                                <Text style={styles.priceValue}>{formatCurrency(parking.hourlyRate)}</Text>
                            </View>
                            <View style={styles.priceItem}>
                                <Text style={styles.priceLabel}>Daily</Text>
                                <Text style={styles.priceValue}>{formatCurrency(parking.dailyRate)}</Text>
                            </View>
                            <View style={styles.priceItem}>
                                <Text style={styles.priceLabel}>Weekly</Text>
                                <Text style={styles.priceValue}>{formatCurrency(parking.weeklyRate)}</Text>
                            </View>
                            <View style={styles.priceItem}>
                                <Text style={styles.priceLabel}>Monthly</Text>
                                <Text style={styles.priceValue}>{formatCurrency(parking.monthlyRate)}</Text>
                            </View>
                        </View>
                    </Card>

                    {/* Amenities */}
                    {parking.amenities?.length > 0 && (
                        <Card style={styles.section}>
                            <Text style={styles.sectionTitle}>Amenities</Text>
                            <View style={styles.amenitiesGrid}>
                                {parking.amenities.map((amenity, idx) => (
                                    <View key={idx} style={styles.amenityChip}>
                                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                        <Text style={styles.amenityText}>{amenity}</Text>
                                    </View>
                                ))}
                            </View>
                        </Card>
                    )}

                    {/* Spot Availability Prediction & Forecast */}
                    {forecast && (
                        <Card style={[styles.section, { borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Ionicons name="sparkles" size={18} color={colors.primary} />
                                    <Text style={{ ...typography.label, color: colors.textPrimary }}>Availability Forecast</Text>
                                </View>
                                <View style={{ backgroundColor: colors.successSoft, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: spacing.radius.full }}>
                                    <Text style={{ ...typography.caption, color: colors.successDark, fontWeight: '700' }}>
                                        {forecast.currentAvailabilityBand || forecast.CurrentAvailabilityBand || 'High'} Demand
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.description}>
                                Predicted free spots: <Text style={{ fontWeight: '700', color: colors.primary }}>{forecast.currentPredictedAvailableSpots ?? forecast.CurrentPredictedAvailableSpots ?? parking.availableSpots}</Text> / {parking.totalSpots} spots · Confidence: {Math.round((forecast.currentConfidenceScore ?? forecast.CurrentConfidenceScore ?? 0.85) * 100)}%
                            </Text>
                        </Card>
                    )}

                    {/* Reviews */}
                    {(() => {
                        const reviewList = Array.isArray(reviews) ? reviews : (reviews?.reviews || []);
                        return (
                            <Card style={styles.section}>
                                <Text style={styles.sectionTitle}>Reviews ({reviewList.length})</Text>
                                {reviewList.slice(0, 3).map((review) => (
                                    <View key={review.id} style={styles.reviewItem}>
                                        <View style={styles.reviewHeader}>
                                            <Text style={styles.reviewerName}>{review.userName}</Text>
                                            <StarRating rating={review.rating} size={14} />
                                        </View>
                                        {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                                        {review.ownerResponse && (
                                            <View style={styles.ownerReplyBox}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                                    <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                                                    <Text style={styles.ownerReplyHeader}>Response from Host</Text>
                                                </View>
                                                <Text style={styles.ownerReplyText}>{review.ownerResponse}</Text>
                                            </View>
                                        )}
                                        <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                                    </View>
                                ))}
                            </Card>
                        );
                    })()}

                    {/* Book Button */}
                    <Button
                        title="Book Now"
                        onPress={() => navigation.navigate('BookParking', { parkingId: parking.id })}
                        style={styles.bookButton}
                        icon={<Ionicons name="calendar" size={20} color={colors.white} />}
                    />
                </View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    imageSection: { height: 220, backgroundColor: colors.borderLight, position: 'relative' },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageText: { ...typography.bodySmall, color: colors.textTertiary, marginTop: spacing.sm },
    backBtn: {
        position: 'absolute', top: 50, left: 16,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
        ...shadows.md,
    },
    content: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing['3xl'] },
    titleSection: { paddingVertical: spacing.lg },
    title: { ...typography.h2, color: colors.textPrimary },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
    ratingText: { ...typography.label, color: colors.textPrimary },
    reviewCount: { ...typography.caption, color: colors.textTertiary },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    address: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
    quickInfo: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.surface, borderRadius: spacing.radius.lg, padding: spacing.base, marginBottom: spacing.lg, ...shadows.sm },
    infoItem: { alignItems: 'center', gap: 4 },
    infoLabel: { ...typography.caption, color: colors.textSecondary, fontWeight: '500' },
    section: { marginBottom: spacing.md },
    sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
    description: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
    priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
    priceItem: { width: '45%', backgroundColor: colors.background, padding: spacing.md, borderRadius: spacing.radius.md },
    priceLabel: { ...typography.caption, color: colors.textTertiary },
    priceValue: { ...typography.h4, color: colors.primary, marginTop: 2 },
    amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.successSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: spacing.radius.full },
    amenityText: { ...typography.caption, color: colors.successDark, fontWeight: '500' },
    reviewItem: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewerName: { ...typography.label, color: colors.textPrimary },
    reviewComment: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.xs },
    reviewDate: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
    ownerReplyBox: { marginTop: spacing.sm, padding: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: spacing.radius.sm, borderLeftWidth: 3, borderLeftColor: colors.primary },
    ownerReplyHeader: { ...typography.caption, color: colors.primary, fontWeight: '700' },
    ownerReplyText: { ...typography.caption, color: colors.textPrimary, marginTop: 2 },
    bookButton: { marginTop: spacing.lg },
});

export default ParkingDetailScreen;
