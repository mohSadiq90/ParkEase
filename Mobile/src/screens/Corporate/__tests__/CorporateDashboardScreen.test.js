import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import CorporateDashboardScreen from '../CorporateDashboardScreen';
import apiClient from '../../../services/api/corporateService';

jest.mock('../../../services/api/corporateService', () => ({
  getMyCompanies: jest.fn().mockResolvedValue({
    data: [
      { id: 'comp-1', name: 'Acme Corp', contactEmail: 'info@acme.com' }
    ]
  }),
  getDashboard: jest.fn().mockResolvedValue({
    totalMembers: 24,
    activeAllocations: 3,
    todaysBookings: 8
  }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('CorporateDashboardScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders active company metrics and quick actions', async () => {
    const preloadedState = {
      corporate: {
        myCompanies: [
          { id: 'comp-1', name: 'Acme Corp', contactEmail: 'info@acme.com' }
        ],
        activeCompanyId: 'comp-1',
        isLoading: false,
      }
    };

    const { findByText, getByText, getAllByText } = renderWithProviders(
      <CorporateDashboardScreen />,
      { preloadedState }
    );

    const compName = await findByText('Acme Corp');
    expect(compName).toBeTruthy();
    expect(getByText('Overview')).toBeTruthy();
    expect(getAllByText('Members').length).toBeGreaterThan(0);
    expect(getByText('Allocations')).toBeTruthy();
    expect(getByText('Bookings')).toBeTruthy();
    expect(getByText('Invoices')).toBeTruthy();

    const invoicesBtn = getByText('Invoices');
    fireEvent.press(invoicesBtn);
    expect(mockNavigate).toHaveBeenCalledWith('CorporateInvoices');
  });
});
