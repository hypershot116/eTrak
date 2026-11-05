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
  - migrations.ts, client.ts (getDb, newId, getDeviceId)
  - categories-repo.ts: listCategories(includeDeleted), createCategory(name, emoji = ''), updateCategory, softDeleteCategory, ensureDefaultCategories
  - expenses-repo.ts: createExpense, listExpenses, listExpensesInRange, updateExpense (incl. spentAt), softDeleteExpense, listDeletedExpenses, restoreExpense
  - settings-repo.ts keys: device_id, last_currency, main_currency, theme_mode, theme_accent, last_sync_at
  - backup-repo.ts: exportBackup, mergeBackup (newer updated_at wins, soft deletes sync; removes unused duplicate starter categories), eraseLocalData
- Google sign-in + Drive sync (WEB ONLY for now): lib/google-auth.ts (OAuth implicit flow with same-tab redirect, token in sessionStorage, ~1h expiry, no refresh), lib/google-drive.ts (etrak-backup.json in hidden appDataFolder, scope drive.appdata), components/backup-panel.tsx (Sign in, Sync now = pull+merge then push, Erase data on this device, Sign out), a "Recently deleted" panel (file name to be confirmed; src/components/recently-deleted.tsx does not exist). captureGoogleRedirect() runs in _layout.tsx. Client ID in apps/mobile/.env as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (gitignored; baked in at build/start time; restart server after editing)
- UI: index.tsx = DAY view (selected day state YYYY-MM-DD; swipe left = previous day, swipe right = next day via PanResponder capture; arrows; calendar icon; Today button; day total card ("Planned" for future days); small month total line; loads the viewed month with listExpensesInRange and filters the day in memory; passes onCategoriesChanged={refresh} to the sheet), expense-sheet.tsx (scrollable sheet; styled date block with weekday in accent color + calendar popup + Yesterday/Today/Tomorrow chips; initialDate prop; any date allowed incl. future; onSaved(savedDate|null); "+ New category" dashed chip opens inline form: name + optional emoji, new category auto-selected), components/calendar-popup.tsx (custom month grid, month and year arrows, WEEK_STARTS_ON constant = Sunday), components/icons.tsx (CalendarIcon, react-native-svg outline), category-manager.tsx (Settings: add/edit/delete, emoji optional, tap emoji again to remove), insights.tsx (react-native-svg donut + 6-month bars), reports.tsx + lib/report-html.ts (3 PDF styles; web = hidden iframe print dialog, native = expo-print + expo-sharing), explore.tsx (Settings: ThemePanel, MainCurrency, CategoryManager, BackupPanel, Recently deleted)
- Helpers: lib/currencies.ts, money.ts, emojis.ts, category-display.ts (categoryEmoji, categoryLabel), dates.ts (toDateInput, dayOffset, dateInputToMs, monthRange, monthLabel, dayLabel incl. Tomorrow, parseDateParts, addDays, weekdayName, shortDateLabel, relativeDayTag)
- Production web: `pnpm exec expo export --platform web` then `node scripts/serve-web.mjs` (port 3000, sends COEP credentialless + COOP same-origin)
- Planned: Reanimated, FlashList; Hono + zod-openapi + Swagger API; Android/iOS Google sign-in (needs dev build, native client IDs)

## Requested changes (Session #2 backlog, build in this order, one step at a time)

1. Day navigation + date UX [IMPLEMENTED, merged]: day swipe (left = previous day), prominent styled date title with weekday, calendar icon + popup, future-dated expenses allowed
2. Instant categories + optional emoji [IMPLEMENTED, committed and pushed; merge into develop commands given; user did not report problems]: "+ New category" chip in the entry sheet, emoji optional everywhere, category-display helpers
3. Sync behaviour [IN PROGRESS, waiting for ~/Desktop/etrak-step3.txt]. Plan: signed out = local only; signed in = automatic sync after every change (debounced; central change notifier, preferably in db/client.ts wrapping writes; suppressed while a sync is itself writing, to avoid loops); signing out keeps data visible locally but stops syncing; "Delete cloud backup" (Drive files.delete on etrak-backup.json), after which auto-sync pauses until the user presses Sync now; first-sync message when data is restored from Google (counts of restored expenses/categories). Files requested: backup-panel.tsx, google-drive.ts, google-auth.ts, backup-repo.ts, explore.tsx, settings-repo.ts, client.ts, expenses-repo.ts, plus the file name of the Recently deleted panel
4. Welcome screen [TO DO]: short description ("an easy way to track your expenses"), then animated transition into the expense screen; shown on first launch (setting key welcome_seen). Files needed: app-tabs.tsx, app-tabs.web.tsx
5. Futuristic look [TO DO, LAST]: futuristic logo/outline shapes and graphics throughout; accent color setting changes TEXT colors only (not buttons, borders, chips, backgrounds). Currently bg-accent / border-accent are used in chips, buttons, FAB, calendar selection, emoji picker: all must be restyled in this step

## Decisions

