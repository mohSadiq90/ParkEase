/**
 * Platform Admin Service
 * Matching API_ENDPOINTS_MOBILE.md Section 21 (Platform Admin Operations)
 */

import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';

class AdminService {
    // 21.1 Dashboard
    getDashboard = async () => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.DASHBOARD);
        return response.data;
    };

    // 21.2 User Management
    getUsers = async (params) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.USERS, { params });
        return response.data;
    };

    getUserDetails = async (id) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.USER_BY_ID(id));
        return response.data;
    };

    activateUser = async (id, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.USER_ACTIVATE(id), { reason });
        return response.data;
    };

    deactivateUser = async (id, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.USER_DEACTIVATE(id), { reason });
        return response.data;
    };

    // 21.3 Listing Oversight
    getListings = async (params) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.LISTINGS, { params });
        return response.data;
    };

    getListingDetails = async (id) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.LISTING_BY_ID(id));
        return response.data;
    };

    activateListing = async (id, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.LISTING_ACTIVATE(id), { reason });
        return response.data;
    };

    deactivateListing = async (id, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.LISTING_DEACTIVATE(id), { reason });
        return response.data;
    };

    verifyListing = async (id, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.LISTING_VERIFY(id), { reason });
        return response.data;
    };

    unverifyListing = async (id, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.LISTING_UNVERIFY(id), { reason });
        return response.data;
    };

    // 21.4 Booking Oversight
    getBookings = async (params) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.BOOKINGS, { params });
        return response.data;
    };

    getBookingDetails = async (id) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.BOOKING_BY_ID(id));
        return response.data;
    };

    forceCancelBooking = async (id, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.BOOKING_CANCEL(id), { reason });
        return response.data;
    };

    // 21.5 Payment & Refund Oversight
    getPayments = async (params) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.PAYMENTS, { params });
        return response.data;
    };

    getPaymentDetails = async (id) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.PAYMENT_BY_ID(id));
        return response.data;
    };

    processAdminRefund = async (paymentId, refundData) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.PAYMENT_REFUND(paymentId), refundData);
        return response.data;
    };

    // 21.6 Audit Logs
    getAuditLogs = async (params) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.AUDIT, { params });
        return response.data;
    };

    // 21.7 Corporate SSO Platform Oversight
    getCorporateSsoConfigs = async (params) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.CORPORATE_SSO, { params });
        return response.data;
    };

    forceDisableCorporateSso = async (companyId, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.CORPORATE_SSO_FORCE_DISABLE(companyId), { reason });
        return response.data;
    };

    clearForceDisableCorporateSso = async (companyId, reason) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.CORPORATE_SSO_CLEAR_FORCE_DISABLE(companyId), { reason });
        return response.data;
    };

    getCorporateSsoAudit = async (companyId, take = 50) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.CORPORATE_SSO_AUDIT(companyId), { params: { take } });
        return response.data;
    };

    // 21.8 Outbox Management
    getOutboxMessages = async (params) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.OUTBOX, { params });
        return response.data;
    };

    getOutboxMessageDetails = async (id) => {
        const response = await apiClient.get(ENDPOINTS.ADMIN.OUTBOX_BY_ID(id));
        return response.data;
    };

    requeueOutboxMessage = async (id) => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.OUTBOX_REQUEUE(id));
        return response.data;
    };

    requeueAllFailedOutboxMessages = async () => {
        const response = await apiClient.post(ENDPOINTS.ADMIN.OUTBOX_REQUEUE_FAILED);
        return response.data;
    };

    processOutboxBatch = async (batchSize = 50) => {
        const response = await apiClient.post(`${ENDPOINTS.ADMIN.OUTBOX_PROCESS}?batchSize=${batchSize}`);
        return response.data;
    };
}

export const adminService = new AdminService();
export default adminService;
