/**
 * PostHog Analytics Service
 * Centralized PostHog SDK wrapper for user identification, lifecycle tracking,
 * navigation screen views, and event capture in ParkEase Mobile.
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
     * Track a screen view manually
     * @param {string} screenName - Name of the active screen
     * @param {Object} properties - Additional route params or context
     */
    trackScreen(screenName, properties = {}) {
        if (!screenName) return;
        try {
            posthog.screen(screenName, properties);
            logger.debug(TAG, `Tracked screen: ${screenName}`, properties);
        } catch (error) {
            logger.error(TAG, `Failed to track screen: ${screenName}`, error);
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
