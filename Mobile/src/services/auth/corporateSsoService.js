/**
 * Corporate SSO Service
 * Handles Enterprise OIDC SSO Discovery, In-App Browser Authorization Session,
 * Deep Link Callback parsing, and Exchange Code Resolution.
 * Following MOBILE_CORPORATE_SSO_IMPLEMENTATION_GUIDE.md
 */

import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import authService from './authService';
import logger from '../../utils/logger';

const TAG = 'CorporateSsoService';
export const DEFAULT_SSO_RETURN_URL = 'parkease://sso-callback';

/**
 * Extract SSO exchange code from deep link redirect URL
 * Handles parkease://sso-callback?sso_code=XYZ and variations
 * @param {string} url
 * @returns {string}
 */
export function extractSsoCode(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('Invalid or empty redirect URL');
    }

    try {
        // Try standard URL parsing
        const parsed = new URL(url);
        const code =
            parsed.searchParams.get('sso_code') ||
            parsed.searchParams.get('exchangeCode') ||
            parsed.searchParams.get('exchange_code') ||
            parsed.searchParams.get('code');
        if (code) return code;
    } catch {
        // Fallback to regex query string extraction
    }

    const match = url.match(/[?&](?:sso_code|exchangeCode|exchange_code|code)=([^&#]+)/);
    if (match && match[1]) {
        return decodeURIComponent(match[1]);
    }

    throw new Error('No sso_code parameter found in deep link redirect');
}

/**
 * Open In-App Browser session with ephemeral cookies and native authenticator
 * (ASWebAuthenticationSession on iOS, CustomTabs on Android)
 * @param {string} authorizationUrl
 * @param {string} returnUrl
 * @returns {Promise<string>} sso exchange code
 */
export async function launchAuthBrowser(authorizationUrl, returnUrl = DEFAULT_SSO_RETURN_URL) {
    if (!authorizationUrl) {
        throw new Error('authorizationUrl is required');
    }

    try {
        const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, returnUrl, {
            preferEphemeralSession: true,
            showTitle: true,
        });

        if (result.type === 'cancel' || result.type === 'dismiss') {
            const cancelError = new Error('SSO authentication was cancelled.');
            cancelError.code = 'user_cancelled';
            throw cancelError;
        }

        if (result.type === 'success' && result.url) {
            return extractSsoCode(result.url);
        }

        throw new Error(`Unexpected browser result: ${result.type}`);
    } catch (error) {
        if (error.code === 'user_cancelled') {
            throw error;
        }

        logger.warn(TAG, 'In-App WebBrowser failed, attempting Linking fallback', error);

        // Fallback to Linking if WebBrowser fails
        return new Promise((resolve, reject) => {
            let subscription = null;
            let timeoutId = null;

            const cleanup = () => {
                if (subscription) subscription.remove();
                if (timeoutId) clearTimeout(timeoutId);
            };

            subscription = Linking.addEventListener('url', (event) => {
                cleanup();
                try {
                    const code = extractSsoCode(event.url);
                    resolve(code);
                } catch (err) {
                    reject(err);
                }
            });

            // 3-minute timeout for user to finish auth
            timeoutId = setTimeout(() => {
                cleanup();
                const timeoutErr = new Error('SSO authentication timed out.');
                timeoutErr.code = 'invalid_exchange_code';
                reject(timeoutErr);
            }, 180000);

            Linking.openURL(authorizationUrl).catch((openErr) => {
                cleanup();
                reject(openErr);
            });
        });
    }
}

/**
 * Corporate SSO Orchestrator
 * Performs End-to-End SSO Flow matching Implementation Guide Sections 1-4:
 * 1. Discover SSO availability
 * 2. Start SSO session (client: 'mobile')
 * 3. Launch In-App Browser & capture parkease://sso-callback
 * 4. Exchange sso_code via completeSSO
 *
 * @param {Object} options
 * @param {string} options.email - Corporate email address
 * @param {string} [options.domain] - Corporate domain
 * @param {string} [options.returnUrl] - Mobile callback URL scheme
 * @returns {Promise<Object>} Corporate session payload
 */
export async function performCorporateSSO({ email, domain, returnUrl = DEFAULT_SSO_RETURN_URL }) {
    logger.info(TAG, `Initiating Corporate SSO discovery for ${email || domain}`);

    // Step 1: Discover SSO Availability
    const discoverRes = await authService.discoverSSO(email || domain);
    const data = discoverRes?.data;
    const isAvailable = Boolean(data?.ssoAvailable ?? data?.ssoEnabled);

    if (!isAvailable) {
        const err = new Error('Corporate SSO is not configured for this domain.');
        err.code = 'sso_not_available';
        throw err;
    }

    // Step 2: Start Mobile SSO Session
    logger.info(TAG, `Starting SSO session for ${email}`);
    const startRes = await authService.startSSO({
        email,
        domain,
        client: 'mobile',
        returnUrl,
    });

    const authorizationUrl = startRes?.data?.authorizationUrl;
    if (!authorizationUrl) {
        const err = new Error('Identity provider authorization URL not returned by server.');
        err.code = 'sso_failed';
        throw err;
    }

    // Step 3: Launch In-App Authentication Browser
    logger.info(TAG, 'Launching in-app browser for IdP authentication');
    const ssoCode = await launchAuthBrowser(authorizationUrl, returnUrl);

    // Step 4: Complete SSO Code Exchange
    logger.info(TAG, 'Exchanging SSO code for corporate session tokens');
    const completeRes = await authService.completeSSO({
        exchangeCode: ssoCode,
    });

    if (!completeRes?.success) {
        const err = new Error(completeRes?.message || 'Failed to complete SSO exchange.');
        err.code = completeRes?.code || 'invalid_exchange_code';
        err.errors = completeRes?.errors;
        throw err;
    }

    return completeRes.data;
}

export default {
    DEFAULT_SSO_RETURN_URL,
    extractSsoCode,
    launchAuthBrowser,
    performCorporateSSO,
};
