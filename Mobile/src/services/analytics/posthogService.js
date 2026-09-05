/**
 * PostHog Analytics Service
 * Centralized PostHog SDK wrapper for user identification, lifecycle tracking,
 * navigation screen views with dwell time & transitions, B2B group analytics,
 * and error/exception tracking in ParkEase Mobile.
 */

import { PostHog } from 'posthog-react-native';
import environment from '../../config/environment';
import logger from '../../utils/logger';

const TAG = 'PostHogService';

/**
 * Standard Analytics Event Catalog
 */
export const AnalyticsEvents = {
    // Auth & Identity
    AUTH_LOGIN: 'user_login',
    AUTH_LOGOUT: 'user_logout',
    AUTH_REGISTER: 'user_register',
    AUTH_EXTERNAL_LOGIN: 'user_external_login',
    AUTH_EXTERNAL_LINK: 'user_external_link',
    AUTH_SESSION_RESTORED: 'user_session_restored',
    AUTH_CHANNEL_SWITCHED: 'user_channel_switched',

    // Navigation & Screen Views
    SCREEN_VIEW: '$screen',

    // Search & Discovery
    SEARCH_PERFORMED: 'search_performed',
    SEARCH_APPLIED_FILTERS: 'search_applied_filters',
    VIEW_PARKING_DETAIL: 'view_parking_detail',
    TOGGLE_FAVORITE: 'toggle_favorite',

    // Booking Lifecycle
    BOOKING_CREATED: 'booking_created',
    BOOKING_CONFIRMED: 'booking_confirmed',
    BOOKING_CANCELLED: 'booking_cancelled',

    // Payments & Passes
    PAYMENT_INITIATED: 'payment_initiated',
    PAYMENT_COMPLETED: 'payment_completed',
    PAYMENT_FAILED: 'payment_failed',
    PASS_PURCHASED: 'pass_purchased',
    ACCESS_PASS_VERIFIED: 'access_pass_verified',

    // Host & Vendor Operations
    LISTING_CREATED: 'listing_created',
    LISTING_UPDATED: 'listing_updated',
    VEHICLE_ADDED: 'vehicle_added',

    // Corporate Operations
    CORPORATE_ALLOCATION_REQUESTED: 'corporate_allocation_requested',
    COMPANY_CREATED: 'company_created',

    // Reliability & Observability
    API_ERROR_OCCURRED: 'api_error_occurred',
};

/**
 * Screen Name to Functional Module Mapping
 */
export const SCREEN_MODULES = {
    // Auth
    Login: 'Auth',
    Signup: 'Auth',
    ForgotPassword: 'Auth',

    // Dashboards
    UnifiedDashboard: 'Home & Dashboards',
    MemberDashboard: 'Home & Dashboards',
    VendorDashboard: 'Home & Dashboards',
    CorporateDashboard: 'Home & Dashboards',
    AdminDashboard: 'Home & Dashboards',

    // Search & Discovery
    Search: 'Search & Discovery',
    SearchScreen: 'Search & Discovery',
    ParkingDetail: 'Search & Discovery',
    ParkingDetailScreen: 'Search & Discovery',
    MapView: 'Search & Discovery',

    // Booking & Payments
    Booking: 'Booking & Checkout',
    BookingScreen: 'Booking & Checkout',
    BookingDetail: 'Booking & Checkout',
    BookingDetailScreen: 'Booking & Checkout',
    MyBookings: 'Booking & Checkout',
    MyBookingsScreen: 'Booking & Checkout',
    Payment: 'Booking & Checkout',
    PaymentScreen: 'Booking & Checkout',

    // Host & Vendor
    MyListings: 'Host & Vendor',
    MyListingsScreen: 'Host & Vendor',
    CreateParking: 'Host & Vendor',
    CreateParkingScreen: 'Host & Vendor',
    VendorBookings: 'Host & Vendor',
    VendorBookingsScreen: 'Host & Vendor',
    AccessPassScanner: 'Host & Vendor',
    AccessPassScannerScreen: 'Host & Vendor',
    AncillaryServices: 'Host & Vendor',
    AncillaryServicesScreen: 'Host & Vendor',
    LprSettings: 'Host & Vendor',
    LprSettingsScreen: 'Host & Vendor',

    // Corporate Suite
    CorporateDashboard: 'Corporate Suite',
    CorporateAllocations: 'Corporate Suite',
    CorporateAllocationsScreen: 'Corporate Suite',
    CorporateBookings: 'Corporate Suite',
    CorporateBookingsScreen: 'Corporate Suite',
    CorporateInvoices: 'Corporate Suite',
    CorporateInvoicesScreen: 'Corporate Suite',
    CorporateMembers: 'Corporate Suite',
    CorporateMembersScreen: 'Corporate Suite',
    CompanyManagement: 'Corporate Suite',
    CompanyManagementScreen: 'Corporate Suite',

    // User Profile & Garage
    Profile: 'User Profile & Garage',
    ProfileScreen: 'User Profile & Garage',
    EditProfile: 'User Profile & Garage',
    EditProfileScreen: 'User Profile & Garage',
    ChangePassword: 'User Profile & Garage',
    ChangePasswordScreen: 'User Profile & Garage',
    Vehicles: 'User Profile & Garage',
    VehiclesScreen: 'User Profile & Garage',
    MyVehicles: 'User Profile & Garage',
    MyVehiclesScreen: 'User Profile & Garage',
    Favorites: 'User Profile & Garage',
    FavoritesScreen: 'User Profile & Garage',

    // Passes & Events
    MyPasses: 'Passes & Events',
    MyPassesScreen: 'Passes & Events',
    EventPackages: 'Passes & Events',
    EventPackagesScreen: 'Passes & Events',

    // Communication & Reviews
    Notifications: 'Communication',
    NotificationsScreen: 'Communication',
    ConversationList: 'Communication',
    ConversationListScreen: 'Communication',
    Chat: 'Communication',
    ChatScreen: 'Communication',
    ReviewsList: 'Social & Reviews',
    ReviewsListScreen: 'Social & Reviews',
    CreateReview: 'Social & Reviews',
    CreateReviewScreen: 'Social & Reviews',
};

