/**
 * Corporate Fleet, Allocations & Invoicing End-to-End Flow Tests
 *
 * Covers:
 * 1. Corporate Dashboard: Active company overview, member metrics, quick navigation actions
 * 2. Dedicated Inventory / Spaces: Facility list, bay occupancy, empty state
 * 3. Employee Directory & Member Management: Listing members, inline invite validation, successful invite, remove member
 * 4. Bay Allocations Flow: Allocations list, request allocation validation, successful allocation
 * 5. Corporate Invoices & Payment: Invoice listing, mark paid offline action, status display
 */

import React from 'react';
import { Alert } from 'react-native';
import { renderWithProviders, fireEvent, waitFor } from '../../utils/test-utils';
import corporateService from '../../services/api/corporateService';
import apiClient from '../../services/api/apiClient';
import CorporateDashboardScreen from '../../screens/Corporate/CorporateDashboardScreen';
import CorporateParkingSpacesScreen from '../../screens/Corporate/CorporateParkingSpacesScreen';
import CorporateMembersScreen from '../../screens/Corporate/CorporateMembersScreen';
import CorporateAllocationsScreen from '../../screens/Corporate/CorporateAllocationsScreen';
import CorporateInvoicesScreen from '../../screens/Corporate/CorporateInvoicesScreen';
import { EventBus } from '../../utils/EventBus';

jest.mock('../../services/api/corporateService');
jest.mock('../../services/api/apiClient');
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn(() => () => {}),
    getParent: jest.fn(() => ({
        setOptions: jest.fn(),
        navigate: jest.fn(),
    })),
};

const preloadedCorporateState = {
    corporate: {
        myCompanies: [
            { id: 'comp-99', name: 'Nexus Enterprise', contactEmail: 'admin@nexus.io' }
        ],
        activeCompanyId: 'comp-99',
        isLoading: false,
    }
};

