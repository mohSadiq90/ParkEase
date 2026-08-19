import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SocialAuthSection from './SocialAuthSection';

const mockGetExternalProviders = vi.fn();
const mockSignIn = vi.fn();
const mockInit = vi.fn();

vi.mock('../services/api', () => ({
  default: {
    getExternalProviders: (...args) => mockGetExternalProviders(...args),
  },
}));

vi.mock('../config', () => ({
  GOOGLE_CLIENT_ID: 'test-client-id.apps.googleusercontent.com',
  APPLE_CLIENT_ID: 'com.parkease.web',
  APPLE_REDIRECT_URI: 'https://app.example.com',
}));

const mockInitialize = vi.fn();
const mockRenderButton = vi.fn((el) => {
  if (el) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Continue with Google';
    el.appendChild(btn);
  }
});

vi.mock('../utils/loadGoogleGis', () => ({
  loadGoogleGis: vi.fn().mockResolvedValue({
    accounts: {
      id: {
        initialize: (...a) => mockInitialize(...a),
        renderButton: (...a) => mockRenderButton(...a),
      },
    },
  }),
}));

vi.mock('../utils/loadAppleAuth', () => ({
  loadAppleAuth: vi.fn().mockResolvedValue({
    auth: {
      init: (...a) => mockInit(...a),
      signIn: (...a) => mockSignIn(...a),
    },
  }),
}));

vi.mock('../utils/appleNonce', () => ({
  createAppleNonce: vi.fn(() => 'test-raw-nonce'),
}));

describe('SocialAuthSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({
      authorization: { id_token: 'apple-id-token' },
      user: { name: { firstName: 'Ada', lastName: 'Lovelace' } },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when providers list is empty', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: [] },
    });
    const { container } = render(
      <SocialAuthSection onGoogleCredential={vi.fn()} onAppleCredential={vi.fn()} />
    );
    await waitFor(() => {
      expect(mockGetExternalProviders).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders Google host when Google is enabled', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google'] },
    });
    render(
      <SocialAuthSection onGoogleCredential={vi.fn()} onAppleCredential={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId('social-auth-section')).toBeInTheDocument();
      expect(screen.getByTestId('google-signin-host')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled();
      expect(mockRenderButton).toHaveBeenCalled();
    });
    expect(mockInitialize).toHaveBeenCalledWith(
      expect.objectContaining({
        ux_mode: 'popup',
        use_fedcm_for_prompt: true,
      })
    );
    expect(screen.queryByTestId('apple-signin-button')).not.toBeInTheDocument();
  });

  it('renders Apple button when Apple is enabled', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Apple'] },
    });
    render(
      <SocialAuthSection onGoogleCredential={vi.fn()} onAppleCredential={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId('social-auth-section')).toBeInTheDocument();
      expect(screen.getByTestId('apple-signin-button')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(mockInit).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'com.parkease.web',
          usePopup: true,
        })
      );
    });
    expect(screen.queryByTestId('google-signin-host')).not.toBeInTheDocument();
  });

  it('renders both Google and Apple when both providers enabled', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google', 'Apple'] },
    });
    render(
      <SocialAuthSection onGoogleCredential={vi.fn()} onAppleCredential={vi.fn()} />
    );
    await waitFor(() => {
      expect(screen.getByTestId('google-signin-host')).toBeInTheDocument();
      expect(screen.getByTestId('apple-signin-button')).toBeInTheDocument();
    });
  });

  it('invokes onGoogleCredential with id_token from GIS callback', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Google'] },
    });
    const onCred = vi.fn();
    render(<SocialAuthSection onGoogleCredential={onCred} onAppleCredential={vi.fn()} />);

    await waitFor(() => {
      expect(mockInitialize).toHaveBeenCalled();
    });

    const initArg = mockInitialize.mock.calls[0][0];
    initArg.callback({ credential: 'jwt-id-token' });
    expect(onCred).toHaveBeenCalledWith('jwt-id-token');
  });

  it('invokes onAppleCredential with id_token, nonce, and first-auth names', async () => {
    mockGetExternalProviders.mockResolvedValue({
      success: true,
      data: { providers: ['Apple'] },
    });
    const onApple = vi.fn();
    render(
      <SocialAuthSection onGoogleCredential={vi.fn()} onAppleCredential={onApple} />
    );

    await waitFor(() => {
      expect(screen.getByTestId('apple-signin-button')).toBeEnabled();
    });

    await userEvent.click(screen.getByTestId('apple-signin-button'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({ nonce: 'test-raw-nonce' });
      expect(onApple).toHaveBeenCalledWith({
        idToken: 'apple-id-token',
        nonce: 'test-raw-nonce',
        firstName: 'Ada',
        lastName: 'Lovelace',
      });
    });
  });

  it('renders nothing when providers request fails', async () => {
    mockGetExternalProviders.mockRejectedValue(new Error('network'));
    const { container } = render(
      <SocialAuthSection onGoogleCredential={vi.fn()} onAppleCredential={vi.fn()} />
    );
    await waitFor(() => {
      expect(mockGetExternalProviders).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });
});
