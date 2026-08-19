import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';

const mockLogin = vi.fn();
const mockLoginExternal = vi.fn();
const mockLoginCorporate = vi.fn();
const mockNavigate = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockGetExternalProviders = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginExternal: mockLoginExternal,
    loginCorporate: mockLoginCorporate,
    isAdmin: false,
  }),
}));

vi.mock('../services/api', () => ({
  default: {
    getExternalProviders: (...args) => mockGetExternalProviders(...args),
  },
}));

vi.mock('../config', () => ({
  GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
  APPLE_CLIENT_ID: 'com.parkease.web',
  APPLE_REDIRECT_URI: 'https://app.example.com',
  API_BASE_URL: 'http://localhost:5129',
  API_ENDPOINTS: { BASE: 'http://localhost:5129/api', UPLOADS: '', HUBS: '' },
}));

/** Captures GIS initialize callback so tests can fire a fake credential. */
let lastGisCallback = null;
const mockAppleSignIn = vi.fn();

vi.mock('../utils/loadGoogleGis', () => ({
  loadGoogleGis: vi.fn().mockImplementation(async () => ({
    accounts: {
      id: {
        initialize: ({ callback }) => {
          lastGisCallback = callback;
        },
        renderButton: vi.fn((el) => {
          if (el) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Continue with Google';
            el.appendChild(btn);
          }
        }),
      },
    },
  })),
}));

vi.mock('../utils/loadAppleAuth', () => ({
  loadAppleAuth: vi.fn().mockResolvedValue({
    auth: {
      init: vi.fn(),
      signIn: (...args) => mockAppleSignIn(...args),
    },
  }),
}));

vi.mock('../utils/appleNonce', () => ({
  createAppleNonce: vi.fn(() => 'login-test-nonce'),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../utils/toast.jsx', () => ({
  default: {
    error: (...args) => mockToastError(...args),
    success: (...args) => mockToastSuccess(...args),
  },
}));

function renderLogin(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    </MemoryRouter>
  );
}

function emailInput(isCorporate = false) {
  return screen.getByPlaceholderText(isCorporate ? /work email/i : /enter your email/i);
}

