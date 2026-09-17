/**
 * Chat API Service
 * Handles all chat-related API calls
 */

import apiClient from '../api/apiClient';
import logger from '../../utils/logger';

const TAG = 'ChatService';

const chatService = {
    /**
     * Get user's conversations (paginated)
     */
    async getConversations(page = 1, pageSize = 20) {
        try {
            const response = await apiClient.get(`/chat/conversations?page=${page}&pageSize=${pageSize}`);
            return response.data;
        } catch (error) {
            logger.error(TAG, 'Failed to get conversations', error);
            throw error;
        }
    },

    /**
     * Get messages for a conversation (paginated, newest first)
     */
    async getMessages(conversationId, page = 1, pageSize = 50) {
        try {
            const response = await apiClient.get(`/chat/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`);
            const result = response.data;
            if (result && conversationId) {
                const list = Array.isArray(result.data)
                    ? result.data
                    : (result.data?.messages || result.data?.items || (Array.isArray(result) ? result : []));
                if (list.length > 0 && page === 1) {
                    const newest = list[0];
                    this.setLastMessageReceipt(conversationId, {
                        senderId: newest.senderId,
                        content: newest.content,
                        isRead: Boolean(newest.isRead),
                        isDelivered: true,
                        status: newest.isRead ? 'read' : 'delivered',
                        createdAt: newest.createdAt,
                    });
                }
            }
            return result;
        } catch (error) {
            logger.error(TAG, 'Failed to get messages', error);
            throw error;
        }
    },

    /**
     * Send a message (creates conversation if needed)
     */
    async sendMessage(parkingSpaceId, content, conversationId = null) {
        try {
            const body = {
                parkingSpaceId: parkingSpaceId || undefined,
                content: typeof content === 'string' ? content.trim() : content,
            };
            if (conversationId) body.conversationId = conversationId;
            const response = await apiClient.post('/chat/send', body);
            const result = response.data;
            if (result?.success && result?.data) {
                const msg = result.data;
                const convId = msg.conversationId || conversationId;
                if (convId) {
                    this.setLastMessageReceipt(convId, {
                        senderId: msg.senderId || 'me',
                        isMine: true,
                        content: msg.content || body.content,
                        isRead: Boolean(msg.isRead),
                        isDelivered: true,
                        status: 'delivered',
                        createdAt: msg.createdAt || new Date().toISOString(),
                    });
                }
            }
            return result;
        } catch (error) {
            logger.error(TAG, 'Failed to send message', error);
            throw error;
        }
    },

    /**
     * Find existing conversation by parking space ID
     */
    async findConversationByParkingSpace(parkingSpaceId) {
        if (!parkingSpaceId) return null;
        try {
            const result = await chatService.getConversations(1, 50);
            const rawList = result?.data?.conversations || (Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []));
            const targetId = String(parkingSpaceId).trim().toLowerCase();
            return (
                rawList.find((c) => {
                    const spaceId = c?.parkingSpaceId || c?.ParkingSpaceId || c?.parkingId || c?.ParkingId;
                    return spaceId && String(spaceId).trim().toLowerCase() === targetId;
                }) || null
            );
        } catch (error) {
            logger.error(TAG, 'Failed to find conversation by parking space', error);
            return null;
        }
    },

    /**
     * In-memory cache for conversation receipts
     */
    _receipts: {},

    setLastMessageReceipt(conversationId, receipt) {
        if (!conversationId) return;
        const key = String(conversationId);
        this._receipts[key] = {
            ...(this._receipts[key] || {}),
            ...receipt,
            updatedAt: Date.now(),
        };
    },

    getLastMessageReceipt(conversationId) {
        if (!conversationId) return null;
        return this._receipts[String(conversationId)] || null;
    },

    getAllReceipts() {
        return { ...this._receipts };
    },

    /**
     * Resolve latest message receipts for conversations where last message sender is unknown
     */
    async resolveLatestReceipts(conversationIds = [], currentUserId = null) {
        if (!Array.isArray(conversationIds) || conversationIds.length === 0) return {};
        const updated = {};
        await Promise.all(
            conversationIds.slice(0, 10).map(async (convId) => {
                try {
                    const result = await this.getMessages(convId, 1, 1);
                    const list = Array.isArray(result?.data)
                        ? result.data
                        : (result?.data?.messages || result?.data?.items || []);
                    if (list.length > 0) {
                        const newest = list[0];
                        const isMine = currentUserId
                            ? (newest.senderId === currentUserId || newest.senderId === 'me')
                            : false;
                        const receipt = {
                            senderId: newest.senderId,
                            isMine,
                            content: newest.content,
                            isRead: Boolean(newest.isRead),
                            isDelivered: true,
                            status: newest.isRead ? 'read' : 'delivered',
                            createdAt: newest.createdAt,
                        };
                        this.setLastMessageReceipt(convId, receipt);
                        updated[String(convId)] = receipt;
                    }
                } catch {
                    // Non-critical background resolution failure can be ignored
                }
            })
        );
        return updated;
    },

    /**
     * Mark all messages in a conversation as read
     */
    async markAsRead(conversationId) {
        try {
            const response = await apiClient.post(`/chat/conversations/${conversationId}/read`);
            if (conversationId && this._receipts[String(conversationId)]) {
                this.setLastMessageReceipt(conversationId, {
                    ...this._receipts[String(conversationId)],
                    isRead: true,
                    status: 'read',
                });
            }
            return response.data;
        } catch (error) {
            logger.error(TAG, 'Failed to mark messages as read', error);
            throw error;
        }
    },

    /**
     * Get global unread message count
     */
    async getUnreadCount() {
        try {
            const response = await apiClient.get('/chat/unread-count');
            return response.data;
        } catch (error) {
            logger.error(TAG, 'Failed to get unread count', error);
            throw error;
        }
    },
};

export default chatService;
