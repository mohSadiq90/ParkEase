/**
 * MyVehiclesScreen (Mobile)
 * View, add, edit, and delete user vehicles for faster checkout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../services/api/apiClient';
import ENDPOINTS from '../../services/api/endpoints';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Input from '../../components/Common/Input';
import EmptyState from '../../components/Common/EmptyState';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';

const VehicleCard = ({ vehicle, onEdit, onDelete }) => (
    <Card style={styles.vehicleCard}>
        <View style={styles.cardHeader}>
            <View style={styles.vehicleIcon}>
                <Ionicons name="car" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.plateNumber}>{vehicle.licensePlate || vehicle.plateNumber || 'No Plate'}</Text>
                <Text style={styles.vehicleModel}>
                    {vehicle.make} {vehicle.model} {vehicle.color ? `· ${vehicle.color}` : ''}
                </Text>
            </View>
            <View style={styles.actionsRow}>
                <TouchableOpacity onPress={() => onEdit(vehicle)} style={styles.actionBtn}>
                    <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(vehicle.id)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
            </View>
        </View>
    </Card>
);

const MyVehiclesScreen = ({ navigation }) => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);

    // Form
    const [plate, setPlate] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [color, setColor] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchVehicles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(ENDPOINTS.VEHICLES.BASE);
            if (res.success && res.data) {
                setVehicles(Array.isArray(res.data) ? res.data : []);
            }
        } catch (err) {
            console.error('Error fetching vehicles:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const handleOpenModal = (vehicle = null) => {
        if (vehicle) {
            setEditingVehicle(vehicle);
            setPlate(vehicle.licensePlate || vehicle.plateNumber || '');
            setMake(vehicle.make || '');
            setModel(vehicle.model || '');
            setColor(vehicle.color || '');
        } else {
            setEditingVehicle(null);
            setPlate('');
            setMake('');
            setModel('');
            setColor('');
        }
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!plate.trim()) {
            Alert.alert('Validation', 'License plate is required.');
            return;
        }
        try {
            setSubmitting(true);
            const payload = {
                licensePlate: plate.trim().toUpperCase(),
                make: make.trim(),
                model: model.trim(),
                color: color.trim(),
                vehicleType: 0,
            };

            if (editingVehicle) {
                await apiClient.put(`${ENDPOINTS.VEHICLES.BASE}/${editingVehicle.id}`, payload);
                Alert.alert('Success', 'Vehicle updated');
            } else {
                await apiClient.post(ENDPOINTS.VEHICLES.BASE, payload);
                Alert.alert('Success', 'Vehicle added to My Garage');
            }
            setModalVisible(false);
            fetchVehicles();
        } catch (err) {
            Alert.alert('Error', err.message || 'Failed to save vehicle');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id) => {
        Alert.alert('Delete Vehicle', 'Are you sure you want to remove this vehicle?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiClient.delete(`${ENDPOINTS.VEHICLES.BASE}/${id}`);
                        fetchVehicles();
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete vehicle');
                    }
                }
            }
        ]);
    };

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.screenTitle}>My Garage</Text>
                <TouchableOpacity onPress={() => handleOpenModal()} style={styles.addBtn}>
                    <Ionicons name="add" size={24} color={colors.white} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <LoadingScreen />
            ) : vehicles.length === 0 ? (
                <EmptyState
                    icon="car-outline"
                    title="No vehicles in garage"
                    message="Add your vehicles here for 1-tap checkout when booking spots."
                />
            ) : (
                <FlatList
                    data={vehicles}
                    keyExtractor={(item) => item.id?.toString()}
                    renderItem={({ item }) => (
                        <VehicleCard
                            vehicle={item}
                            onEdit={handleOpenModal}
                            onDelete={handleDelete}
                        />
                    )}
                    contentContainerStyle={styles.listContainer}
                />
            )}

            {/* Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: spacing.md }}
                        >
                            <Text style={styles.modalTitle}>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
                            
                            <Input
                                label="License Plate Number"
                                placeholder="e.g. MH02AB1234"
                                value={plate}
                                onChangeText={setPlate}
                                autoCapitalize="characters"
                            />
                            <Input
                                label="Make (Brand)"
                                placeholder="e.g. Honda, Tesla, Hyundai"
                                value={make}
                                onChangeText={setMake}
                            />
                            <Input
                                label="Model"
                                placeholder="e.g. Civic, Model 3, Creta"
                                value={model}
                                onChangeText={setModel}
                            />
                            <Input
                                label="Color"
                                placeholder="e.g. White, Black, Silver"
                                value={color}
                                onChangeText={setColor}
                            />

                            <View style={styles.modalActions}>
                                <Button
                                    title="Cancel"
                                    variant="ghost"
                                    onPress={() => setModalVisible(false)}
                                    style={{ flex: 1 }}
                                />
                                <Button
                                    title={editingVehicle ? 'Update' : 'Save'}
                                    onPress={handleSave}
                                    loading={submitting}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    addBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.sm
    },
    listContainer: { paddingHorizontal: spacing.screenHorizontal, paddingBottom: spacing.xl },
    vehicleCard: { marginBottom: spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    vehicleIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primarySoft,
        justifyContent: 'center',
        alignItems: 'center'
    },
    plateNumber: { ...typography.h4, color: colors.textPrimary },
    vehicleModel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
    actionsRow: { flexDirection: 'row', gap: spacing.xs },
    actionBtn: { padding: spacing.xs },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: spacing.radius.xl,
        borderTopRightRadius: spacing.radius.xl,
        padding: spacing.xl,
        paddingBottom: spacing['2xl'],
        maxHeight: '85%',
    },
    modalTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.lg },
    modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }
});

export default MyVehiclesScreen;
