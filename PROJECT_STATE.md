# PROJECT_STATE.md

_Last updated: 2026-10-30 · Session #1_

## Project

eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code.

## Architecture & Tech Stack

- Monorepo: pnpm + (later) Turborepo; apps/mobile, packages/shared
- App: Expo SDK 58 + Expo Router + TypeScript (template uses src/app/ and an AppTabs tab layout), NativeWind v4 + Tailwind ^3.4.17
- State: Zustand 5 (theme store in src/theme/)
- Theming: NativeWind darkMode "class"; useColorScheme from 'nativewind' (setColorScheme for light/dark/system); accent color via CSS variable --accent (set with vars() in ThemeRoot), Tailwind color "accent". Do NOT use bg-accent inside react-native Modal on web (portal is outside ThemeRoot): sheets are rendered as absolute overlays instead
- _layout.tsx: ThemeRoot wraps expo-router ThemeProvider, AnimatedSplashOverlay and AppTabs
- Tabs (src/components/app-tabs.tsx): NativeTabs with "index" (label Expenses, home icon) and "explore" (label Settings, explore icon); uses nativewind useColorScheme so the tab bar follows the in-app theme. Route file explore.tsx kept (label only renamed); a dedicated settings icon asset is still to add
- Shared package: @etrak/shared (packages/shared, Zod schemas: currency, category, expense; main = src/index.ts); consumed by apps/mobile via workspace:*
- Data layer (apps/mobile/src/db): expo-sqlite async API with plain SQL (NO Drizzle), Zod validation from @etrak/shared
  - migrations.ts: versioned SQL migrations using PRAGMA user_version (tables: categories, expenses, settings)
  - client.ts: getDb() singleton connection (etrak.db) stored on globalThis (survives hot reloads; one connection per browser tab), newId() via expo-crypto randomUUID, getDeviceId() stored in settings
  - categories-repo.ts: listCategories, createCategory, ensureDefaultCategories (Food, Transport, Shopping, Bills, Health, Fun)
  - expenses-repo.ts: createExpense, listExpenses(limit), updateExpense(id, {amountMinor, currency, categoryId, note}), softDeleteExpense. Rows map snake_case columns to camelCase via fromRow + expenseSchema.parse; every write bumps updated_at and device_id
  - settings-repo.ts: getSetting, setSetting (keys so far: device_id, last_currency)
- UI (apps/mobile/src):
  - app/index.tsx = expense list (FlatList; to be upgraded to FlashList) + floating + button; tapping a row opens it in the sheet for editing
  - components/expense-sheet.tsx = entry/edit sheet (prop expense: Expense | null; null = new). Fields: amount, currency chips, category chips, note, haptics. Edit mode shows a Delete button that needs a second tap to confirm (Alert.alert is unreliable on web)
  - app/explore.tsx = Settings screen with ThemePanel; theme/theme-panel.tsx
- Helpers: lib/currencies.ts (10 currencies with decimal digits), lib/money.ts (parseAmountToMinor, formatMinor)
- SQLite on web: confirmed working (survives reloads); stored in the browser's private file system (OPFS)
- metro.config.js: NativeWind + wasm asset support + COEP (credentialless) / COOP (same-origin) headers for expo-sqlite on web
- Animation/lists/charts (planned): Reanimated, FlashList, Victory Native XL
- Backup/sync (planned): Google Drive appDataFolder
- API (planned): Hono + zod-openapi + Swagger UI, stateless
- Auth: Google sign-in only in v1
- Web output: static (free hosting)

## Decisions

