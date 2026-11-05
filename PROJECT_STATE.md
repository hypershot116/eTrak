# PROJECT_STATE.md

_Last updated: 2026-11-04 · Session #2_

## Project

eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code.

## Architecture & Tech Stack

- Monorepo: pnpm; apps/mobile, packages/shared
- App: Expo SDK 58 + Expo Router + TypeScript (src/app/), NativeWind v4 + Tailwind ^3.4.17, Zustand 5
- Theming: NativeWind darkMode "class"; accent via CSS variable --accent; theme_mode/theme_accent persisted in settings table (theme-store hydrate); web "system" mode resolved via matchMedia in theme-root.tsx. Do NOT use bg-accent inside react-native Modal on web: sheets are absolute overlays
- Tabs: native app-tabs.tsx (Expenses, Insights, Reports, Settings; extra tabs reuse explore.png icon) and web app-tabs.web.tsx (custom pill header, same four). Routes: index, insights, reports, explore (= Settings)
- Shared package: @etrak/shared (Zod: currency, category, expense). Category emoji is optional (`z.string().max(8)`; empty string = no emoji)
- Data layer (apps/mobile/src/db): expo-sqlite async API, plain SQL (NO Drizzle), Zod validation
  - migrations.ts; client.ts (getDb, newId, getDeviceId, change notifier: onDataChanged, withoutChangeEvents; runAsync is wrapped so any write to expenses/categories/main_currency announces a change; state kept on globalThis to survive hot reloads)
  - categories-repo.ts: listCategories(includeDeleted), createCategory(name, emoji = ''), updateCategory, softDeleteCategory, ensureDefaultCategories
  - expenses-repo.ts: createExpense, listExpenses, listExpensesInRange, updateExpense (incl. spentAt), softDeleteExpense (NO restoreExpense / listDeletedExpenses in code)
  - settings-repo.ts: getSetting, setSetting, deleteSetting. Keys: device_id, last_currency, main_currency, theme_mode, theme_accent, last_sync_at, cloud_paused
  - backup-repo.ts: exportBackup, mergeBackup (newer updated_at wins, soft deletes sync; removes unused duplicate starter categories; returns changed, skipped, addedExpenses, addedCategories), eraseLocalData
- Google sign-in + Drive sync (WEB ONLY for now): lib/google-auth.ts (OAuth implicit flow with same-tab redirect, token in sessionStorage, ~1h expiry, no refresh), lib/google-drive.ts (etrak-backup.json in hidden appDataFolder, scope drive.appdata; findBackupId, downloadBackup, uploadBackup, deleteBackup), lib/sync-engine.ts (state + useSyncState hook; auto-sync: 2.5 s after any change, every 2 min, and when the tab becomes visible; pull+merge first, push when dirty; syncNow(manual); deleteCloudData; afterLocalErase; signOutSync; dismissNotice; initSync called from _layout.tsx after captureGoogleRedirect), components/backup-panel.tsx (status, Sync now, Delete cloud backup, Erase data on this device, Sign out), components/sync-banner.tsx (one-time messages). Client ID in apps/mobile/.env as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (gitignored; baked in at build/start time; restart server after editing)
- UI: index.tsx = DAY view (selected day state YYYY-MM-DD; swipe left = previous day, swipe right = next day via PanResponder capture; arrows; calendar icon; Today button; sync status line under the title; SyncBanner; day total card ("Planned" for future days); small month total line; reloads on focus and when sync.dataVersion changes), expense-sheet.tsx (scrollable sheet; styled date block + calendar popup + Yesterday/Today/Tomorrow chips; any date incl. future; "+ New category" inline form with optional emoji; pressing Save expense with a typed new category name creates that category first and uses it; typing an existing name selects the existing category; hint line shows the target category), components/calendar-popup.tsx, components/icons.tsx (CalendarIcon), category-manager.tsx (reloads on sync.dataVersion), insights.tsx (react-native-svg donut + 6-month bars), reports.tsx + lib/report-html.ts (3 PDF styles), explore.tsx (Settings: ThemePanel, MainCurrency, CategoryManager, BackupPanel)
- Helpers: lib/currencies.ts, money.ts, emojis.ts, category-display.ts, dates.ts
- Production web: `pnpm exec expo export --platform web` then `node scripts/serve-web.mjs` (port 3000, sends COEP credentialless + COOP same-origin)
- Planned: Reanimated, FlashList; Hono + zod-openapi + Swagger API (also the route to a longer-lived Google sign-in); Android/iOS Google sign-in (needs dev build, native client IDs)

