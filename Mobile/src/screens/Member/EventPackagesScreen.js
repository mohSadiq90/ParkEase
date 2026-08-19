import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchOnSalePackages, fetchMyEventPackages, purchaseEventPackage } from '../../store/slices/eventPackageSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const EventPackagesScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { onSalePackages, myPackages, isLoading } = useSelector(s => s.eventPackage);

    const [activeTab, setActiveTab] = useState('onSale'); // 'onSale' | 'myPasses'
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [licensePlate, setLicensePlate] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [purchaseLoading, setPurchaseLoading] = useState(false);

    const loadData = useCallback(() => {
        if (activeTab === 'onSale') {
            dispatch(fetchOnSalePackages());
        } else {
            dispatch(fetchMyEventPackages());
        }
    }, [dispatch, activeTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handlePurchase = async () => {
        if (!selectedPackage) return;
        setPurchaseLoading(true);
        const res = await dispatch(purchaseEventPackage({
            id: selectedPackage.id,
            purchaseData: {
                licensePlate: licensePlate || undefined,
                quantity: parseInt(quantity, 10) || 1,
            },
        }));
        setPurchaseLoading(false);

        if (!res.error) {
            setSelectedPackage(null);
            setLicensePlate('');
            setQuantity('1');
            Alert.alert('Success', 'Event parking package purchased! Access pass is ready in your passes.');
            dispatch(fetchMyEventPackages());
            setActiveTab('myPasses');
        } else {
            Alert.alert('Purchase Failed', res.payload || 'Could not complete event package purchase.');
        }
    };

    if (isLoading && !onSalePackages.length && !myPackages.length) return <LoadingScreen />;

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Event Parking</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Segmented Control */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'onSale' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('onSale')}
                >
                    <Text style={[styles.tabBtnText, activeTab === 'onSale' && styles.tabBtnTextActive]}>
                        On Sale Events
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'myPasses' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('myPasses')}
                >
                    <Text style={[styles.tabBtnText, activeTab === 'myPasses' && styles.tabBtnTextActive]}>
                        My Event Passes
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'onSale' ? (
                <FlatList
                    data={onSalePackages}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
                    renderItem={({ item }) => (
                        <Card style={styles.card}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.title}>{item.name}</Text>
                                <View style={styles.eventBadge}>
                                    <Text style={styles.eventBadgeText}>🎟️ Event Pass</Text>
                                </View>
                            </View>
                            <Text style={styles.eventInfo}>🏟️ {item.venueName || item.venue} - {item.eventName || item.event}</Text>
                            <Text style={styles.timeInfo}>⏰ {formatDateTime(item.eventStart || item.startDate)}</Text>
                            <View style={styles.footer}>
                                <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                                <TouchableOpacity
                                    style={styles.buyBtn}
                                    onPress={() => setSelectedPackage(item)}
                                >
                                    <Text style={styles.buyBtnText}>Book Pass</Text>
                                </TouchableOpacity>
                            </View>
                        </Card>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No event packages currently on sale.</Text>}
                />
            ) : (
                <FlatList
                    data={myPackages}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
                    renderItem={({ item }) => (
                        <Card style={styles.card}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.title}>{item.packageName || item.name}</Text>
                                <View style={[styles.eventBadge, { backgroundColor: colors.successSoft }]}>
                                    <Text style={[styles.eventBadgeText, { color: colors.success }]}>Active Gate Pass</Text>
                                </View>
                            </View>
                            <Text style={styles.eventInfo}>🏟️ {item.venueName || 'Stadium Venue'}</Text>
                            <Text style={styles.timeInfo}>Valid for event date: {formatDateTime(item.eventDate || item.eventStart)}</Text>
                            {item.licensePlate && (
                                <Text style={{ ...typography.caption, color: colors.textSecondary }}>Vehicle: {item.licensePlate}</Text>
                            )}
                        </Card>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>You have no purchased event parking passes.</Text>}
                />
            )}

            {/* Purchase Event Package Modal */}
            <Modal
                visible={!!selectedPackage}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedPackage(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Event Pass Checkout</Text>
                            <TouchableOpacity onPress={() => setSelectedPackage(null)}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSub}>{selectedPackage?.name}</Text>
                        <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md }}>
                            🏟️ {selectedPackage?.venueName} - {selectedPackage?.eventName}
                        </Text>

                        <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
                            <Card style={{ backgroundColor: colors.background, padding: spacing.sm }}>
                                <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: 2 }}>Vehicle License Plate (Optional)</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={licensePlate}
                                    onChangeText={setLicensePlate}
                                    placeholder="e.g. MH01CD5678"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            </Card>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs }}>
                                <Text style={typography.label}>Price per pass:</Text>
                                <Text style={[typography.h3, { color: colors.primary }]}>{formatCurrency(selectedPackage?.price || 0)}</Text>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: spacing.md }}>
                            <Button
                                title="Cancel"
                                onPress={() => setSelectedPackage(null)}
                                variant="outline"
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Confirm & Pay"
                                onPress={handlePurchase}
                                loading={purchaseLoading}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.screenHorizontal,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.sm,
    },
    headerTitle: { ...typography.h3, color: colors.textPrimary },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: spacing.screenHorizontal,
        marginBottom: spacing.md,
        backgroundColor: colors.background,
        borderRadius: spacing.radius.full,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: spacing.xs,
        borderRadius: spacing.radius.full,
        alignItems: 'center',
    },
    tabBtnActive: {
        backgroundColor: colors.primary,
    },
    tabBtnText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    tabBtnTextActive: {
        color: colors.white,
        fontWeight: '700',
    },
    list: { paddingHorizontal: spacing.screenHorizontal, gap: spacing.md, paddingBottom: spacing['3xl'] },
    card: { gap: spacing.xs },
    title: { ...typography.h4, color: colors.textPrimary, flex: 1 },
    eventBadge: {
        backgroundColor: colors.primarySoft,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: spacing.radius.full,
    },
    eventBadgeText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
    },
    eventInfo: { ...typography.bodySmall, color: colors.textSecondary },
    timeInfo: { ...typography.caption, color: colors.textTertiary },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
    price: { ...typography.h4, color: colors.primary },
    buyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: spacing.radius.full },
    buyBtnText: { ...typography.caption, color: colors.white, fontWeight: 'bold' },
    emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
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
        ...shadows.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    modalTitle: { ...typography.h3, color: colors.textPrimary },
    modalSub: { ...typography.label, color: colors.textPrimary, marginTop: 4 },
    textInput: {
        fontSize: 14,
        color: colors.textPrimary,
        paddingVertical: 4,
    },
});

export default EventPackagesScreen;