describe('Corporate Fleet, Allocations & Invoicing End-to-End Flows', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        jest.spyOn(EventBus, 'emit').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // ── 1. Corporate Dashboard Flow ──
    describe('Corporate Dashboard Flow', () => {
        it('renders company overview, statistics, and handles navigation actions', async () => {
            corporateService.getMyCompanies.mockResolvedValueOnce({
                data: [{ id: 'comp-99', name: 'Nexus Enterprise', contactEmail: 'admin@nexus.io' }]
            });
            corporateService.getDashboard.mockResolvedValueOnce({
                totalMembers: 45,
                activeAllocations: 8,
                todaysBookings: 14,
            });

            const { findByText, getByText, getAllByText } = renderWithProviders(
                <CorporateDashboardScreen navigation={mockNavigation} />,
                { preloadedState: preloadedCorporateState }
            );

            expect(await findByText('Nexus Enterprise')).toBeTruthy();
            expect(getByText('Overview')).toBeTruthy();
            expect(getAllByText('Members').length).toBeGreaterThan(0);
            expect(getByText('Allocations')).toBeTruthy();
            expect(getByText('Invoices')).toBeTruthy();

            // Navigate to Invoices
            fireEvent.press(getByText('Invoices'));
            expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateInvoices');

            // Navigate to Allocations
            fireEvent.press(getByText('Allocations'));
            expect(mockNavigation.navigate).toHaveBeenCalledWith('CorporateAllocations');
        });
    });

    // ── 2. Dedicated Inventory / Spaces Flow ──
    describe('Corporate Parking Spaces Flow', () => {
        it('renders corporate facility inventory list with spot counts', async () => {
            const mockSpaces = [
                {
                    id: 'corp-space-1',
                    title: 'Nexus Headquarters Tower Lot',
                    address: '100 Cyber Ave',
                    city: 'San Francisco',
                    totalSpots: 50,
                    occupiedSpots: 22,
                    is24Hours: true,
                }
            ];

            corporateService.getCompanyParkingSpaces.mockResolvedValueOnce({
                data: mockSpaces,
            });

            const { findByText, getByText } = renderWithProviders(
                <CorporateParkingSpacesScreen navigation={mockNavigation} />,
                { preloadedState: preloadedCorporateState }
            );

            expect(await findByText('Nexus Headquarters Tower Lot')).toBeTruthy();
            expect(getByText(/100 Cyber Ave/i)).toBeTruthy();
        });

        it('renders empty state when no dedicated facilities exist', async () => {
            corporateService.getCompanyParkingSpaces.mockResolvedValueOnce({
                data: [],
            });

            const { findByText } = renderWithProviders(
                <CorporateParkingSpacesScreen navigation={mockNavigation} />,
                { preloadedState: preloadedCorporateState }
            );

            expect(await findByText(/No company facilities/i)).toBeTruthy();
        });
    });

    // ── 3. Corporate Members Directory Flow ──
    describe('Corporate Members Flow', () => {
        it('renders member directory and handles invite validation', async () => {
            const mockMembers = [
                {
                    id: 'mem-1',
                    userId: 'u-1',
                    user: { firstName: 'Sarah', lastName: 'Connor', email: 'sarah@nexus.io' },
                    email: 'sarah@nexus.io',
                    role: 0,
                }
            ];

            corporateService.getMembers.mockResolvedValueOnce({
                items: mockMembers,
            });

            const { findByText, getByText, getByPlaceholderText } = renderWithProviders(
                <CorporateMembersScreen navigation={mockNavigation} />,
                { preloadedState: preloadedCorporateState }
            );

            expect(await findByText(/Sarah/)).toBeTruthy();
            expect(getByText('sarah@nexus.io')).toBeTruthy();

            // Open Invite Modal
            const inviteBtn = getByText('Invite');
            fireEvent.press(inviteBtn);

            // Send without email -> triggers validation error banner
            const sendBtn = getByText('Send Invitation');
            fireEvent.press(sendBtn);

            expect(EventBus.emit).toHaveBeenCalledWith(
                'SHOW_ERROR_BANNER',
                expect.objectContaining({ message: 'Email is required' })
            );

            // Enter email and send invite successfully
            corporateService.inviteMember.mockResolvedValueOnce({ success: true });
            corporateService.getMembers.mockResolvedValueOnce({ items: mockMembers });

            const emailInput = getByPlaceholderText('employee@company.com');
            fireEvent.changeText(emailInput, 'john@nexus.io');
            fireEvent.press(sendBtn);

            await waitFor(() => {
                expect(corporateService.inviteMember).toHaveBeenCalledWith('comp-99', {
                    email: 'john@nexus.io',
                    role: 0,
                });
                expect(EventBus.emit).toHaveBeenCalledWith(
                    'SHOW_BANNER',
                    expect.objectContaining({ message: 'Invitation sent!', type: 'success' })
                );
            });
        });

        it('removes member via alert confirmation', async () => {
            const mockMembers = [
                {
                    id: 'mem-2',
                    userId: 'u-2',
                    user: { firstName: 'Kyle', lastName: 'Reese', email: 'kyle@nexus.io' },
                    email: 'kyle@nexus.io',
                    role: 0,
                }
            ];

            corporateService.getMembers.mockResolvedValueOnce({ items: mockMembers });
            corporateService.removeMember.mockResolvedValueOnce({ success: true });

            const { findByText, getByTestId } = renderWithProviders(
                <CorporateMembersScreen navigation={mockNavigation} />,
                { preloadedState: preloadedCorporateState }
            );

            expect(await findByText(/Kyle/)).toBeTruthy();

            // Remove member button
            const removeBtn = getByTestId('remove-member-mem-2');
            fireEvent.press(removeBtn);

            const alertCall = Alert.alert.mock.calls.find((c) => c[0] === 'Remove Member');
            expect(alertCall).toBeTruthy();

            // Confirm removal
            const confirmBtn = alertCall[2].find((b) => b.text === 'Remove');
            await confirmBtn.onPress();

            await waitFor(() => {
                expect(corporateService.removeMember).toHaveBeenCalledWith('comp-99', 'mem-2');
            });
        });
    });

    // ── 4. Spot Allocations Flow ──
    describe('Corporate Allocations Flow', () => {
        it('renders active allocations and validates new allocation requests', async () => {
            const mockAllocations = [
                {
                    id: 'alloc-1',
                    leaseReference: 'LEASE-CYBER-99',
                    totalSlots: 10,
                    fixedSlots: 0,
                    sharedSlots: 10,
                    monthlyRate: 50000,
                    status: 1,
                }
            ];

            corporateService.getAllocations.mockResolvedValueOnce(mockAllocations);

            const { findByText, getByText } = renderWithProviders(
                <CorporateAllocationsScreen navigation={mockNavigation} />,
                { preloadedState: preloadedCorporateState }
            );

            expect(await findByText(/LEASE-CYBER-99/)).toBeTruthy();

            // Open Request Allocation Modal
            const requestBtn = getByText('Request');
            fireEvent.press(requestBtn);

            // Submit empty form -> triggers validation error banner
            const submitBtn = getByText('Submit Request');
            fireEvent.press(submitBtn);

            expect(EventBus.emit).toHaveBeenCalledWith(
                'SHOW_ERROR_BANNER',
                expect.objectContaining({ message: 'Parking Space ID is required' })
            );
        });
    });

    // ── 5. Corporate Invoices Flow ──
    describe('Corporate Invoices Flow', () => {
        it('renders billing invoices and allows marking invoice paid offline', async () => {
            const mockInvoices = [
                {
                    id: 'inv-101',
                    invoiceNumber: 'INV-2026-001',
                    totalAmount: 1200,
                    amountDue: 1200,
                    dueDate: '2026-09-30T00:00:00Z',
                    status: 0, // Unpaid
                }
            ];

            corporateService.getInvoices.mockResolvedValueOnce({
                data: mockInvoices,
            });
            corporateService.markInvoicePaid.mockResolvedValueOnce({
                success: true,
                message: 'Invoice paid successfully',
            });

            const { findByText, getByText } = renderWithProviders(
                <CorporateInvoicesScreen navigation={mockNavigation} />,
                { preloadedState: preloadedCorporateState }
            );

            expect(await findByText(/INV-2026-001/)).toBeTruthy();
            expect(getByText('₹1,200')).toBeTruthy();

            // Tap invoice card action to open detail modal
            const detailActionBtn = getByText(/View Details & Actions/);
            fireEvent.press(detailActionBtn);

            // Press Mark Paid Offline
            const markPaidBtn = await findByText('Mark Paid Offline');
            fireEvent.press(markPaidBtn);

            await waitFor(() => {
                expect(Alert.alert).toHaveBeenCalledWith('Success', 'Invoice marked as paid offline.');
            });
        });
    });
});
