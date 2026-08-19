/**
 * PR4 AC: CorporateLogin.jsx must never mount social login controls.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CorporateLogin from './CorporateLogin';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    loginCorporate: vi.fn(),
    isAuthenticated: false,
    channel: null,
    isBootstrap: false,
  }),
}));

vi.mock('../../utils/toast.jsx', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

describe('CorporateLogin social isolation (PR4)', () => {
  afterEach(() => {
    cleanup();
  });

  it('has no social auth section or Google controls', () => {
    render(
      <MemoryRouter initialEntries={['/corporate/login']}>
        <Routes>
          <Route path="/corporate/login" element={<CorporateLogin />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /corporate/i })).toBeInTheDocument();
    expect(screen.queryByTestId('social-auth-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('google-signin-host')).not.toBeInTheDocument();
    expect(screen.queryByText(/continue with google/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^or$/i)).not.toBeInTheDocument();
  });
});
