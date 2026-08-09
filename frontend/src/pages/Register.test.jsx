import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Register from './Register';

const mockRegister = vi.fn();
const mockLoginExternal = vi.fn();
const mockNavigate = vi.fn();
const mockToastError = vi.fn();
const mockGetExternalProviders = vi.fn();

const mockSwitchChannel = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    loginExternal: mockLoginExternal,
    switchChannel: mockSwitchChannel,
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

vi.mock('../utils/loadGoogleGis', () => ({
  loadGoogleGis: vi.fn().mockResolvedValue({
    accounts: {
      id: {
        initialize: vi.fn(),
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
  }),
}));

vi.mock('../utils/loadAppleAuth', () => ({
  loadAppleAuth: vi.fn().mockResolvedValue({
    auth: {
      init: vi.fn(),
      signIn: vi.fn().mockResolvedValue({
        authorization: { id_token: 'apple-jwt' },
      }),
    },
  }),
}));

vi.mock('../utils/appleNonce', () => ({
  createAppleNonce: vi.fn(() => 'register-test-nonce'),
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
    success: vi.fn(),
  },
}));

function renderRegister(initialEntry = '/register') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    </MemoryRouter>
  );
}

async function fillValidForm(user, { password = 'password1', confirm = 'password1' } = {}) {
  await user.type(screen.getByPlaceholderText('John'), 'Jane');
  await user.type(screen.getByPlaceholderText('Doe'), 'Doe');
  await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@test.com');
  await user.type(screen.getByPlaceholderText('+919876543210'), '+919876543210');
  await user.type(screen.getByPlaceholderText('Min 8 characters'), password);
  await user.type(screen.getByPlaceholderText('Re-enter password'), confirm);
}

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: [] },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders create-account form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('hides social when providers empty', async () => {
    renderRegister();
    await waitFor(() => {
      expect(mockGetExternalProviders).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('social-auth-section')).not.toBeInTheDocument();
  });

  it('shows social on marketplace when Google enabled', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google'] },
    });
    renderRegister();
    await waitFor(() => {
      expect(screen.getByTestId('social-auth-section')).toBeInTheDocument();
    });
  });

  it('does not show social on corporate register tab', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google'] },
    });
    renderRegister('/register?channel=corporate');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create corporate account/i })).toBeInTheDocument();
    });
    expect(screen.queryByTestId('social-auth-section')).not.toBeInTheDocument();
    expect(mockGetExternalProviders).not.toHaveBeenCalled();
  });

  it('shows invite copy when returnUrl is invite path', () => {
    renderRegister('/register?returnUrl=%2Finvite%2Faccept%2Ftok');
    expect(
      screen.getByText(/create an account to accept your company invitation/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?returnUrl=%2Finvite%2Faccept%2Ftok'
    );
  });

  it('toasts when passwords do not match', async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillValidForm(user, { password: 'password1', confirm: 'password2' });
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Passwords do not match');
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('toasts when password is shorter than 8 characters', async () => {
    const user = userEvent.setup();
    renderRegister();
    await fillValidForm(user, { password: 'short', confirm: 'short' });
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Password must be at least 8 characters');
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('navigates to dashboard on successful register', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ success: true });

    renderRegister();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'jane@test.com',
        password: 'password1',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+919876543210',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('navigates to safe returnUrl after success', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ success: true });

    renderRegister('/register?returnUrl=%2Finvite%2Faccept%2Fabc');
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/invite/accept/abc');
    });
  });

  it('ignores open-redirect returnUrl and uses dashboard', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ success: true });

    renderRegister('/register?returnUrl=https%3A%2F%2Fevil.com');
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('toasts on registration failure', async () => {
    const user = userEvent.setup();
    mockRegister.mockResolvedValue({ success: false, message: 'Email taken' });

    renderRegister();
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email taken');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
