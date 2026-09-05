import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../styles/globalStyles';
import { getReviewsThunk, clearReviews } from '../../store/slices/reviewSlice';
import StarRating from '../../components/Common/StarRating';
import Button from '../../components/Common/Button';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../services/api/apiClient';
import ENDPOINTS from '../../services/api/endpoints';

const ReviewsListScreen = ({ route, navigation }) => {
    const parkingSpaceId = route?.params?.parkingSpaceId || route?.params?.id;
    const isOwnerParam = route?.params?.isOwner;
    const { user, isVendor } = useAuth();
    const isOwner = isOwnerParam ?? isVendor;

    const dispatch = useDispatch();
    const { reviews, loading, error } = useSelector(state => state.review);

    // Reply modal state
    const [replyModalVisible, setReplyModalVisible] = useState(false);
    const [selectedReviewId, setSelectedReviewId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    useEffect(() => {
        if (parkingSpaceId) {
            dispatch(getReviewsThunk(parkingSpaceId));
        }

        return () => {
            dispatch(clearReviews());
        };
    }, [dispatch, parkingSpaceId]);

    const handleOpenReplyModal = (reviewId) => {
        setSelectedReviewId(reviewId);
        setReplyText('');
        setReplyModalVisible(true);
    };

    const handleSubmitReply = async () => {
        if (!replyText.trim()) {
            Alert.alert('Required', 'Please enter your response message.');
            return;
        }

        setSubmittingReply(true);
        try {
            await apiClient.post(ENDPOINTS.REVIEWS.OWNER_RESPONSE(selectedReviewId), {
                response: replyText.trim(),
            });
            setReplyModalVisible(false);
            setReplyText('');
            Alert.alert('Success', 'Your reply has been posted.');
            if (parkingSpaceId) {
                dispatch(getReviewsThunk(parkingSpaceId));
            }
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to submit reply.';
            Alert.alert('Error', message);
        } finally {
            setSubmittingReply(false);
        }
    };

    const renderItem = ({ item }) => {
        const ownerResponse = item.ownerResponse || item.response;

        return (
            <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {item.userName ? item.userName.charAt(0).toUpperCase() : 'A'}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.reviewerName}>{item.userName || 'Anonymous User'}</Text>
                            <Text style={styles.reviewDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                    <StarRating rating={item.rating} size={16} />
                </View>

                {item.comment ? (
                    <Text style={styles.reviewComment}>{item.comment}</Text>
                ) : null}

                {/* Existing Owner Response */}
                {ownerResponse ? (
                    <View style={styles.ownerResponseBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <Ionicons name="business-outline" size={14} color={colors.primary} />
                            <Text style={styles.ownerResponseTitle}>Response from Owner</Text>
                        </View>
                        <Text style={styles.ownerResponseText}>{ownerResponse}</Text>
                    </View>
                ) : isOwner ? (
                    <TouchableOpacity
                        style={styles.replyButton}
                        onPress={() => handleOpenReplyModal(item.id)}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
                        <Text style={styles.replyButtonText}>Reply as Host</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textPrimary || colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Reviews</Text>
                <View style={{ width: 34 }} />
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : error ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={reviews}
                    keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={64} color={colors.borderLight} />
                            <Text style={styles.emptyText}>No reviews yet.</Text>
                        </View>
                    }
                />
            )}

            {/* Owner Reply Modal */}
            <Modal
                visible={replyModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setReplyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reply to Review</Text>
                            <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.replyInput}
                            placeholder="Thank the driver or address their feedback..."
                            placeholderTextColor={colors.textTertiary}
                            value={replyText}
                            onChangeText={setReplyText}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalActions}>
                            <Button
                                title="Cancel"
                                variant="outline"
                                onPress={() => setReplyModalVisible(false)}
                                style={{ flex: 1 }}
                            />
                            <Button
                                title="Post Reply"
                                onPress={handleSubmitReply}
                                loading={submittingReply}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
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
    backButton: {
        padding: 5,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.textPrimary || colors.text,
    },
    listContainer: {
        padding: 15,
        flexGrow: 1,
    },
    reviewCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: colors.borderLight,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    reviewerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    avatarText: {
        ...typography.h4,
        color: colors.primary,
        fontWeight: 'bold',
    },
    reviewerName: {
        ...typography.subtitle1,
        color: colors.textPrimary || colors.text,
    },
    reviewDate: {
        ...typography.body3,
        color: colors.textTertiary,
    },
    reviewComment: {
        ...typography.body1,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    ownerResponseBox: {
        marginTop: 12,
        backgroundColor: colors.primarySoft || '#f0fdf4',
        borderRadius: 8,
        padding: 10,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    ownerResponseTitle: {
        ...typography.caption,
        fontWeight: '700',
        color: colors.primary,
    },
    ownerResponseText: {
        ...typography.bodySmall,
        color: colors.textPrimary,
        lineHeight: 18,
    },
    replyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: colors.primarySoft,
    },
    replyButtonText: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 36,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        ...typography.h4,
        color: colors.textPrimary,
    },
    replyInput: {
        backgroundColor: colors.background,
        borderRadius: 10,
        padding: 12,
        minHeight: 100,
        textAlignVertical: 'top',
        ...typography.body,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.borderLight,
        marginBottom: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        ...typography.body1,
        color: colors.textTertiary,
        marginTop: 15,
    },
    errorText: {
        ...typography.body1,
        color: colors.error,
        paddingHorizontal: 20,
        textAlign: 'center',
    },
});

export default ReviewsListScreen;
