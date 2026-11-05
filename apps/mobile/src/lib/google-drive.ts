const FILE_NAME = 'etrak-backup.json';
const API = 'https://www.googleapis.com';

export class DriveAuthError extends Error {}

async function call(token: string, url: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) ?? {}),
    Authorization: `Bearer ${token}`,
  };
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) throw new DriveAuthError('Your Google sign-in expired. Please sign in again.');
  if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

export async function findBackupId(token: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}'`);
  const res = await call(
    token,
    `${API}/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`
  );
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

export async function downloadBackup(token: string, id: string): Promise<unknown> {
  const res = await call(token, `${API}/drive/v3/files/${id}?alt=media`);
  return res.json();
}

// Updates the file if it exists, otherwise creates it in the hidden app folder.
export async function uploadBackup(token: string, id: string | null, content: string) {
  if (id) {
    await call(token, `${API}/upload/drive/v3/files/${id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: content,
    });
    return;
  }
  const boundary = `etrak${Math.random().toString(36).slice(2)}`;
  const meta = JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
  await call(token, `${API}/upload/drive/v3/files?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

// Removes the backup file from the hidden app folder in the user's Google Drive.
export async function deleteBackup(token: string, id: string) {
  await call(token, `${API}/drive/v3/files/${id}`, { method: 'DELETE' });
}
