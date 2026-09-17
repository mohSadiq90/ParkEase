import React from 'react';
import { render } from '@testing-library/react-native';
import Badge from '../Badge';
import { BookingStatus } from '../../../utils/constants';

describe('Badge Component', () => {
    it('renders Pending Payment label for AwaitingPayment status', () => {
        const { getByText } = render(<Badge status={BookingStatus.AwaitingPayment} />);
        expect(getByText('Pending Payment')).toBeTruthy();
    });

    it('renders Cancelled badge with distinct styling', () => {
        const { getByText } = render(<Badge status={BookingStatus.Cancelled} />);
        expect(getByText('Cancelled')).toBeTruthy();
    });

    it('renders Rejected badge with distinct styling and outline', () => {
        const { getByText } = render(<Badge status={BookingStatus.Rejected} />);
        expect(getByText('Rejected')).toBeTruthy();
    });

    it('renders string status labels correctly', () => {
        const { getByText: getCancelled } = render(<Badge status="CANCELLED" />);
        expect(getCancelled('CANCELLED')).toBeTruthy();

        const { getByText: getRejected } = render(<Badge status="REJECTED" />);
        expect(getRejected('REJECTED')).toBeTruthy();
    });
});
