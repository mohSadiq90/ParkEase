/**
 * Corporate Service
 * Matching API_ENDPOINTS_MOBILE.md Section 20 (Corporate Module & Enterprise SSO)
 */

import apiClient from './apiClient';
import { ENDPOINTS } from './endpoints';

class CorporateService {
    // 20.1 Companies
    createCompany = async (companyData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.COMPANIES, companyData);
        return response.data;
    };

    getMyCompanies = async () => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.MY_COMPANIES);
        return response.data;
    };

    getCompanyDetails = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.COMPANY_BY_ID(companyId));
        return response.data;
    };

    updateCompany = async (companyId, companyData) => {
        const response = await apiClient.put(ENDPOINTS.CORPORATE.COMPANY_BY_ID(companyId), companyData);
        return response.data;
    };

    getDashboard = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.DASHBOARD(companyId));
        return response.data;
    };

    exportDashboard = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.DASHBOARD_EXPORT(companyId), {
            responseType: 'blob',
        });
        return response.data;
    };

    // 20.2 Members & Invitations
    getMembers = async (companyId, params) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.MEMBERS(companyId), { params });
        return response.data;
    };

    addMember = async (companyId, memberData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.MEMBERS(companyId), memberData);
        return response.data;
    };

    updateMember = async (companyId, membershipId, updateData) => {
        const response = await apiClient.put(ENDPOINTS.CORPORATE.MEMBER_BY_ID(companyId, membershipId), updateData);
        return response.data;
    };

    removeMember = async (companyId, membershipId) => {
        const response = await apiClient.delete(ENDPOINTS.CORPORATE.MEMBER_BY_ID(companyId, membershipId));
        return response.data;
    };

    getInvitations = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.INVITATIONS(companyId));
        return response.data;
    };

    inviteMember = async (companyId, inviteData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.INVITATIONS(companyId), inviteData);
        return response.data;
    };

    cancelInvitation = async (companyId, invitationId) => {
        const response = await apiClient.delete(ENDPOINTS.CORPORATE.INVITATION_BY_ID(companyId, invitationId));
        return response.data;
    };

    resendInvitation = async (companyId, invitationId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.INVITATION_RESEND(companyId, invitationId));
        return response.data;
    };

    acceptInvitation = async (token) => {
        // Body is a raw string token
        const response = await apiClient.post(ENDPOINTS.CORPORATE.ACCEPT_INVITATION, `"${token}"`, {
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    };

    // 20.3 Allocations & Company Parking
    getAllocations = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.ALLOCATIONS(companyId));
        return response.data;
    };

    requestAllocation = async (companyId, requestData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.ALLOCATIONS(companyId), requestData);
        return response.data;
    };

    getVendorAllocations = async () => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.VENDOR_ALLOCATIONS);
        return response.data;
    };

    approveAllocation = async (allocationId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.ALLOCATION_APPROVE(allocationId));
        return response.data;
    };

    rejectAllocation = async (allocationId, reason) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.ALLOCATION_REJECT(allocationId), `"${reason}"`, {
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    };

    updateAllocationPolicy = async (companyId, allocationId, policyData) => {
        const response = await apiClient.put(ENDPOINTS.CORPORATE.ALLOCATION_POLICY(companyId, allocationId), policyData);
        return response.data;
    };

    updateAllocationContract = async (companyId, allocationId, contractData) => {
        const response = await apiClient.put(ENDPOINTS.CORPORATE.ALLOCATION_CONTRACT(companyId, allocationId), contractData);
        return response.data;
    };

    assignFixedSlot = async (companyId, allocationId, slotData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.ALLOCATION_FIXED_SLOTS(companyId, allocationId), slotData);
        return response.data;
    };

    removeFixedSlot = async (companyId, allocationId, membershipId) => {
        const response = await apiClient.delete(ENDPOINTS.CORPORATE.ALLOCATION_FIXED_SLOT_DELETE(companyId, allocationId, membershipId));
        return response.data;
    };

    // Company Parking Spaces
    getCompanyParkingSpaces = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.PARKING_SPACES(companyId));
        return response.data;
    };

    getCompanyParkingSpace = async (companyId, parkingSpaceId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.PARKING_SPACE_BY_ID(companyId, parkingSpaceId));
        return response.data;
    };

    createCompanyParkingSpace = async (companyId, spaceData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.PARKING_SPACES(companyId), spaceData);
        return response.data;
    };

    updateCompanyParkingSpace = async (companyId, parkingSpaceId, spaceData) => {
        const response = await apiClient.put(ENDPOINTS.CORPORATE.PARKING_SPACE_BY_ID(companyId, parkingSpaceId), spaceData);
        return response.data;
    };

    retireCompanyParkingSpace = async (companyId, parkingSpaceId) => {
        const response = await apiClient.delete(ENDPOINTS.CORPORATE.PARKING_SPACE_BY_ID(companyId, parkingSpaceId));
        return response.data;
    };

    toggleActiveCompanyParkingSpace = async (companyId, parkingSpaceId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.PARKING_SPACE_TOGGLE_ACTIVE(companyId, parkingSpaceId));
        return response.data;
    };

    createOwnedAllocation = async (companyId, parkingSpaceId, allocationData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.PARKING_SPACE_ALLOCATIONS(companyId, parkingSpaceId), allocationData);
        return response.data;
    };

    // 20.4 Corporate Bookings & Waitlist
    getCorporateBookings = async (companyId, params) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.BOOKINGS(companyId), { params });
        return response.data;
    };

    exportCorporateBookings = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.BOOKINGS_EXPORT(companyId), {
            responseType: 'blob',
        });
        return response.data;
    };

    createEmployeeBooking = async (companyId, bookingData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.BOOKING_EMPLOYEE(companyId), bookingData);
        return response.data;
    };

    createVisitorBooking = async (companyId, visitorData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.BOOKING_VISITOR(companyId), visitorData);
        return response.data;
    };

    cancelCorporateBooking = async (companyId, bookingId, reason) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.BOOKING_CANCEL(companyId, bookingId), { reason });
        return response.data;
    };

    getWaitlist = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.WAITLIST(companyId));
        return response.data;
    };

    cancelWaitlistEntry = async (companyId, waitlistEntryId) => {
        const response = await apiClient.delete(ENDPOINTS.CORPORATE.WAITLIST_BY_ID(companyId, waitlistEntryId));
        return response.data;
    };
    
    promoteWaitlist = async (companyId, waitlistEntryId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.WAITLIST_PROMOTE(companyId, waitlistEntryId));
        return response.data;
    };

    // 20.5 Corporate Invoices
    generateInvoices = async (companyId, periodData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.INVOICES(companyId), periodData);
        return response.data;
    };

    getInvoices = async (companyId, params) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.INVOICES(companyId), { params });
        return response.data;
    };

    getInvoiceDetails = async (companyId, invoiceId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.INVOICE_BY_ID(companyId, invoiceId));
        return response.data;
    };

    issueInvoice = async (companyId, invoiceId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.INVOICE_ISSUE(companyId, invoiceId));
        return response.data;
    };

    markInvoicePaid = async (companyId, invoiceId, paymentData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.INVOICE_MARK_PAID(companyId, invoiceId), paymentData);
        return response.data;
    };

    voidInvoice = async (companyId, invoiceId, reasonData) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.INVOICE_VOID(companyId, invoiceId), reasonData);
        return response.data;
    };

    exportInvoice = async (companyId, invoiceId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.INVOICE_EXPORT(companyId, invoiceId), {
            responseType: 'blob',
        });
        return response.data;
    };

    // 20.6 Company SSO Configuration (Corporate Admin)
    getSSOConfig = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.SSO(companyId));
        return response.data;
    };

    upsertSSOConfig = async (companyId, config) => {
        const response = await apiClient.put(ENDPOINTS.CORPORATE.SSO(companyId), config);
        return response.data;
    };

    addSSODomain = async (companyId, domain) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.SSO_DOMAINS(companyId), { domain });
        return response.data;
    };

    verifySSODomain = async (companyId, domainId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.SSO_DOMAIN_VERIFY(companyId, domainId));
        return response.data;
    };

    deleteSSODomain = async (companyId, domainId) => {
        const response = await apiClient.delete(ENDPOINTS.CORPORATE.SSO_DOMAIN_DELETE(companyId, domainId));
        return response.data;
    };

    testSSOConnection = async (companyId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.SSO_TEST(companyId));
        return response.data;
    };

    enableSSO = async (companyId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.SSO_ENABLE(companyId));
        return response.data;
    };

    disableSSO = async (companyId) => {
        const response = await apiClient.post(ENDPOINTS.CORPORATE.SSO_DISABLE(companyId));
        return response.data;
    };

    getSSOAudit = async (companyId) => {
        const response = await apiClient.get(ENDPOINTS.CORPORATE.SSO_AUDIT(companyId));
        return response.data;
    };

    unlinkSSOUser = async (companyId, linkId) => {
        const response = await apiClient.delete(ENDPOINTS.CORPORATE.SSO_UNLINK(companyId, linkId));
        return response.data;
    };
}

export const corporateService = new CorporateService();
export default corporateService;
