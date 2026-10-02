import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import chatService from '../../services/chat/chatService';

/**
 * Thunks
 */
export const getConversationsThunk = createAsyncThunk(
    'chat/getConversations',
    async ({ page = 1, pageSize = 20 } = {}, { rejectWithValue }) => {
        try {
            const response = await chatService.getConversations(page, pageSize);
            if (response.success) {
                return response.data;
            }
            return rejectWithValue(response.message || 'Failed to fetch conversations');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const getMessagesThunk = createAsyncThunk(
    'chat/getMessages',
    async ({ conversationId, page = 1, pageSize = 50 }, { rejectWithValue }) => {
        try {
            const response = await chatService.getMessages(conversationId, page, pageSize);
            if (response.success) {
                return { conversationId, messages: response.data, page };
            }
            return rejectWithValue(response.message || 'Failed to fetch messages');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const sendMessageThunk = createAsyncThunk(
    'chat/sendMessage',
    async ({ parkingSpaceId, content, conversationId, tempId }, { rejectWithValue }) => {
        try {
            const response = await chatService.sendMessage(parkingSpaceId, content, conversationId);
            if (response.success) {
                return { message: response.data, tempId, conversationId }; // The newly created message
            }
            return rejectWithValue(response.message || 'Failed to send message');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const markAsReadThunk = createAsyncThunk(
    'chat/markAsRead',
    async (conversationId, { rejectWithValue }) => {
        try {
            const response = await chatService.markAsRead(conversationId);
            if (response.success) {
                return conversationId;
            }
            return rejectWithValue(response.message || 'Failed to mark as read');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const getUnreadCountThunk = createAsyncThunk(
    'chat/getUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const response = await chatService.getUnreadCount();
            if (response.success) {
                return response.data;
            }
            return rejectWithValue(response.message || 'Failed to get unread count');
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const initialState = {
    conversations: [],
    messagesByConversation: {}, // { conversationId: [messages] }
    unreadCount: 0,
    loadingConversations: false,
    loadingMessages: false,
    error: null,
};

const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        // Reducer to manually receive a message via WebSocket / SignalR
        receiveMessage: (state, action) => {
            const message = action.payload;
            if (!message) return;
            const conversationId = message.conversationId || message.ConversationId;
            if (!conversationId) return;

            // Add message to chat history
            if (!state.messagesByConversation[conversationId]) {
                state.messagesByConversation[conversationId] = [];
            }
            // Dedupe by id
            const existingIndex = state.messagesByConversation[conversationId].findIndex(
                (m) => String(m.id) === String(message.id)
            );
            if (existingIndex !== -1) {
                return; // Already processed
            }

            state.messagesByConversation[conversationId].unshift(message);

            // Update conversation list preview
            const convIndex = state.conversations.findIndex((c) => String(c.id) === String(conversationId));
            if (convIndex !== -1) {
                state.conversations[convIndex].lastMessage = message;
                state.conversations[convIndex].lastMessagePreview = message.content;
                state.conversations[convIndex].unreadCount = (state.conversations[convIndex].unreadCount || 0) + 1;
                // Move to top
                const [conv] = state.conversations.splice(convIndex, 1);
                state.conversations.unshift(conv);
            }

            state.unreadCount += 1;
        },
    },
    extraReducers: (builder) => {
        builder
            // getConversations
            .addCase(getConversationsThunk.pending, (state) => {
                state.loadingConversations = true;
                state.error = null;
            })
            .addCase(getConversationsThunk.fulfilled, (state, action) => {
                state.loadingConversations = false;
                state.conversations = action.payload?.conversations || action.payload || [];
            })
            .addCase(getConversationsThunk.rejected, (state, action) => {
                state.loadingConversations = false;
                state.error = action.payload;
            })

            // getMessages
            .addCase(getMessagesThunk.pending, (state) => {
                state.loadingMessages = true;
                state.error = null;
            })
            .addCase(getMessagesThunk.fulfilled, (state, action) => {
                state.loadingMessages = false;
                const { conversationId, messages, page } = action.payload;
                if (page === 1) {
                    state.messagesByConversation[conversationId] = messages || [];
                } else {
                    const existing = state.messagesByConversation[conversationId] || [];
                    state.messagesByConversation[conversationId] = [...existing, ...(messages || [])];
                }
            })
            .addCase(getMessagesThunk.rejected, (state, action) => {
                state.loadingMessages = false;
                state.error = action.payload;
            })

            // sendMessage
            .addCase(sendMessageThunk.pending, (state, action) => {
                const { conversationId, content, tempId, user } = action.meta?.arg || {};
                if (!conversationId) return;

                const tempMessage = {
                    id: tempId || `temp_${Date.now()}`,
                    tempId: tempId || `temp_${Date.now()}`,
                    conversationId,
                    content,
                    senderId: user?.id || user?.userId || 'me',
                    senderName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user?.name || 'Me'),
                    createdAt: new Date().toISOString(),
                    isRead: false,
                    isTemp: true,
                    status: 'sending',
                };

                if (!state.messagesByConversation[conversationId]) {
                    state.messagesByConversation[conversationId] = [];
                }
                state.messagesByConversation[conversationId].unshift(tempMessage);

                const convIndex = state.conversations.findIndex((c) => String(c.id) === String(conversationId));
                if (convIndex !== -1) {
                    state.conversations[convIndex].lastMessage = tempMessage;
                    state.conversations[convIndex].lastMessagePreview = content;
                    const [conv] = state.conversations.splice(convIndex, 1);
                    state.conversations.unshift(conv);
                }
            })
            .addCase(sendMessageThunk.fulfilled, (state, action) => {
                const payload = action.payload;
                const message = payload?.message || payload;
                const tempId = payload?.tempId;
                const conversationId = payload?.conversationId || message?.conversationId;
                const actualConversationId = message?.conversationId || conversationId;

                if (!actualConversationId) return;

                if (!state.messagesByConversation[actualConversationId]) {
                    state.messagesByConversation[actualConversationId] = [];
                }

                const list = state.messagesByConversation[actualConversationId];
                const tempIndex = tempId ? list.findIndex((m) => m.id === tempId || m.tempId === tempId) : -1;
                if (tempIndex !== -1) {
                    list[tempIndex] = message;
                } else {
                    const existingIndex = list.findIndex((m) => String(m.id) === String(message.id));
                    if (existingIndex === -1) {
                        list.unshift(message);
                    } else {
                        list[existingIndex] = message;
                    }
                }

                const convIndex = state.conversations.findIndex((c) => String(c.id) === String(actualConversationId));
                if (convIndex !== -1) {
                    state.conversations[convIndex].lastMessage = message;
                    state.conversations[convIndex].lastMessagePreview = message.content;
                    const [conv] = state.conversations.splice(convIndex, 1);
                    state.conversations.unshift(conv);
                }
            })
            .addCase(sendMessageThunk.rejected, (state, action) => {
                state.error = action.payload;
                const { conversationId, tempId } = action.meta?.arg || {};
                if (conversationId && tempId && state.messagesByConversation[conversationId]) {
                    state.messagesByConversation[conversationId] = state.messagesByConversation[conversationId].filter(
                        (m) => m.id !== tempId && m.tempId !== tempId
                    );
                }
            })

            // markAsRead
            .addCase(markAsReadThunk.fulfilled, (state, action) => {
                const conversationId = action.payload;
                const conv = state.conversations.find(c => c.id === conversationId);
                if (conv && conv.unreadCount > 0) {
                    state.unreadCount = Math.max(0, state.unreadCount - conv.unreadCount);
                    conv.unreadCount = 0;
                }
            })

            // getUnreadCount
            .addCase(getUnreadCountThunk.fulfilled, (state, action) => {
                state.unreadCount = action.payload || 0;
            });
    }
});

export const { receiveMessage } = chatSlice.actions;
export default chatSlice.reducer;
