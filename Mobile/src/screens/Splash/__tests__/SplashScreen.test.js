import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SplashScreen, { LaunchScreen } from '../SplashScreen';

const renderSplashScreen = (props = {}) => {
    return render(
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
            <SplashScreen {...props} />
        </SafeAreaProvider>
    );
};

describe('SplashScreen (Launch Screen)', () => {
    it('renders brand elements correctly with default props', () => {
        const { getByText, getByTestId } = renderSplashScreen();

        expect(getByTestId('splash-screen')).toBeTruthy();
        expect(getByText('ParkEase')).toBeTruthy();
        expect(getByText('Smart Parking Made Effortless')).toBeTruthy();
        expect(getByText('Smart Parking Platform')).toBeTruthy();
        expect(getByText('v1.0.0')).toBeTruthy();
        expect(getByTestId('splash-progress-track')).toBeTruthy();
        expect(getByTestId('splash-progress-indicator')).toBeTruthy();
    });

    it('renders custom tagline and version when passed', () => {
        const { getByText } = renderSplashScreen({
            tagline: 'Instant Access, Zero Hassle',
            version: 'v2.4.0',
        });

        expect(getByText('ParkEase')).toBeTruthy();
        expect(getByText('Instant Access, Zero Hassle')).toBeTruthy();
        expect(getByText('v2.4.0')).toBeTruthy();
    });

    it('exports LaunchScreen alias matching SplashScreen', () => {
        expect(LaunchScreen).toBe(SplashScreen);
    });
});
