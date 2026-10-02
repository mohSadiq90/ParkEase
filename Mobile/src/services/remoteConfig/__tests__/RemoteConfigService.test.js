import remoteConfig from '@react-native-firebase/remote-config';
import RemoteConfigService from '../RemoteConfigService';

describe('RemoteConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    RemoteConfigService.initializePromise = null;
  });

  it('initializes defaults and config settings on initialize()', async () => {
    const res = await RemoteConfigService.initialize();
    expect(res).toBe(true);

    const instance = remoteConfig();
    expect(instance.setDefaults).toHaveBeenCalledWith({
      isDisplayFCMTokenEnabled: false,
      isDebuggerEnabled: false,
    });
    expect(instance.setConfigSettings).toHaveBeenCalled();
    expect(instance.fetchAndActivate).toHaveBeenCalled();
  });

  it('reuses initializePromise on concurrent initialize() calls', async () => {
    const p1 = RemoteConfigService.initialize();
    const p2 = RemoteConfigService.initialize();

    expect(p1).toBe(p2);
    await Promise.all([p1, p2]);
    expect(remoteConfig().setDefaults).toHaveBeenCalledTimes(1);
  });

  it('force refreshes remote config on refresh()', async () => {
    const res = await RemoteConfigService.refresh();
    expect(res).toBe(true);

    const instance = remoteConfig();
    expect(instance.fetch).toHaveBeenCalledWith(0);
    expect(instance.activate).toHaveBeenCalled();
  });

  it('retrieves boolean, string, and number values correctly', () => {
    const boolVal = RemoteConfigService.getBoolean('isDebuggerEnabled');
    expect(typeof boolVal).toBe('boolean');

    const strVal = RemoteConfigService.getString('anyString');
    expect(typeof strVal).toBe('string');

    const numVal = RemoteConfigService.getNumber('anyNumber');
    expect(typeof numVal).toBe('number');
  });

  it('getBooleanAsync reads value and triggers refresh when requested', async () => {
    const val = await RemoteConfigService.getBooleanAsync('isDebuggerEnabled', { refresh: true });
    expect(typeof val).toBe('boolean');
    expect(remoteConfig().fetch).toHaveBeenCalledWith(0);
  });
});
