import remoteConfig from '@react-native-firebase/remote-config';

class RemoteConfigService {
  constructor() {
    this.initializePromise = null;
  }

  initialize() {
    if (this.initializePromise) {
      return this.initializePromise;
    }

    this.initializePromise = (async () => {
      try {
        console.log('[RemoteConfigService] Initializing remote config defaults...');

        // Set default values so the app works before cloud fetch
        await remoteConfig().setDefaults({
          isDisplayFCMTokenEnabled: false,
          isDebuggerEnabled: false,
        });

        // 0 means fetch aggressively for development, 3600 (1 hour) for production
        await remoteConfig().setConfigSettings({
          minimumFetchIntervalMillis: __DEV__ ? 0 : 3600000,
        });

        console.log('[RemoteConfigService] Fetching and activating configs...');
        const fetchedAndActivated = await remoteConfig().fetchAndActivate();

        if (fetchedAndActivated) {
          console.log('[RemoteConfigService] Successfully fetched and activated new configs!');
        } else {
          console.log('[RemoteConfigService] No new configs were fetched from the server.');
        }

        return true;
      } catch (error) {
        console.error('[RemoteConfigService] Failed to initialize Remote Config:', error);
        this.initializePromise = null;
        return false;
      }
    })();

    return this.initializePromise;
  }

  async refresh() {
    await this.initialize();

    try {
      console.log('[RemoteConfigService] Force refreshing remote config...');
      await remoteConfig().fetch(0);
      await remoteConfig().activate();
      return true;
    } catch (error) {
      console.error('[RemoteConfigService] Failed to refresh Remote Config:', error);
      return false;
    }
  }

  async getBooleanAsync(key, options = {}) {
    const { refresh = false } = options;

    if (refresh) {
      await this.refresh();
    } else {
      await this.initialize();
    }

    return this.getBoolean(key);
  }

  getBoolean(key) {
    try {
      return remoteConfig().getValue(key).asBoolean();
    } catch (error) {
      console.warn('[RemoteConfigService] Error reading boolean:', key, error);
      return false;
    }
  }

  getString(key) {
    try {
      return remoteConfig().getValue(key).asString();
    } catch (error) {
      console.warn('[RemoteConfigService] Error reading string:', key, error);
      return '';
    }
  }

  getNumber(key) {
    try {
      return remoteConfig().getValue(key).asNumber();
    } catch (error) {
      console.warn('[RemoteConfigService] Error reading number:', key, error);
      return 0;
    }
  }
}

export default new RemoteConfigService();
