import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import EvChargeSimulatorScreen from '../EvChargeSimulatorScreen';
import iotService from '../../../services/api/iotService';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/iotService');
jest.mock('../../../services/api/apiClient');

describe('EvChargeSimulatorScreen', () => {
    const mockNavigation = {
        goBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        apiClient.get.mockResolvedValue({
            data: {
                data: [
                    { id: 'bk-555', parkingSpaceTitle: 'Central EV Station' },
                ],
            },
        });
        iotService.simulateEvSession.mockResolvedValue({
            success: true,
            message: 'EV charge session completed',
            data: {
                status: 'Completed',
                energyDeliveredKwh: 14.5,
                totalFee: 290,
            },
        });
    });

    it('renders EV charge inputs and station ID', async () => {
        const { getByText, getByTestId } = renderWithProviders(
            <EvChargeSimulatorScreen navigation={mockNavigation} />
        );

        expect(getByText('EV Charge Simulator')).toBeTruthy();
        expect(getByTestId('ev-kwh-input')).toBeTruthy();
        expect(getByTestId('ev-station-id-input')).toBeTruthy();
    });

    it('submits charging simulation and displays session metrics', async () => {
        const { getByTestId, getByText } = renderWithProviders(
            <EvChargeSimulatorScreen navigation={mockNavigation} />
        );

        const bookingInput = getByTestId('ev-booking-id-input');
        fireEvent.changeText(bookingInput, 'bk-555');

        const kwhInput = getByTestId('ev-kwh-input');
        fireEvent.changeText(kwhInput, '14.5');

        const submitBtn = getByTestId('ev-simulate-submit-btn');
        fireEvent.press(submitBtn);

        await waitFor(() => {
            expect(iotService.simulateEvSession).toHaveBeenCalledWith({
                bookingId: 'bk-555',
                energyKwh: 14.5,
                stationId: 'MOCK-OCPP-01',
                connectorId: 1,
            });
            expect(getByText('OCPP Session Completed')).toBeTruthy();
            expect(getByText('14.5 kWh')).toBeTruthy();
        });
    });

    it('navigates back when back button pressed', () => {
        const { getByTestId } = renderWithProviders(
            <EvChargeSimulatorScreen navigation={mockNavigation} />
        );

        fireEvent.press(getByTestId('ev-simulator-back-btn'));
        expect(mockNavigation.goBack).toHaveBeenCalled();
    });
});
