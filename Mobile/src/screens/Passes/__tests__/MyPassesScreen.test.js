import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import MyPassesScreen from '../MyPassesScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('MyPassesScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders active passes list with details', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'pass-1',
            passType: 0, // Monthly
            parkingSpaceTitle: 'Central Terminal Bay',
            status: 'Active',
            startDateUtc: '2026-08-01T00:00:00Z',
            endDateUtc: '2026-08-31T23:59:59Z',
            price: 2999,
            usageMode: 0,
          },
        ],
      },
    });

    const { findByText, getByText } = renderWithProviders(
      <MyPassesScreen navigation={mockNavigation} />
    );

    const title = await findByText('Monthly');
    expect(title).toBeTruthy();
    expect(getByText('Central Terminal Bay')).toBeTruthy();
    expect(getByText('₹2,999')).toBeTruthy();
    expect(getByText('Active')).toBeTruthy();
  });

  it('renders purchase modal on "+ Get Pass" press and purchases pass', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: [],
      },
    });
    apiClient.post.mockResolvedValueOnce({
      data: {
        data: {
          id: 'new-pass-99',
          passType: 1, // Weekly
          status: 'Active',
          startDateUtc: '2026-08-19T00:00:00Z',
          endDateUtc: '2026-08-26T00:00:00Z',
          price: 899,
        },
      },
    });

    const { findByText, getByText } = renderWithProviders(
      <MyPassesScreen navigation={mockNavigation} />
    );

    const getPassBtn = await findByText('+ Get Pass');
    fireEvent.press(getPassBtn);

    expect(getByText('Purchase Parking Pass')).toBeTruthy();
    expect(getByText('Weekly Pass (7 Days)')).toBeTruthy();

    const weeklyChip = getByText('Weekly Pass (7 Days)');
    fireEvent.press(weeklyChip);

    const confirmBtn = getByText('Confirm & Pay');
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
    });
  });
});
