import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const mockLogin = vi.fn();
const mockLoginExternal = vi.fn();
const mockLoginCorporate = vi.fn();
const mockSwitchChannel = vi.fn();
const mockGetChannelContext = vi.fn();
const mockRegister = vi.fn();
const mockLogout = vi.fn();
const mockSetPassword = vi.fn();
const mockLinkExternal = vi.fn();
const mockSetTokens = vi.fn();
const mockClearTokens = vi.fn();
const mockApplySession = vi.fn();
const mockGetToken = vi.fn();

vi.mock('../services/api', () => ({
  default: {
    login: (...args) => mockLogin(...args),
    loginExternal: (...args) => mockLoginExternal(...args),
    loginCorporate: (...args) => mockLoginCorporate(...args),
    switchChannel: (...args) => mockSwitchChannel(...args),
    getChannelContext: (...args) => mockGetChannelContext(...args),
    register: (...args) => mockRegister(...args),
    logout: (...args) => mockLogout(...args),
    setPassword: (...args) => mockSetPassword(...args),
    linkExternal: (...args) => mockLinkExternal(...args),
    setTokens: (...args) => mockSetTokens(...args),
    clearTokens: (...args) => mockClearTokens(...args),
    applySession: (...args) => mockApplySession(...args),
    getToken: (...args) => mockGetToken(...args),
  },
}));