/**
 * Returns functional module for a screen name
 */
export const getScreenModule = (screenName) => {
    if (!screenName) return 'General';
    return SCREEN_MODULES[screenName] || 'General';
};

/**
 * Strips sensitive values and returns safe route metadata
 */
export const sanitizeRouteParams = (params = {}) => {
    if (!params || typeof params !== 'object') return {};
    const safeKeys = [
        'id', 'bookingId', 'parkingSpaceId', 'spaceId', 'companyId',
        'city', 'category', 'status', 'tab', 'role', 'type', 'vehicleType',
        'isOverstaySettlement', 'amount', 'viewMode', 'source'
    ];

    const sanitized = {};
    for (const key of safeKeys) {
        if (params[key] !== undefined && params[key] !== null) {
            sanitized[key] = params[key];
        }
    }
    return sanitized;
};

/**
 * PostHog Singleton Client Instance
 */
export const posthog = new PostHog(environment.posthogApiKey, {
    host: environment.posthogHost,
    captureAppLifecycleEvents: true,
    flushAt: 1,
    flushInterval: 10000,
});

/**
 * PostHog Service Helper Utilities
 */
export const posthogService = {
    client: posthog,
    events: AnalyticsEvents,

    /**
     * Identify an authenticated user in PostHog
     * @param {Object} user - User entity from auth response or session
     */
    identifyUser(user) {
        if (!user) return;
        try {
            const distinctId = String(user.id || user.userId || user.email);
            const personProperties = {
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                name: [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined,
                role: user.role,
                phoneNumber: user.phoneNumber,
                channel: user.channel,
                companyId: user.companyId,
                companyRole: user.companyRole,
                linkedProviders: user.linkedProviders || [],
            };

            posthog.identify(distinctId, personProperties);
            logger.info(TAG, `User identified: ${distinctId}`, { email: user.email, role: user.role });

            // Automatically bind corporate users to their company group
            if (user.companyId) {
                this.groupCompany(user.companyId, {
                    companyId: user.companyId,
                    companyRole: user.companyRole,
                    channel: user.channel,
                });
            }
        } catch (error) {
            logger.error(TAG, 'Failed to identify user with PostHog', error);
        }
    },

    /**
     * Reset user identity and start new anonymous session on logout
     */
    resetUser() {
        try {
            posthog.reset();
            logger.info(TAG, 'PostHog user session reset');
        } catch (error) {
            logger.error(TAG, 'Failed to reset PostHog session', error);
        }
    },

    /**
     * Bind events to a Corporate Company B2B Group
     * @param {string|number} companyId
     * @param {Object} companyProperties
     */
    groupCompany(companyId, companyProperties = {}) {
        if (!companyId) return;
        try {
            const groupKey = String(companyId);
            posthog.group('company', groupKey, {
                companyId: groupKey,
                updatedAt: new Date().toISOString(),
                ...companyProperties,
            });
            logger.info(TAG, `Bound user to corporate group: ${groupKey}`);
        } catch (error) {
            logger.error(TAG, `Failed to group company: ${companyId}`, error);
        }
    },

    /**
     * Capture a custom business event
     * @param {string} eventName - Name of the event (use AnalyticsEvents)
     * @param {Object} properties - Custom event payload
     */
    trackEvent(eventName, properties = {}) {
        try {
            const payload = {
                timestamp: new Date().toISOString(),
                ...properties,
            };
            posthog.capture(eventName, payload);
            logger.debug(TAG, `Captured event: ${eventName}`, payload);
        } catch (error) {
            logger.error(TAG, `Failed to capture event: ${eventName}`, error);
        }
    },

    /**
     * Track a screen view with enriched transition and dwell time metrics
     * @param {string} screenName - Name of the active screen
     * @param {Object} params - Route params
     * @param {string|null} previousScreenName - Name of previous screen
     * @param {number|null} dwellTimeMs - Time spent on previous screen in milliseconds
     */
    trackScreen(screenName, params = {}, previousScreenName = null, dwellTimeMs = null) {
        if (!screenName) return;
        try {
            const safeParams = sanitizeRouteParams(params);
            const enrichedProps = {
                screen_module: getScreenModule(screenName),
                previous_screen: previousScreenName || undefined,
                dwell_time_ms: dwellTimeMs != null && dwellTimeMs >= 0 ? dwellTimeMs : undefined,
                dwell_time_seconds: dwellTimeMs != null && dwellTimeMs >= 0 ? Math.round(dwellTimeMs / 1000) : undefined,
                ...safeParams,
            };

            posthog.screen(screenName, enrichedProps);
            logger.debug(TAG, `Tracked screen: ${screenName}`, enrichedProps);
        } catch (error) {
            logger.error(TAG, `Failed to track screen: ${screenName}`, error);
        }
    },

    /**
     * Automatically captures an API error or network exception
     * @param {Error} error
     * @param {Object} context
     */
    captureException(error, context = {}) {
        if (!error) return;
        try {
            if (typeof posthog.captureException === 'function') {
                posthog.captureException(error, context);
            }
            this.trackEvent(AnalyticsEvents.API_ERROR_OCCURRED, {
                errorMessage: error.message || String(error),
                endpoint: context.endpoint,
                method: context.method,
                statusCode: context.statusCode,
                isNetworkError: context.isNetworkError ?? false,
            });
            logger.warn(TAG, 'Logged API exception to PostHog', { message: error.message, ...context });
        } catch (err) {
            logger.error(TAG, 'Failed to capture exception in PostHog', err);
        }
    },

    /**
     * Register super properties sent with every subsequent event
     * @param {Object} properties
     */
    registerSuperProperties(properties = {}) {
        try {
            posthog.register(properties);
        } catch (error) {
            logger.error(TAG, 'Failed to register super properties', error);
        }
    },

    /**
     * Check if a feature flag is enabled
     * @param {string} flagKey
     * @param {boolean} defaultValue
     * @returns {boolean}
     */
    isFeatureEnabled(flagKey, defaultValue = false) {
        try {
            const enabled = posthog.isFeatureEnabled(flagKey);
            return enabled !== undefined ? enabled : defaultValue;
        } catch (error) {
            logger.error(TAG, `Failed to evaluate feature flag: ${flagKey}`, error);
            return defaultValue;
        }
    },

    /**
     * Get feature flag value / payload
     * @param {string} flagKey
     * @returns {*}
     */
    getFeatureFlag(flagKey) {
        try {
            return posthog.getFeatureFlag(flagKey);
        } catch (error) {
            logger.error(TAG, `Failed to get feature flag: ${flagKey}`, error);
            return null;
        }
    },

    /**
     * Fetch active PostHog surveys (e.g. for in-app customer satisfaction NPS)
     */
    async getSurveys() {
        try {
            if (typeof posthog.getSurveys === 'function') {
                return await posthog.getSurveys();
            }
            return [];
        } catch (error) {
            logger.error(TAG, 'Failed to fetch PostHog surveys', error);
            return [];
        }
    },

    /**
     * Force immediate flush of queued events
     */
    async flush() {
        try {
            await posthog.flush();
        } catch (error) {
            logger.error(TAG, 'Failed to flush PostHog queue', error);
        }
    },
};

export default posthogService;
