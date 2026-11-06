# PROJECT_STATE.md

_Last updated: 2026-11-06 · Session #3 (handoff to a new AI account)_

## HOW TO RESUME (read first)

- This file is the single source of truth. A new AI instance has no memory of earlier chats: read this file, then the handoff text files (00-START-HERE-prompt.txt, 01-requirements-status.txt, 02-working-agreement-and-lessons.txt, 03-roadmap-and-pending-steps.txt, 04-problems-solved.txt) and the code snapshots (code-1 to code-4, git-and-tree.txt) that the owner attaches.
- The owner says "Next" to continue and "begin" in a new chat to resume from here.
- FIRST THING TO DO: ask the owner to run these in the project root and paste the output: `cd ~/Desktop/Project/Project1`, `git branch --show-current`, `git status --short`, `git --no-pager log --oneline -6`, `ls README.md apps/mobile/.env.example`. Do not write code before seeing it.
- Rules: start every reply with "Your message, in professional wording:" + the owner's message rewritten professionally; end every state-changing reply with the FULL updated PROJECT_STATE.md; one step at a time; never rewrite a file you have not seen; be honest about limits.

## Project

eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code. OS: Ubuntu Linux. Owner is a beginner with the terminal and Git.
Current version: 0.4.0 in CHANGELOG.md, BUT the version fields in package.json files and app.json are still 1.0.0 (alignment pending). Release tag v0.4.0 is created after the Android phone test.
Original brief: "Expense Tracker project Primary instructions.txt" in the repository root.

## Architecture & Tech Stack

- Monorepo: pnpm; apps/mobile, packages/shared
- App: Expo SDK 58 + Expo Router + TypeScript (src/app/), NativeWind v4 + Tailwind ^3.4.17, Zustand 5
- Theming: NativeWind darkMode "class"; accent via CSS variable --accent; theme_mode/theme_accent/theme_surface persisted in settings table (theme-store hydrate); web "system" mode resolved via matchMedia in theme-root.tsx. Do NOT use bg-accent inside react-native Modal on web: sheets are absolute overlays
- Tabs: native app-tabs.tsx (Expenses, Insights, Reports, Settings; extra tabs reuse explore.png icon) and web app-tabs.web.tsx (custom pill header, same four). Routes: index, insights, reports, explore (= Settings)
- Shared package: @etrak/shared (Zod: currency, category, expense). Category emoji is optional (`z.string().max(8)`; empty string = no emoji)
- Data layer (apps/mobile/src/db): expo-sqlite async API, plain SQL (NO Drizzle), Zod validation
  - migrations.ts; client.ts (getDb, newId, getDeviceId, change notifier: onDataChanged, withoutChangeEvents; runAsync is wrapped so any write to expenses/categories/main_currency announces a change; state kept on globalThis to survive hot reloads)
  - categories-repo.ts: listCategories(includeDeleted), createCategory(name, emoji = ''), updateCategory, softDeleteCategory, ensureDefaultCategories
  - expenses-repo.ts: createExpense, listExpenses, listExpensesInRange, updateExpense (incl. spentAt), softDeleteExpense (NO restoreExpense / listDeletedExpenses in code)
  - settings-repo.ts: getSetting, setSetting, deleteSetting. Keys: device_id, last_currency, main_currency, theme_mode, theme_accent, theme_surface, last_sync_at, cloud_paused
  - backup-repo.ts: exportBackup, mergeBackup (newer updated_at wins, soft deletes sync; removes unused duplicate starter categories; returns changed, skipped, addedExpenses, addedCategories), eraseLocalData
