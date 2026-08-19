import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { getInvoicesThunk, markInvoicePaidThunk, issueInvoiceThunk, voidInvoiceThunk } from '../../store/slices/corporateSlice';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import LoadingScreen from '../../components/Common/LoadingScreen';
import Badge from '../../components/Common/Badge';
import { colors, spacing, typography, shadows } from '../../styles/globalStyles';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

const CorporateInvoicesScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const { invoices, isLoading, activeCompanyId } = useSelector(s => s.corporate);

    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const loadInvoices = useCallback(() => {
        if (activeCompanyId) {
            dispatch(getInvoicesThunk({ companyId: activeCompanyId, params: {} }));
        }
    }, [dispatch, activeCompanyId]);

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    const handleMarkPaid = async (invoice) => {
        setActionLoading(true);
        const res = await dispatch(markInvoicePaidThunk({
            companyId: activeCompanyId,
            invoiceId: invoice.id,
            paymentData: { notes: 'Paid via Corporate Mobile Banking' }
        }));
        setActionLoading(false);
        if (!res.error) {
            setSelectedInvoice(null);
            Alert.alert('Success', 'Invoice marked as paid offline.');
            loadInvoices();
        } else {
            Alert.alert('Error', res.payload || 'Failed to mark invoice as paid.');
        }
    };

    const handleIssueInvoice = async (invoice) => {
        setActionLoading(true);
        const res = await dispatch(issueInvoiceThunk({
            companyId: activeCompanyId,
            invoiceId: invoice.id,
        }));
        setActionLoading(false);
        if (!res.error) {
            setSelectedInvoice(null);
            Alert.alert('Success', 'Invoice issued successfully.');
            loadInvoices();
        } else {
            Alert.alert('Error', res.payload || 'Failed to issue invoice.');
        }
    };

    if (isLoading && !invoices.length) return <LoadingScreen />;

    return (
        <ScreenLayout>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Corporate Invoices</Text>
                <View style={{ width: 40 }} />
            </View>

            {!activeCompanyId ? (
                <Text style={styles.emptyText}>Please select a company first.</Text>
            ) : (
                <FlatList
                    data={invoices}
                    keyExtractor={item => item.id || item.invoiceNumber}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={loadInvoices} />
                    }
                    renderItem={({ item }) => (
                        <Card style={styles.card}>
                            <View style={styles.row}>
                                <Text style={styles.invoiceNumber}>Inv: {item.invoiceNumber}</Text>
                                <Badge status={item.status} />
                            </View>
                            <Text style={styles.dateText}>Due: {formatDateTime(item.dueDate)}</Text>
                            <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
                            <TouchableOpacity
                                style={styles.viewBtn}
                                onPress={() => setSelectedInvoice(item)}
                            >
                                <Text style={styles.viewBtnText}>View Details & Actions →</Text>
                            </TouchableOpacity>
                        </Card>
                    )}
                    ListEmptyComponent={<Text style={styles.emptyText}>No invoices found for this company.</Text>}
                />
            )}

            {/* Invoice Detail Modal */}
            <Modal
                visible={!!selectedInvoice}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedInvoice(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Invoice {selectedInvoice?.invoiceNumber}</Text>
                            <TouchableOpacity onPress={() => setSelectedInvoice(null)}>
                                <Ionicons name="close" size={22} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ gap: spacing.xs, marginVertical: spacing.md }}>
                            <View style={styles.row}>
                                <Text style={typography.caption}>Total Amount:</Text>
                                <Text style={[typography.h3, { color: colors.primary }]}>{formatCurrency(selectedInvoice?.totalAmount || 0)}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={typography.caption}>Status:</Text>
                                <Badge status={selectedInvoice?.status} />
                            </View>
                            <View style={styles.row}>
                                <Text style={typography.caption}>Due Date:</Text>
                                <Text style={typography.bodySmall}>{formatDateTime(selectedInvoice?.dueDate)}</Text>
                            </View>
                        </View>

                        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                            {selectedInvoice?.status === 0 && (
                                <Button
                                    title="Issue Invoice"
                                    onPress={() => handleIssueInvoice(selectedInvoice)}
                                    loading={actionLoading}
                                    variant="primary"
                                />
                            )}
                            <Button
                                title="Mark Paid Offline"
                                onPress={() => handleMarkPaid(selectedInvoice)}
                                loading={actionLoading}
                                variant="secondary"
                            />
                            <Button
                                title="Close"
                                onPress={() => setSelectedInvoice(null)}
                                variant="outline"
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
    list: { padding: spacing.screenHorizontal, gap: spacing.md, paddingBottom: spacing['3xl'] },
    card: { gap: spacing.sm },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    invoiceNumber: { ...typography.body, fontWeight: 'bold', color: colors.textPrimary },
    dateText: { ...typography.caption, color: colors.textSecondary },
    amount: { ...typography.h4, color: colors.primary, marginVertical: spacing.xs },
    viewBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
    viewBtnText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
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
        marginBottom: spacing.sm,
    },
    modalTitle: {
        ...typography.h3,
        color: colors.textPrimary,
    },
});

export default CorporateInvoicesScreen;
