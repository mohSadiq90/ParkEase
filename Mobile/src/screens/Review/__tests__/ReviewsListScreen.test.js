import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import ReviewsListScreen from '../ReviewsListScreen';
import apiClient from '../../../services/api/apiClient';
import { Alert } from 'react-native';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
};

const mockReviews = [
    {
        id: 'rev-1',
        rating: 5,
        comment: 'Fantastic secure parking space, EV charger worked smoothly.',
        user: { firstName: 'Alice', lastName: 'Smith' },
        createdAt: '2026-09-01T10:00:00Z',
        ownerResponse: null,
    },
    {
        id: 'rev-2',
        rating: 4,
        comment: 'Easy access with LPR gate.',
        user: { firstName: 'Bob', lastName: 'Jones' },
        createdAt: '2026-09-02T11:00:00Z',
        ownerResponse: 'Thank you Bob for parking with us!',
        ownerResponseCreatedAt: '2026-09-02T12:00:00Z',
    },
];

describe('ReviewsListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        apiClient.get.mockResolvedValue({
            data: { data: mockReviews },
        });
    });

    it('renders reviews list with comments, ratings, and existing owner response', async () => {
        const preloadedState = {
            auth: {
                user: { id: 'u-owner', role: 'Vendor' },
                isVendor: true,
            },
        };

        const { getByText } = renderWithProviders(
            <ReviewsListScreen
                route={{ params: { parkingSpaceId: 'space-101', isOwner: true } }}
                navigation={mockNavigation}
            />,
            { preloadedState }
        );

        await waitFor(() => {
            expect(getByText('Reviews')).toBeTruthy();
            expect(getByText('Fantastic secure parking space, EV charger worked smoothly.')).toBeTruthy();
            expect(getByText('Easy access with LPR gate.')).toBeTruthy();
            expect(getByText('Thank you Bob for parking with us!')).toBeTruthy();
            expect(getByText('Reply as Host')).toBeTruthy();
        });
    });

    it('opens host response modal and submits owner reply successfully', async () => {
        apiClient.post.mockResolvedValueOnce({
            data: { success: true },
        });

        const preloadedState = {
            auth: {
                user: { id: 'u-owner', role: 'Vendor' },
                isVendor: true,
            },
        };

        const { getByText, getByPlaceholderText } = renderWithProviders(
            <ReviewsListScreen
                route={{ params: { parkingSpaceId: 'space-101', isOwner: true } }}
                navigation={mockNavigation}
            />,
            { preloadedState }
        );

        await waitFor(() => {
            expect(getByText('Reply as Host')).toBeTruthy();
        });

        fireEvent.press(getByText('Reply as Host'));
        expect(getByText('Reply to Review')).toBeTruthy();

        const input = getByPlaceholderText('Thank the driver or address their feedback...');
        fireEvent.changeText(input, 'Glad you enjoyed the EV charging!');
        fireEvent.press(getByText('Post Reply'));

        await waitFor(() => {
            expect(apiClient.post).toHaveBeenCalledWith(
                expect.stringContaining('/reviews/rev-1/owner-response'),
                { response: 'Glad you enjoyed the EV charging!' }
            );
            expect(Alert.alert).toHaveBeenCalledWith('Success', 'Your reply has been posted.');
        });
    });
});
