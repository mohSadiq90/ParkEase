import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import AccessPassScannerScreen from '../AccessPassScannerScreen';
import apiClient from '../../../services/api/apiClient';
import { Alert } from 'react-native';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
};

describe('AccessPassScannerScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    it('renders scanner screen with input, scan button and instructions', () => {
        const { getByText, getByPlaceholderText } = renderWithProviders(
            <AccessPassScannerScreen navigation={mockNavigation} />
        );

        expect(getByText('Gate Pass Verifier')).toBeTruthy();
        expect(getByPlaceholderText('Paste token or enter pass code...')).toBeTruthy();
        expect(getByText('Verify Pass Clearance')).toBeTruthy();
    });

    it('prompts user if verify is clicked without token', () => {
        const { getByText } = renderWithProviders(
            <AccessPassScannerScreen navigation={mockNavigation} />
        );

        fireEvent.press(getByText('Verify Pass Clearance'));
        expect(Alert.alert).toHaveBeenCalledWith('Required', 'Please enter or scan an access pass token.');
    });

    it('submits verification request and displays Access Granted result card', async () => {
        apiClient.post.mockResolvedValueOnce({
            data: {
                success: true,
                data: {
                    accessGranted: true,
                    decision: 'Permitted entry',
                    booking: {
                        userName: 'John Doe',
                        vehicleNumber: 'KA-01-AB-1234',
                        bayNumber: 'Bay-04',
                    },
                },
            },
        });

        const { getByPlaceholderText, getByText } = renderWithProviders(
            <AccessPassScannerScreen navigation={mockNavigation} />
        );

        const input = getByPlaceholderText('Paste token or enter pass code...');
        fireEvent.changeText(input, 'PASS-VALID-123');
        fireEvent.press(getByText('Verify Pass Clearance'));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                expect.stringContaining('/bookings/access-pass/verify'),
                { token: 'PASS-VALID-123' }
            );
            expect(getByText('ACCESS GRANTED')).toBeTruthy();
            expect(getByText('Bay-04')).toBeTruthy();
            expect(getByText('KA-01-AB-1234')).toBeTruthy();
        });
    });

    it('displays Access Denied when API returns verification denial', async () => {
        apiClient.post.mockResolvedValueOnce({
            data: {
                success: false,
                data: {
                    accessGranted: false,
                    decision: 'Unauthorized pass',
                    denialReason: 'Access pass has expired or is invalid.',
                },
            },
        });

        const { getByPlaceholderText, getByText } = renderWithProviders(
            <AccessPassScannerScreen navigation={mockNavigation} />
        );

        const input = getByPlaceholderText('Paste token or enter pass code...');
        fireEvent.changeText(input, 'PASS-EXPIRED-999');
        fireEvent.press(getByText('Verify Pass Clearance'));

        await waitFor(() => {
            expect(getByText('ACCESS DENIED')).toBeTruthy();
            expect(getByText('Access pass has expired or is invalid.')).toBeTruthy();
        });
    });
});
