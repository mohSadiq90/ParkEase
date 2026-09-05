import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import AdminDashboardScreen from '../AdminDashboardScreen';
import { adminService } from '../../../services/api/adminService';

jest.mock('../../../services/api/adminService', () => ({
  adminService: {
    getDashboard: jest.fn().mockResolvedValue({
      totalUsers: 1420,
      activeUsers: 890,
      totalListings: 250,
      pendingVerifications: 4,
      totalBookings: 6420,
      revenueToday: 18500,
      monthlyRevenue: 420000,
    }),
    getListings: jest.fn().mockResolvedValue({
      items: [
        {
          id: 'list-101',
          title: 'Prime Bay Spot',
          address: '42 Wallaby Way',
          isVerified: false,
          basePrice: 80,
        },
      ],
      total: 1,
    }),
    getUsers: jest.fn().mockResolvedValue({
      items: [
        {
          id: 'u-1',
          email: 'admin@parkease.com',
          role: 'Admin',
          isActive: true,
        },
      ],
      total: 1,
    }),
    getAuditLogs: jest.fn().mockResolvedValue({
      items: [],
      total: 0,
    }),
    verifyListing: jest.fn().mockResolvedValue({ success: true }),
    processOutboxBatch: jest.fn().mockResolvedValue({ processed: 5 }),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('AdminDashboardScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders platform metrics and pending listing verifications', async () => {
    const preloadedState = {
      admin: {
        dashboard: {
          totalUsers: 1420,
          totalListings: 250,
          pendingVerifications: 4,
          revenueToday: 18500,
        },
        dashboardLoading: false,
        listings: [
          {
            id: 'list-101',
            title: 'Prime Bay Spot',
            address: '42 Wallaby Way',
            isVerified: false,
            basePrice: 80,
          },
        ],
        users: [],
        auditLogs: [],
        outboxLoading: false,
      },
    };

    const { findByText, getByText } = renderWithProviders(
      <AdminDashboardScreen navigation={mockNavigation} />,
      { preloadedState }
    );

    const title = await findByText('Platform Admin');
    expect(title).toBeTruthy();
    expect(getByText('Listing Verification & Oversight')).toBeTruthy();
    expect(getByText('Prime Bay Spot')).toBeTruthy();
    expect(getByText('Verify')).toBeTruthy();
    expect(getByText('Event Outbox Worker')).toBeTruthy();
  });
});