- Multi-device simultaneous use: per-record change log (timestamp + deviceId), soft deletes (deletedAt), polling sync
- Multi-currency: each expense stores currency + rateToMain (rate when saved); rateToMain is 1 for now; real exchange rates and main-currency setting come with reports
- Money stored as integer minor units (amountMinor); timestamps as epoch milliseconds (integers)
- No backup password lock in v1 (design allows adding later)
- Distribution: GitHub releases (Android APK) + PWA for iOS testing; store release later
- Web performance requirement: sustained 60 fps; mobile 60/120Hz. Measure on a production build (expo export), not on the dev server
- iOS 120Hz flag set in app.json (CADisableMinimumFrameRateOnPhone)
- app.json: name eTrak, slug/scheme etrak, web.output "static"
- Commits: Conventional Commits via Husky + commitlint; SemVer, CHANGELOG later
- Theme and accent choice currently in memory only; to be persisted in settings table
- Git workflow: main = stable releases only; develop = integration branch; feat/* = feature branches merged locally with `git merge --no-ff` (no pull requests for now)
- Drizzle ORM dropped: its Expo driver relies on synchronous SQLite calls, which are not available in Expo SQLite web (alpha); plain async SQL + Zod instead
- Web hosting (later) must send Cross-Origin-Embedder-Policy: credentialless and Cross-Origin-Opener-Policy: same-origin
- Known web limitation: only ONE browser tab can open the database at a time (OPFS single access handle). TODO: friendly "eTrak is already open in another tab" message
- Expense date cannot be edited yet; to be added with the date filtering work

## Environment notes

- pnpm installed with `sudo npm install -g pnpm` (do NOT use corepack on this machine)
- Do NOT run `pnpm dlx tailwindcss init` (pulls Tailwind 4); tailwind.config.js created by hand
- NativeWind v4 needs react-native-css-interop resolvable by Metro: installed directly in apps/mobile
- Start the app with `pnpm start` (from apps/mobile); use `pnpm exec expo start --clear` ONLY after changing config files (metro/tailwind/babel)
- Dev server is slower than production: first load after start is the slowest, later reloads are fast
- Error "createSyncAccessHandle ... another open Access Handle": another browser tab holds the database. Fix: close all localhost:8081 tabs, restart `pnpm start`, open ONE tab; if it persists, quit Chrome completely
- Terminal paste may add stray characters (^[[200~): paste with Ctrl+Shift+V
- Git commands run from project root (...Project1$); pnpm start/add run from apps/mobile. cd ../.. goes from apps/mobile to root. Workspace installs from root: `pnpm --filter ./apps/mobile add <pkg>`
- Files can be created from the terminal with `cat > path << 'EOF' ... EOF` blocks
- Nothing edits project files automatically: every code change is either a terminal block the user runs or a manual edit
- To see latest work on GitHub, switch the branch dropdown from main to develop
- Git pager: press q to leave the ":" / "(END)" viewer; disable with `git config --global core.pager cat`
- Pressing w in the Expo terminal opens the browser; if nothing happens, open http://localhost:8081 manually; hard reload with Ctrl+Shift+R
- Reload the app with F5 in the BROWSER tab (localhost:8081). F5 inside VS Code starts the debugger (popup: click Cancel)

## Git

- Branches on GitHub: main, develop, feat/mobile-scaffold, feat/theme-system, feat/shared-schemas, feat/local-database, feat/data-layer, feat/expense-entry, feat/expense-edit
- feat/expense-entry and feat/expense-edit merged into develop
- Current branch: feat/categories (just created, no changes yet)

## Completed

- [x] Monorepo, commitlint, husky, GitHub remote
- [x] Expo app created in apps/mobile; NativeWind configured; renders on web
- [x] Theme system (light/dark/system + 5 accent colors)
- [x] packages/shared (currency, category, expense Zod schemas)
- [x] SQLite data layer working on web (default categories, add expense, survives reload, soft delete)
- [x] Expense entry sheet, expense list, Settings screen, themed tabs (all web checks passed)
- [x] Edit and delete expenses (updateExpense, tap row to edit, two-tap delete)

## In Progress

- [ ] feat/categories: category management (add with built-in emoji picker, edit, delete) so custom types appear as quick-pick chips in the sheet (requirement #4)

## Exact Next Steps

1. Category management: needs categories-repo.ts, the category Zod schema, migrations.ts and app/explore.tsx pasted into the chat
2. Persist theme/accent in settings, main currency setting, friendly "open in another tab" message, proper settings tab icon, expense date editing
3. Upgrade list to FlashList; month filter; totals
4. Dashboard charts (monthly, category donut, trend), PDF report export, exchange rates
5. Production web build and 60 fps measurement; Google sign-in + Drive backup/sync; Swagger API
