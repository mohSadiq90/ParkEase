/**
 * Conversation List Screen
 * Shows all conversations for the current user
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, RefreshControl, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '../../styles/globalStyles';
import chatService from '../../services/chat/chatService';
import ScreenLayout from '../../components/Layouts/ScreenLayout';
import { useAuth } from '../../hooks/useAuth';

const ConversationListScreen = ({ navigation }) => {
    const { user } = useAuth();
    const currentUserId = user?.id || user?.userId || null;
    const [conversations, setConversations] = useState([]);
    const [receipts, setReceipts] = useState({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const result = await chatService.getConversations();
            if (result && (result.success || Array.isArray(result.data) || Array.isArray(result))) {
                const list = Array.isArray(result.data)
                    ? result.data
                    : (result.data?.conversations || result.conversations || (Array.isArray(result) ? result : []));
                setConversations(list);

                // Update receipt state from chatService cache if available
                if (chatService?.getAllReceipts) {
                    const allReceipts = chatService.getAllReceipts() || {};
                    if (allReceipts && typeof allReceipts === 'object') {
                        setReceipts(allReceipts);
                    }
                }

                // Background resolution for conversations whose last message sender is unknown
                if (chatService?.resolveLatestReceipts && currentUserId) {
                    const missing = list
                        .filter((c) => {
                            const cId = c.id || c.Id;
                            const unread = c.unreadCount || c.UnreadCount || 0;
                            const preview = c.lastMessagePreview || c.LastMessagePreview;
                            return (
                                unread === 0 &&
                                preview &&
                                preview !== 'No messages yet' &&
                                !chatService.getLastMessageReceipt?.(cId)
                            );
                        })
                        .map((c) => c.id || c.Id);

                    if (missing.length > 0) {
                        try {
                            const resPromise = chatService.resolveLatestReceipts(missing, currentUserId);
                            if (resPromise?.then) {
                                resPromise
                                    .then((updated) => {
                                        if (updated && Object.keys(updated).length > 0) {
                                            setReceipts((prev) => ({ ...(prev || {}), ...updated }));
                                        }
                                    })
                                    .catch(() => {});
                            }
                        } catch {
                            // Non-critical background resolution failure
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConversations();
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadConversations();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadConversations();
        setRefreshing(false);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const renderConversation = ({ item }) => {
        const id = item.id || item.Id;
        const spaceId = item.parkingSpaceId || item.ParkingSpaceId || item.parkingId || item.ParkingId;
        const name = item.otherParticipantName || item.OtherParticipantName || 'Host / Driver';
        const title = item.parkingSpaceTitle || item.ParkingSpaceTitle || 'Parking Space';
        const preview = item.lastMessagePreview || item.LastMessagePreview || 'No messages yet';
        const timestamp = item.lastMessageAt || item.LastMessageAt || item.createdAt || item.CreatedAt;
        const unread = item.unreadCount || item.UnreadCount || 0;

        const receipt = (receipts && receipts[id]) || (chatService?.getLastMessageReceipt ? chatService.getLastMessageReceipt(id) : null);

        // Check if last message was sent by current user:
        // Must have 0 unread messages (as unread indicates incoming messages from the other user)
        const isMine =
            unread === 0 &&
            Boolean(
                item.isLastMessageMine === true ||
                item.IsLastMessageMine === true ||
                (item.lastMessageSenderId && (item.lastMessageSenderId === currentUserId || item.lastMessageSenderId === 'me')) ||
                (item.LastMessageSenderId && (item.LastMessageSenderId === currentUserId || item.LastMessageSenderId === 'me')) ||
                (item.lastMessage?.senderId && (item.lastMessage.senderId === currentUserId || item.lastMessage.senderId === 'me')) ||
                (item.senderId && (item.senderId === currentUserId || item.senderId === 'me')) ||
                (receipt && (receipt.isMine || (receipt.senderId && (receipt.senderId === currentUserId || receipt.senderId === 'me'))))
            );

        const isRead = Boolean(
            item.lastMessageIsRead ||
            item.LastMessageIsRead ||
            item.isRead ||
            item.IsRead ||
            item.lastMessage?.isRead ||
            receipt?.isRead
        );

        const isDelivered = Boolean(
            item.isDelivered ||
            item.IsDelivered ||
            item.lastMessageIsDelivered ||
            item.lastMessageStatus === 'delivered' ||
            item.status === 'delivered' ||
            receipt?.isDelivered ||
            receipt?.status === 'delivered' ||
            isRead
        );

        return (
            <TouchableOpacity
                testID={`conversation-item-${id}`}
                style={styles.conversationItem}
                onPress={() => navigation.navigate('ChatScreen', {
                    conversationId: id,
                    parkingSpaceId: spaceId,
                    participantName: name,
                    parkingTitle: title,
                })}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                </View>
                <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                        <Text style={styles.participantName} numberOfLines={1}>
                            {name}
                        </Text>
                        <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
                    </View>
                    <Text style={styles.parkingTitle} numberOfLines={1}>
                        🅿️ {title}
                    </Text>
                    <View style={styles.previewRow}>
                        <View style={styles.previewTextContainer}>
                            {isMine && preview !== 'No messages yet' && (
                                <Text
                                    testID={`conversation-receipt-${id}`}
                                    style={[
                                        styles.previewReceipt,
                                        isRead && styles.previewReceiptRead,
                                        isDelivered && !isRead && styles.previewReceiptDelivered,
                                    ]}
                                >
                                    {isDelivered || isRead ? '✓✓' : '✓'}
                                </Text>
                            )}
                            <Text style={styles.preview} numberOfLines={1}>
                                {preview}
                            </Text>
                        </View>
                        {unread > 0 && (
                            <View style={styles.badge} testID={`unread-badge-${id}`}>
                                <Text style={styles.badgeText}>{unread}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <ScreenLayout edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>💬 Messages</Text>
            </View>
            {conversations.length === 0 ? (
                <View style={styles.centered}>
                    <Ionicons name="chatbubbles-outline" size={48} color={colors.textTertiary} />
                    <Text style={styles.emptyText}>No conversations yet</Text>
                    <Text style={styles.emptySubtext}>
                        Start chatting from a parking listing
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderConversation}
                    keyExtractor={(item, index) => (item?.id || item?.Id ? String(item.id || item.Id) : `conv-${index}`)}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={colors.primary}
                        />
                    }
                />
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    headerTitle: { fontSize: 22, fontWeight: '700', color: colors.text },
    conversationItem: {
        flexDirection: 'row', padding: 16, alignItems: 'center',
        borderBottomWidth: 1, borderBottomColor: colors.borderLight,
        backgroundColor: colors.surface,
    },
    avatar: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: colors.primary, justifyContent: 'center',
        alignItems: 'center', marginRight: 12,
    },
    avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    conversationContent: { flex: 1 },
    conversationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    participantName: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: 8 },
    timestamp: { fontSize: 12, color: colors.textTertiary },
    parkingTitle: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewTextContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    previewReceipt: {
        fontSize: 13,
        color: colors.textTertiary,
        marginRight: 4,
        fontWeight: '700',
    },
    previewReceiptDelivered: {
        color: colors.textSecondary,
    },
    previewReceiptRead: {
        color: colors.primary,
    },
    preview: { fontSize: 14, color: colors.textTertiary, flex: 1 },
    badge: {
        backgroundColor: colors.primary, borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 2, minWidth: 20, alignItems: 'center',
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    emptyText: { fontSize: 16, fontWeight: '500', color: colors.textSecondary, marginTop: 16 },
    emptySubtext: { fontSize: 14, color: colors.textTertiary, marginTop: 4 },
});

export default ConversationListScreen;
