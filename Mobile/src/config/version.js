import appJson from '../../app.json';

export const APP_VERSION = appJson?.expo?.version || '1.0.0';
export const APP_BUILD_NUMBER = appJson?.expo?.android?.versionCode || appJson?.expo?.ios?.buildNumber || 1;
export const APP_VERSION_STRING = `v${APP_VERSION} (Build ${APP_BUILD_NUMBER})`;

export default {
    version: APP_VERSION,
    buildNumber: APP_BUILD_NUMBER,
    versionString: APP_VERSION_STRING,
};
