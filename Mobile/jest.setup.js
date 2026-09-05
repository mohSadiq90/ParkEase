import '@testing-library/jest-native/extend-expect';

jest.setTimeout(30000);

// Mock SafeAreaContext
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest.fn().mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockReturnValue(inset),
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
  };
});

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: View,
    MaterialIcons: View,
    Feather: View,
  };
});

// Mock Expo Secure Store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const MockMapView = (props) => <View testID="map-view" {...props}>{props.children}</View>;
  MockMapView.Marker = (props) => <View testID="map-marker" {...props} />;
  
  return {
      __esModule: true,
      default: MockMapView,
      Marker: MockMapView.Marker,
      PROVIDER_GOOGLE: 'google',
      PROVIDER_DEFAULT: 'default'
  };
});

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({
      data: {
        idToken: 'mock-google-id-token',
        user: { email: 'test@example.com', name: 'Test User' },
      },
    }),
    signOut: jest.fn().mockResolvedValue(null),
    isSignedIn: jest.fn().mockResolvedValue(true),
    getTokens: jest.fn().mockResolvedValue({ idToken: 'mock-google-id-token' }),
    getCurrentUser: jest.fn().mockResolvedValue({ email: 'test@example.com' }),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

// Mock PostHog React Native
const mockPostHogInstance = {
  capture: jest.fn(),
  screen: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  flush: jest.fn().mockResolvedValue(true),
  register: jest.fn(),
  unregister: jest.fn(),
  isFeatureEnabled: jest.fn().mockReturnValue(true),
  getFeatureFlag: jest.fn().mockReturnValue('control'),
  getFeatureFlagPayload: jest.fn(),
  reloadFeatureFlags: jest.fn(),
  optIn: jest.fn(),
  optOut: jest.fn(),
  debug: jest.fn(),
  ready: jest.fn().mockResolvedValue(true),
  getDistinctId: jest.fn().mockReturnValue('mock-distinct-id'),
  getDeviceId: jest.fn().mockReturnValue('mock-device-id'),
};

jest.mock('posthog-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  const PostHogProvider = ({ children }) => React.createElement(View, { testID: 'posthog-provider' }, children);
  const usePostHog = () => mockPostHogInstance;

  return {
    __esModule: true,
    default: jest.fn(() => mockPostHogInstance),
    PostHog: jest.fn(() => mockPostHogInstance),
    PostHogProvider,
    usePostHog,
    PostHogErrorBoundary: ({ children }) => children,
    useNavigationTracker: jest.fn(),
    useFeatureFlags: () => ({}),
    useFeatureFlag: () => false,
  };
});

