# eTrak

An easy way to track your expenses. eTrak runs in the browser, on Android and on iPhone from a single code base. Your data is stored on your own device, and you can optionally back it up to your own Google Drive.

## Features

- Fast expense entry: amount, currency, category, note and any date, past or future
- Day-by-day view: swipe or use the arrows, jump anywhere with the calendar
- Your own categories, created on the spot while adding an expense (emoji optional)
- Many currencies; totals are shown per currency
- Insights: category donut chart and month-by-month bars
- PDF reports with a date range and layout styles
- Dark, light or system mode, a free accent color and background styles
- Works offline. Optional Google sign-in: automatic backup and sync to a hidden folder in your own Google Drive, and restore on a new device

## Try it

Links are added here when each version is published.

- Web: coming soon
- Android (APK): coming soon
- iPhone: open the web link in Safari, tap Share, then "Add to Home Screen" (a native iPhone file cannot be shared by link without a paid Apple Developer account)

## Run it on your own computer

### What you need

- Git
- Node.js 22 LTS or newer (https://nodejs.org)
- pnpm: run `npm install -g pnpm` (on Linux or macOS you may need `sudo` in front)

### Steps

```bash
git clone https://github.com/hypershot116/eTrak.git
cd eTrak
pnpm install
cd apps/mobile
cp .env.example .env      # optional: only needed for Google sign-in (Windows: copy .env.example .env)
pnpm start
```

Then:

- Press `w` to open the web version, or open http://localhost:8081 yourself (use `localhost`, not `127.0.0.1`).
- On a phone, install the Expo Go app and scan the QR code shown in the terminal (phone and computer on the same Wi-Fi).

Web tip: eTrak can be open in only one browser tab at a time. If you see an "Access Handle" error, close the other tabs and reload.

### Optional: turn on Google backup and sync

1. Open https://console.cloud.google.com and create a project.
2. Enable the Google Drive API for it.
3. Set up the OAuth consent screen (External). Add the scope `https://www.googleapis.com/auth/drive.appdata`, and add your Google account as a test user while the app is in Testing mode.
4. Create an OAuth client ID of type "Web application". Add `http://localhost:8081` under both "Authorized JavaScript origins" and "Authorized redirect URIs".
5. Copy the client ID into `apps/mobile/.env` as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
6. Stop the server, start it again (`pnpm start`) and open a fresh tab.

eTrak only asks for the hidden app-data folder. It cannot see your other Drive files.

## Everyday commands (run in `apps/mobile`)

| Command | What it does |
|---|---|
| `pnpm start` | Start the app in development |
| `pnpm exec expo start --clear` | Start with an empty cache (after changing config files) |
| `pnpm exec expo export --platform web` | Build the website into `dist` |
| `node scripts/serve-web.mjs` | Serve the built website on http://localhost:3000 |

## Project layout

```
apps/mobile/        the app (Expo, React Native, TypeScript, NativeWind)
  src/app/          screens: Expenses, Insights, Reports, Settings
  src/components/   shared interface pieces
  src/db/           local SQLite database and sync-ready repositories
  src/lib/          dates, money, Google sign-in, Drive and sync engine
  src/theme/        light/dark mode, accent color, background styles
packages/shared/    shared Zod rules for expenses, categories and currencies
```

## How your data is stored

- On your device, in a local SQLite database. Nothing is sent anywhere unless you sign in.
- After signing in with Google, changes are saved to a hidden app folder in your own Google Drive within a few seconds. Signing out keeps your data on the device but stops saving it to Drive.
- Money is stored as whole minor units (for example cents), so there are no rounding errors.

## Known limitations

- Google backup and sync works on the web version for now. The Android app gets it in a later version.
- On the web, the Google sign-in lasts about an hour. The app then asks you to sign in again. Your data is never lost.
- Totals, charts and reports are shown per currency until exchange rates are added.
- Only one browser tab can use the database at a time.

## Versions

See [CHANGELOG.md](CHANGELOG.md) for what each version introduced.

## Contributing

- Commit messages follow Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`.
- Branches: `main` holds stable releases, `develop` collects finished work, and `feat/...` branches hold work in progress.
