/**
 * Friendly copy for Marketplace social-auth machine codes.
 * Prefer these over raw API code tokens (e.g. "account_exists").
 */

const FRIENDLY = {
  account_exists:
    'This email is already registered. Sign in with your password, then link this provider in Profile.',
  provider_already_linked:
    'This social account is already linked to another user.',
  provider_disabled: 'Social sign-in is not available right now.',
  nonce_required: 'Apple sign-in failed. Please try again.',
  invalid_id_token: 'Social sign-in failed. Please try again.',
  invalid_credentials: 'Could not verify your account. Please try again.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
  email_required: 'Your social account did not provide an email address.',
  email_not_verified: 'Please verify your email with the provider, then try again.',
  admin_social_forbidden: 'Admin accounts cannot use social sign-in.',
  account_disabled: 'This account is disabled. Contact support if you need help.',
  idp_unavailable: 'Sign-in is temporarily unavailable. Please try again shortly.',
};

/**
 * Resolve a machine code from result.code or result.errors[].
 * @param {{ code?: string, errors?: string[] }|null|undefined} result
 * @returns {string|null}
 */
export function resolveExternalAuthCode(result) {
  if (!result) return null;
  if (result.code && typeof result.code === 'string') {
    return result.code;
  }
  if (Array.isArray(result.errors)) {
    const code = result.errors.find(
      (e) => typeof e === 'string' && Object.prototype.hasOwnProperty.call(FRIENDLY, e),
    );
    if (code) return code;
  }
  return null;
}

/**
 * User-facing toast/body text for social login failures.
 * @param {{ code?: string, message?: string, errors?: string[] }|null|undefined} result
 * @returns {string}
 */
export function externalAuthErrorMessage(result) {
  const code = resolveExternalAuthCode(result);
  if (code && FRIENDLY[code]) {
    return FRIENDLY[code];
  }

  // Human API message (not a bare code token)
  const msg = result?.message;
  if (msg && typeof msg === 'string' && !/^[a-z][a-z0-9_]*$/.test(msg)) {
    return msg;
  }

  return 'Social sign-in failed. Please try again.';
}
