/**
 * Environment Configuration
 */

const API_BASE = 'https://parkeaseapp.runasp.net';

export const environment = {
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
  apiUrl: `${API_BASE}/api`,
  uploadUrl: `${API_BASE}/uploads`,
  hubsUrl: `${API_BASE}/hubs`,
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '202763663198-vfa9arg479q2chtvg8l0i7bb459hk1vc.apps.googleusercontent.com',
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY || 'phc_ocMXR9NeuG667HK2Gr48eRN9mDrmugaUFWXUDm8M534W',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
};

export default environment;