## Requested changes (Session #2 backlog, build in this order, one step at a time)

1. Day navigation + date UX [IMPLEMENTED, merged]
2. Instant categories + optional emoji [IMPLEMENTED, merged]. FIX delivered on the current branch: user reported an expense saved under Bills after typing a new category "Car Service" + emoji and pressing Save expense without pressing the form's Add button; Save expense now creates the typed category itself. Fix test checklist (6): Save-only creates and uses the category; Add then Save; no emoji shows dot; existing name reuses the category; empty form saves under the selected chip; hint line visible
3. Sync behaviour [IMPLEMENTED, awaiting user test of 9 checks]: signed out = local only; signed in = auto-sync; sign out keeps data but stops syncing; Delete cloud backup (auto-sync pauses until Sync now); restore message on the first sync of a device (counts); "Backup started" message when the first sync creates the cloud file. Checks: not-signed-in label; sign-in label; auto-sync on add/edit/delete; sign out stops sync; sign in again uploads offline change; erase + Sync now shows restore banner; delete cloud backup pauses and Sync now resumes; second profile restore (optional); no errors elsewhere
4. Welcome screen [CANCELLED by user: the app opens straight into the Expenses tab, no intro]
5. Futuristic look [IN PROGRESS]: Dark + Violet style (reference image: navy-black page, violet glow, gradient ring, glowing charts). DONE: free accent color (preset swatches + Custom color picker), Background styles (Midnight / Matched / Pure black), hexagon "e" logo component. TO DO: logo and glow on other screens, gradient ring for totals, glowing charts in Insights, card outlines. PARKED: replace hard-coded text-white on bg-accent with text-on-accent (tiny contrast fix, needs the grep list of text-white lines)

## Decisions

- Accent is a free hex color (theme_accent, old names like "indigo" still load). All accent-dependent colors (glow, tint, gradient, text-on-accent) are derived from it in lib/color.ts; deriveAccent(hex, mode). Accent now applies to the whole UI, not only text (reverses the earlier text-only plan)
- Background style setting theme_surface: midnight (navy, default), matched (tinted by accent), pure (black/white). Implemented by overriding Tailwind zinc-50..950 with CSS variables --z-* set in theme-root.tsx; any zinc class follows automatically
- Welcome screen cancelled

