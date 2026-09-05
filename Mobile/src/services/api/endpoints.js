/**
 * API Endpoints
 * All endpoint constants matching the backend controllers as documented in API_ENDPOINTS_MOBILE.md
 */

export const ENDPOINTS = {
    // Auth & Users
    AUTH: {
        REGISTER: '/auth/register',
        LOGIN: '/auth/login',
        LOGIN_CORPORATE: '/auth/login/corporate',
        EXTERNAL: '/auth/external',
        EXTERNAL_LINK: '/auth/external/link',
        SET_PASSWORD: '/auth/set-password',
        EXTERNAL_PROVIDERS: '/auth/external/providers',
        CHANNEL: '/auth/channel',
        CHANNEL_CONTEXT: '/auth/channel-context',
        CORPORATE_SSO_DISCOVER: '/auth/corporate/sso/discover',
        CORPORATE_SSO_START: '/auth/corporate/sso/start',
        CORPORATE_SSO_CALLBACK: '/auth/corporate/sso/callback',
        CORPORATE_SSO_COMPLETE: '/auth/corporate/sso/complete',
        REFRESH: '/auth/refresh',
        LOGOUT: '/auth/logout',
        CHANGE_PASSWORD: '/auth/change-password',
    },

    // Users
    USERS: {
        ME: '/users/me',
    },

    // Parking
    PARKING: {
        BASE: '/parking',
        SEARCH: '/parking/search',
        MAP: '/parking/map',
        MY_LISTINGS: '/parking/my-listings',
        BY_ID: (id) => `/parking/${id}`,
        TOGGLE_ACTIVE: (id) => `/parking/${id}/toggle-active`,
    },

    // Bookings
    // Keep this in sync with the ASP.NET controller route: /api/bookings.
    BOOKINGS: {
        BASE: '/bookings',
        MY_BOOKINGS: '/bookings/my-bookings',
        VENDOR_BOOKINGS: '/bookings/vendor-bookings',
        PENDING_COUNT: '/bookings/pending-count',
        CALCULATE_PRICE: '/bookings/calculate-price',
        BY_ID: (id) => `/bookings/${id}`,
        BY_REFERENCE: (ref) => `/bookings/reference/${ref}`,
        BY_PARKING_SPACE: (parkingSpaceId) => `/bookings/parking-space/${parkingSpaceId}`,
        CANCEL: (id) => `/bookings/${id}/cancel`,
        APPROVE: (id) => `/bookings/${id}/approve`,
        REJECT: (id) => `/bookings/${id}/reject`,
        CHECK_IN: (id) => `/bookings/${id}/check-in`,
        CHECK_OUT: (id) => `/bookings/${id}/check-out`,
        EXTEND: (id) => `/bookings/${id}/extend`,
        APPROVE_EXTENSION: (id) => `/bookings/${id}/approve-extension`,
        REJECT_EXTENSION: (id) => `/bookings/${id}/reject-extension`,
        VALET_REQUEST: (id) => `/bookings/${id}/valet/request`,
        VALET_CANCEL: (id) => `/bookings/${id}/valet/cancel`,
        VALET_ACKNOWLEDGE: (id) => `/bookings/${id}/valet/acknowledge`,
        VALET_READY: (id) => `/bookings/${id}/valet/ready`,
        VALET_COMPLETE: (id) => `/bookings/${id}/valet/complete`,
        BAY_ASSIGNMENT: (id) => `/bookings/${id}/bay-assignment`,
        EV_SESSION: (id) => `/bookings/${id}/ev-session`,
        ACCESS_PASS: (id) => `/bookings/${id}/access-pass`,
        ACCESS_PASS_APPLE: (id) => `/bookings/${id}/access-pass/apple.pkpass`,
        ACCESS_PASS_GOOGLE: (id) => `/bookings/${id}/access-pass/google-wallet`,
        ACCESS_PASS_VERIFY: '/bookings/access-pass/verify',
    },

    // Payments
    PAYMENTS: {
        BASE: '/payments',
        STRIPE_CONFIG: '/payments/stripe-config',
        CREATE_ORDER: '/payments/create-order',
        VERIFY: '/payments/verify',
        REFUND: '/payments/refund',
        BY_ID: (id) => `/payments/${id}`,
        BY_BOOKING: (bookingId) => `/payments/booking/${bookingId}`,
    },

    // Chat
    CHAT: {
        CONVERSATIONS: '/chat/conversations',
        MESSAGES: (id) => `/chat/conversations/${id}/messages`,
        SEND: '/chat/send',
        MARK_READ: (id) => `/chat/conversations/${id}/read`,
        UNREAD_COUNT: '/chat/unread-count',
    },

    // Notifications
    NOTIFICATIONS: {
        BASE: '/notifications',
        MARK_READ: (id) => `/notifications/${id}/read`,
        MARK_ALL_READ: '/notifications/read-all',
        DELETE: (id) => `/notifications/${id}`,
        CLEAR_ALL: '/notifications/clear-all',
    },

    // Vehicles
    VEHICLES: {
        BASE: '/vehicles',
        BY_ID: (id) => `/vehicles/${id}`,
    },

    // Favorites
    FAVORITES: {
        BASE: '/favorites',
        TOGGLE: (id) => `/favorites/${id}/toggle`,
    },

    // Reviews
    REVIEWS: {
        BASE: '/reviews',
        BY_ID: (id) => `/reviews/${id}`,
        BY_PARKING_SPACE: (parkingSpaceId) => `/reviews/parking-space/${parkingSpaceId}`,
        OWNER_RESPONSE: (id) => `/reviews/${id}/owner-response`,
    },

    // Device Tokens (FCM)
    DEVICE_TOKENS: {
        REGISTER: '/device-tokens/register',
    },

    // Dashboard
    DASHBOARD: {
        VENDOR: '/dashboard/vendor',
        MEMBER: '/dashboard/member',
    },

    // Parking availability forecasts
    PARKING_AVAILABILITY: {
        FORECAST: (parkingSpaceId) => `/parking-availability/${parkingSpaceId}/forecast`,
        MY_LISTINGS: '/parking-availability/my-listings',
    },

    // Parking passes
    PASSES: {
        BASE: '/passes',
        MY: '/passes/my',
        CORPORATE: '/passes/corporate',
    },

    // Files (Parking Media)
    FILES: {
        UPLOAD: (parkingSpaceId) => `/files/parking/${parkingSpaceId}/upload`,
        SIGN_UPLOAD: (parkingSpaceId) => `/files/parking/${parkingSpaceId}/sign-upload`,
        CONFIRM_UPLOAD: (parkingSpaceId) => `/files/parking/${parkingSpaceId}/confirm-upload`,
        DELETE: (parkingSpaceId, fileName) => `/files/parking/${parkingSpaceId}/${fileName}`,
        GET: (parkingSpaceId) => `/files/parking/${parkingSpaceId}`,
    },

    // Ancillary Services
    ANCILLARY_SERVICES: {
        BASE: '/ancillary-services',
        BY_PARKING: (parkingSpaceId) => `/ancillary-services/by-parking/${parkingSpaceId}`,
        MY: '/ancillary-services/my',
        BY_ID: (id) => `/ancillary-services/${id}`,
        DEACTIVATE: (id) => `/ancillary-services/${id}/deactivate`,
    },

    // Event Packages
    EVENT_PACKAGES: {
        BASE: '/event-packages',
        ON_SALE: '/event-packages/on-sale',
        VENUES_ON_SALE: '/event-packages/venues/on-sale',
        BY_VENUE_EVENT: (venueEventId) => `/event-packages/by-venue-event/${venueEventId}`,
        BY_PARKING: (parkingSpaceId) => `/event-packages/by-parking/${parkingSpaceId}`,
        MY: '/event-packages/my',
        MY_ANALYTICS: '/event-packages/my/analytics',
        BY_ID: (id) => `/event-packages/${id}`,
        ANALYTICS: (id) => `/event-packages/${id}/analytics`,
        DEACTIVATE: (id) => `/event-packages/${id}/deactivate`,
        PURCHASE: (id) => `/event-packages/${id}/purchase`,
    },

    // IoT (EV & LPR Simulator)
    IOT: {
        OCPP_SIMULATE: '/iot/ocpp/simulate',
        LPR_SIMULATE: '/iot/lpr-events/simulate',
    },

    // LPR Settings
    LPR: {
        CAMERA_KEYS: (parkingSpaceId) => `/parking/${parkingSpaceId}/lpr/camera-keys`,
        CAMERA_KEY_TOGGLE: (parkingSpaceId, keyId) => `/parking/${parkingSpaceId}/lpr/camera-keys/${keyId}/enabled`,
        CAMERA_KEY_DELETE: (parkingSpaceId, keyId) => `/parking/${parkingSpaceId}/lpr/camera-keys/${keyId}`,
        PLATE_RULES: (parkingSpaceId) => `/parking/${parkingSpaceId}/lpr/plate-rules`,
        PLATE_RULE_TOGGLE: (parkingSpaceId, ruleId) => `/parking/${parkingSpaceId}/lpr/plate-rules/${ruleId}/enabled`,
        PLATE_RULE_DELETE: (parkingSpaceId, ruleId) => `/parking/${parkingSpaceId}/lpr/plate-rules/${ruleId}`,
    },

    // Corporate Module
    CORPORATE: {
        // 20.1 Companies
        COMPANIES: '/v1/corporate/companies',
        COMPANY_BY_ID: (companyId) => `/v1/corporate/companies/${companyId}`,
        MY_COMPANIES: '/v1/corporate/me/companies',
        DASHBOARD: (companyId) => `/v1/corporate/companies/${companyId}/dashboard`,
        DASHBOARD_EXPORT: (companyId) => `/v1/corporate/companies/${companyId}/dashboard/export`,
        
        // 20.2 Members & invitations
        MEMBERS: (companyId) => `/v1/corporate/companies/${companyId}/members`,
        MEMBER_BY_ID: (companyId, membershipId) => `/v1/corporate/companies/${companyId}/members/${membershipId}`,
        INVITATIONS: (companyId) => `/v1/corporate/companies/${companyId}/invitations`,
        INVITATION_BY_ID: (companyId, invitationId) => `/v1/corporate/companies/${companyId}/invitations/${invitationId}`,
        INVITATION_RESEND: (companyId, invitationId) => `/v1/corporate/companies/${companyId}/invitations/${invitationId}/resend`,
        ACCEPT_INVITATION: '/v1/corporate/invitations/accept',

        // 20.3 Allocations & company parking
        ALLOCATIONS: (companyId) => `/v1/corporate/companies/${companyId}/allocations`,
        VENDOR_ALLOCATIONS: '/v1/corporate/vendor/allocations',
        ALLOCATION_APPROVE: (allocationId) => `/v1/corporate/allocations/${allocationId}/approve`,
        ALLOCATION_REJECT: (allocationId) => `/v1/corporate/allocations/${allocationId}/reject`,
        ALLOCATION_POLICY: (companyId, allocationId) => `/v1/corporate/companies/${companyId}/allocations/${allocationId}/policy`,
        ALLOCATION_CONTRACT: (companyId, allocationId) => `/v1/corporate/companies/${companyId}/allocations/${allocationId}/contract`,
        ALLOCATION_FIXED_SLOTS: (companyId, allocationId) => `/v1/corporate/companies/${companyId}/allocations/${allocationId}/fixed-slots`,
        ALLOCATION_FIXED_SLOT_DELETE: (companyId, allocationId, membershipId) => `/v1/corporate/companies/${companyId}/allocations/${allocationId}/fixed-slots/${membershipId}`,
        
        PARKING_SPACES: (companyId) => `/v1/corporate/companies/${companyId}/parking-spaces`,
        PARKING_SPACE_BY_ID: (companyId, parkingSpaceId) => `/v1/corporate/companies/${companyId}/parking-spaces/${parkingSpaceId}`,
        PARKING_SPACE_TOGGLE_ACTIVE: (companyId, parkingSpaceId) => `/v1/corporate/companies/${companyId}/parking-spaces/${parkingSpaceId}/toggle-active`,
        PARKING_SPACE_ALLOCATIONS: (companyId, parkingSpaceId) => `/v1/corporate/companies/${companyId}/parking-spaces/${parkingSpaceId}/allocations`,

        // 20.4 Corporate bookings & waitlist
        BOOKINGS: (companyId) => `/v1/corporate/companies/${companyId}/bookings`,
        BOOKINGS_EXPORT: (companyId) => `/v1/corporate/companies/${companyId}/bookings/export`,
        BOOKING_EMPLOYEE: (companyId) => `/v1/corporate/companies/${companyId}/bookings/employee`,
        BOOKING_VISITOR: (companyId) => `/v1/corporate/companies/${companyId}/bookings/visitor`,
        BOOKING_CANCEL: (companyId, bookingId) => `/v1/corporate/companies/${companyId}/bookings/${bookingId}/cancel`,
        WAITLIST: (companyId) => `/v1/corporate/companies/${companyId}/waitlist`,
        WAITLIST_BY_ID: (companyId, waitlistEntryId) => `/v1/corporate/companies/${companyId}/waitlist/${waitlistEntryId}`,
        WAITLIST_PROMOTE: (companyId, waitlistEntryId) => `/v1/corporate/companies/${companyId}/waitlist/${waitlistEntryId}/promote`,

        // 20.5 Corporate invoices
        INVOICES: (companyId) => `/v1/corporate/companies/${companyId}/invoices`,
        INVOICE_BY_ID: (companyId, invoiceId) => `/v1/corporate/companies/${companyId}/invoices/${invoiceId}`,
        INVOICE_ISSUE: (companyId, invoiceId) => `/v1/corporate/companies/${companyId}/invoices/${invoiceId}/issue`,
        INVOICE_MARK_PAID: (companyId, invoiceId) => `/v1/corporate/companies/${companyId}/invoices/${invoiceId}/mark-paid`,
        INVOICE_VOID: (companyId, invoiceId) => `/v1/corporate/companies/${companyId}/invoices/${invoiceId}/void`,
        INVOICE_EXPORT: (companyId, invoiceId) => `/v1/corporate/companies/${companyId}/invoices/${invoiceId}/export`,

        // 20.6 Company SSO configuration (Admin)
        SSO: (companyId) => `/v1/corporate/companies/${companyId}/sso`,
        SSO_DOMAINS: (companyId) => `/v1/corporate/companies/${companyId}/sso/domains`,
        SSO_DOMAIN_VERIFY: (companyId, domainId) => `/v1/corporate/companies/${companyId}/sso/domains/${domainId}/verify`,
        SSO_DOMAIN_DELETE: (companyId, domainId) => `/v1/corporate/companies/${companyId}/sso/domains/${domainId}`,
        SSO_TEST: (companyId) => `/v1/corporate/companies/${companyId}/sso/test`,
        SSO_ENABLE: (companyId) => `/v1/corporate/companies/${companyId}/sso/enable`,
        SSO_DISABLE: (companyId) => `/v1/corporate/companies/${companyId}/sso/disable`,
        SSO_AUDIT: (companyId) => `/v1/corporate/companies/${companyId}/sso/audit`,
        SSO_UNLINK: (companyId, linkId) => `/v1/corporate/companies/${companyId}/sso/links/${linkId}`,
    },

    // 21. Platform Admin Operations (Admin Role)
    ADMIN: {
        DASHBOARD: '/admin/dashboard',
        USERS: '/admin/users',
        USER_BY_ID: (id) => `/admin/users/${id}`,
        USER_ACTIVATE: (id) => `/admin/users/${id}/activate`,
        USER_DEACTIVATE: (id) => `/admin/users/${id}/deactivate`,
        LISTINGS: '/admin/listings',
        LISTING_BY_ID: (id) => `/admin/listings/${id}`,
        LISTING_ACTIVATE: (id) => `/admin/listings/${id}/activate`,
        LISTING_DEACTIVATE: (id) => `/admin/listings/${id}/deactivate`,
        LISTING_VERIFY: (id) => `/admin/listings/${id}/verify`,
        LISTING_UNVERIFY: (id) => `/admin/listings/${id}/unverify`,
        BOOKINGS: '/admin/bookings',
        BOOKING_BY_ID: (id) => `/admin/bookings/${id}`,
        BOOKING_CANCEL: (id) => `/admin/bookings/${id}/cancel`,
        PAYMENTS: '/admin/payments',
        PAYMENT_BY_ID: (id) => `/admin/payments/${id}`,
        PAYMENT_REFUND: (id) => `/admin/payments/${id}/refund`,
        AUDIT: '/admin/audit',
        CORPORATE_SSO: '/admin/corporate-sso',
        CORPORATE_SSO_FORCE_DISABLE: (companyId) => `/admin/corporate-sso/${companyId}/force-disable`,
        CORPORATE_SSO_CLEAR_FORCE_DISABLE: (companyId) => `/admin/corporate-sso/${companyId}/clear-force-disable`,
        CORPORATE_SSO_AUDIT: (companyId) => `/admin/corporate-sso/${companyId}/audit`,
        OUTBOX: '/admin/outbox',
        OUTBOX_BY_ID: (id) => `/admin/outbox/${id}`,
        OUTBOX_REQUEUE: (id) => `/admin/outbox/${id}/requeue`,
        OUTBOX_REQUEUE_FAILED: '/admin/outbox/requeue-failed',
        OUTBOX_PROCESS: '/admin/outbox/process',
    },

    // 22. Health
    HEALTH: {
        CHECK: '/health',
    },
};

export default ENDPOINTS;
