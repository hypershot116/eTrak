import { Platform } from 'react-native';

const SESSION_KEY = 'etrak_google_session';
const STATE_KEY = 'etrak_google_state';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export type GoogleSession = { accessToken: string; expiresAt: number; email: string | null };

export const googleSupported = Platform.OS === 'web';
export const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

// Sends the whole page to Google; Google sends the user back with a token in the address.
export function startGoogleSignIn() {
  if (!googleSupported || !googleClientId) return;
  const state = crypto.randomUUID();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {}
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: window.location.origin,
    response_type: 'token',
    scope: `openid email ${DRIVE_SCOPE}`,
    state,
    include_granted_scopes: 'true',
    prompt: 'select_account',
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

// Runs once at app start: picks up the token Google put in the address and stores it.
export async function captureGoogleRedirect() {
  if (!googleSupported || typeof window === 'undefined') return;
  const hash = window.location.hash;
  if (!hash.includes('access_token') && !hash.includes('error=')) return;

  const params = new URLSearchParams(hash.replace(/^#/, ''));
  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  let expected: string | null = null;
  try {
    expected = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
  } catch {}

  const token = params.get('access_token');
  if (!token || !expected || params.get('state') !== expected) return;

  const expiresAt = Date.now() + (Number(params.get('expires_in')) || 3600) * 1000;
  let email: string | null = null;
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) email = (await res.json()).email ?? null;
  } catch {}

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: token, expiresAt, email }));
  } catch {}
}

export function getGoogleSession(): GoogleSession | null {
  if (!googleSupported) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GoogleSession;
    return s.expiresAt > Date.now() + 30_000 ? s : null;
  } catch {
    return null;
  }
}

export function clearGoogleSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}