- Multi-device: per-record updated_at + deviceId, soft deletes; last write wins. A delete is a normal change and syncs
- Auto-sync always pulls and merges before it pushes, so it can never overwrite cloud data with an empty device. After "Delete cloud backup" or "Erase data on this device", auto-sync is paused (setting cloud_paused) until the user presses Sync now
- Deleting the cloud backup does not stop other devices that are still signed in from uploading their copy again (stated in the app)
- Web Google sign-in lasts about 1 hour (implicit flow, no refresh token): the app shows "sign-in expired" and the user taps Sign in again; data is never lost. A longer sign-in needs the planned Hono API server (auth-code flow with refresh token)
- Instant category creation: typing a category name in the sheet is enough; Save expense creates it. Typing an existing category name reuses it (no duplicate, no error)
- Multi-currency: totals, charts, reports are per currency until exchange rates exist
- Money as integer minor units; timestamps epoch ms
- Future-dated expenses are allowed and count in month totals, Insights and Reports
- Swipe direction: left swipe = previous day, right swipe = next day (user's choice)
- Category emoji is optional; empty emoji displays as a dot (•) and as just the name on chips; DB column stays TEXT NOT NULL (empty string)
- Backups live in each user's own Google Drive appDataFolder (no storage for us); Google sign-in only in v1 (no phone login)
- NO store release. Distribution plan: GitHub repository with full instructions (how to get the code and run it on any PC, requirements, setup), a version history (CHANGELOG.md: what each version introduced, SemVer starting v0.1.0), Android APK shared by Google Drive link
- iOS: an iPhone app cannot be installed from a Drive link without a paid Apple Developer account (signing). Free options: web version added to home screen (PWA), or the user builds it in Xcode on a Mac with a free Apple ID (expires every 7 days). Document this honestly in the GitHub instructions
- Free cloud hosting (Cloudflare Pages, static dist with a `_headers` file sending COEP credentialless + COOP same-origin; Direct Upload by dragging apps/mobile/dist into Workers & Pages > Pages; Cloudflare has announced Pages is being replaced by Workers, existing Pages keeps working, check the dashboard; add the hosted address to the Google OAuth client origins and redirect URIs; publish the consent screen) is DEFERRED until the Session #2 backlog is finished
- Charts: react-native-svg + plain Views
- Commits: Conventional Commits (Husky + commitlint). Git: main = stable, develop = integration, feat/* merged with `git merge --no-ff`. Run `git branch --show-current` before each commit
- Web limitation: only ONE browser tab can open the database at a time

## Known issues

- Earlier state file claimed "Recently deleted" and restoreExpense existed; they are NOT in the code (grep found nothing). Not a requested item. Check `git log --all --oneline -S"listDeletedExpenses"` to see if it lives on an unmerged branch
- Web "system" theme did not follow the browser's dark setting for the user (matchMedia fix unconfirmed)
- Dev server only: "Invalid VFS state" after hot reload or new dependency. Fix: close all localhost:8081 tabs, pkill -f chrome, wipe localhost:8081 at chrome://settings/content/all, reopen in ONE tab; press F5 after pasting files
- Google sign-in in Testing mode: only listed test users; sign-in expires after ~1h; fresh browsers may show duplicate starter categories until synced (merge cleans unused duplicates)
- Native tabs, PDF share flow and Android/iOS sign-in untested on a phone (Google sync is web only for now)
- Swipe gesture uses mouse drag on web (no trackpad two-finger swipe); arrows and calendar are the desktop alternatives
- Older app builds cannot read backups containing categories with an empty emoji
- Git history: some commits landed on develop directly; harmless

## Environment notes

- pnpm via `sudo npm install -g pnpm` (no corepack); do NOT run `pnpm dlx tailwindcss init`
- Start: `cd apps/mobile && pnpm start`, press w (open http://localhost:8081, NOT 127.0.0.1)
- ALWAYS run git commands and `cat > apps/mobile/...` blocks from the project root (prompt ends in ...Project1$)
- Two terminals: root (git, file blocks) and apps/mobile (server). Paste with Ctrl+Shift+V, one command or block at a time
- Git push over HTTPS needs a GitHub personal access token; `git config --global credential.helper store`
- After installing a dependency, editing .env or changing packages/shared: stop server, close all localhost tabs, restart, open ONE tab
- Reload in the BROWSER tab with F5
- Nothing edits project files automatically: every change is a terminal block, a python edit script (prints STOP and changes nothing if a target is not found), or a manual edit
- To share files with Claude: copy them into one text file with a single-line `cd ~/Desktop/Project/Project1/apps/mobile && { for f in ...; do if [ -f "$f" ]; then echo "=== $f ==="; cat "$f"; else echo "=== $f (missing) ==="; fi; done; } > ~/Desktop/name.txt` command and attach it in the chat (the file must be attached, creating it is not enough)

## Git

- Merged into develop: everything up to feat/google-backup, plus feat/hosting (public/_headers), feat/day-navigation, feat/instant-categories
- Current branch: feat/auto-sync (backlog item 3 files created; plus the instant-category fix in expense-sheet.tsx; commit the fix separately with a `fix:` message)

## Completed

- [x] Monorepo, theme system with persistence, shared schemas, SQLite data layer
- [x] Expense entry/edit/delete/date, categories, main currency, tab-lock banner
- [x] Web header, month filter and totals, day grouping
- [x] Insights charts, PDF reports, production web build server
- [x] Google sign-in + manual Drive sync (web), Erase local data
- [x] Backlog item 1: day view, swipe, calendar popup, styled date title, future dates
- [x] Backlog item 2: instant categories in the sheet, optional emoji (+ fix: Save expense creates the typed category)
- [x] Backlog item 3 code delivered: auto-sync, delete cloud backup, restore message, status line

## In Progress

- [ ] User tests the instant-category fix (6 checks) and commits it
- [ ] User tests backlog item 3 (9 checks), then commits and pushes feat/auto-sync

## Exact Next Steps

1. User checks Settings > Categories for "Car Service", runs the 6 fix checks, commits the fix
2. User runs the 9 auto-sync checks and reports; commit and push feat/auto-sync; merge into develop; create feat/welcome-screen
3. Backlog item 4 (welcome screen): user sends app-tabs.tsx and app-tabs.web.tsx
4. Backlog item 5 (futuristic look), last
5. Then: README with full setup instructions, CHANGELOG.md with version history (v0.1.0), Android APK via Google Drive link, iOS note
6. Then free cloud hosting (Cloudflare Pages), Hono API + Swagger UI (requirement #8), Android/iOS Google sign-in, real tab icons, exchange rates, FlashList
