import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';
import logger from '../../utils/logger';

const TAG = 'NotificationApiService';

export const notificationApiService = {
    /**
     * Get all notifications for the current user
     */
    getNotifications: async () => {
        try {
            const response = await apiClient.get(ENDPOINTS.NOTIFICATIONS.BASE);
            return response.data;
        } catch (error) {
            logger.error(TAG, 'Failed to fetch notifications', error);
            throw error;
        }
    },

    /**
     * Mark a specific notification as read (PUT /api/notifications/{id}/read)
     */
    markAsRead: async (id) => {
        try {
            // Section 17 of API_ENDPOINTS_MOBILE.md specifies PUT for marking read
            const response = await apiClient.put(ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
            return response.data || { success: true };
        } catch (error) {
            logger.error(TAG, `Failed to mark notification ${id} as read`, error);
            throw error;
        }
    },

    /**
     * Mark all notifications as read (PUT /api/notifications/read-all)
     */
    markAllAsRead: async () => {
        try {
            const response = await apiClient.put(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
            return response.data || { success: true };
        } catch (error) {
            logger.error(TAG, 'Failed to mark all notifications as read', error);
            throw error;
        }
    },

    /**
     * Delete a notification (DELETE /api/notifications/{id})
     */
    deleteNotification: async (id) => {
        try {
            const response = await apiClient.delete(ENDPOINTS.NOTIFICATIONS.DELETE(id));
            return response.data || { success: true };
        } catch (error) {
            logger.error(TAG, `Failed to delete notification ${id}`, error);
            throw error;
        }
    },

    /**
     * Clear all notifications (DELETE /api/notifications/clear-all)
     */
    clearAll: async () => {
        try {
            const response = await apiClient.delete(ENDPOINTS.NOTIFICATIONS.CLEAR_ALL);
            return response.data || { success: true };
        } catch (error) {
            logger.error(TAG, 'Failed to clear all notifications', error);
            throw error;
        }
    }
};

export default notificationApiService;