function passwordInput() {
  return screen.getByPlaceholderText(/enter your password/i);
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lastGisCallback = null;
    mockAppleSignIn.mockResolvedValue({
      authorization: { id_token: 'apple-jwt' },
      user: { name: { firstName: 'Sam', lastName: 'Apple' } },
    });
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: [] },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders sign-in form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(emailInput()).toBeInTheDocument();
    expect(passwordInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/register');
  });

  it('hides social buttons when providers list is empty', async () => {
    mockGetExternalProviders.mockResolvedValue({ success: true, data: { providers: [] } });
    renderLogin();
    await waitFor(() => {
      expect(mockGetExternalProviders).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('social-auth-section')).not.toBeInTheDocument();
  });

  it('shows Google social section on marketplace when Google provider enabled', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google'] },
    });
    renderLogin();
    await waitFor(() => {
      expect(screen.getByTestId('social-auth-section')).toBeInTheDocument();
    });
  });

  it('does not mount social section on corporate channel tab', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google'] },
    });
    renderLogin('/login?channel=corporate');
    // SocialAuthSection is not rendered for corporate tab, so providers is never fetched
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in to corporate/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('social-auth-section')).not.toBeInTheDocument();
    expect(mockGetExternalProviders).not.toHaveBeenCalled();
  });

  it('handles Google account_exists (409) with safe toast copy', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google'] },
    });
    mockLoginExternal.mockResolvedValue({
      success: false,
      code: 'account_exists',
      message:
        'An account with this email already exists. Sign in with your existing method, then link this provider in account settings.',
    });

    renderLogin();
    await waitFor(() => {
      expect(screen.getByTestId('social-auth-section')).toBeInTheDocument();
      expect(lastGisCallback).toBeTypeOf('function');
    });

    lastGisCallback({ credential: 'id-token-jwt' });

    await waitFor(() => {
      expect(mockLoginExternal).toHaveBeenCalledWith({
        provider: 'Google',
        idToken: 'id-token-jwt',
      });
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringMatching(/already registered|already exists|sign in with your/i)
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('navigates on successful Google external login', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google'] },
    });
    mockLoginExternal.mockResolvedValue({
      success: true,
      channel: 'Marketplace',
      isNewUser: false,
    });

    renderLogin();
    await waitFor(() => {
      expect(lastGisCallback).toBeTypeOf('function');
    });

    lastGisCallback({ credential: 'good-token' });

    await waitFor(() => {
      expect(mockLoginExternal).toHaveBeenCalledWith({
        provider: 'Google',
        idToken: 'good-token',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('navigates on successful Apple external login with nonce and names', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Apple'] },
    });
    mockLoginExternal.mockResolvedValue({
      success: true,
      channel: 'Marketplace',
      isNewUser: true,
    });

    renderLogin();
    await waitFor(() => {
      expect(screen.getByTestId('apple-signin-button')).toBeEnabled();
    });

    await userEvent.click(screen.getByTestId('apple-signin-button'));

    await waitFor(() => {
      expect(mockLoginExternal).toHaveBeenCalledWith({
        provider: 'Apple',
        idToken: 'apple-jwt',
        nonce: 'login-test-nonce',
        firstName: 'Sam',
        lastName: 'Apple',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  it('shows invite copy when returnUrl is invite path', () => {
    renderLogin('/login?returnUrl=%2Finvite%2Faccept%2Ftok');
    expect(
      screen.getByText(/sign in to accept your company invitation/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute(
      'href',
      '/register?returnUrl=%2Finvite%2Faccept%2Ftok'
    );
  });

  it('navigates to marketplace dashboard on successful marketplace login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderLogin();
    await user.type(emailInput(), 'user@test.com');
    await user.type(passwordInput(), 'secret');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'secret');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('navigates to corporate dashboard on successful corporate login', async () => {
    const user = userEvent.setup();
    mockLoginCorporate.mockResolvedValue({ success: true, isBootstrap: false });

    renderLogin('/login?channel=corporate');
    await user.type(emailInput(true), 'corp@test.com');
    await user.type(passwordInput(), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in to corporate/i }));

    await waitFor(() => {
      expect(mockLoginCorporate).toHaveBeenCalledWith('corp@test.com', 'secret', null);
      expect(mockNavigate).toHaveBeenCalledWith('/corporate/dashboard');
    });
  });

  it('navigates to create-company when corporate bootstrap', async () => {
    const user = userEvent.setup();
    mockLoginCorporate.mockResolvedValue({ success: true, isBootstrap: true });

    renderLogin('/login?channel=corporate');
    await user.type(emailInput(true), 'new@test.com');
    await user.type(passwordInput(), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in to corporate/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/corporate/create-company');
    });
  });

  it('honors marketplace-compatible returnUrl after marketplace login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderLogin('/login?returnUrl=%2Fbookings');
    await user.type(emailInput(), 'user@test.com');
    await user.type(passwordInput(), 'secret');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/bookings');
    });
  });

  it('ignores corporate returnUrl after marketplace login and uses dashboard', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderLogin('/login?returnUrl=%2Fcorporate%2Fdashboard');
    await user.type(emailInput(), 'user@test.com');
    await user.type(passwordInput(), 'secret');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('ignores open-redirect returnUrl and uses dashboard', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: true });

    renderLogin('/login?returnUrl=https%3A%2F%2Fevil.com');
    await user.type(emailInput(), 'user@test.com');
    await user.type(passwordInput(), 'secret');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('toasts on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue({ success: false, message: 'Bad password' });

    renderLogin();
    await user.type(emailInput(), 'user@test.com');
    await user.type(passwordInput(), 'wrong');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Bad password');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
