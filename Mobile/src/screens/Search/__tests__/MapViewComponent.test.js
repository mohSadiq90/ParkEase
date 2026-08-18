import React from 'react';
import { render } from '@testing-library/react-native';
import MapViewComponent from '../MapViewComponent';

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

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        navigate: mockNavigate,
    }),
}));

describe('MapViewComponent', () => {
    const mockParkings = [
        { id: 1, title: 'Spot 1', latitude: 40.7128, longitude: -74.0060, hourlyRate: 10, availableSpots: 2 },
        { id: 2, title: 'Spot 2', latitude: 40.7130, longitude: -74.0065, hourlyRate: 15, availableSpots: 0 },
        { id: 3, title: 'Invalid Spot' }, // Missing coordinates
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders MapView and filters invalid markers', () => {
        const { getByTestId, getAllByTestId } = render(
            <MapViewComponent parkings={mockParkings} />
        );

        expect(getByTestId('map-view')).toBeTruthy();
        
        const markers = getAllByTestId('map-marker');
        // Should only render 2 markers (spot 1 and spot 2) because spot 3 is missing coordinates
        expect(markers.length).toBe(2);
        
        // Verify props passed to markers
        expect(markers[0].props.title).toBe('Spot 1');
        expect(markers[1].props.title).toBe('Spot 2');
    });

    it('handles empty parkings gracefully', () => {
        const { getByTestId, queryAllByTestId } = render(
            <MapViewComponent parkings={[]} />
        );

        expect(getByTestId('map-view')).toBeTruthy();
        expect(queryAllByTestId('map-marker').length).toBe(0);
    });
});