- Google sign-in + Drive sync (WEB ONLY for now): lib/google-auth.ts (OAuth implicit flow with same-tab redirect, token in sessionStorage, ~1h expiry, no refresh), lib/google-drive.ts (etrak-backup.json in hidden appDataFolder, scope drive.appdata; findBackupId, downloadBackup, uploadBackup, deleteBackup), lib/sync-engine.ts (state + useSyncState hook; auto-sync: 2.5 s after any change, every 2 min, and when the tab becomes visible; pull+merge first, push when dirty; syncNow(manual); deleteCloudData; afterLocalErase; signOutSync; dismissNotice; initSync called from _layout.tsx after captureGoogleRedirect), components/backup-panel.tsx (status, Sync now, Delete cloud backup, Erase data on this device, Sign out), components/sync-banner.tsx (one-time messages). Client ID in apps/mobile/.env as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (gitignored; baked in at build/start time; restart server after editing). NEVER ask the owner to share .env or tokens
- UI: index.tsx = DAY view (selected day YYYY-MM-DD; swipe left = previous day, swipe right = next day via PanResponder capture; arrows; calendar icon; Today button; sync status line under the title; SyncBanner; day total card with gradient progress ring ("Planned" for future days); small month total line; reloads on focus and when sync.dataVersion changes), expense-sheet.tsx (scrollable sheet; styled date block + calendar popup + Yesterday/Today/Tomorrow chips; any date incl. future; "+ New category" inline form with optional emoji; Save expense with a typed new category name creates that category first and uses it; typing an existing name selects the existing category), components/calendar-popup.tsx, components/icons.tsx, category-manager.tsx (reloads on sync.dataVersion), main-currency.tsx, db-error-banner.tsx (tab-lock / database error banner), insights.tsx (react-native-svg donut + 6-month bars, accent-derived glow/gradients), reports.tsx + lib/report-html.ts (3 PDF styles; web = hidden iframe print dialog, native = expo-print + expo-sharing), explore.tsx (Settings: ThemePanel with accent swatches + custom color picker + background styles, MainCurrency, CategoryManager, BackupPanel). A hexagon "e" logo component exists (file name: see code snapshot)
- Look: Dark + Violet futuristic style, hexagon "e" logo, glow on cards and the add button; lib/color.ts deriveAccent(hex, mode); Tailwind zinc-50..950 overridden by CSS variables --z-* set in theme-root.tsx
- Helpers: lib/currencies.ts, money.ts, emojis.ts, category-display.ts, dates.ts, color.ts
- Production web: `pnpm exec expo export --platform web` then `node scripts/serve-web.mjs` (port 3000, sends COEP credentialless + COOP same-origin). apps/mobile/public/_headers carries the same headers for hosting
- Docs: CHANGELOG.md EXISTS on develop (Keep a Changelog; versions 0.1.0 to 0.4.0; 0.4.0 dated 2026-11-05; DO NOT overwrite it). README.md and apps/mobile/.env.example are PREPARED but NOT yet in the repository: they are in the handoff folder (pending/README.md, pending/env.example, pending/apply-changelog-and-versions.py) with exact apply commands in 03-roadmap-and-pending-steps.txt section A
- Planned: Reanimated, FlashList; Hono + zod-openapi + Swagger API (Cloudflare Worker; also the route to a longer-lived Google sign-in and a rates endpoint); Android Google sign-in (needs a development/production build, Android OAuth client + SHA-1)

## Original requirements status (details in 01-requirements-status.txt)

- DONE: unified codebase, responsive web, dark/light + accent, entry sheet, full CRUD, custom categories, dashboard charts, PDF reports, Google OAuth (web), Option A storage (web), Conventional Commits, feature branches, SemVer history, PROJECT_STATE.md
- NOT DONE: REST API with Swagger UI, free cloud deployment, Android/iOS Google backup, automated CHANGELOG, 60 fps measurement, exchange rates
- DROPPED: phone-number SMS OTP (costs money), welcome screen (cancelled by owner)

## Release roadmap (do in this order, one step at a time; details in 03-roadmap-and-pending-steps.txt)

