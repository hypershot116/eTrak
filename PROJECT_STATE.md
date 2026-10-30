# PROJECT_STATE.md

_Last updated: 2026-10-30 · Session #1_

## Project

eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code.

## Architecture & Tech Stack

- Monorepo: pnpm + (later) Turborepo; apps/mobile, packages/shared
- App: Expo SDK 58 + Expo Router + TypeScript (template uses src/app/ and an AppTabs tab layout), NativeWind v4 + Tailwind ^3.4.17
- State: Zustand 5 (theme store in src/theme/)
- Theming: NativeWind darkMode "class"; useColorScheme from 'nativewind' (setColorScheme for light/dark/system); accent color via CSS variable --accent (set with vars() in ThemeRoot), Tailwind color "accent"
- \_layout.tsx: ThemeRoot wraps expo-router ThemeProvider, AnimatedSplashOverlay and AppTabs
- Shared package: @etrak/shared (packages/shared, Zod schemas: currency, category, expense; main = src/index.ts); consumed by apps/mobile via workspace:\*
- Data layer (apps/mobile/src/db): expo-sqlite async API with plain SQL (NO Drizzle), Zod validation from @etrak/shared
  - migrations.ts: versioned SQL migrations using PRAGMA user_version (tables: categories, expenses, settings)
  - client.ts: getDb() singleton connection (etrak.db) stored on globalThis (survives hot reloads; one connection per browser tab), newId() via expo-crypto randomUUID, getDeviceId() stored in settings
  - categories-repo.ts: listCategories, createCategory, ensureDefaultCategories (Food, Transport, Shopping, Bills, Health, Fun)
  - expenses-repo.ts: createExpense, listExpenses, softDeleteExpense (updateExpense still to add)
  - data-layer-test.tsx: temporary test panel on the home screen
- SQLite on web: confirmed working (smoke test passed, survives reloads); stored in the browser's private file system (OPFS)
- metro.config.js: NativeWind + wasm asset support + COEP (credentialless) / COOP (same-origin) headers for expo-sqlite on web
- Animation/lists/charts (planned): Reanimated, FlashList, Victory Native XL
- Backup/sync (planned): Google Drive appDataFolder
- API (planned): Hono + zod-openapi + Swagger UI, stateless
- Auth: Google sign-in only in v1
- Web output: static (free hosting)

## Decisions

- Multi-device simultaneous use: per-record change log (timestamp + deviceId), soft deletes (deletedAt), polling sync
- Multi-currency: each expense stores currency + rateToMain (rate when saved); user picks main currency
- Money stored as integer minor units (amountMinor); timestamps as epoch milliseconds (integers)
- No backup password lock in v1 (design allows adding later)
- Distribution: GitHub releases (Android APK) + PWA for iOS testing; store release later
- Web performance requirement: sustained 60 fps; mobile 60/120Hz. Measure on a production build (expo export), not on the dev server
- iOS 120Hz flag set in app.json (CADisableMinimumFrameRateOnPhone)
- app.json: name eTrak, slug/scheme etrak, web.output "static"
- Commits: Conventional Commits via Husky + commitlint; SemVer, CHANGELOG later
- Theme and accent choice currently in memory only; to be persisted in settings table later
- Git workflow: main = stable releases only; develop = integration branch; feat/\* = feature branches merged locally with `git merge --no-ff` (no pull requests for now)
- Drizzle ORM dropped: its Expo driver relies on synchronous SQLite calls, which are not available in Expo SQLite web (alpha); plain async SQL + Zod instead
- Web hosting (later) must send Cross-Origin-Embedder-Policy: credentialless and Cross-Origin-Opener-Policy: same-origin
- Known web limitation: only ONE browser tab can open the database at a time (OPFS single access handle). TODO: show a friendly "eTrak is already open in another tab" message instead of the raw error

## Environment notes

- pnpm installed with `sudo npm install -g pnpm` (do NOT use corepack on this machine)
- Do NOT run `pnpm dlx tailwindcss init` (pulls Tailwind 4); tailwind.config.js created by hand
- NativeWind v4 needs react-native-css-interop resolvable by Metro: installed directly in apps/mobile
- Start the app with `pnpm start`; use `pnpm exec expo start --clear` ONLY after changing config files (metro/tailwind/babel). --clear empties the bundler cache and makes the next load slow
- Dev server is slower than production: first load after start is the slowest (1200+ modules bundled), later reloads are fast
- Error "createSyncAccessHandle ... another open Access Handle": another browser tab (or a stale hot-reload connection) holds the database. Fix: close all localhost:8081 tabs, restart `pnpm start`, open ONE tab; if it persists, quit Chrome completely
- Terminal paste may add stray characters (^[[200~): paste with Ctrl+Shift+V
- Git commands run from project root (...Project1$); pnpm start/add run from apps/mobile. cd ../.. goes from apps/mobile to root. Workspace installs from root: `pnpm --filter ./apps/mobile add <pkg>`
- Files can be created from the terminal with `cat > path << 'EOF' ... EOF` blocks
- Nothing edits project files automatically: every code change is either a terminal block the user runs or a manual edit
- To see latest work on GitHub, switch the branch dropdown from main to develop
- Git pager: press q to leave the ":" / "(END)" viewer; disable with `git config --global core.pager cat`
- Pressing w in the Expo terminal opens the browser; if nothing happens, open http://localhost:8081 manually; hard reload with Ctrl+Shift+R
- Reload the app with F5 in the BROWSER tab (localhost:8081). F5 inside VS Code starts the debugger (popup: click Cancel)

## Git

- GitHub branches: main, develop, feat/mobile-scaffold, feat/theme-system, feat/shared-schemas, feat/local-database (pushed once the commands are run)
- feat/local-database and feat/shared-schemas being merged into develop (commands given, pending user confirmation)
- Current branch: feat/data-layer; changes not yet committed

## Completed

- [x] Monorepo, commitlint, husky, GitHub remote
- [x] Expo app created in apps/mobile; NativeWind configured; renders on web
- [x] Theme system code, merged into develop
- [x] packages/shared (currency, category, expense Zod schemas) committed and pushed
- [x] SQLite web smoke test passed (persistent across reloads)
- [x] Data layer files created (migrations, client, repositories, test panel); expo-crypto installed; client.ts uses globalThis-cached connection

## In Progress

- [ ] Confirm the "Access Handle" error is gone: one tab only, 6 default categories shown, add test expense, survives browser reload, delete works (user has not reported the result yet)
- [ ] Slow loading: likely --clear / dev mode / locked database; user to confirm after the fix
- [ ] Commit, push, merge feat/data-layer into develop (commands given)

## Exact Next Steps

1. User reports the Step 1 check result (or the first line of any error, plus number of open tabs)
2. Run the commit/merge commands; create branch feat/expense-entry
3. Build expense entry sheet (amount, currency, category chips, note) and real expense list; replace theme preview and test panel
4. Add updateExpense, category edit/delete, settings helpers (main currency, theme, accent persisted), friendly "open in another tab" message
5. Production web build and 60 fps measurement; dashboard charts, PDF export, Google sign-in + Drive backup/sync, Swagger API
