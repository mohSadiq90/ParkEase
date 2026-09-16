import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import LprSimulatorScreen from '../LprSimulatorScreen';
import iotService from '../../../services/api/iotService';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/iotService');
jest.mock('../../../services/api/apiClient');

describe('LprSimulatorScreen', () => {
    const mockNavigation = {
        goBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        apiClient.get.mockResolvedValue({
            data: {
                data: [
                    { id: 'ps-1', title: 'Downtown Deck', isLprEnabled: true },
                ],
            },
        });
        iotService.simulateLprEvent.mockResolvedValue({
            success: true,
            message: 'Access granted',
            data: {
                accessGranted: true,
                booking: {
                    id: 'bk-100',
                    userName: 'John Doe',
                    bayNumber: 'Bay 12',
                },
            },
        });
    });

    it('renders simulator header, direction buttons, and plate input', async () => {
        const { getByText, getByTestId } = renderWithProviders(
            <LprSimulatorScreen navigation={mockNavigation} />
        );

        expect(getByText('LPR Simulator')).toBeTruthy();
        expect(getByText('Entry Gate')).toBeTruthy();
        expect(getByText('Exit Gate')).toBeTruthy();

        // Switch to Exit
        fireEvent.press(getByTestId('direction-exit-btn'));
        expect(getByText('Simulate Exit Event')).toBeTruthy();

        // Enter Plate
        const plateInput = getByTestId('lpr-plate-input');
        fireEvent.changeText(plateInput, 'DL01AB1234');
        expect(plateInput.props.value).toBe('DL01AB1234');
    });

    it('submits LPR simulation and displays granted access result card', async () => {
        const { getByTestId, getByText } = renderWithProviders(
            <LprSimulatorScreen navigation={mockNavigation} />
        );

        const plateInput = getByTestId('lpr-plate-input');
        fireEvent.changeText(plateInput, 'MH12AB9999');

        const spaceInput = getByTestId('lpr-space-id-input');
        fireEvent.changeText(spaceInput, 'ps-1');

        const submitBtn = getByTestId('lpr-simulate-submit-btn');
        fireEvent.press(submitBtn);

        await waitFor(() => {
            expect(iotService.simulateLprEvent).toHaveBeenCalledWith({
                licensePlate: 'MH12AB9999',
                parkingSpaceId: 'ps-1',
                direction: 'Entry',
            });
            expect(getByText('Access Granted')).toBeTruthy();
            expect(getByText('Booking Match')).toBeTruthy();
            expect(getByText('Bay 12')).toBeTruthy();
        });
    });

    it('navigates back on header button press', () => {
        const { getByTestId } = renderWithProviders(
            <LprSimulatorScreen navigation={mockNavigation} />
        );

        fireEvent.press(getByTestId('lpr-simulator-back-btn'));
        expect(mockNavigation.goBack).toHaveBeenCalled();
    });
});
