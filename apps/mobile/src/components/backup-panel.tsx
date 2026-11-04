import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { eraseLocalData, exportBackup, mergeBackup } from '@/db/backup-repo';
import { getSetting, setSetting } from '@/db/settings-repo';
import {
  clearGoogleSession,
  getGoogleSession,
  googleClientId,
  googleSupported,
  startGoogleSignIn,
  type GoogleSession,
} from '@/lib/google-auth';
import { DriveAuthError, downloadBackup, findBackupId, uploadBackup } from '@/lib/google-drive';

export function BackupPanel() {
  const [session, setSession] = useState<GoogleSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [confirmErase, setConfirmErase] = useState(false);

  useEffect(() => {
    setSession(getGoogleSession());
    getSetting('last_sync_at')
      .then((v) => {
        if (v) setLastSync(Number(v));
      })
      .catch(() => {});
  }, []);

  const sync = async () => {
    const s = getGoogleSession();
    if (!s) {
      setSession(null);
      setError('Your sign-in expired. Please sign in again.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const id = await findBackupId(s.accessToken);
      let pulled = 0;
      if (id) {
        const remote = await downloadBackup(s.accessToken, id);
        pulled = (await mergeBackup(remote)).changed;
      }
      const local = await exportBackup();
      await uploadBackup(s.accessToken, id, JSON.stringify(local));
      const now = Date.now();
      await setSetting('last_sync_at', String(now));
      setLastSync(now);
      setMessage(
        `Done. ${pulled} ${pulled === 1 ? 'record' : 'records'} updated from Drive, ${
          local.categories.length + local.expenses.length
        } saved to Drive.`
      );
    } catch (e) {
      if (e instanceof DriveAuthError) {
        clearGoogleSession();
        setSession(null);
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const erase = async () => {
    if (!lastSync) return;
    if (!confirmErase) {
      setConfirmErase(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await eraseLocalData();
      setLastSync(null);
      setConfirmErase(false);
      setMessage('Data on this device erased. Press "Sync now" to bring it back from Google Drive.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    clearGoogleSession();
    setSession(null);
    setMessage(null);
    setError(null);
  };

  return (
    <View className="w-full gap-3">
      <Text className="text-lg font-semibold text-zinc-900 dark:text-white">Backup and sync</Text>

      {!googleSupported ? (
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          Google backup works on the web version for now. Phone support comes later.
        </Text>
      ) : !googleClientId ? (
        <Text className="text-sm text-red-500">
          Google client ID is missing. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to apps/mobile/.env and
          restart the server.
        </Text>
      ) : session ? (
        <>
          <Text className="text-sm text-zinc-600 dark:text-zinc-300">
            Signed in{session.email ? ` as ${session.email}` : ''}
          </Text>
          <Pressable
            onPress={sync}
            disabled={busy}
            className={`items-center rounded-2xl bg-accent py-3 ${busy ? 'opacity-50' : ''}`}
          >
            <Text className="font-semibold text-white">{busy ? 'Syncing...' : 'Sync now'}</Text>
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {lastSync ? `Last sync: ${new Date(lastSync).toLocaleString()}` : 'Not synced yet'}. Your
            data is saved in your own Google Drive, in a hidden folder only eTrak can use.
          </Text>
          <Pressable
            onPress={erase}
            disabled={busy || !lastSync}
            className={`items-center rounded-2xl py-3 ${
              confirmErase ? 'bg-red-500' : 'bg-red-500/15'
            } ${busy || !lastSync ? 'opacity-40' : ''}`}
          >
            <Text className={`font-semibold ${confirmErase ? 'text-white' : 'text-red-500'}`}>
              {confirmErase ? 'Tap again to erase' : 'Erase data on this device'}
            </Text>
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            Removes expenses and categories from this browser only. Your Google Drive backup stays.
            Works only after you have synced.
          </Text>
          <Pressable onPress={signOut} className="self-start">
            <Text className="text-sm text-zinc-500 underline dark:text-zinc-400">Sign out</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Pressable onPress={startGoogleSignIn} className="items-center rounded-2xl bg-accent py-3">
            <Text className="font-semibold text-white">Sign in with Google</Text>
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            Sign in to back up your expenses to your own Google Drive and restore them on another
            device.
          </Text>
        </>
      )}

      {message ? <Text className="text-sm text-accent">{message}</Text> : null}
      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
