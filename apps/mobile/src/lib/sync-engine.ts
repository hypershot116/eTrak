import { useSyncExternalStore } from 'react';

import { exportBackup, mergeBackup } from '@/db/backup-repo';
import { onDataChanged, withoutChangeEvents } from '@/db/client';
import { deleteSetting, getSetting, setSetting } from '@/db/settings-repo';
import { clearGoogleSession, getGoogleSession } from '@/lib/google-auth';
import {
  DriveAuthError,
  deleteBackup,
  downloadBackup,
  findBackupId,
  uploadBackup,
} from '@/lib/google-drive';

export type SyncNotice = { title: string; body: string };

export type SyncState = {
  signedIn: boolean;
  email: string | null;
  syncing: boolean;
  paused: boolean; // true after "Delete cloud backup" or "Erase data", until the user presses Sync now
  lastSync: number | null;
  error: string | null;
  notice: SyncNotice | null; // one-time message, e.g. data restored from Google
  dataVersion: number; // goes up whenever a sync changed local data (screens reload on it)
};

let state: SyncState = {
  signedIn: false,
  email: null,
  syncing: false,
  paused: false,
  lastSync: null,
  error: null,
  notice: null,
  dataVersion: 0,
};
const subscribers = new Set<() => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  subscribers.forEach((l) => l());
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function useSyncState(): SyncState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state
  );
}

const DEBOUNCE_MS = 2500; // wait for a burst of edits to finish
const POLL_MS = 120_000; // also check every 2 minutes (picks up changes from other devices)

let dirty = true; // unsynced local changes; true at startup so the first sync uploads
let timer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let queued = false;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function friendly(e: unknown): string {
  if (e instanceof TypeError) {
    return 'Could not reach Google Drive. Your data is safe on this device and will sync when you are back online.';
  }
  return e instanceof Error ? e.message : String(e);
}

// Reads the saved Google sign-in and keeps the state in step with it.
function readSession() {
  const s = getGoogleSession();
  if (s) {
    if (!state.signedIn || state.email !== s.email) setState({ signedIn: true, email: s.email });
  } else if (state.signedIn) {
    setState({
      signedIn: false,
      email: null,
      error: 'Your Google sign-in expired. Sign in again to keep syncing.',
    });
  }
  return s;
}

function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow(false);
  }, DEBOUNCE_MS);
}

function handleDataChanged() {
  dirty = true;
  const s = readSession();
  if (!s || state.paused) return; // signed out or paused: the change stays on this device
  scheduleSync();
}

async function runSync(manual: boolean) {
  const s = readSession();
  if (!s) {
    if (manual) setState({ error: 'Your Google sign-in expired. Please sign in again.' });
    return;
  }
  if (state.paused && !manual) return;

  setState({ syncing: true, error: null });
  try {
    const firstOnThisDevice = (await getSetting('last_sync_at')) === null;
    const id = await findBackupId(s.accessToken);

    let changed = 0;
    let addedExpenses = 0;
    let addedCategories = 0;
    if (id) {
      const remote = await downloadBackup(s.accessToken, id);
      const merged = await withoutChangeEvents(() => mergeBackup(remote));
      changed = merged.changed;
      addedExpenses = merged.addedExpenses;
      addedCategories = merged.addedCategories;
    }

    if (manual || dirty || !id) {
      dirty = false;
      const local = await exportBackup();
      await uploadBackup(s.accessToken, id, JSON.stringify(local));
    }

    const now = Date.now();
    await setSetting('last_sync_at', String(now));
    await deleteSetting('cloud_paused');

    let notice = state.notice;
    if (firstOnThisDevice) {
      if (addedExpenses + addedCategories > 0) {
        notice = {
          title: 'Welcome back! Your data is restored',
          body: `We found your backup in Google Drive and restored ${plural(
            addedExpenses,
            'expense',
            'expenses'
          )} and ${plural(
            addedCategories,
            'category',
            'categories'
          )} on this device. From now on, every change syncs automatically.`,
        };
      } else if (!id) {
        notice = {
          title: 'Backup started',
          body: 'Your data is now saved in your own Google Drive. From now on, every change syncs automatically.',
        };
      }
    }

    setState({
      syncing: false,
      paused: false,
      lastSync: now,
      notice,
      dataVersion: changed > 0 ? state.dataVersion + 1 : state.dataVersion,
    });
  } catch (e) {
    dirty = true;
    if (e instanceof DriveAuthError) {
      clearGoogleSession();
      setState({ syncing: false, signedIn: false, email: null, error: e.message });
    } else {
      setState({ syncing: false, error: friendly(e) });
    }
  }
}

// manual = true is the "Sync now" button: it also resumes a paused sync and always uploads.
export async function syncNow(manual = true): Promise<void> {
  if (running) {
    queued = true;
    return;
  }
  running = true;
  try {
    await runSync(manual);
  } finally {
    running = false;
    if (queued) {
      queued = false;
      scheduleSync();
    }
  }
}

// Removes the backup from Google Drive. Local data stays; auto-sync pauses until Sync now.
export async function deleteCloudData(): Promise<void> {
  const s = readSession();
  if (!s) {
    setState({ error: 'Your Google sign-in expired. Please sign in again, then try again.' });
    return;
  }
  if (running) return;
  running = true;
  setState({ syncing: true, error: null });
  try {
    const id = await findBackupId(s.accessToken);
    if (id) await deleteBackup(s.accessToken, id);
    await setSetting('cloud_paused', '1');
    await deleteSetting('last_sync_at');
    dirty = true;
    setState({
      syncing: false,
      paused: true,
      lastSync: null,
      notice: {
        title: 'Cloud backup deleted',
        body: 'Your backup was removed from Google Drive. Your data is still on this device. Auto-sync is paused: press "Sync now" to save it to Google Drive again. Other devices that are still signed in may upload their copy again.',
      },
    });
  } catch (e) {
    if (e instanceof DriveAuthError) {
      clearGoogleSession();
      setState({ syncing: false, signedIn: false, email: null, error: e.message });
    } else {
      setState({ syncing: false, error: friendly(e) });
    }
  } finally {
    running = false;
  }
}

// Call after the local data was erased: pauses auto-sync so the restore happens when you press Sync now.
export async function afterLocalErase(): Promise<void> {
  await setSetting('cloud_paused', '1');
  setState({ paused: true, lastSync: null, dataVersion: state.dataVersion + 1 });
}

// Signing out keeps the data on this device, but nothing is uploaded any more.
export function signOutSync() {
  clearGoogleSession();
  setState({ signedIn: false, email: null, error: null });
}

export function dismissNotice() {
  setState({ notice: null });
}

// Called once at app start (after the Google sign-in redirect was read).
export async function initSync(): Promise<void> {
  const g = globalThis as unknown as { __etrakSyncCleanup?: () => void };
  g.__etrakSyncCleanup?.();

  try {
    const last = await getSetting('last_sync_at');
    const paused = (await getSetting('cloud_paused')) === '1';
    setState({ lastSync: last ? Number(last) : null, paused });
  } catch {
    // database not ready: keep defaults
  }
  const session = readSession();

  const unsubscribe = onDataChanged(handleDataChanged);

  const tickSync = () => {
    const s = readSession();
    if (s && !state.paused && !state.syncing) void syncNow(false);
  };
  const interval = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    tickSync();
  }, POLL_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') tickSync();
  };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);

  g.__etrakSyncCleanup = () => {
    unsubscribe();
    clearInterval(interval);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisible);
    }
  };

  if (session && !state.paused) void syncNow(false);
}
