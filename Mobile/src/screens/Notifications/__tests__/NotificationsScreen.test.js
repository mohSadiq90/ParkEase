import React from 'react';
import { renderWithProviders } from '../../../utils/test-utils';
import NotificationsScreen from '../NotificationsScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('NotificationsScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders notifications list with unread items and mark read action', async () => {
    const mockNotifications = {
      data: {
        data: [
          {
            id: 'notif-1',
            title: 'Booking Confirmed',
            message: 'Your booking at Downtown Bay is confirmed.',
            isRead: false,
            createdAt: '2026-08-18T10:00:00Z',
            referenceId: 'b-123',
          },
          {
            id: 'notif-2',
            title: 'Valet Ready',
            message: 'Your vehicle is parked in Bay A1-001.',
            isRead: true,
            createdAt: '2026-08-18T11:00:00Z',
          },
        ],
      },
    };

    apiClient.get.mockResolvedValueOnce(mockNotifications);

    const { findByText, getByText } = renderWithProviders(
      <NotificationsScreen navigation={mockNavigation} />
    );

    const notif1 = await findByText('Booking Confirmed');
    expect(notif1).toBeTruthy();
    expect(getByText('Your booking at Downtown Bay is confirmed.')).toBeTruthy();
    expect(getByText('Valet Ready')).toBeTruthy();
    expect(getByText('Mark read')).toBeTruthy();
  });

  it('renders empty state when there are no notifications', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: [],
      },
    });

    const { findByText } = renderWithProviders(
      <NotificationsScreen navigation={mockNavigation} />
    );

    const empty = await findByText('No notifications');
    expect(empty).toBeTruthy();
  });
});
