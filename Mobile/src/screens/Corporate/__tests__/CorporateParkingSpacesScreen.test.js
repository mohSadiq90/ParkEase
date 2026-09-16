import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import CorporateParkingSpacesScreen from '../CorporateParkingSpacesScreen';
import corporateService from '../../../services/api/corporateService';

jest.mock('../../../services/api/corporateService');

describe('CorporateParkingSpacesScreen', () => {
    const mockNavigation = {
        goBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        corporateService.getCompanyParkingSpaces.mockResolvedValue({
            data: [
                {
                    id: 'cps-1',
                    title: 'Corporate HQ Basement',
                    address: '500 Tech Park',
                    city: 'Pune',
                    totalSpots: 20,
                    fourWheelerPhysicalSpots: 16,
                    twoWheelerPhysicalSpots: 4,
                    monthlyRate: 1500,
                    isActive: true,
                },
            ],
        });
        corporateService.toggleActiveCompanyParkingSpace.mockResolvedValue({ success: true });
        corporateService.createCompanyParkingSpace.mockResolvedValue({ success: true });
        corporateService.retireCompanyParkingSpace.mockResolvedValue({ success: true });
    });

    it('renders company parking spaces and inventory details', async () => {
        const { getByText } = renderWithProviders(
            <CorporateParkingSpacesScreen navigation={mockNavigation} />,
            {
                preloadedState: {
                    corporate: {
                        activeCompanyId: 'comp-99',
                    },
                },
            }
        );

        expect(getByText('Parking Inventory')).toBeTruthy();

        await waitFor(() => {
            expect(getByText('Corporate HQ Basement')).toBeTruthy();
            expect(getByText('500 Tech Park, Pune')).toBeTruthy();
            expect(getByText('20')).toBeTruthy();
        });
    });

    it('opens add space modal and creates company-owned facility', async () => {
        const { getByTestId, getByText } = renderWithProviders(
            <CorporateParkingSpacesScreen navigation={mockNavigation} />,
            {
                preloadedState: {
                    corporate: {
                        activeCompanyId: 'comp-99',
                    },
                },
            }
        );

        fireEvent.press(getByTestId('add-space-header-btn'));
        expect(getByText('Add Company Parking Space')).toBeTruthy();

        fireEvent.changeText(getByTestId('create-space-title-input'), 'East Wing Annex');
        fireEvent.changeText(getByTestId('create-space-address-input'), '22 Station Rd');
        fireEvent.changeText(getByTestId('create-space-city-input'), 'Mumbai');

        fireEvent.press(getByTestId('submit-create-space-btn'));

        await waitFor(() => {
            expect(corporateService.createCompanyParkingSpace).toHaveBeenCalledWith(
                'comp-99',
                expect.objectContaining({
                    title: 'East Wing Annex',
                    address: '22 Station Rd',
                    city: 'Mumbai',
                })
            );
        });
    });

    it('navigates back when back button pressed', () => {
        const { getByTestId } = renderWithProviders(
            <CorporateParkingSpacesScreen navigation={mockNavigation} />
        );

        fireEvent.press(getByTestId('corporate-spaces-back-btn'));
        expect(mockNavigation.goBack).toHaveBeenCalled();
    });
});
