import { Platform } from 'react-native';

const SESSION_KEY = 'etrak_google_session';
const STATE_KEY = 'etrak_google_state';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

export type GoogleSession = {
  accessToken: string;
  expiresAt: number;
  email: string | null;
  name: string | null;
  givenName: string | null;
};

export const googleSupported = Platform.OS === 'web';
export const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

let authChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    authChannel = new BroadcastChannel('etrak_auth_sync');
  } catch {}
}

export function subscribeToAuthChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === SESSION_KEY) {
      callback();
    }
  };

  const handleChannel = (e: MessageEvent) => {
    if (e.data?.type === 'AUTH_STATE_CHANGED' || e.data?.type === 'SYNC_COMPLETED') {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  if (authChannel) {
    authChannel.addEventListener('message', handleChannel);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (authChannel) {
      authChannel.removeEventListener('message', handleChannel);
    }
  };
}

export function broadcastAuthUpdate(type = 'AUTH_STATE_CHANGED') {
  if (authChannel) {
    try {
      authChannel.postMessage({ type, timestamp: Date.now() });
    } catch {}
  }
}

export function startGoogleSignIn() {
  if (!googleSupported || !googleClientId) return;
  const state = crypto.randomUUID();
  try {
    localStorage.setItem(STATE_KEY, state);
  } catch {}
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: window.location.origin,
    response_type: 'token',
    scope: `openid profile email ${DRIVE_SCOPE}`,
    state,
    include_granted_scopes: 'true',
    prompt: 'select_account',
  });
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function captureGoogleRedirect() {
  if (!googleSupported || typeof window === 'undefined') return;

  const rawHash = window.location.hash.replace(/^#/, '');
  const rawSearch = window.location.search.replace(/^\?/, '');

  if (!rawHash.includes('access_token') && !rawSearch.includes('access_token')) {
    return;
  }

  const params = new URLSearchParams(rawHash.includes('access_token') ? rawHash : rawSearch);
  const token = params.get('access_token');
  if (!token) return;

  window.history.replaceState(null, '', window.location.pathname);

  try {
    localStorage.removeItem(STATE_KEY);
  } catch {}

  const expiresAt = Date.now() + (Number(params.get('expires_in')) || 3600) * 1000;
  let email: string | null = null;
  let name: string | null = null;
  let givenName: string | null = null;

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      email = data.email ?? null;
      name = data.name ?? null;
      givenName = data.given_name ?? null;
    }
  } catch {}

  try {
    const session: GoogleSession = { accessToken: token, expiresAt, email, name, givenName };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    broadcastAuthUpdate();
  } catch {}
}

export function getGoogleSession(): GoogleSession | null {
  if (!googleSupported || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GoogleSession;
    if (s.expiresAt > Date.now() + 30_000) {
      return s;
    }
    clearGoogleSession();
    return null;
  } catch {
    return null;
  }
}

export function clearGoogleSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    broadcastAuthUpdate();
  } catch {}
}
