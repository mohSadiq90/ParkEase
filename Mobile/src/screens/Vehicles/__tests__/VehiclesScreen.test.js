import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import VehiclesScreen from '../VehiclesScreen';
import { vehicleService } from '../../../services/api/vehicleService';
import { Alert } from 'react-native';

jest.mock('../../../services/api/vehicleService', () => ({
    vehicleService: {
        getVehicles: jest.fn(),
        addVehicle: jest.fn(),
        updateVehicle: jest.fn(),
        deleteVehicle: jest.fn(),
    },
}));

const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
};

const mockVehicles = [
    {
        id: 'veh-1',
        make: 'Tesla',
        model: 'Model 3',
        licensePlate: 'KA-05-EV-1000',
        color: 'Pearl White',
        type: 0, // Car
        isDefault: true,
    },
    {
        id: 'veh-2',
        make: 'Honda',
        model: 'Civic',
        licensePlate: 'DL-08-AB-9999',
        color: 'Sonic Gray',
        type: 0, // Car
        isDefault: false,
    },
];

describe('VehiclesScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        vehicleService.getVehicles.mockResolvedValue({
            data: mockVehicles,
        });
    });

    it('renders vehicles list with make, model, license plate, and primary badge', async () => {
        const { getByText } = renderWithProviders(
            <VehiclesScreen navigation={mockNavigation} />
        );

        await waitFor(() => {
            expect(getByText('Tesla Model 3')).toBeTruthy();
            expect(getByText('KA-05-EV-1000')).toBeTruthy();
            expect(getByText('Primary')).toBeTruthy();
            expect(getByText('Honda Civic')).toBeTruthy();
            expect(getByText('DL-08-AB-9999')).toBeTruthy();
            expect(getByText('Set Default')).toBeTruthy();
        });
    });

    it('allows opening the Add Vehicle form and submitting new vehicle', async () => {
        vehicleService.addVehicle.mockResolvedValueOnce({
            success: true,
            data: { id: 'veh-3', make: 'Hyundai', model: 'Ioniq 5', licensePlate: 'MH02CD5555' },
        });

        const { getByTestId, getByText, getByPlaceholderText } = renderWithProviders(
            <VehiclesScreen navigation={mockNavigation} />
        );

        await waitFor(() => {
            expect(getByTestId('toggle-add-vehicle-btn')).toBeTruthy();
        });

        fireEvent.press(getByTestId('toggle-add-vehicle-btn'));

        expect(getByPlaceholderText('Make (e.g. Toyota, Tesla)')).toBeTruthy();
        fireEvent.changeText(getByPlaceholderText('Make (e.g. Toyota, Tesla)'), 'Hyundai');
        fireEvent.changeText(getByPlaceholderText('Model (e.g. Camry, Model 3)'), 'Ioniq 5');
        fireEvent.changeText(getByPlaceholderText('Plate (e.g. MH02AB1234)'), 'MH02CD5555');

        fireEvent.press(getByText('Save to Garage'));

        await waitFor(() => {
            expect(vehicleService.addVehicle).toHaveBeenCalledWith(
                expect.objectContaining({
                    make: 'Hyundai',
                    model: 'Ioniq 5',
                    licensePlate: 'MH02CD5555',
                })
            );
        });
    });

    it('handles setting a vehicle as primary default', async () => {
        vehicleService.updateVehicle.mockResolvedValueOnce({ success: true });

        const { getByText } = renderWithProviders(
            <VehiclesScreen navigation={mockNavigation} />
        );

        await waitFor(() => {
            expect(getByText('Set Default')).toBeTruthy();
        });

        fireEvent.press(getByText('Set Default'));

        await waitFor(() => {
            expect(vehicleService.updateVehicle).toHaveBeenCalledWith(
                'veh-2',
                expect.objectContaining({ isDefault: true })
            );
        });
    });
});
