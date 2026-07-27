/**
 * Chat Screen
 * Displays message thread for a conversation with real-time updates
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import chatService from '../../services/chat/chatService';
import chatHub from '../../services/chat/chatHub';
import { getMessagesThunk, sendMessageThunk, markAsReadThunk } from '../../store/slices/chatSlice';

const ChatScreen = ({ route, navigation }) => {
    const { conversationId, parkingSpaceId, participantName, parkingTitle } = route.params;
    const { user } = useAuth();
    const dispatch = useDispatch();
    const messages = useSelector(state => state.chat.messagesByConversation[conversationId] || [])
        .slice()
        .reverse(); // Redux state is newest-first, we need oldest-first for non-inverted FlatList
    
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef(null);

    useEffect(() => {
        let isMounted = true;
        let isCurrentConversation = true;

        const initChat = async () => {
            if (!conversationId) return;
            
            // Join real-time room
            chatHub.joinConversation(conversationId);

            try {
                // Parallel load and mark read
                await Promise.all([
                    dispatch(getMessagesThunk({ conversationId })).unwrap(),
                    dispatch(markAsReadThunk(conversationId)).unwrap()
                ]);
            } catch (error) {
                if (isCurrentConversation) {
                    console.error('Failed to initialize chat:', error);
                }
            } finally {
                if (isMounted && isCurrentConversation) {
                    setLoading(false);
                }
            }
        };

        initChat();

        return () => {
            isMounted = false;
            isCurrentConversation = false;
            if (conversationId) {
                chatHub.leaveConversation(conversationId);
            }
        };
    }, [conversationId, dispatch]);

    const handleSend = async () => {
        const content = newMessage.trim();
        if (!content) return;

        // Optimistic UI updates
        const tempId = `temp-${Date.now()}`;
        setNewMessage('');
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

        try {
            await dispatch(sendMessageThunk({
                parkingSpaceId,
                content,
                conversationId,
                tempId,
                user
            })).unwrap();
        } catch (error) {
            console.error('Failed to send message:', error);
            // Revert message input on failure
            setNewMessage(content);
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessage = ({ item }) => {
        const isMine = item.senderId === user?.id;
        return (
            <View style={[styles.messageBubbleRow, isMine && styles.messageBubbleRowMine]}>
                <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.otherBubble]}>
                    {!isMine && (
                        <Text style={styles.senderName}>{item.senderName}</Text>
                    )}
                    <Text style={[styles.messageText, isMine && styles.myMessageText]}>
                        {item.content}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={[styles.timestamp, isMine && styles.myTimestamp]}>
                            {formatTime(item.createdAt)}
                        </Text>
                        {isMine && (
                            <Text style={styles.readReceipt}>
                                {item.isRead ? '✓✓' : '✓'}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>{participantName}</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>🅿️ {parkingTitle}</Text>
                </View>
            </View>

            {/* Messages */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    ListEmptyComponent={
                        <View style={styles.centered}>
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>👋</Text>
                            <Text style={styles.emptyText}>Start the conversation!</Text>
                        </View>
                    }
                />
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textTertiary}
                    maxLength={2000}
                    multiline
                    editable={true}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!newMessage.trim()}
                >
                    <Ionicons
                        name="send"
                        size={20}
                        color={newMessage.trim() ? '#fff' : colors.textTertiary}
                    />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', padding: 12, paddingTop: 50,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    backBtn: { marginRight: 12 },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '600', color: colors.text },
    headerSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    messagesList: { padding: 12, paddingBottom: 4 },
    messageBubbleRow: { flexDirection: 'row', marginBottom: 8 },
    messageBubbleRowMine: { justifyContent: 'flex-end' },
    messageBubble: { maxWidth: '75%', padding: 10, borderRadius: 16 },
    myBubble: {
        backgroundColor: colors.primary, borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: colors.surface, borderBottomLeftRadius: 4,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    senderName: { fontSize: 11, fontWeight: '600', color: colors.primary, marginBottom: 2 },
    messageText: { fontSize: 15, color: colors.text, lineHeight: 20 },
    myMessageText: { color: '#fff' },
    metaRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 },
    timestamp: { fontSize: 10, color: colors.textTertiary },
    myTimestamp: { color: 'rgba(255,255,255,0.7)' },
    readReceipt: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
    emptyText: { fontSize: 15, color: colors.textTertiary },
    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end', padding: 8,
        backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight,
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    },
    input: {
        flex: 1, backgroundColor: colors.background, borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
        color: colors.text, maxHeight: 100, marginRight: 8,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: colors.borderLight },
});

export default ChatScreen;
