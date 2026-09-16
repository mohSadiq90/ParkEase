import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import CorporateLeaseBrowseScreen from '../CorporateLeaseBrowseScreen';
import corporateService from '../../../services/api/corporateService';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/corporateService');
jest.mock('../../../services/api/apiClient');

describe('CorporateLeaseBrowseScreen', () => {
    const mockNavigation = {
        goBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        apiClient.get.mockResolvedValue({
            data: {
                data: {
                    parkingSpaces: [
                        {
                            id: 'space-101',
                            title: 'Silicon Park Garage',
                            address: '100 Tech Blvd',
                            city: 'Bangalore',
                            totalSpots: 50,
                            monthlyRate: 3000,
                            isVerified: true,
                        },
                    ],
                },
            },
        });
        corporateService.requestAllocation.mockResolvedValue({
            success: true,
            message: 'Allocation requested',
        });
    });

    it('renders lease browse search bar and listed facilities', async () => {
        const { getByText, getByTestId } = renderWithProviders(
            <CorporateLeaseBrowseScreen navigation={mockNavigation} />,
            {
                preloadedState: {
                    corporate: {
                        activeCompanyId: 'comp-1',
                    },
                },
            }
        );

        expect(getByText('Lease Browse')).toBeTruthy();
        await waitFor(() => {
            expect(getByText('Silicon Park Garage')).toBeTruthy();
            expect(getByText('50 spots')).toBeTruthy();
        });
    });

    it('opens allocation modal and submits lease request', async () => {
        const { getByTestId, getByText } = renderWithProviders(
            <CorporateLeaseBrowseScreen navigation={mockNavigation} />,
            {
                preloadedState: {
                    corporate: {
                        activeCompanyId: 'comp-1',
                    },
                },
            }
        );

        await waitFor(() => {
            expect(getByTestId('request-lease-btn-space-101')).toBeTruthy();
        });

        fireEvent.press(getByTestId('request-lease-btn-space-101'));

        expect(getByText('Request Corporate Lease')).toBeTruthy();

        fireEvent.changeText(getByTestId('lease-4w-spots-input'), '10');
        fireEvent.changeText(getByTestId('lease-monthly-rate-input'), '2500');

        fireEvent.press(getByTestId('submit-allocation-request-btn'));

        await waitFor(() => {
            expect(corporateService.requestAllocation).toHaveBeenCalledWith(
                'comp-1',
                expect.objectContaining({
                    parkingSpaceId: 'space-101',
                    totalSpots: 10,
                    monthlyRate: 2500,
                })
            );
        });
    });

    it('navigates back on back button press', () => {
        const { getByTestId } = renderWithProviders(
            <CorporateLeaseBrowseScreen navigation={mockNavigation} />
        );

        fireEvent.press(getByTestId('corporate-lease-back-btn'));
        expect(mockNavigation.goBack).toHaveBeenCalled();
    });
});
