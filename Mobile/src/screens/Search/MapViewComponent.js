import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../styles/globalStyles';
import { formatCurrency } from '../../utils/formatters';

const { width, height } = Dimensions.get('window');

const MapViewComponent = ({ parkings, initialRegion }) => {
    const mapRef = useRef(null);
    const navigation = useNavigation();

    // Default to New York if no initial region is provided
    const [region, setRegion] = useState(initialRegion || {
        latitude: 40.7128,
        longitude: -74.0060,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });

    // Auto fit to markers when parkings change
    useEffect(() => {
        if (parkings && parkings.length > 0 && mapRef.current) {
            // Extract coordinates
            const coordinates = parkings.filter(p => p.latitude && p.longitude).map(p => ({
                latitude: p.latitude,
                longitude: p.longitude
            }));

            if (coordinates.length > 0) {
                // Add a small delay to ensure map is ready
                setTimeout(() => {
                    mapRef.current?.fitToCoordinates(coordinates, {
                        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                        animated: true,
                    });
                }, 500);
            }
        }
    }, [parkings]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                initialRegion={region}
                onRegionChangeComplete={setRegion}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {parkings.filter(p => p.latitude && p.longitude).map((parking) => (
                    <Marker
                        key={parking.id}
                        coordinate={{
                            latitude: parking.latitude,
                            longitude: parking.longitude,
                        }}
                        title={parking.title}
                        description={`${formatCurrency(parking.hourlyRate)}/hr - ${parking.availableSpots} spots`}
                        onCalloutPress={() => {
                            navigation.navigate('ParkingDetail', { parkingId: parking.id });
                        }}
                        pinColor={parking.availableSpots > 0 ? colors.primary : colors.danger}
                    />
                ))}
            </MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    map: {
        width: width,
        height: height,
    },
});

export default MapViewComponent;
