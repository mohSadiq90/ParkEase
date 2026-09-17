import { formatCurrency, formatTimeRange, formatDate, formatTime } from '../formatters';

describe('formatters', () => {
    describe('formatCurrency', () => {
        it('formats decimal amounts with 2 decimal places (e.g. ₹12.30)', () => {
            const formatted = formatCurrency(12.3);
            expect(formatted).toBe('₹12.30');
        });

        it('formats integers cleanly without unnecessary decimal trailing zeroes by default', () => {
            expect(formatCurrency(20)).toBe('₹20');
            expect(formatCurrency(1200)).toBe('₹1,200');
        });

        it('formats amounts with 2 decimal places when minimumFractionDigits option is passed', () => {
            expect(formatCurrency(20, 'INR', { minimumFractionDigits: 2 })).toBe('₹20.00');
            expect(formatCurrency(12.34, 'INR', { minimumFractionDigits: 2 })).toBe('₹12.34');
        });

        it('handles null, undefined, or NaN gracefully', () => {
            expect(formatCurrency(null)).toBe('₹0');
            expect(formatCurrency(undefined)).toBe('₹0');
            expect(formatCurrency('invalid')).toBe('₹0');
            expect(formatCurrency(null, 'INR', { minimumFractionDigits: 2 })).toBe('₹0.00');
        });
    });

    describe('formatTimeRange', () => {
        it('truncates identical start and end times to a single time display (e.g. 04:44 pm)', () => {
            const start = '2026-09-17T16:44:00.000Z';
            const end = '2026-09-17T16:44:00.000Z';
            const result = formatTimeRange(start, end);
            expect(result).toBe(formatTime(start));
        });

        it('displays full time range when start and end times differ on the same day', () => {
            const start = '2026-09-17T14:00:00.000Z';
            const end = '2026-09-17T16:30:00.000Z';
            const result = formatTimeRange(start, end);
            expect(result).toBe(`${formatTime(start)} - ${formatTime(end)}`);
        });

        it('handles multi-day booking time range cleanly', () => {
            const start = '2026-09-17T14:00:00.000Z';
            const end = '2026-09-19T18:00:00.000Z';
            const result = formatTimeRange(start, end);
            expect(result).toContain(formatTime(start));
            expect(result).toContain(formatDate(end));
            expect(result).toContain(formatTime(end));
        });

        it('handles missing dates gracefully', () => {
            expect(formatTimeRange(null, null)).toBe('');
            const start = '2026-09-17T14:00:00.000Z';
            expect(formatTimeRange(start, null)).toBe(formatTime(start));
            expect(formatTimeRange(null, start)).toBe(formatTime(start));
        });
    });
});