function ResultProbe() {
  const auth = useAuth();
  const [last, setLast] = useState(null);
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          const r = await auth.login('a@b.com', 'pw');
          setLast(r);
        }}
      >
        login
      </button>
      <button
        type="button"
        onClick={async () => {
          const r = await auth.loginExternal({
            provider: 'Google',
            idToken: 'id-token',
          });
          setLast(r);
        }}
      >
        loginExternal
      </button>
      <button
        type="button"
        onClick={async () => {
          const r = await auth.setPassword('TestPass1!');
          setLast(r);
        }}
      >
        setPassword
      </button>
      <button
        type="button"
        onClick={async () => {
          const r = await auth.linkExternal({
            provider: 'Google',
            idToken: 'link-token',
          });
          setLast(r);
        }}
      >
        linkExternal
      </button>
      <button
        type="button"
        onClick={async () => {
          const r = await auth.loginCorporate('corp@b.com', 'pw', null);
          setLast(r);
        }}
      >
        loginCorporate
      </button>
      <button
        type="button"
        onClick={async () => {
          const r = await auth.switchChannel({ channel: 'Corporate', companyId: 'c1' });
          setLast(r);
        }}
      >
        switchChannel
      </button>
      <button
        type="button"
        onClick={async () => {
          const r = await auth.register({ email: 'n@b.com' });
          setLast(r);
        }}
      >
        register
      </button>
      <button
        type="button"
        onClick={async () => {
          await auth.logout();
          setLast({ loggedOut: true });
        }}
      >
        logout
      </button>
      <button
        type="button"
        onClick={() => {
          auth.updateUser({ firstName: 'Pat' });
          setLast({ updated: true });
        }}
      >
        update
      </button>
      <pre data-testid="result">{last ? JSON.stringify(last) : ''}</pre>
      <span data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'none'}</span>
      <span data-testid="isAdmin">{String(auth.isAdmin)}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="channel">{auth.channel || 'none'}</span>
      <span data-testid="companyId">{auth.companyId || 'none'}</span>
      <span data-testid="isBootstrap">{String(auth.isBootstrap)}</span>
      <span data-testid="isolation">{String(auth.isolationEnabled)}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockGetToken.mockReturnValue(null);
    mockGetChannelContext.mockResolvedValue({ success: false });
    mockApplySession.mockImplementation((session) => {
      if (session?.user) {
        localStorage.setItem('user', JSON.stringify(session.user));
      }
      if (session?.channel) localStorage.setItem('channel', session.channel);
      if (session?.companyId) localStorage.setItem('companyId', String(session.companyId));
      if (session?.companyRole) localStorage.setItem('companyRole', session.companyRole);
      localStorage.setItem('isBootstrap', session?.isBootstrap ? 'true' : 'false');
      return {
        channel: session?.channel || 'Marketplace',
        companyId: session?.companyId ? String(session.companyId) : null,
        companyRole: session?.companyRole || null,
        isBootstrap: !!session?.isBootstrap,
        user: session?.user || null,
      };
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('throws when useAuth is used outside provider', () => {
    const Spy = () => {
      useAuth();
      return null;
    };
    expect(() => render(<Spy />)).toThrow('useAuth must be used within an AuthProvider');
  });

  it('hydrates user from localStorage and finishes loading', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ email: 'stored@test.com', role: 1 })
    );
    localStorage.setItem('channel', 'Marketplace');

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toContain('stored@test.com');
    expect(screen.getByTestId('isAdmin').textContent).toBe('false');
    expect(screen.getByTestId('channel').textContent).toBe('Marketplace');
  });

  it('treats role 0 and Admin string as isAdmin', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ email: 'admin@test.com', role: 0 })
    );

    const { unmount } = render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('true');
    });
    unmount();

    localStorage.setItem(
      'user',
      JSON.stringify({ email: 'admin2@test.com', role: 'Admin' })
    );
    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('isAdmin').textContent).toBe('true');
    });
  });

  it('login success stores tokens and user via applySession', async () => {
    mockLogin.mockResolvedValue({
      success: true,
      data: {
        accessToken: 'at',
        refreshToken: 'rt',
        channel: 'Marketplace',
        user: { email: 'a@b.com', role: 1 },
      },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('result').textContent).toContain('"success":true');
    });
    expect(mockApplySession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'at', channel: 'Marketplace' })
    );
    expect(screen.getByTestId('authenticated').textContent).toBe('true');
    expect(screen.getByTestId('channel').textContent).toBe('Marketplace');
  });

  it('loginExternal applies nested data.session only', async () => {
    mockLoginExternal.mockResolvedValue({
      success: true,
      data: {
        session: {
          accessToken: 'ext-at',
          refreshToken: 'ext-rt',
          channel: 'Marketplace',
          user: { email: 'g@b.com', role: 1 },
        },
        isNewUser: true,
        requiresPhone: true,
        linkedProviders: ['Google'],
      },
    });
    mockApplySession.mockReturnValue({
      channel: 'Marketplace',
      companyId: null,
      companyRole: null,
      isBootstrap: false,
      user: { email: 'g@b.com', role: 1 },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'loginExternal' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('result').textContent).toContain('"success":true');
    });
    expect(mockApplySession).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'ext-at', channel: 'Marketplace' })
    );
    // Must not apply the outer envelope as session
    expect(mockApplySession).not.toHaveBeenCalledWith(
      expect.objectContaining({ isNewUser: true })
    );
    const result = JSON.parse(screen.getByTestId('result').textContent);
    expect(result.isNewUser).toBe(true);
    expect(result.requiresPhone).toBe(true);
  });

  it('loginExternal account_exists does not apply session', async () => {
    mockLoginExternal.mockRejectedValue({
      code: 'account_exists',
      response: {
        data: {
          success: false,
          code: 'account_exists',
          message: 'An account with this email already exists.',
        },
        status: 409,
      },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'loginExternal' }).click();
    });

    await waitFor(() => {
      const result = JSON.parse(screen.getByTestId('result').textContent);
      expect(result.success).toBe(false);
      expect(result.code).toBe('account_exists');
    });
    expect(mockApplySession).not.toHaveBeenCalled();
  });

  it('setPassword applies nested data.session', async () => {
    mockSetPassword.mockResolvedValue({
      success: true,
      data: {
        session: {
          accessToken: 'new-at',
          refreshToken: 'new-rt',
          channel: 'Marketplace',
          user: { email: 's@b.com', role: 1 },
        },
      },
    });
    mockApplySession.mockReturnValue({
      channel: 'Marketplace',
      companyId: null,
      companyRole: null,
      isBootstrap: false,
      user: { email: 's@b.com', role: 1 },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'setPassword' }).click();
    });

    await waitFor(() => {
      expect(mockSetPassword).toHaveBeenCalledWith({ newPassword: 'TestPass1!' });
      expect(mockApplySession).toHaveBeenCalledWith(
        expect.objectContaining({ accessToken: 'new-at', refreshToken: 'new-rt' })
      );
    });
  });

  it('linkExternal returns linkedProviders without applying session', async () => {
    mockLinkExternal.mockResolvedValue({
      success: true,
      data: { linkedProviders: ['Google', 'Apple'] },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'linkExternal' }).click();
    });

    await waitFor(() => {
      const result = JSON.parse(screen.getByTestId('result').textContent);
      expect(result.success).toBe(true);
      expect(result.linkedProviders).toEqual(['Google', 'Apple']);
    });
    expect(mockApplySession).not.toHaveBeenCalled();
  });

  it('login failure returns message without setting user', async () => {
    mockLogin.mockResolvedValue({
      success: false,
      message: 'Invalid credentials',
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      const result = JSON.parse(screen.getByTestId('result').textContent);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });
    expect(mockApplySession).not.toHaveBeenCalled();
    expect(screen.getByTestId('authenticated').textContent).toBe('false');
  });

  it('login catch maps thrown API errors', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { message: 'Server down' } },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    await waitFor(() => {
      const result = JSON.parse(screen.getByTestId('result').textContent);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Server down');
    });
  });

  it('loginCorporate applies corporate session and bootstrap flag', async () => {
    mockLoginCorporate.mockResolvedValue({
      success: true,
      data: {
        isBootstrap: true,
        requiresCompanySelection: false,
        session: {
          accessToken: 'cat',
          refreshToken: 'crt',
          channel: 'Corporate',
          isBootstrap: true,
          user: { email: 'corp@b.com', role: 1 },
        },
      },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'loginCorporate' }).click();
    });

    await waitFor(() => {
      const result = JSON.parse(screen.getByTestId('result').textContent);
      expect(result.success).toBe(true);
      expect(result.isBootstrap).toBe(true);
    });
    expect(mockApplySession).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'Corporate', isBootstrap: true })
    );
    expect(screen.getByTestId('channel').textContent).toBe('Corporate');
    expect(screen.getByTestId('isBootstrap').textContent).toBe('true');
  });

  it('loginCorporate returns memberships when company selection required', async () => {
    mockLoginCorporate.mockResolvedValue({
      success: true,
      data: {
        requiresCompanySelection: true,
        memberships: [{ companyId: 'c1', companyName: 'Acme', role: 'Admin' }],
      },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'loginCorporate' }).click();
    });

    await waitFor(() => {
      const result = JSON.parse(screen.getByTestId('result').textContent);
      expect(result.success).toBe(false);
      expect(result.requiresCompanySelection).toBe(true);
      expect(result.memberships).toHaveLength(1);
    });
    expect(mockApplySession).not.toHaveBeenCalled();
  });

  it('switchChannel applies re-minted session', async () => {
    mockSwitchChannel.mockResolvedValue({
      success: true,
      data: {
        accessToken: 'a2',
        refreshToken: 'r2',
        channel: 'Corporate',
        companyId: 'c1',
        companyRole: 'Admin',
        isBootstrap: false,
        user: { email: 'a@b.com', role: 1 },
      },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'switchChannel' }).click();
    });

    await waitFor(() => {
      const result = JSON.parse(screen.getByTestId('result').textContent);
      expect(result.success).toBe(true);
      expect(result.companyId).toBe('c1');
    });
    expect(screen.getByTestId('companyId').textContent).toBe('c1');
    expect(screen.getByTestId('isBootstrap').textContent).toBe('false');
  });

  it('register success stores session', async () => {
    mockRegister.mockResolvedValue({
      success: true,
      data: {
        accessToken: 'at2',
        refreshToken: 'rt2',
        channel: 'Marketplace',
        user: { email: 'n@b.com', role: 1 },
      },
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'register' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('result').textContent).toContain('"success":true');
    });
    expect(mockApplySession).toHaveBeenCalled();
    expect(screen.getByTestId('user').textContent).toContain('n@b.com');
  });

  it('register failure returns false', async () => {
    mockRegister.mockResolvedValue({
      success: false,
      message: 'Email taken',
    });

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'register' }).click();
    });

    await waitFor(() => {
      const result = JSON.parse(screen.getByTestId('result').textContent);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Email taken');
    });
  });

  it('logout clears tokens even when API fails', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ email: 'a@b.com', role: 1 })
    );
    mockLogout.mockRejectedValue(new Error('network'));

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('true');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'logout' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('false');
    });
    expect(mockClearTokens).toHaveBeenCalled();
    expect(screen.getByTestId('channel').textContent).toBe('none');
  });

  it('updateUser merges and persists', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ email: 'a@b.com', firstName: 'Ann', role: 1 })
    );

    render(
      <AuthProvider>
        <ResultProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('Ann');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'update' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toContain('Pat');
    });
    expect(JSON.parse(localStorage.getItem('user')).firstName).toBe('Pat');
    expect(JSON.parse(localStorage.getItem('user')).email).toBe('a@b.com');
  });
});
