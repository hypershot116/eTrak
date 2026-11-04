# PROJECT_STATE.md

_Last updated: 2026-11-04 · Session #1_

## Project

eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code.

## Architecture & Tech Stack

- Monorepo: pnpm; apps/mobile, packages/shared
- App: Expo SDK 58 + Expo Router + TypeScript (src/app/), NativeWind v4 + Tailwind ^3.4.17, Zustand 5
- Theming: NativeWind darkMode "class"; accent via CSS variable --accent; theme_mode/theme_accent persisted in settings table (theme-store hydrate); web "system" mode resolved via matchMedia in theme-root.tsx. Do NOT use bg-accent inside react-native Modal on web: sheets are absolute overlays
- Tabs: native app-tabs.tsx (Expenses, Insights, Reports, Settings; extra tabs reuse explore.png icon) and web app-tabs.web.tsx (custom pill header, same four). Routes: index, insights, reports, explore (= Settings)
- Shared package: @etrak/shared (Zod: currency, category, expense)
- Data layer (apps/mobile/src/db): expo-sqlite async API, plain SQL (NO Drizzle), Zod validation
  - migrations.ts, client.ts (getDb, newId, getDeviceId)
  - categories-repo.ts: listCategories(includeDeleted), createCategory, updateCategory, softDeleteCategory, ensureDefaultCategories
  - expenses-repo.ts: createExpense, listExpenses, listExpensesInRange, updateExpense (incl. spentAt), softDeleteExpense, listDeletedExpenses, restoreExpense
  - settings-repo.ts keys: device_id, last_currency, main_currency, theme_mode, theme_accent, last_sync_at
  - backup-repo.ts: exportBackup, mergeBackup (newer updated_at wins, soft deletes sync; removes unused duplicate starter categories), eraseLocalData
- Google sign-in + Drive sync (WEB ONLY for now): lib/google-auth.ts (OAuth implicit flow with same-tab redirect, token in sessionStorage, ~1h expiry, no refresh), lib/google-drive.ts (etrak-backup.json in hidden appDataFolder, scope drive.appdata), components/backup-panel.tsx (Sign in, Sync now = pull+merge then push, Erase data on this device, Sign out), components/recently-deleted.tsx. captureGoogleRedirect() runs in _layout.tsx. Client ID in apps/mobile/.env as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (gitignored; baked in at build/start time; restart server after editing)
- UI: index.tsx (month nav, per-currency totals, list grouped by day), expense-sheet.tsx, insights.tsx (react-native-svg donut + 6-month bars), reports.tsx + lib/report-html.ts (3 PDF styles; web = hidden iframe print dialog, native = expo-print + expo-sharing), explore.tsx (Settings: ThemePanel, MainCurrency, CategoryManager, BackupPanel, RecentlyDeleted)
- Helpers: lib/currencies.ts, money.ts, emojis.ts, dates.ts
- Production web: `pnpm exec expo export --platform web` then `node scripts/serve-web.mjs` (port 3000, sends COEP credentialless + COOP same-origin)
- Planned: Reanimated, FlashList; Hono + zod-openapi + Swagger API; Android/iOS Google sign-in (needs dev build, native client IDs); static web hosting

## Decisions

- Multi-device: per-record updated_at + deviceId, soft deletes; last write wins. A delete is a normal change and syncs (deleting while signed out then syncing overwrites the Drive copy). Use "Erase data on this device" to test restore, not manual deletes
- Multi-currency: totals, charts, reports are per currency until exchange rates exist
- Money as integer minor units; timestamps epoch ms
- Backups live in each user's own Google Drive appDataFolder (no storage for us); Google sign-in only in v1 (no phone login)
- Hosting plan: Cloudflare Pages (free), static `dist` with a `_headers` file sending COEP credentialless + COOP same-origin (GitHub Pages cannot send custom headers). Add the hosted https address to the Google OAuth client origins and redirect URIs, then publish the consent screen so other users can sign in
- Distribution: GitHub releases (Android APK) + PWA for iOS testing; store release later
- Charts: react-native-svg + plain Views
- Commits: Conventional Commits (Husky + commitlint). Git: main = stable, develop = integration, feat/* merged with `git merge --no-ff`. Run `git branch --show-current` before each commit
- Web limitation: only ONE browser tab can open the database at a time

## Known issues

- Drive restore round trip (Sync, Erase, Sync) not yet confirmed by the user
- Web "system" theme did not follow the browser's dark setting for the user (matchMedia fix unconfirmed)
- Dev server only: "Invalid VFS state" after hot reload or new dependency. Fix: close all localhost:8081 tabs, pkill -f chrome, wipe localhost:8081 at chrome://settings/content/all, reopen in ONE tab; press F5 after pasting files
- Google sign-in in Testing mode: only listed test users; sign-in expires after ~1h; fresh browsers may show duplicate starter categories until synced (merge cleans unused duplicates)
- Native tabs, PDF share flow and Android/iOS sign-in untested on a phone
- Git history: some commits landed on develop directly; harmless

## Environment notes

- pnpm via `sudo npm install -g pnpm` (no corepack); do NOT run `pnpm dlx tailwindcss init`
- Start: `cd apps/mobile && pnpm start`, press w (open http://localhost:8081, NOT 127.0.0.1)
- ALWAYS run git commands and `cat > apps/mobile/...` blocks from the project root (prompt ends in ...Project1$)
- Two terminals: root (git, file blocks) and apps/mobile (server). Paste with Ctrl+Shift+V
- Git push over HTTPS needs a GitHub personal access token; `git config --global credential.helper store`
- After installing a dependency or editing .env: stop server, close all localhost tabs, restart, open ONE tab
- Reload in the BROWSER tab with F5
- Nothing edits project files automatically: every change is a terminal block or manual edit

## Git

- Merged into develop: everything up to feat/google-backup
- Current branch: feat/hosting

## Completed

- [x] Monorepo, theme system with persistence, shared schemas, SQLite data layer
- [x] Expense entry/edit/delete/date, categories with emoji, main currency, tab-lock banner
- [x] Web header, month filter and totals, day grouping
- [x] Insights charts, PDF reports, production web build server
- [x] Google sign-in + Drive sync (web), Recently deleted, Erase local data

## In Progress

- [ ] feat/hosting: public/_headers, Cloudflare Pages deploy, add hosted URL to Google client

## Exact Next Steps

1. Deploy to Cloudflare Pages; add hosted URL to Google OAuth client; test sign-in on the hosted site
2. Hono API + Swagger UI (requirement #8)
3. Publish OAuth consent screen (check drive.appdata verification needs)
4. Android/iOS: dev build, native Google client IDs, test tabs, PDF share, haptics
5. Real tab icons, bar chart amounts, exchange rates, FlashList, CHANGELOG, v0.1.0
