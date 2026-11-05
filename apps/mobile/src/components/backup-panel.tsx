import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SyncBanner } from '@/components/sync-banner';
import { eraseLocalData } from '@/db/backup-repo';
import { googleClientId, googleSupported, startGoogleSignIn } from '@/lib/google-auth';
import {
  afterLocalErase,
  deleteCloudData,
  signOutSync,
  syncNow,
  useSyncState,
} from '@/lib/sync-engine';

export function BackupPanel() {
  const sync = useSyncState();
  const [confirmErase, setConfirmErase] = useState(false);
  const [confirmCloud, setConfirmCloud] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = sync.syncing;

  const erase = async () => {
    if (!sync.lastSync) return;
    if (!confirmErase) {
      setConfirmErase(true);
      return;
    }
    try {
      setLocalError(null);
      await eraseLocalData();
      await afterLocalErase();
      setConfirmErase(false);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : String(e));
    }
  };

  const removeCloud = async () => {
    if (!confirmCloud) {
      setConfirmCloud(true);
      return;
    }
    setConfirmCloud(false);
    await deleteCloudData();
  };

  const error = localError ?? sync.error;

  return (
    <View className="w-full gap-3">
      <Text className="text-lg font-semibold text-zinc-900 dark:text-white">Backup and sync</Text>

      <SyncBanner />

      {!googleSupported ? (
        <Text className="text-sm text-zinc-500 dark:text-zinc-400">
          Google backup works on the web version for now. Phone support comes later.
        </Text>
      ) : !googleClientId ? (
        <Text className="text-sm text-red-500">
          Google client ID is missing. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to apps/mobile/.env and
          restart the server.
        </Text>
      ) : sync.signedIn ? (
        <>
          <Text className="text-sm text-zinc-600 dark:text-zinc-300">
            Signed in{sync.email ? ` as ${sync.email}` : ''}
          </Text>
          <Text className="text-sm text-zinc-700 dark:text-zinc-300">
            {sync.paused
              ? 'Auto-sync is paused. Press "Sync now" to turn it back on.'
              : 'Auto-sync is on. Every change is saved to your Google Drive a moment after you make it.'}
          </Text>
          <Pressable
            onPress={() => syncNow(true)}
            disabled={busy}
            className={`items-center rounded-2xl bg-accent py-3 ${busy ? 'opacity-50' : ''}`}
          >
            <Text className="font-semibold text-white">{busy ? 'Syncing...' : 'Sync now'}</Text>
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            {sync.lastSync ? `Last sync: ${new Date(sync.lastSync).toLocaleString()}` : 'Not synced yet'}
            . Your data is saved in your own Google Drive, in a hidden folder only eTrak can use.
          </Text>

          <Pressable
            onPress={removeCloud}
            disabled={busy}
            className={`items-center rounded-2xl py-3 ${
              confirmCloud ? 'bg-red-500' : 'bg-red-500/15'
            } ${busy ? 'opacity-40' : ''}`}
          >
            <Text className={`font-semibold ${confirmCloud ? 'text-white' : 'text-red-500'}`}>
              {confirmCloud ? 'Tap again to delete cloud backup' : 'Delete cloud backup'}
            </Text>
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            Removes your backup from Google Drive. Your data on this device stays, and auto-sync
            pauses until you press "Sync now".
          </Text>

          <Pressable
            onPress={erase}
            disabled={busy || !sync.lastSync}
            className={`items-center rounded-2xl py-3 ${
              confirmErase ? 'bg-red-500' : 'bg-red-500/15'
            } ${busy || !sync.lastSync ? 'opacity-40' : ''}`}
          >
            <Text className={`font-semibold ${confirmErase ? 'text-white' : 'text-red-500'}`}>
              {confirmErase ? 'Tap again to erase' : 'Erase data on this device'}
            </Text>
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            Removes expenses and categories from this browser only. Your Google Drive backup stays.
            Works only after you have synced. Press "Sync now" afterwards to bring everything back.
          </Text>

          <Pressable onPress={signOutSync} className="self-start">
            <Text className="text-sm text-zinc-500 underline dark:text-zinc-400">Sign out</Text>
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            Signing out keeps your data on this device, but it is no longer saved to Google Drive.
          </Text>
        </>
      ) : (
        <>
          <Pressable onPress={startGoogleSignIn} className="items-center rounded-2xl bg-accent py-3">
            <Text className="font-semibold text-white">
              {sync.error ? 'Sign in again with Google' : 'Sign in with Google'}
            </Text>
          </Pressable>
          <Text className="text-xs text-zinc-500 dark:text-zinc-400">
            You are not signed in, so your expenses are saved on this device only. Sign in to save
            them in your own Google Drive. After that, every change syncs automatically, and you can
            restore everything on another device.
          </Text>
        </>
      )}

      {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
    </View>
  );
}
