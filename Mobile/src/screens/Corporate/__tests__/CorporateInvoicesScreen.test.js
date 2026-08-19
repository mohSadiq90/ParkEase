import React from 'react';
import { renderWithProviders, fireEvent, waitFor } from '../../../utils/test-utils';
import CorporateInvoicesScreen from '../CorporateInvoicesScreen';
import apiClient from '../../../services/api/apiClient';

jest.mock('../../../services/api/apiClient');

const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
};

describe('CorporateInvoicesScreen', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders invoices list when company is active', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: {
          items: [
            {
              id: 'inv-101',
              invoiceNumber: 'INV-2026-001',
              totalAmount: 15000,
              dueDate: '2026-09-01T00:00:00Z',
              status: 1, // Issued
            },
          ],
        },
      },
    });

    const preloadedState = {
      corporate: {
        activeCompanyId: 'comp-123',
        invoices: [],
        isLoading: false,
      },
    };

    const { findByText, getByText } = renderWithProviders(
      <CorporateInvoicesScreen navigation={mockNavigation} />,
      { preloadedState }
    );

    const invText = await findByText('Inv: INV-2026-001');
    expect(invText).toBeTruthy();
    expect(getByText('₹15,000')).toBeTruthy();
  });

  it('opens invoice detail modal and triggers mark paid offline', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: {
        data: {
          items: [
            {
              id: 'inv-102',
              invoiceNumber: 'INV-2026-002',
              totalAmount: 25000,
              dueDate: '2026-09-15T00:00:00Z',
              status: 1,
            },
          ],
        },
      },
    });

    apiClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: { id: 'inv-102', status: 2 }, // Paid
      },
    });

    const preloadedState = {
      corporate: {
        activeCompanyId: 'comp-123',
        invoices: [],
        isLoading: false,
      },
    };

    const { findByText, getByText } = renderWithProviders(
      <CorporateInvoicesScreen navigation={mockNavigation} />,
      { preloadedState }
    );

    const viewBtn = await findByText('View Details & Actions →');
    fireEvent.press(viewBtn);

    expect(getByText('Invoice INV-2026-002')).toBeTruthy();

    const markPaidBtn = getByText('Mark Paid Offline');
    fireEvent.press(markPaidBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalled();
    });
  });
});
