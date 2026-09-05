/**
 * Google Auth Service
 * Integrates native Google Sign-In SDK (@react-native-google-signin/google-signin)
 * Matches MOBILE_GOOGLE_SIGNIN_IMPLEMENTATION_GUIDE.md Section 5.1
 */

import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import environment from '../../config/environment';
import logger from '../../utils/logger';

const TAG = 'GoogleAuthService';

let isConfigured = false;

export const googleAuthService = {
    /**
     * Configure Google SDK with Web Client ID (backend audience)
     */
    configure() {
        if (isConfigured) return;

        try {
            const webClientId = environment.googleWebClientId;
            logger.info(TAG, 'Configuring GoogleSignin', { webClientId });

            GoogleSignin.configure({
                webClientId,
                offlineAccess: false,
                scopes: ['profile', 'email'],
            });

            isConfigured = true;
        } catch (error) {
            logger.error(TAG, 'Failed to configure GoogleSignin', error);
        }
    },

    /**
     * Check if Google Play Services are available (Android)
     */
    async checkPlayServices() {
        if (Platform.OS !== 'android') return true;

        try {
            this.configure();
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            return true;
        } catch (error) {
            logger.warn(TAG, 'Play Services check failed', error);
            if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                return false;
            }
            throw error;
        }
    },

    /**
     * Trigger native Google Sign-In prompt and obtain genuine Google ID token
     * @returns {Promise<{ idToken: string, user: Object, cancelled?: boolean, inProgress?: boolean }>}
     */
    async signIn() {
        this.configure();

        try {
            await this.checkPlayServices();

            // Sign in with Google
            const response = await GoogleSignin.signIn();
            const idToken = response.data?.idToken || response.idToken;

            if (!idToken) {
                logger.error(TAG, 'Google Sign-In completed without an ID token', response);
                throw new Error('Failed to obtain Google ID token. Please try again.');
            }

            const user = response.data?.user || response.user;
            logger.info(TAG, 'Google Sign-In successful, obtained ID token', {
                email: user?.email,
                hasToken: !!idToken,
            });

            return {
                idToken,
                user,
                cancelled: false,
            };
        } catch (error) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                logger.info(TAG, 'User cancelled Google Sign-In');
                return { cancelled: true };
            }

            if (error.code === statusCodes.IN_PROGRESS) {
                logger.info(TAG, 'Google Sign-In already in progress');
                return { inProgress: true };
            }

            if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                logger.warn(TAG, 'Google Play Services not available');
                const err = new Error('Google Play Services is not available or outdated on this device.');
                err.code = 'play_services_missing';
                throw err;
            }

            if (error.code === '10' || error.code === 10 || error.message?.includes('DEVELOPER_ERROR')) {
                logger.error(TAG, 'Google Sign-In DEVELOPER_ERROR: Missing Android SHA-1 in Google Cloud Console', {
                    packageName: 'com.parkease.app',
                    sha1: '59:E1:77:99:1A:CB:28:C5:B7:15:6E:7E:89:C0:7A:08:56:BC:1F:3D',
                    webClientId: environment.googleWebClientId,
                });
                const devErr = new Error('Google Sign-In configuration error (DEVELOPER_ERROR): The Android SHA-1 certificate fingerprint for com.parkease.app must be added to Google Cloud Console for project 202763663198.');
                devErr.code = 'developer_error';
                throw devErr;
            }

            logger.error(TAG, 'Google Sign-In failed', error);
            throw error;
        }
    },

    /**
     * Sign out of Google session
     */
    async signOut() {
        try {
            this.configure();
            await GoogleSignin.signOut();
            logger.info(TAG, 'Signed out of Google session');
        } catch (error) {
            logger.warn(TAG, 'Google signOut failed', error);
        }
    },

    /**
     * Check if currently signed in with Google
     */
    async isSignedIn() {
        try {
            this.configure();
            return await GoogleSignin.isSignedIn();
        } catch (error) {
            return false;
        }
    },

    /**
     * Get current authenticated Google user
     */
    async getCurrentUser() {
        try {
            this.configure();
            const response = await GoogleSignin.getCurrentUser();
            return response?.data || response;
        } catch (error) {
            return null;
        }
    },
};

export default googleAuthService;
