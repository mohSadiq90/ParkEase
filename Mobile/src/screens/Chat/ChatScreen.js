/**
 * Chat Screen
 * Displays message thread for a conversation with real-time updates,
 * optimistic rendering, instant sending feedback, delivery receipts,
 * failed-message retry, and date dividers like modern chat apps.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/globalStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import chatService from '../../services/chat/chatService';

const QUICK_SUGGESTIONS = [
    'Hi, is this parking space available now?',
    'What are the entry / access instructions?',
    'Can I park an SUV or large vehicle here?',
    'Can I extend my parking time if needed?',
];

const ChatScreen = ({ route, navigation }) => {
    const targetConvId = route?.params?.conversationId || route?.params?.convId || route?.params?.id || null;
    const targetSpaceId = route?.params?.parkingSpaceId || route?.params?.parkingId || null;
    const participantName = route?.params?.participantName || route?.params?.name || route?.params?.ownerName || 'Host / Driver';
    const parkingTitle = route?.params?.parkingTitle || route?.params?.title || 'Parking Space';

    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const [currentConvId, setCurrentConvId] = useState(targetConvId);
    const [currentSpaceId, setCurrentSpaceId] = useState(targetSpaceId);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(Boolean(targetConvId));
    const [refreshing, setRefreshing] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [showScrollBottom, setShowScrollBottom] = useState(false);
    const flatListRef = useRef(null);
    const pollInterval = useRef(null);

    // Hide bottom tab bar while in chat to give maximum viewport and avoid keyboard clashes
    useEffect(() => {
        let parentNav = navigation?.getParent?.();
        while (parentNav && !parentNav.getState?.()?.type?.includes('tab')) {
            const nextParent = parentNav.getParent?.();
            if (!nextParent) break;
            parentNav = nextParent;
        }
        if (parentNav?.setOptions) {
            parentNav.setOptions({ tabBarStyle: { display: 'none' } });
        }
        return () => {
            if (parentNav?.setOptions) {
                parentNav.setOptions({ tabBarStyle: undefined });
            }
        };
    }, [navigation]);

    // Track keyboard visibility and auto-scroll to latest message
    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSub = Keyboard.addListener(showEvent, () => {
            setKeyboardVisible(true);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            setKeyboardVisible(false);
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const loadMessages = useCallback(async (convId = currentConvId, isManualRefresh = false) => {
        if (!convId) {
            setLoading(false);
            return;
        }
        if (isManualRefresh) setRefreshing(true);
        try {
            const result = await chatService.getMessages(convId);
            if (result && (result.success || Array.isArray(result.data))) {
                const rawMsgs = Array.isArray(result.data)
                    ? result.data
                    : (result.data?.messages || result.data?.items || []);
                const serverMsgs = [...rawMsgs].reverse();

                setMessages((prev) => {
                    // Retain any pending/failed messages OR recently sent messages not yet in serverMsgs
                    const localPreserved = prev.filter((m) => {
                        if (m.status === 'sending' || m.status === 'failed') return true;
                        const isInServer = serverMsgs.some((s) => String(s.id) === String(m.id));
                        if (!isInServer && (m.status === 'sent' || m.tempId)) {
                            return true;
                        }
                        return false;
                    });

                    if (localPreserved.length === 0) {
                        return serverMsgs;
                    }

                    // Filter out any local message that already has an exact match on server
                    const unresolved = localPreserved.filter((p) => {
                        const matchedOnServer = serverMsgs.some((s) => {
                            if (s.id && p.id && String(s.id) === String(p.id)) return true;
                            if (
                                s.senderId === p.senderId &&
                                s.content === p.content &&
                                Math.abs(new Date(s.createdAt).getTime() - new Date(p.createdAt).getTime()) < 30000
                            ) {
                                return true;
                            }
                            return false;
                        });
                        return !matchedOnServer;
                    });

                    return [...serverMsgs, ...unresolved];
                });

                if (serverMsgs.length > 0 && convId && chatService?.setLastMessageReceipt) {
                    const latest = serverMsgs[serverMsgs.length - 1];
                    chatService.setLastMessageReceipt(convId, {
                        senderId: latest.senderId,
                        isMine: latest.senderId === user?.id || latest.senderId === 'me',
                        content: latest.content,
                        createdAt: latest.createdAt,
                        isRead: Boolean(latest.isRead),
                        isDelivered: true,
                        status: latest.isRead ? 'read' : 'delivered',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setLoading(false);
            if (isManualRefresh) setRefreshing(false);
        }
    }, [currentConvId]);

    const markRead = useCallback(async (convId = currentConvId) => {
        if (!convId) return;
        try {
            await chatService.markAsRead(convId);
        } catch { }
    }, [currentConvId]);

    useEffect(() => {
        if (currentConvId) {
            loadMessages(currentConvId);
            markRead(currentConvId);

            // Poll for new messages every 5 seconds (lightweight real-time substitute for mobile)
            pollInterval.current = setInterval(() => loadMessages(currentConvId), 5000);
        } else {
            setLoading(false);
        }
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [currentConvId, loadMessages, markRead]);

    /**
     * Optimistic Message Dispatch:
     * 1. Instantly clears input
     * 2. Immediately adds message to UI with 'sending' status
     * 3. Scrolls to bottom right away
     * 4. Asynchronously sends over API and updates to 'sent' or 'failed'
     */
    const handleSend = async (overrideContent = null) => {
        const textToProcess = typeof overrideContent === 'string' ? overrideContent : newMessage;
        const content = textToProcess.trim();
        if (!content) return;

        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const optimisticMsg = {
            id: tempId,
            tempId,
            conversationId: currentConvId,
            senderId: user?.id || 'me',
            senderName: user?.firstName || user?.name || 'Me',
            content,
            createdAt: new Date().toISOString(),
            isRead: false,
            status: 'sending',
        };

        // Instantly clear the textfield so the user can continue typing without block
        if (!overrideContent) {
            setNewMessage('');
        }

        // Instantly display message in the chat thread
        setMessages((prev) => [...prev, optimisticMsg]);

        // Immediate scroll to bottom
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);

        const effectiveSpaceId = currentSpaceId || targetSpaceId;
        try {
            const result = await chatService.sendMessage(effectiveSpaceId, content, currentConvId);
            if (result?.success && result?.data) {
                const confirmedMsg = result.data;
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === tempId || m.tempId === tempId
                            ? { ...confirmedMsg, status: 'sent' }
                            : m
                    )
                );
                const convKey = confirmedMsg.conversationId || currentConvId;
                if (chatService?.setLastMessageReceipt && convKey) {
                    chatService.setLastMessageReceipt(convKey, {
                        senderId: user?.id || 'me',
                        isMine: true,
                        content: confirmedMsg.content || content,
                        createdAt: confirmedMsg.createdAt,
                        isRead: Boolean(confirmedMsg.isRead),
                        isDelivered: true,
                        status: confirmedMsg.isRead ? 'read' : 'delivered',
                    });
                }
                if (confirmedMsg.conversationId && !currentConvId) {
                    setCurrentConvId(confirmedMsg.conversationId);
                }
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
            } else {
                throw new Error(result?.message || 'Could not deliver message.');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempId || m.tempId === tempId
                        ? {
                            ...m,
                            status: 'failed',
                            errorMessage: error?.response?.data?.message || error?.message || 'Failed to deliver',
                        }
                        : m
                )
            );
        }
    };

    /**
     * Retry sending a failed message
     */
    const handleRetry = async (failedMsg) => {
        if (!failedMsg) return;

        // Reset status to sending
        setMessages((prev) =>
            prev.map((m) =>
                m.id === failedMsg.id || m.tempId === failedMsg.id
                    ? { ...m, status: 'sending', errorMessage: null }
                    : m
            )
        );

        const effectiveSpaceId = currentSpaceId || targetSpaceId;
        try {
            const result = await chatService.sendMessage(effectiveSpaceId, failedMsg.content, currentConvId);
            if (result?.success && result?.data) {
                const confirmedMsg = result.data;
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === failedMsg.id || m.tempId === failedMsg.id
                            ? { ...confirmedMsg, status: 'sent' }
                            : m
                    )
                );
                if (confirmedMsg.conversationId && !currentConvId) {
                    setCurrentConvId(confirmedMsg.conversationId);
                }
            } else {
                throw new Error(result?.message || 'Could not deliver message.');
            }
        } catch (error) {
            console.error('Failed to retry message:', error);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === failedMsg.id || m.tempId === failedMsg.id
                        ? {
                            ...m,
                            status: 'failed',
                            errorMessage: error?.response?.data?.message || error?.message || 'Failed to deliver',
                        }
                        : m
                )
            );
        }
    };

    const handleDeleteFailed = (msgId) => {
        setMessages((prev) => prev.filter((m) => m.id !== msgId && m.tempId !== msgId));
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const formatDateDivider = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            if (isToday) return 'Today';

            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const isYesterday = date.toDateString() === yesterday.toDateString();
            if (isYesterday) return 'Yesterday';

            const isSameYear = date.getFullYear() === now.getFullYear();
            if (isSameYear) {
                return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            }
            return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return '';
        }
    };

    const renderDateDivider = (currentDate, prevDate) => {
        if (!currentDate) return null;
        const curr = new Date(currentDate).toDateString();
        const prev = prevDate ? new Date(prevDate).toDateString() : null;
        if (curr === prev) return null;

        return (
            <View style={styles.dateDividerContainer} testID="chat-date-divider">
                <View style={styles.dateDividerPill}>
                    <Text style={styles.dateDividerText}>{formatDateDivider(currentDate)}</Text>
                </View>
            </View>
        );
    };

    const renderMessage = ({ item, index }) => {
        const isMine = item.senderId === user?.id || item.senderId === 'me';
        const isSending = item.status === 'sending';
        const isFailed = item.status === 'failed';
        const prevItem = index > 0 ? messages[index - 1] : null;

        return (
            <View>
                {renderDateDivider(item.createdAt, prevItem?.createdAt)}
                <View
                    testID="chat-message-item"
                    style={[styles.messageBubbleRow, isMine && styles.messageBubbleRowMine]}
                >
                    <View
                        style={[
                            styles.messageBubble,
                            isMine ? styles.myBubble : styles.otherBubble,
                            isFailed && styles.failedBubble,
                        ]}
                    >
                        {!isMine && (
                            <Text style={styles.senderName}>{item.senderName || participantName}</Text>
                        )}
                        <Text style={[styles.messageText, isMine && styles.myMessageText]}>
                            {item.content}
                        </Text>
                        <View style={styles.metaRow}>
                            <Text style={[styles.timestamp, isMine && styles.myTimestamp]}>
                                {formatTime(item.createdAt)}
                            </Text>

                            {isMine && (
                                <View style={styles.statusIndicatorContainer}>
                                    {isSending ? (
                                        <View style={styles.sendingRow} testID={`status-sending-${item.id}`}>
                                            <ActivityIndicator size={10} color="rgba(255,255,255,0.85)" style={{ marginRight: 3 }} />
                                            <Text style={styles.sendingText}>Sending...</Text>
                                        </View>
                                    ) : isFailed ? (
                                        <TouchableOpacity
                                            testID={`status-failed-${item.id}`}
                                            style={styles.failedRow}
                                            onPress={() => handleRetry(item)}
                                            onLongPress={() => {
                                                Alert.alert(
                                                    'Delete Message',
                                                    'Do you want to delete this unsent message?',
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteFailed(item.id) },
                                                    ]
                                                );
                                            }}
                                        >
                                            <Ionicons name="alert-circle" size={13} color="#FCA5A5" style={{ marginRight: 2 }} />
                                            <Text style={styles.failedText}>Tap to retry</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text testID={`status-receipt-${item.id}`} style={styles.readReceipt}>
                                            {item.isRead || item.isDelivered || item.status === 'delivered' ? '✓✓' : '✓'}
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const hasInFlightMessages = messages.some((m) => m.status === 'sending');

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets?.top || 0, 12) + 4 }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backBtn}
                    accessibilityLabel="Back"
                >
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.avatarMini}>
                    <Text style={styles.avatarMiniText}>
                        {participantName?.charAt(0)?.toUpperCase() || 'P'}
                    </Text>
                </View>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerName} numberOfLines={1}>
                        {participantName || 'Host / Driver'}
                    </Text>
                    <View style={styles.subtitleRow}>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                            🅿️ {parkingTitle || 'Parking Space'}
                        </Text>
                    </View>
                </View>
                {hasInFlightMessages ? (
                    <View style={styles.headerSyncStatus}>
                        <ActivityIndicator size="small" color={colors.primary} />
                    </View>
                ) : (
                    <TouchableOpacity
                        onPress={() => loadMessages(currentConvId, true)}
                        style={styles.refreshBtn}
                        accessibilityLabel="Refresh messages"
                        disabled={refreshing}
                    >
                        <Ionicons
                            name="refresh"
                            size={20}
                            color={refreshing ? colors.primary : colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Messages */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <View style={styles.listWrapper}>
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item, index) => (item?.id ? String(item.id) : `msg-${index}`)}
                        style={styles.messagesListContainer}
                        contentContainerStyle={styles.messagesList}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        onContentSizeChange={() => {
                            if (!showScrollBottom) {
                                flatListRef.current?.scrollToEnd({ animated: false });
                            }
                        }}
                        onScroll={(e) => {
                            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                            const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
                            setShowScrollBottom(distanceFromBottom > 180);
                        }}
                        scrollEventThrottle={100}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyAvatar}>
                                    <Text style={styles.emptyAvatarText}>
                                        {participantName?.charAt(0)?.toUpperCase() || 'P'}
                                    </Text>
                                </View>
                                <Text style={styles.emptyTitle}>
                                    Start the conversation with {participantName}!
                                </Text>
                                <Text style={styles.emptySubtitle}>
                                    Ask about parking availability, entry instructions, or vehicle size restrictions.
                                </Text>

                                <View style={styles.suggestionsContainer}>
                                    <Text style={styles.suggestionsHeader}>💡 Quick Questions:</Text>
                                    {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                                        <TouchableOpacity
                                            key={`sug-${idx}`}
                                            testID={`quick-suggestion-${idx}`}
                                            style={styles.suggestionChip}
                                            onPress={() => handleSend(suggestion)}
                                        >
                                            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                                            <Text style={styles.suggestionText}>{suggestion}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        }
                    />

                    {showScrollBottom && (
                        <TouchableOpacity
                            style={styles.scrollBottomBtn}
                            onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            accessibilityLabel="Scroll to bottom"
                        >
                            <Ionicons name="chevron-down" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Input Bar */}
            <View style={[
                styles.inputContainer,
                {
                    paddingBottom: keyboardVisible
                        ? 8
                        : Math.max(insets?.bottom || 0, 8),
                },
            ]}>
                <TextInput
                    testID="chat-input"
                    style={styles.input}
                    value={newMessage}
                    onChangeText={setNewMessage}
                    onFocus={() => {
                        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
                    }}
                    placeholder="Type a message..."
                    placeholderTextColor={colors.textTertiary}
                    maxLength={2000}
                    multiline
                />
                <TouchableOpacity
                    testID="chat-send-btn"
                    style={[
                        styles.sendBtn,
                        !newMessage.trim() && styles.sendBtnDisabled,
                    ]}
                    onPress={() => handleSend()}
                    disabled={!newMessage.trim()}
                    accessibilityLabel="Send message"
                >
                    <Ionicons
                        name="send"
                        size={18}
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
    listWrapper: { flex: 1, position: 'relative' },
    header: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10,
        backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    },
    backBtn: { marginRight: 8, padding: 4 },
    avatarMini: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
        marginRight: 10,
    },
    avatarMiniText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    headerInfo: { flex: 1 },
    headerName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary || '#1E293B' },
    subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
    headerSubtitle: { fontSize: 12, color: colors.textSecondary, flex: 1 },
    headerSyncStatus: { paddingHorizontal: 8 },
    refreshBtn: { padding: 8 },
    messagesListContainer: { flex: 1 },
    messagesList: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },

    // Date Dividers
    dateDividerContainer: {
        alignItems: 'center', marginVertical: 12,
    },
    dateDividerPill: {
        backgroundColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 12,
    },
    dateDividerText: {
        fontSize: 11, fontWeight: '600', color: '#64748B',
    },

    // Message Bubbles
    messageBubbleRow: { flexDirection: 'row', marginBottom: 8 },
    messageBubbleRowMine: { justifyContent: 'flex-end' },
    messageBubble: {
        maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 9,
        borderRadius: 18,
    },
    myBubble: {
        backgroundColor: colors.primary, borderBottomRightRadius: 3,
    },
    otherBubble: {
        backgroundColor: colors.surface, borderBottomLeftRadius: 3,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    failedBubble: {
        borderWidth: 1.5, borderColor: '#EF4444',
    },
    senderName: { fontSize: 11, fontWeight: '700', color: colors.primary, marginBottom: 3 },
    messageText: { fontSize: 15, color: colors.textPrimary || '#1E293B', lineHeight: 21 },
    myMessageText: { color: '#FFFFFF' },
    metaRow: {
        flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center',
        marginTop: 4, gap: 5,
    },
    timestamp: { fontSize: 10, color: colors.textTertiary },
    myTimestamp: { color: 'rgba(255,255,255,0.75)' },
    statusIndicatorContainer: { flexDirection: 'row', alignItems: 'center' },
    sendingRow: { flexDirection: 'row', alignItems: 'center' },
    sendingText: { fontSize: 10, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic' },
    failedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
    failedText: { fontSize: 10, color: '#FCA5A5', fontWeight: '600' },
    readReceipt: { fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },

    // Empty state
    emptyContainer: {
        alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20,
    },
    emptyAvatar: {
        width: 60, height: 60, borderRadius: 30,
        backgroundColor: colors.primarySoft || '#EEF2FF',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    emptyAvatarText: { fontSize: 26, fontWeight: '700', color: colors.primary },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary || '#1E293B', textAlign: 'center', marginBottom: 6 },
    emptySubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    suggestionsContainer: { width: '100%', marginTop: 8 },
    suggestionsHeader: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
    suggestionChip: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10,
        borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight,
    },
    suggestionText: { fontSize: 13, color: colors.textPrimary || '#1E293B', fontWeight: '500', flex: 1 },

    // Scroll-to-bottom FAB
    scrollBottomBtn: {
        position: 'absolute', right: 16, bottom: 16,
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, shadowRadius: 3.84,
    },

    // Input Bar
    inputContainer: {
        flexDirection: 'row', alignItems: 'flex-end', padding: 8,
        backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderLight,
    },
    input: {
        flex: 1, backgroundColor: colors.background, borderRadius: 20,
        paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
        color: colors.textPrimary || '#1E293B', maxHeight: 110, marginRight: 8,
        borderWidth: 1, borderColor: colors.borderLight,
    },
    sendBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: colors.borderLight },
});

export default ChatScreen;
