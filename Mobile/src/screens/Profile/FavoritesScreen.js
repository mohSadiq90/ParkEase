/**
 * FavoritesScreen (Mobile)
 * View and toggle user favorite parking spots
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/api/apiClient';
import ENDPOINTS from '../../services/api/endpoints';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import StarRating from '../../components/Common/StarRating';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography } from '../../styles/globalStyles';
import { formatCurrency } from '../../utils/formatters';

const FavoritesScreen = ({ navigation }) => {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFavorites = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(ENDPOINTS.FAVORITES.BASE);
            if (res.success && res.data) {
                setFavorites(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            console.error('Error fetching favorites:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const handleRemoveFavorite = async (parkingSpaceId) => {
        try {
            await apiClient.post(ENDPOINTS.FAVORITES.TOGGLE(parkingSpaceId));
            setFavorites(prev => prev.filter(f => (f.id !== parkingSpaceId && f.parkingSpaceId !== parkingSpaceId)));
        } catch (err) {
            Alert.alert('Error', 'Failed to update favorites');
        }
    };

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>Saved Favorites</Text>
                <View style={{ width: 24 }} />
            </View>

            {loading ? (
                <LoadingScreen />
            ) : favorites.length === 0 ? (
                <EmptyState
                    icon="heart-outline"
                    title="No favorites saved"
                    message="Tap the heart icon on any parking spot to bookmark it here for fast access."
                />
            ) : (
                <FlatList
                    data={favorites}
                    keyExtractor={(item) => (item.id || item.parkingSpaceId || Math.random()).toString()}
                    renderItem={({ item }) => {
                        const spotId = item.parkingSpaceId || item.id;
                        return (
                            <Card
                                onPress={() => navigation.navigate('SearchTab', {
                                    screen: 'ParkingDetail',
                                    params: { parkingId: spotId }
                                })}
                                style={styles.card}
                            >
                                <View style={styles.cardRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.spotTitle}>{item.title || item.parkingSpaceTitle || 'Parking Space'}</Text>
                                        <Text style={styles.spotAddress} numberOfLines={1}>
                                            {item.address || item.parkingSpaceAddress}
                                        </Text>
                                        <View style={styles.metaRow}>
                                            <StarRating rating={item.averageRating || 5} size={14} />
                                            <Text style={styles.rateText}>{formatCurrency(item.hourlyRate || 50)}/hr</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveFavorite(spotId)}
                                        style={styles.heartBtn}
                                    >
                                        <Ionicons name="heart" size={24} color={colors.danger} />
                                    </TouchableOpacity>
                                </View>
                            </Card>
                        );
                    }}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingTop: 60,
        paddingHorizontal: spacing.screenHorizontal,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    backBtn: { padding: spacing.xs },
    screenTitle: { ...typography.h3, color: colors.textPrimary },
    listContainer: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.xl },
    card: { marginBottom: spacing.md },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    spotTitle: { ...typography.label, color: colors.textPrimary },
    spotAddress: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
    rateText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
    heartBtn: { padding: spacing.sm }
});

export default FavoritesScreen;
