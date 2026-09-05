import posthogService, { posthog, AnalyticsEvents } from '../posthogService';
import environment from '../../../config/environment';

describe('PostHog Analytics Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization & Configuration', () => {
        it('initializes posthog client with environment config', () => {
            expect(posthog).toBeDefined();
            expect(posthogService.client).toBe(posthog);
            expect(environment.posthogApiKey).toBe('phc_ocMXR9NeuG667HK2Gr48eRN9mDrmugaUFWXUDm8M534W');
            expect(environment.posthogHost).toBe('https://us.i.posthog.com');
        });

        it('defines all required AnalyticsEvents keys', () => {
            expect(AnalyticsEvents.AUTH_LOGIN).toBe('user_login');
            expect(AnalyticsEvents.AUTH_LOGOUT).toBe('user_logout');
            expect(AnalyticsEvents.AUTH_REGISTER).toBe('user_register');
            expect(AnalyticsEvents.AUTH_EXTERNAL_LOGIN).toBe('user_external_login');
            expect(AnalyticsEvents.AUTH_EXTERNAL_LINK).toBe('user_external_link');
            expect(AnalyticsEvents.AUTH_SESSION_RESTORED).toBe('user_session_restored');
            expect(AnalyticsEvents.AUTH_CHANNEL_SWITCHED).toBe('user_channel_switched');
            expect(AnalyticsEvents.SCREEN_VIEW).toBe('$screen');
            expect(AnalyticsEvents.SEARCH_PERFORMED).toBe('search_performed');
            expect(AnalyticsEvents.VIEW_PARKING_DETAIL).toBe('view_parking_detail');
            expect(AnalyticsEvents.BOOKING_CREATED).toBe('booking_created');
            expect(AnalyticsEvents.PAYMENT_COMPLETED).toBe('payment_completed');
            expect(AnalyticsEvents.LISTING_CREATED).toBe('listing_created');
        });
    });

    describe('identifyUser', () => {
        it('calls posthog.identify with formatted distinctId and person properties', () => {
            const mockUser = {
                id: 'usr-12345',
                email: 'driver@parkease.com',
                firstName: 'Alex',
                lastName: 'Rivera',
                role: 0,
                phoneNumber: '+15551234567',
                channel: 'Consumer',
                companyId: null,
                companyRole: null,
                linkedProviders: ['google'],
            };

            posthogService.identifyUser(mockUser);

            expect(posthog.identify).toHaveBeenCalledWith(
                'usr-12345',
                expect.objectContaining({
                    email: 'driver@parkease.com',
                    firstName: 'Alex',
                    lastName: 'Rivera',
                    name: 'Alex Rivera',
                    role: 0,
                    phoneNumber: '+15551234567',
                    channel: 'Consumer',
                    companyId: null,
                    companyRole: null,
                    linkedProviders: ['google'],
                })
            );
        });

        it('falls back to userId or email if id is not present', () => {
            const mockUser = {
                userId: 'usr-67890',
                email: 'host@parkease.com',
                firstName: 'Sam',
            };

            posthogService.identifyUser(mockUser);

            expect(posthog.identify).toHaveBeenCalledWith(
                'usr-67890',
                expect.objectContaining({
                    email: 'host@parkease.com',
                    name: 'Sam',
                })
            );
        });

        it('gracefully handles null or undefined user', () => {
            posthogService.identifyUser(null);
            posthogService.identifyUser(undefined);
            expect(posthog.identify).not.toHaveBeenCalled();
        });

        it('catches and logs errors without throwing', () => {
            posthog.identify.mockImplementationOnce(() => {
                throw new Error('Identify network failure');
            });

            expect(() => {
                posthogService.identifyUser({ id: 'err-1', email: 'fail@test.com' });
            }).not.toThrow();
        });
    });

    describe('resetUser', () => {
        it('calls posthog.reset on logout', () => {
            posthogService.resetUser();
            expect(posthog.reset).toHaveBeenCalledTimes(1);
        });

        it('handles reset failures gracefully without throwing', () => {
            posthog.reset.mockImplementationOnce(() => {
                throw new Error('Reset failed');
            });

            expect(() => {
                posthogService.resetUser();
            }).not.toThrow();
        });
    });

    describe('trackEvent', () => {
        it('captures custom events with timestamp and payload', () => {
            posthogService.trackEvent(AnalyticsEvents.SEARCH_PERFORMED, {
                query: 'Downtown Parking',
                resultsCount: 12,
            });

            expect(posthog.capture).toHaveBeenCalledWith(
                'search_performed',
                expect.objectContaining({
                    query: 'Downtown Parking',
                    resultsCount: 12,
                    timestamp: expect.any(String),
                })
            );
        });

        it('handles capture errors gracefully', () => {
            posthog.capture.mockImplementationOnce(() => {
                throw new Error('Capture exception');
            });

            expect(() => {
                posthogService.trackEvent('test_event');
            }).not.toThrow();
        });
    });

    describe('trackScreen', () => {
        it('calls posthog.screen with screen name and route parameters', () => {
            posthogService.trackScreen('ParkingDetailScreen', { parkingSpaceId: 'spot-99' });

            expect(posthog.screen).toHaveBeenCalledWith('ParkingDetailScreen', {
                parkingSpaceId: 'spot-99',
            });
        });

        it('ignores null or empty screen names', () => {
            posthogService.trackScreen('');
            posthogService.trackScreen(null);
            expect(posthog.screen).not.toHaveBeenCalled();
        });

        it('handles screen tracking errors gracefully', () => {
            posthog.screen.mockImplementationOnce(() => {
                throw new Error('Screen tracking error');
            });

            expect(() => {
                posthogService.trackScreen('HomeScreen');
            }).not.toThrow();
        });
    });

    describe('registerSuperProperties', () => {
        it('registers properties across all events', () => {
            posthogService.registerSuperProperties({ platform: 'mobile', appVersion: '1.0.0' });
            expect(posthog.register).toHaveBeenCalledWith({ platform: 'mobile', appVersion: '1.0.0' });
        });
    });

    describe('Feature Flags & Flush', () => {
        it('evaluates isFeatureEnabled', () => {
            posthog.isFeatureEnabled.mockReturnValueOnce(true);
            expect(posthogService.isFeatureEnabled('new-checkout-flow')).toBe(true);

            posthog.isFeatureEnabled.mockReturnValueOnce(false);
            expect(posthogService.isFeatureEnabled('disabled-feature')).toBe(false);
        });

        it('falls back to default value when feature flag evaluation fails', () => {
            posthog.isFeatureEnabled.mockImplementationOnce(() => {
                throw new Error('Flag service unavailable');
            });

            expect(posthogService.isFeatureEnabled('experimental-flag', true)).toBe(true);
        });

        it('gets feature flag payload', () => {
            posthog.getFeatureFlag.mockReturnValueOnce('variant-b');
            expect(posthogService.getFeatureFlag('banner-test')).toBe('variant-b');
        });

        it('flushes event queue', async () => {
            await posthogService.flush();
            expect(posthog.flush).toHaveBeenCalled();
        });
    });
});
