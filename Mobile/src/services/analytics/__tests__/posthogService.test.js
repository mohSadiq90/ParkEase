import posthogService, { posthog, AnalyticsEvents, getScreenModule, sanitizeRouteParams } from '../posthogService';
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
            expect(AnalyticsEvents.ACCESS_PASS_VERIFIED).toBe('access_pass_verified');
            expect(AnalyticsEvents.VEHICLE_ADDED).toBe('vehicle_added');
            expect(AnalyticsEvents.API_ERROR_OCCURRED).toBe('api_error_occurred');
        });
    });

    describe('identifyUser and B2B Group Binding', () => {
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

        it('automatically binds corporate user to company group when companyId is present', () => {
            const corporateUser = {
                id: 'usr-corp-99',
                email: 'manager@acmecorp.com',
                firstName: 'Morgan',
                companyId: 'company-55',
                companyRole: 'Admin',
                channel: 'Corporate',
            };

            posthogService.identifyUser(corporateUser);

            expect(posthog.identify).toHaveBeenCalledWith('usr-corp-99', expect.any(Object));
            expect(posthog.group).toHaveBeenCalledWith(
                'company',
                'company-55',
                expect.objectContaining({
                    companyId: 'company-55',
                    companyRole: 'Admin',
                    channel: 'Corporate',
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

    describe('groupCompany (B2B Analytics)', () => {
        it('calls posthog.group with company key and properties', () => {
            posthogService.groupCompany('comp-101', { name: 'Acme Fleet', tier: 'Enterprise' });

            expect(posthog.group).toHaveBeenCalledWith(
                'company',
                'comp-101',
                expect.objectContaining({
                    companyId: 'comp-101',
                    name: 'Acme Fleet',
                    tier: 'Enterprise',
                })
            );
        });

        it('handles null companyId gracefully', () => {
            posthogService.groupCompany(null);
            expect(posthog.group).not.toHaveBeenCalled();
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

    describe('trackScreen with Dwell Time & Transition Context', () => {
        it('enriches screen event with module, previous_screen, and dwell time', () => {
            posthogService.trackScreen(
                'BookingDetailScreen',
                { bookingId: 'bk-555', status: 'Confirmed' },
                'BookingScreen',
                45200
            );

            expect(posthog.screen).toHaveBeenCalledWith(
                'BookingDetailScreen',
                expect.objectContaining({
                    screen_module: 'Booking & Checkout',
                    previous_screen: 'BookingScreen',
                    dwell_time_ms: 45200,
                    dwell_time_seconds: 45,
                    bookingId: 'bk-555',
                    status: 'Confirmed',
                })
            );
        });

        it('maps module categorization accurately across domains', () => {
            expect(getScreenModule('Login')).toBe('Auth');
            expect(getScreenModule('SearchScreen')).toBe('Search & Discovery');
            expect(getScreenModule('CreateParkingScreen')).toBe('Host & Vendor');
            expect(getScreenModule('CorporateDashboard')).toBe('Corporate Suite');
            expect(getScreenModule('UnknownScreen')).toBe('General');
        });

        it('sanitizes route params to strip non-whitelisted or sensitive data', () => {
            const rawParams = {
                parkingSpaceId: 'spot-10',
                city: 'Austin',
                password: 'secretPassword123',
                creditCard: '4111222233334444',
                token: 'bearerToken',
            };

            const sanitized = sanitizeRouteParams(rawParams);
            expect(sanitized.parkingSpaceId).toBe('spot-10');
            expect(sanitized.city).toBe('Austin');
            expect(sanitized.password).toBeUndefined();
            expect(sanitized.creditCard).toBeUndefined();
            expect(sanitized.token).toBeUndefined();
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

    describe('captureException (Observability & Error Tracking)', () => {
        it('calls posthog.captureException and records API_ERROR_OCCURRED event', () => {
            const error = new Error('500 Internal Server Error');
            posthogService.captureException(error, {
                endpoint: '/api/bookings',
                method: 'POST',
                statusCode: 500,
                isNetworkError: false,
            });

            expect(posthog.captureException).toHaveBeenCalledWith(
                error,
                expect.objectContaining({
                    endpoint: '/api/bookings',
                    statusCode: 500,
                })
            );

            expect(posthog.capture).toHaveBeenCalledWith(
                AnalyticsEvents.API_ERROR_OCCURRED,
                expect.objectContaining({
                    errorMessage: '500 Internal Server Error',
                    endpoint: '/api/bookings',
                    statusCode: 500,
                })
            );
        });

        it('handles captureException errors gracefully without crashing', () => {
            posthog.captureException.mockImplementationOnce(() => {
                throw new Error('Capture exception failure');
            });

            expect(() => {
                posthogService.captureException(new Error('Network drop'));
            }).not.toThrow();
        });
    });

    describe('registerSuperProperties', () => {
        it('registers properties across all events', () => {
            posthogService.registerSuperProperties({ platform: 'mobile', appVersion: '1.0.0' });
            expect(posthog.register).toHaveBeenCalledWith({ platform: 'mobile', appVersion: '1.0.0' });
        });
    });

    describe('Feature Flags, Surveys & Flush', () => {
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

        it('fetches active surveys', async () => {
            posthog.getSurveys.mockResolvedValueOnce([{ id: 'survey-nps-1', name: 'Post Booking NPS' }]);
            const surveys = await posthogService.getSurveys();
            expect(surveys).toEqual([{ id: 'survey-nps-1', name: 'Post Booking NPS' }]);
        });

        it('flushes event queue', async () => {
            await posthogService.flush();
            expect(posthog.flush).toHaveBeenCalled();
        });
    });
});
