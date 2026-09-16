/**
 * LprSettingsScreen
 * Vendor: Manage facility LPR camera keys, API secrets, and license plate whitelist/blacklist rules
 * Parity with web frontend /my/listings/:id/lpr (LprRegistry.jsx)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Switch,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
    fetchCameraKeys,
    fetchPlateRules,
    toggleCameraKeyThunk,
    createCameraKeyThunk,
    deleteCameraKeyThunk,
    createPlateRuleThunk,
    togglePlateRuleThunk,
    deletePlateRuleThunk,
} from '../../store/slices/iotSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Badge from '../../components/Common/Badge';
import Button from '../../components/Common/Button';
import LoadingScreen from '../../components/Common/LoadingScreen';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';

const LprSettingsScreen = ({ route, navigation }) => {
    const { parkingSpaceId = 'ps_123', facilityTitle } = route?.params || {};
    const dispatch = useDispatch();
    const { cameraKeys, plateRules, isLoading } = useSelector((s) => s.iot);

    // Modal state for creating Camera Key
    const [keyModalVisible, setKeyModalVisible] = useState(false);
    const [keyName, setKeyName] = useState('');
    const [keyId, setKeyId] = useState('');
    const [createdSecret, setCreatedSecret] = useState(null);

    // Modal state for creating Plate Rule
    const [ruleModalVisible, setRuleModalVisible] = useState(false);
    const [plateNumber, setPlateNumber] = useState('');
    const [ruleType, setRuleType] = useState(2); // 1 = Allow, 2 = Deny
    const [ruleNote, setRuleNote] = useState('');

    const loadData = useCallback(() => {
        dispatch(fetchCameraKeys(parkingSpaceId));
        dispatch(fetchPlateRules(parkingSpaceId));
    }, [dispatch, parkingSpaceId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleKey = async (item) => {
        await dispatch(toggleCameraKeyThunk({
            parkingSpaceId,
            keyId: item.id,
            isEnabled: !item.isEnabled,
        }));
        loadData();
    };

    const handleDeleteKey = (item) => {
        Alert.alert(
            'Delete Camera Key',
            `Are you sure you want to delete camera key "${item.name}"? Hardware cameras using it will immediately stop working.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await dispatch(deleteCameraKeyThunk({ parkingSpaceId, keyId: item.id }));
                        loadData();
                    },
                },
            ]
        );
    };

    const handleCreateKey = async () => {
        if (!keyName.trim()) {
            Alert.alert('Validation Error', 'Key name is required.');
            return;
        }

        const res = await dispatch(createCameraKeyThunk({
            parkingSpaceId,
            keyData: {
                name: keyName.trim(),
                keyId: keyId.trim() || undefined,
            },
        }));

        if (!res.error) {
            const secret = res.payload?.secret || res.payload?.data?.secret;
            setCreatedSecret(secret || 'Key registered successfully.');
            setKeyName('');
            setKeyId('');
            loadData();
        } else {
            Alert.alert('Error', res.payload || 'Failed to create camera key.');
        }
    };

    const handleToggleRule = async (item) => {
        await dispatch(togglePlateRuleThunk({
            parkingSpaceId,
            ruleId: item.id,
            isEnabled: !item.isEnabled,
        }));
        loadData();
    };

    const handleDeleteRule = (item) => {
        Alert.alert(
            'Delete Plate Rule',
            `Delete rule for license plate "${item.plateNumber || item.licensePlate}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await dispatch(deletePlateRuleThunk({ parkingSpaceId, ruleId: item.id }));
                        loadData();
                    },
                },
            ]
        );
    };

    const handleCreateRule = async () => {
        if (!plateNumber.trim()) {
            Alert.alert('Validation Error', 'Vehicle license plate is required.');
            return;
        }

        const res = await dispatch(createPlateRuleThunk({
            parkingSpaceId,
            ruleData: {
                licensePlate: plateNumber.trim().toUpperCase(),
                ruleType: Number(ruleType),
                note: ruleNote.trim() || undefined,
            },
        }));

        if (!res.error) {
            setRuleModalVisible(false);
            setPlateNumber('');
            setRuleNote('');
            Alert.alert('Rule Created', `Rule for plate ${plateNumber.trim().toUpperCase()} active.`);
            loadData();
        } else {
            Alert.alert('Error', res.payload || 'Failed to create plate rule.');
        }
    };

    return (
        <ScreenLayout scrollable>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation?.goBack?.()}
                    style={styles.backBtn}
                    accessibilityLabel="Go back"
                    testID="lpr-settings-back-btn"
                >
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>LPR Facility Registry</Text>
                    <Text style={styles.headerSub}>
                        {facilityTitle ? `${facilityTitle} • ` : ''}ID: {parkingSpaceId}
                    </Text>
                </View>
            </View>

            {isLoading && !cameraKeys.length && !plateRules.length ? (
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                    <LoadingScreen message="Loading LPR settings..." />
                </View>
            ) : (
                <View style={styles.content}>
                {/* ── Section: Camera Keys ── */}
                <View style={styles.sectionHeaderRow}>
                    <View>
                        <Text style={styles.sectionTitle}>Camera API Keys</Text>
                        <Text style={styles.sectionDesc}>Hardware keys for ANPR barrier cameras</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addSectionBtn}
                        onPress={() => { setCreatedSecret(null); setKeyModalVisible(true); }}
                        testID="add-camera-key-btn"
                    >
                        <Ionicons name="add" size={18} color={colors.white} />
                        <Text style={styles.addBtnText}>New Key</Text>
                    </TouchableOpacity>
                </View>

                {cameraKeys.map((item) => (
                    <Card key={item.id} style={styles.rowCard}>
                        <View style={styles.cardInfo}>
                            <View style={styles.cardTitleRow}>
                                <Ionicons name="videocam-outline" size={18} color={colors.primary} />
                                <Text style={styles.itemName}>{item.name}</Text>
                            </View>
                            <Text style={styles.itemSub}>Key ID: {item.keyId || item.id}</Text>
                        </View>
                        <View style={styles.cardActions}>
                            <Switch
                                value={item.isEnabled}
                                onValueChange={() => handleToggleKey(item)}
                                trackColor={{ true: colors.primary }}
                            />
                            <TouchableOpacity
                                onPress={() => handleDeleteKey(item)}
                                style={styles.deleteBtn}
                                testID={`delete-camera-key-${item.id}`}
                            >
                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                            </TouchableOpacity>
                        </View>
                    </Card>
                ))}

                {cameraKeys.length === 0 && (
                    <Card style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No camera keys configured for this facility.</Text>
                    </Card>
                )}

                {/* ── Section: Plate Rules ── */}
                <View style={[styles.sectionHeaderRow, { marginTop: spacing.xl }]}>
                    <View>
                        <Text style={styles.sectionTitle}>Plate Access Rules</Text>
                        <Text style={styles.sectionDesc}>Allow or deny specific license plates</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.addSectionBtn}
                        onPress={() => setRuleModalVisible(true)}
                        testID="add-plate-rule-btn"
                    >
                        <Ionicons name="add" size={18} color={colors.white} />
                        <Text style={styles.addBtnText}>New Rule</Text>
                    </TouchableOpacity>
                </View>

                {plateRules.map((item) => {
                    const isAllow = item.ruleType === 1 || item.ruleType === 'Allow';
                    return (
                        <Card key={item.id} style={styles.rowCard}>
                            <View style={styles.cardInfo}>
                                <View style={styles.cardTitleRow}>
                                    <Text style={styles.plateNumberText}>
                                        {item.licensePlate || item.plateNumber}
                                    </Text>
                                    <Badge
                                        label={isAllow ? 'Allow' : 'Deny'}
                                        variant={isAllow ? 'success' : 'danger'}
                                    />
                                </View>
                                {item.note ? <Text style={styles.itemSub}>Note: {item.note}</Text> : null}
                            </View>
                            <View style={styles.cardActions}>
                                <Switch
                                    value={item.isEnabled !== false}
                                    onValueChange={() => handleToggleRule(item)}
                                    trackColor={{ true: colors.primary }}
                                />
                                <TouchableOpacity
                                    onPress={() => handleDeleteRule(item)}
                                    style={styles.deleteBtn}
                                    testID={`delete-plate-rule-${item.id}`}
                                >
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        </Card>
                    );
                })}

                {plateRules.length === 0 && (
                    <Card style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No plate access rules added.</Text>
                    </Card>
                )}
            </View>
            )}

            {/* Create Camera Key Modal */}
            <Modal
                visible={keyModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setKeyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Camera API Key</Text>
                            <TouchableOpacity onPress={() => setKeyModalVisible(false)} testID="close-key-modal">
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {createdSecret ? (
                            <View style={styles.secretBox}>
                                <Ionicons name="key-outline" size={28} color={colors.primary} />
                                <Text style={styles.secretTitle}>Camera Secret Generated</Text>
                                <Text style={styles.secretDesc}>
                                    Copy this secret now. It will never be displayed again.
                                </Text>
                                <View style={styles.secretValueBox}>
                                    <Text style={styles.secretValueText} selectable>{createdSecret}</Text>
                                </View>
                                <Button
                                    title="Done"
                                    onPress={() => { setCreatedSecret(null); setKeyModalVisible(false); }}
                                    style={{ marginTop: spacing.md }}
                                />
                            </View>
                        ) : (
                            <View style={styles.modalBody}>
                                <Text style={styles.inputLabel}>Camera Name</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="e.g. North Gate Entry Camera"
                                    placeholderTextColor={colors.textTertiary}
                                    value={keyName}
                                    onChangeText={setKeyName}
                                    testID="create-key-name-input"
                                />

                                <Text style={styles.inputLabel}>Hardware Key ID (Optional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="e.g. CAM-01"
                                    placeholderTextColor={colors.textTertiary}
                                    value={keyId}
                                    onChangeText={setKeyId}
                                    autoCapitalize="characters"
                                    testID="create-key-id-input"
                                />

                                <Button
                                    title="Generate Key & Secret"
                                    onPress={handleCreateKey}
                                    style={{ marginTop: spacing.md }}
                                    testID="submit-create-key-btn"
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Create Plate Rule Modal */}
            <Modal
                visible={ruleModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setRuleModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Plate Access Rule</Text>
                            <TouchableOpacity onPress={() => setRuleModalVisible(false)} testID="close-rule-modal">
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.inputLabel}>Vehicle License Plate</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. DL 01 AB 1234"
                                placeholderTextColor={colors.textTertiary}
                                value={plateNumber}
                                onChangeText={setPlateNumber}
                                autoCapitalize="characters"
                                testID="plate-rule-number-input"
                            />

                            <Text style={styles.inputLabel}>Action Rule</Text>
                            <View style={styles.ruleTypeRow}>
                                <TouchableOpacity
                                    style={[styles.ruleTypeBtn, ruleType === 1 && styles.ruleTypeBtnAllow]}
                                    onPress={() => setRuleType(1)}
                                    testID="rule-type-allow"
                                >
                                    <Text style={[styles.ruleTypeBtnText, ruleType === 1 && { color: colors.white }]}>
                                        Allow / Whitelist
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.ruleTypeBtn, ruleType === 2 && styles.ruleTypeBtnDeny]}
                                    onPress={() => setRuleType(2)}
                                    testID="rule-type-deny"
                                >
                                    <Text style={[styles.ruleTypeBtnText, ruleType === 2 && { color: colors.white }]}>
                                        Deny / Blacklist
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Reason / Internal Note</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. VIP guest or payment defaulter"
                                placeholderTextColor={colors.textTertiary}
                                value={ruleNote}
                                onChangeText={setRuleNote}
                                testID="plate-rule-note-input"
                            />

                            <Button
                                title="Create Plate Rule"
                                onPress={handleCreateRule}
                                style={{ marginTop: spacing.md }}
                                testID="submit-plate-rule-btn"
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
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
    },
    backBtn: {
        padding: spacing.xs,
        marginRight: spacing.sm,
    },
    headerTextWrap: {
        flex: 1,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
    headerSub: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: 2,
    },
    content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    sectionTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    sectionDesc: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    addSectionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    addBtnText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.white,
    },
    rowCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        marginBottom: spacing.xs,
    },
    cardInfo: {
        flex: 1,
        marginRight: spacing.sm,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itemName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    plateNumberText: {
        ...typography.body,
        fontWeight: '700',
        letterSpacing: 1,
        color: colors.textPrimary,
    },
    itemSub: {
        ...typography.caption,
        color: colors.textTertiary,
        marginTop: 2,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    deleteBtn: {
        padding: 6,
    },
    emptyCard: {
        padding: spacing.md,
        alignItems: 'center',
    },
    emptyText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: spacing.lg,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    modalBody: {
        marginTop: spacing.md,
    },
    inputLabel: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: 4,
        marginTop: spacing.xs,
    },
    formInput: {
        backgroundColor: colors.surfaceSecondary || '#F8FAFC',
        borderWidth: 1,
        borderColor: colors.borderLight,
        borderRadius: 10,
        paddingHorizontal: spacing.md,
        height: 44,
        ...typography.body,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    ruleTypeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    ruleTypeBtn: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.borderLight,
        backgroundColor: colors.surfaceSecondary || '#F8FAFC',
    },
    ruleTypeBtnAllow: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    ruleTypeBtnDeny: {
        backgroundColor: colors.danger,
        borderColor: colors.danger,
    },
    ruleTypeBtnText: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    secretBox: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    secretTitle: {
        ...typography.h4,
        color: colors.textPrimary,
        marginTop: spacing.sm,
    },
    secretDesc: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
    },
    secretValueBox: {
        backgroundColor: '#F1F5F9',
        padding: spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.primary,
        width: '100%',
        marginTop: spacing.md,
    },
    secretValueText: {
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
        textAlign: 'center',
    },
});

export default LprSettingsScreen;
