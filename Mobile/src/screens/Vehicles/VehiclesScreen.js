import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../styles/globalStyles';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import { vehicleService } from '../../services/api/vehicleService';
import { VehicleType, VehicleTypeLabels } from '../../utils/constants';

const VehiclesScreen = ({ navigation }) => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // For adding vehicle
    const [isAdding, setIsAdding] = useState(false);
    const [newMake, setNewMake] = useState('');
    const [newModel, setNewModel] = useState('');
    const [newPlate, setNewPlate] = useState('');
    const [newColor, setNewColor] = useState('');
    const [newType, setNewType] = useState(VehicleType.Car);
    const [isDefault, setIsDefault] = useState(false);

    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        try {
            const response = await vehicleService.getVehicles();
            const items = response.data?.data || response.data || [];
            if (Array.isArray(items)) {
                setVehicles(items);
            }
        } catch (error) {
            console.error('Failed to fetch vehicles', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const handleAddVehicle = async () => {
        if (!newMake.trim() || !newModel.trim() || !newPlate.trim()) {
            Alert.alert('Error', 'Please fill in make, model, and license plate number.');
            return;
        }

        try {
            setLoading(true);
            const response = await vehicleService.addVehicle({
                make: newMake.trim(),
                model: newModel.trim(),
                licensePlate: newPlate.trim().toUpperCase(),
                color: newColor.trim() || 'Unspecified',
                type: Number(newType),
                isDefault: isDefault || vehicles.length === 0,
            });
            
            if (response.success) {
                setIsAdding(false);
                setNewMake('');
                setNewModel('');
                setNewPlate('');
                setNewColor('');
                setNewType(VehicleType.Car);
                setIsDefault(false);
                fetchVehicles();
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to add vehicle.';
            Alert.alert('Error', message);
            setLoading(false);
        }
    };

    const handleSetDefault = async (vehicle) => {
        try {
            setLoading(true);
            await vehicleService.updateVehicle(vehicle.id, {
                ...vehicle,
                isDefault: true,
            });
            fetchVehicles();
        } catch (error) {
            Alert.alert('Error', 'Failed to update default vehicle.');
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        Alert.alert('Delete Vehicle', 'Are you sure you want to remove this vehicle from your garage?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    try {
                        setLoading(true);
                        await vehicleService.deleteVehicle(id);
                        fetchVehicles();
                    } catch (error) {
                        Alert.alert('Error', 'Failed to delete vehicle');
                        setLoading(false);
                    }
                }
            }
        ]);
    };

    const renderItem = ({ item }) => {
        const typeLabel = VehicleTypeLabels[item.type] || 'Car';

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.plateContainer}>
                        <Ionicons name="car-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.plateText}>{item.licensePlate || item.plateNumber}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={styles.typeBadge}>
                            <Text style={styles.typeText}>{typeLabel}</Text>
                        </View>
                        {item.isDefault ? (
                            <View style={styles.defaultBadge}>
                                <Text style={styles.defaultText}>Primary</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.makeDefaultBtn}
                                onPress={() => handleSetDefault(item)}
                            >
                                <Text style={styles.makeDefaultText}>Set Default</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.vehicleName}>{item.make} {item.model}</Text>
                    {item.color && item.color !== 'Unspecified' && (
                        <Text style={styles.vehicleColor}>Color: {item.color}</Text>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.lprHint}>
                        <Ionicons name="camera-outline" size={13} color={colors.textTertiary} /> LPR Gate Enabled
                    </Text>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <ScreenLayout style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary || colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Vehicles</Text>
                <TouchableOpacity onPress={() => setIsAdding(!isAdding)} style={styles.addButton} testID="toggle-add-vehicle-btn">
                    <Ionicons name={isAdding ? "close" : "add"} size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {isAdding && (
                <View style={styles.addForm}>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={false}
                        style={{ maxHeight: 380 }}
                        contentContainerStyle={{ paddingBottom: spacing.sm }}
                    >
                        <Text style={styles.formTitle}>Add New Vehicle</Text>
                        
                        {/* Vehicle Type selection */}
                        <Text style={styles.inputLabel}>Vehicle Category</Text>
                        <View style={styles.typeRow}>
                            {Object.entries(VehicleTypeLabels).map(([val, label]) => (
                                <TouchableOpacity
                                    key={val}
                                    onPress={() => setNewType(Number(val))}
                                    style={[styles.typeChip, newType === Number(val) && styles.typeChipActive]}
                                >
                                    <Text style={[styles.typeChipText, newType === Number(val) && styles.typeChipTextActive]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="Make (e.g. Toyota, Tesla)"
                            value={newMake}
                            onChangeText={setNewMake}
                            placeholderTextColor={colors.textTertiary}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Model (e.g. Camry, Model 3)"
                            value={newModel}
                            onChangeText={setNewModel}
                            placeholderTextColor={colors.textTertiary}
                        />
                        <View style={styles.row}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Plate (e.g. MH02AB1234)"
                                value={newPlate}
                                onChangeText={setNewPlate}
                                autoCapitalize="characters"
                                placeholderTextColor={colors.textTertiary}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Color (e.g. White)"
                                value={newColor}
                                onChangeText={setNewColor}
                                placeholderTextColor={colors.textTertiary}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.defaultToggle}
                            onPress={() => setIsDefault(!isDefault)}
                        >
                            <Ionicons
                                name={isDefault ? 'checkbox' : 'square-outline'}
                                size={20}
                                color={isDefault ? colors.primary : colors.textTertiary}
                            />
                            <Text style={styles.defaultToggleText}>Set as Primary / Default Vehicle</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.submitButton} onPress={handleAddVehicle}>
                            <Text style={styles.submitButtonText}>Save to Garage</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}

            <FlatList
                data={vehicles}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                refreshControl={
                    <RefreshControl 
                        refreshing={loading && !isAdding} 
                        onRefresh={fetchVehicles} 
                        tintColor={colors.primary}
                    />
                }
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    !isAdding && (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="car-sport-outline" size={64} color={colors.borderLight} />
                            <Text style={styles.emptyText}>You haven't added any vehicles yet.</Text>
                            <TouchableOpacity style={styles.exploreButton} onPress={() => setIsAdding(true)}>
                                <Text style={styles.exploreButtonText}>Add a Vehicle</Text>
                            </TouchableOpacity>
                        </View>
                    )
                }
            />
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    backButton: { padding: 5 },
    addButton: { padding: 5 },
    headerTitle: {
        ...typography.h3,
        color: colors.textPrimary || colors.text,
    },
    listContainer: {
        padding: 15,
        flexGrow: 1,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    plateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    plateText: {
        ...typography.bodySmall,
        fontWeight: '700',
        color: colors.textPrimary,
        letterSpacing: 0.5,
    },
    typeBadge: {
        backgroundColor: colors.primarySoft,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    typeText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
        fontSize: 11,
    },
    defaultBadge: {
        backgroundColor: colors.successSoft || '#f0fdf4',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    defaultText: {
        ...typography.caption,
        color: colors.successDark || '#059669',
        fontWeight: '700',
        fontSize: 11,
    },
    makeDefaultBtn: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    makeDefaultText: {
        ...typography.caption,
        color: colors.textTertiary,
        fontSize: 11,
    },
    cardBody: {
        marginVertical: 4,
    },
    vehicleName: {
        ...typography.body,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    vehicleColor: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    lprHint: {
        ...typography.caption,
        color: colors.textTertiary,
        fontSize: 11,
    },
    deleteButton: {
        padding: 4,
    },
    addForm: {
        backgroundColor: colors.surface,
        padding: 16,
        margin: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    formTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginBottom: 12,
    },
    inputLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 6,
        fontWeight: '600',
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    typeChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    typeChipActive: {
        backgroundColor: colors.primarySoft,
        borderColor: colors.primary,
    },
    typeChipText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    typeChipTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
        ...typography.bodySmall,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    defaultToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginVertical: 6,
    },
    defaultToggleText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    submitButtonText: {
        ...typography.button,
        color: colors.white,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        ...typography.bodySmall,
        color: colors.textTertiary,
        marginTop: 12,
    },
    exploreButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: colors.primarySoft,
        borderRadius: 20,
    },
    exploreButtonText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
    },
});

export default VehiclesScreen;
