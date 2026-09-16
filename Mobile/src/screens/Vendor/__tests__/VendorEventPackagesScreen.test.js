import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../utils/test-utils';
import VendorEventPackagesScreen from '../VendorEventPackagesScreen';
import eventPackageService from '../../../services/api/eventPackageService';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/eventPackageService');
jest.mock('../../../services/api/apiClient');

describe('VendorEventPackagesScreen', () => {
    const mockNavigation = {
        goBack: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        eventPackageService.getMyPackages.mockResolvedValue({
            data: [
                {
                    id: 'pkg-1',
                    title: 'IPL Finals VIP Deck',
                    eventName: 'IPL Finals 2026',
                    venueName: 'Wankhede',
                    packagePrice: 1200,
                    totalSpots: 30,
                    isActive: true,
                },
            ],
        });
        eventPackageService.getMyAnalytics.mockResolvedValue({
            data: [
                { totalSold: 18, totalRevenue: 21600 },
            ],
        });
        apiClient.get.mockResolvedValue({
            data: {
                data: [
                    { id: 'space-vip', title: 'Stadium View Lot' },
                ],
            },
        });
        eventPackageService.createPackage.mockResolvedValue({ success: true });
        eventPackageService.deactivatePackage.mockResolvedValue({ success: true });
    });

    it('renders event packages and sell-through analytics', async () => {
        const { getByText } = renderWithProviders(
            <VendorEventPackagesScreen navigation={mockNavigation} />
        );

        expect(getByText('Event Packages')).toBeTruthy();

        await waitFor(() => {
            expect(getByText('IPL Finals VIP Deck')).toBeTruthy();
            expect(getByText('Sell-Through Performance')).toBeTruthy();
            expect(getByText('18')).toBeTruthy();
        });
    });

    it('opens create modal and publishes new package', async () => {
        const { getByTestId, getByText } = renderWithProviders(
            <VendorEventPackagesScreen navigation={mockNavigation} />
        );

        fireEvent.press(getByTestId('add-event-pkg-header-btn'));
        expect(getByText('Create Event Package')).toBeTruthy();

        fireEvent.changeText(getByTestId('event-pkg-title-input'), 'Concert Special Pass');
        fireEvent.changeText(getByTestId('event-pkg-space-id-input'), 'space-vip');
        fireEvent.changeText(getByTestId('event-pkg-price-input'), '800');
        fireEvent.changeText(getByTestId('event-pkg-spots-input'), '25');

        fireEvent.press(getByTestId('submit-event-pkg-btn'));

        await waitFor(() => {
            expect(eventPackageService.createPackage).toHaveBeenCalledWith(
                expect.objectContaining({
                    parkingSpaceId: 'space-vip',
                    title: 'Concert Special Pass',
                    packagePrice: 800,
                    totalSpots: 25,
                })
            );
        });
    });

    it('navigates back when back button pressed', () => {
        const { getByTestId } = renderWithProviders(
            <VendorEventPackagesScreen navigation={mockNavigation} />
        );

        fireEvent.press(getByTestId('vendor-event-pkg-back-btn'));
        expect(mockNavigation.goBack).toHaveBeenCalled();
    });
});