1. Verify git state (FIRST THING TO DO above)
2. Finish docs: README + .env.example + version alignment 0.4.0 on branch docs/readme (prepared, not applied)
3. Web quick test (9 checks) and Android Expo Go phone test (9 checks); fix failures
4. Release tag v0.4.0 on main
5. Free web hosting (Cloudflare Pages Direct Upload or Workers static assets: check the dashboard, Pages is being replaced by Workers) + Google OAuth origins/redirects for the hosted address + publish consent screen + PWA install files (iPhone: Add to Home Screen) [version 0.5.0]
6. Android APK for a Google Drive link (EAS Build preview profile, apk; owner chooses the android package name) [0.6.0]
7. Android Google sign-in + sync (Android OAuth client with SHA-1; native sign-in library)
8. API with Swagger UI on a Cloudflare Worker (/health, /auth/google, /rates, /docs)
9. Exchange rates: rateToMain per expense, main-currency totals everywhere
10. Polish: budget ring, FlashList, tab icons, card polish, text-on-accent, release-please, 60 fps measurement

## Decisions

- Expenses ring shows the day total as a share of the month (same currency). Parked idea: per-currency monthly budget setting (synced), or compare the day with the daily average
- Accent is a free hex color (theme_accent, old names like "indigo" still load). Accent-dependent colors (glow, tint, gradient, text-on-accent) derive from it in lib/color.ts. The accent applies to the whole UI, not only text (reverses an earlier text-only plan)
- Background style theme_surface: midnight (navy, default), matched (tinted by accent), pure (black/white), via CSS variables --z-* overriding Tailwind zinc-50..950
- Multi-device: per-record updated_at + deviceId, soft deletes; last write wins. A delete is a normal change and syncs
- Auto-sync always pulls and merges before it pushes, so it can never overwrite cloud data with an empty device. After "Delete cloud backup" or "Erase data on this device", auto-sync is paused (setting cloud_paused) until the owner presses Sync now
- Deleting the cloud backup does not stop other devices that are still signed in from uploading their copy again (stated in the app)
- Web Google sign-in lasts about 1 hour (implicit flow, no refresh token): the app shows "sign-in expired" and the user signs in again; data is never lost. A longer sign-in needs the API server (auth-code flow with refresh token); Android can use the native library
- Instant category creation: typing a category name in the sheet is enough; Save expense creates it. Typing an existing name reuses it
- Multi-currency: totals, charts, reports are per currency until exchange rates exist
- Money as integer minor units; timestamps epoch ms; future-dated expenses allowed and counted in month totals, Insights and Reports
- Swipe direction (owner's choice): left swipe = previous day, right swipe = next day
- Category emoji is optional; empty emoji displays as a dot (•) and as just the name on chips; DB column stays TEXT NOT NULL (empty string)
- Backups live in each user's own Google Drive appDataFolder (no storage for us); Google sign-in only (no phone/SMS login)
- NO store release. Distribution: GitHub repository with README, CHANGELOG version history, Android APK shared by a Google Drive link, hosted web version + "Add to Home Screen" for iPhone
- iOS: a native iPhone app cannot be installed from a Drive link without a paid Apple Developer account ($99 a year). Free options: the hosted web version added to the home screen, or building in Xcode on a Mac with a free Apple ID (expires every 7 days). State this honestly in docs
- Until Android Google sign-in exists, the Android app works offline without Google backup (say so in README and the APK instructions)
- Charts: react-native-svg + plain Views
- Commits: Conventional Commits (Husky + commitlint). Git: main = stable, develop = integration, feat/* and docs/* merged with `git merge --no-ff`. Run `git branch --show-current` before each commit. Release tag on main: `git checkout main`, `git merge --no-ff develop -m "chore: release vX.Y.Z"`, `git tag -a vX.Y.Z -m "eTrak X.Y.Z"`, `git push origin main --tags`, `git checkout develop`. For each release update the version in root package.json, apps/mobile/package.json and apps/mobile/app.json
- Web limitation: only ONE browser tab can open the database at a time

## Known issues

- Earlier state file claimed "Recently deleted" and restoreExpense existed; they are NOT in the code. Not a requested item (soft deletes exist but no restore UI)
- Web "system" theme did not follow the browser's dark setting for the owner (matchMedia fix unconfirmed)
- Dev server only: "Invalid VFS state" or "createSyncAccessHandle ... another open Access Handle" after hot reload, new dependency or a second tab. Fix: close all localhost:8081 tabs, `pkill -f chrome`, wipe localhost:8081 at chrome://settings/content/all, reopen in ONE tab; press F5 after pasting files
- Google sign-in in Testing mode: only listed test users; sign-in expires after ~1h; fresh browsers may show duplicate starter categories until synced (merge cleans unused duplicates)
- Native tabs, PDF share flow, haptics and SQLite on a real phone are UNTESTED (Google sync is web only)
- The web quick test (9 checks) and the Android phone test (9 checks) have never been reported by the owner
- Swipe on web uses mouse drag (no trackpad two-finger swipe); arrows and calendar are the desktop alternatives
- Older app builds cannot read backups containing categories with an empty emoji
- Git: branches feat/expense-entry and main show as "not merged into develop" (harmless: old branch / release branch). Some commits landed on develop directly

## Environment notes

- pnpm via `sudo npm install -g pnpm` (NOT corepack); do NOT run `pnpm dlx tailwindcss init`
- Start: `cd apps/mobile && pnpm start`, press w (open http://localhost:8081, NOT 127.0.0.1). Use `pnpm exec expo start --clear` ONLY after changing config files
- Phone testing: Expo Go + QR code on the same Wi-Fi; fallback `pnpm exec expo start --tunnel`
- ALWAYS run git commands and `cat > apps/mobile/...` blocks from the project root (prompt ends in ...Project1$). Server runs in apps/mobile
- Two terminals: root (git, file blocks) and apps/mobile (server). Paste with Ctrl+Shift+V, one command or block at a time
- Git push over HTTPS needs a GitHub personal access token; `git config --global credential.helper store`
- After installing a dependency, editing .env or changing packages/shared: stop the server, close all localhost tabs, restart, open ONE tab. Reload in the BROWSER tab with F5 (F5 in VS Code starts the debugger)
- Nothing edits project files automatically: every change is a terminal block (cat heredoc), a python edit script (prints STOP and changes nothing if a target is not found), or a manual edit
- To share files with the AI: single-line command that writes a text file on the Desktop, then ATTACH it: `cd ~/Desktop/Project/Project1/apps/mobile && { for f in ...; do if [ -f "$f" ]; then echo "=== $f ==="; cat "$f"; else echo "=== $f (missing) ==="; fi; done; } > ~/Desktop/name.txt`
- Git pager: press q to leave the ":" / "(END)" viewer; `git config --global core.pager cat` disables it

## Git

- Last known: branch develop at commit cfb0a9a "merge futuristic look, auto-sync and changelog into develop"; working tree clean; local branch docs/readme-changelog (merged) exists. Branch docs/readme (README work) may not exist yet
- develop contains: scaffold, theme, shared schemas, data layer, day navigation, instant categories (+ fix), auto-sync, futuristic look, CHANGELOG
- main still holds only the first commit until the release tag

## Completed

- [x] Monorepo, theme system with persistence, shared schemas, SQLite data layer
- [x] Expense entry/edit/delete/date, categories, main currency, tab-lock banner
- [x] Web header, month filter and totals, day grouping
- [x] Insights charts, PDF reports, production web build server
- [x] Google sign-in + Drive sync (web), Erase local data
- [x] Day view, swipe, calendar popup, styled date title, future dates
- [x] Instant categories in the sheet, optional emoji, Save expense creates the typed category
- [x] Auto-sync, delete cloud backup, restore message, status line
- [x] Dark + Violet futuristic look, free accent color, background styles
- [x] CHANGELOG.md with version history (on develop)
- [x] Handoff package created (this file + text files + code snapshots)

## In Progress

- [ ] Apply the prepared README, .env.example and version alignment (03-roadmap-and-pending-steps.txt section A)
- [ ] Web quick test (9 checks) and Android Expo Go test (9 checks): results unreported

## Exact Next Steps

1. New AI reads this file and the handoff files; asks the owner for the FIRST THING TO DO outputs
2. Apply docs (section A), then run the web and Android tests and fix failures
3. Tag v0.4.0 on main
4. Roadmap steps 5 to 10 in order (hosting + PWA, Android APK, Android sign-in, API with Swagger, exchange rates, polish)