- Multi-device: per-record updated_at + deviceId, soft deletes; last write wins. A delete is a normal change and syncs (deleting while signed out then syncing overwrites the Drive copy). Use "Erase data on this device" to test restore, not manual deletes
- Multi-currency: totals, charts, reports are per currency until exchange rates exist
- Money as integer minor units; timestamps epoch ms
- Future-dated expenses are allowed and count in month totals, Insights and Reports
- Swipe direction: left swipe = previous day, right swipe = next day (user's choice; flip in index.tsx PanResponder release handler if wanted)
- Category emoji is optional (user request); empty emoji displays as a dot (•) on screens and in PDF reports, and as just the name on chips; DB column stays TEXT NOT NULL (empty string), no migration
- Backups live in each user's own Google Drive appDataFolder (no storage for us); Google sign-in only in v1 (no phone login)
- NO store release. Distribution plan: GitHub repository with full instructions (how to get the code and run it on any PC, requirements, setup), a version history (CHANGELOG.md: what each version introduced, SemVer starting v0.1.0), Android APK shared by Google Drive link
- iOS: an iPhone app cannot be installed from a Drive link without a paid Apple Developer account (signing). Free options: web version added to home screen (PWA), or the user builds it in Xcode on a Mac with a free Apple ID (expires every 7 days). Document this honestly in the GitHub instructions
- Free cloud hosting (Cloudflare Pages, static dist with a `_headers` file sending COEP credentialless + COOP same-origin; Direct Upload by dragging apps/mobile/dist into Workers & Pages > Pages; add the hosted address to the Google OAuth client origins and redirect URIs; publish the consent screen) is DEFERRED until the Session #2 backlog is finished
- Charts: react-native-svg + plain Views
- Commits: Conventional Commits (Husky + commitlint). Git: main = stable, develop = integration, feat/* merged with `git merge --no-ff`. Run `git branch --show-current` before each commit
- Web limitation: only ONE browser tab can open the database at a time

## Known issues

- Drive restore round trip (Sync, Erase, Sync) not yet confirmed by the user
- Web "system" theme did not follow the browser's dark setting for the user (matchMedia fix unconfirmed)
- Dev server only: "Invalid VFS state" after hot reload or new dependency. Fix: close all localhost:8081 tabs, pkill -f chrome, wipe localhost:8081 at chrome://settings/content/all, reopen in ONE tab; press F5 after pasting files
- Google sign-in in Testing mode: only listed test users; sign-in expires after ~1h (auto-sync must handle an expired token gracefully: pause and ask to sign in again); fresh browsers may show duplicate starter categories until synced (merge cleans unused duplicates)
- Native tabs, PDF share flow and Android/iOS sign-in untested on a phone
- Swipe gesture uses mouse drag on web (no trackpad two-finger swipe); arrows and calendar are the desktop alternatives
- Older app builds cannot read backups containing categories with an empty emoji (only matters if someone runs an old version against the same Drive backup)
- Git history: some commits landed on develop directly; harmless

## Environment notes

- pnpm via `sudo npm install -g pnpm` (no corepack); do NOT run `pnpm dlx tailwindcss init`
- Start: `cd apps/mobile && pnpm start`, press w (open http://localhost:8081, NOT 127.0.0.1)
- ALWAYS run git commands and `cat > apps/mobile/...` blocks from the project root (prompt ends in ...Project1$)
- Two terminals: root (git, file blocks) and apps/mobile (server). Paste with Ctrl+Shift+V, one command or block at a time
- Git push over HTTPS needs a GitHub personal access token; `git config --global credential.helper store`
- After installing a dependency, editing .env or changing packages/shared: stop server, close all localhost tabs, restart, open ONE tab
- Reload in the BROWSER tab with F5
- Nothing edits project files automatically: every change is a terminal block, a python edit script, or a manual edit
- To share files with Claude: copy them into one text file with a single-line `cd ~/Desktop/Project/Project1/apps/mobile && { for f in ...; do if [ -f "$f" ]; then echo "=== $f ==="; cat "$f"; else echo "=== $f (missing) ==="; fi; done; } > ~/Desktop/name.txt` command and attach it in the chat (the file must be attached, creating it is not enough)

## Git

- Merged into develop: everything up to feat/google-backup, plus feat/hosting (public/_headers), feat/day-navigation, and feat/instant-categories (merge commands given, pending user confirmation)
- Current branch: feat/auto-sync (new, no changes yet)

## Completed

- [x] Monorepo, theme system with persistence, shared schemas, SQLite data layer
- [x] Expense entry/edit/delete/date, categories with emoji, main currency, tab-lock banner
- [x] Web header, month filter and totals, day grouping
- [x] Insights charts, PDF reports, production web build server
- [x] Google sign-in + Drive sync (web), Recently deleted, Erase local data
- [x] Backlog item 1: day view, swipe, calendar popup, styled date title, future dates
- [x] Backlog item 2: instant categories in the sheet, optional emoji (committed and pushed)

## In Progress

- [ ] Step 1 git commands: merge feat/instant-categories into develop, create feat/auto-sync
- [ ] User attaches etrak-step3.txt (8 files) and the file name of the Recently deleted panel, for backlog item 3

## Exact Next Steps

1. User runs the Step 1 git commands, creates and ATTACHES etrak-step3.txt, and reports the Recently deleted file name (grep -rl "ecently" src)
2. Implement backlog item 3 (auto-sync, delete cloud data, first-sync message); user tests; commit and merge
3. Backlog items 4 (welcome screen) and 5 (futuristic look) in order (one branch each, user tests before the next)
4. Then: README with full setup instructions, CHANGELOG.md with version history (v0.1.0), Android APK via Google Drive link, iOS note
5. Then free cloud hosting (Cloudflare Pages), Hono API + Swagger UI (requirement #8), Android/iOS Google sign-in, real tab icons, exchange rates, FlashList
