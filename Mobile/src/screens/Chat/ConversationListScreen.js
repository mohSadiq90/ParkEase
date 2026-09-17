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

const ConversationListScreen = ({ navigation }) => {
    const [conversations, setConversations] = useState([]);
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
                        <Text style={styles.preview} numberOfLines={1}>
                            {preview}
                        </Text>
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
                    keyExtractor={(item) => item.id}
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
    preview: { fontSize: 14, color: colors.textTertiary, flex: 1, marginRight: 8 },
    badge: {
        backgroundColor: colors.primary, borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 2, minWidth: 20, alignItems: 'center',
    },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    emptyText: { fontSize: 16, fontWeight: '500', color: colors.textSecondary, marginTop: 16 },
    emptySubtext: { fontSize: 14, color: colors.textTertiary, marginTop: 4 },
});

export default ConversationListScreen;
