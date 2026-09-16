import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import LprSettingsScreen from '../LprSettingsScreen';
import iotService from '../../../services/api/iotService';

jest.mock('../../../services/api/iotService');

describe('LprSettingsScreen', () => {
    const mockNavigation = {
        goBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        iotService.getCameraKeys.mockResolvedValue({
            data: [
                { id: 'key-1', name: 'North Barrier Cam', keyId: 'CAM-N1', isEnabled: true },
            ],
        });
        iotService.getPlateRules.mockResolvedValue({
            data: [
                { id: 'rule-1', plateNumber: 'MH02CL8888', ruleType: 1, isEnabled: true, note: 'VIP Member' },
            ],
        });
        iotService.createCameraKey.mockResolvedValue({
            data: { id: 'key-2', name: 'South Gate Cam', secret: 'sec_xyz_12345' },
        });
        iotService.createPlateRule.mockResolvedValue({ success: true });
        iotService.toggleCameraKey.mockResolvedValue({ success: true });
        iotService.deleteCameraKey.mockResolvedValue({ success: true });
        iotService.togglePlateRule.mockResolvedValue({ success: true });
        iotService.deletePlateRule.mockResolvedValue({ success: true });
    });

    it('renders camera keys, plate rules, and facility header', async () => {
        const { getByText } = renderWithProviders(
            <LprSettingsScreen
                route={{ params: { parkingSpaceId: 'ps-42', facilityTitle: 'Metro Hub' } }}
                navigation={mockNavigation}
            />
        );

        expect(getByText('LPR Facility Registry')).toBeTruthy();

        await waitFor(() => {
            expect(getByText('North Barrier Cam')).toBeTruthy();
            expect(getByText('MH02CL8888')).toBeTruthy();
            expect(getByText('VIP Member', { exact: false })).toBeTruthy();
        });
    });

    it('opens create camera key modal and generates secret', async () => {
        const { getByTestId, getByText } = renderWithProviders(
            <LprSettingsScreen
                route={{ params: { parkingSpaceId: 'ps-42' } }}
                navigation={mockNavigation}
            />
        );

        await waitFor(() => {
            expect(getByTestId('add-camera-key-btn')).toBeTruthy();
        });

        fireEvent.press(getByTestId('add-camera-key-btn'));
        expect(getByText('Create Camera API Key')).toBeTruthy();

        fireEvent.changeText(getByTestId('create-key-name-input'), 'West Wing ANPR');
        fireEvent.changeText(getByTestId('create-key-id-input'), 'CAM-W1');

        fireEvent.press(getByTestId('submit-create-key-btn'));

        await waitFor(() => {
            expect(iotService.createCameraKey).toHaveBeenCalledWith(
                'ps-42',
                expect.objectContaining({
                    name: 'West Wing ANPR',
                    keyId: 'CAM-W1',
                })
            );
            expect(getByText('Camera Secret Generated')).toBeTruthy();
            expect(getByText('sec_xyz_12345')).toBeTruthy();
        });
    });

    it('opens add plate rule modal and submits new rule', async () => {
        const { getByTestId, getByText } = renderWithProviders(
            <LprSettingsScreen
                route={{ params: { parkingSpaceId: 'ps-42' } }}
                navigation={mockNavigation}
            />
        );

        await waitFor(() => {
            expect(getByTestId('add-plate-rule-btn')).toBeTruthy();
        });

        fireEvent.press(getByTestId('add-plate-rule-btn'));
        expect(getByText('Add Plate Access Rule')).toBeTruthy();

        fireEvent.changeText(getByTestId('plate-rule-number-input'), 'KA01MJ4321');
        fireEvent.press(getByTestId('rule-type-deny'));
        fireEvent.changeText(getByTestId('plate-rule-note-input'), 'Unauthorized entry attempt');

        fireEvent.press(getByTestId('submit-plate-rule-btn'));

        await waitFor(() => {
            expect(iotService.createPlateRule).toHaveBeenCalledWith(
                'ps-42',
                expect.objectContaining({
                    licensePlate: 'KA01MJ4321',
                    ruleType: 2,
                    note: 'Unauthorized entry attempt',
                })
            );
        });
    });

    it('navigates back when back button pressed', () => {
        const { getByTestId } = renderWithProviders(
            <LprSettingsScreen navigation={mockNavigation} />
        );

        fireEvent.press(getByTestId('lpr-settings-back-btn'));
        expect(mockNavigation.goBack).toHaveBeenCalled();
    });
});
