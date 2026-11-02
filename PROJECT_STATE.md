# PROJECT_STATE.md

_Last updated: 2026-11-02 · Session #1_

## Project

eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code.

## Architecture & Tech Stack

- Monorepo: pnpm + (later) Turborepo; apps/mobile, packages/shared
- App: Expo SDK 58 + Expo Router + TypeScript (src/app/), NativeWind v4 + Tailwind ^3.4.17
- State: Zustand 5 (theme store in src/theme/)
- Theming: NativeWind darkMode "class"; accent color via CSS variable --accent (set with vars() in ThemeRoot), Tailwind color "accent". Do NOT use bg-accent inside react-native Modal on web: sheets are rendered as absolute overlays instead
- Theme persistence: theme-store.ts saves theme_mode and theme_accent to the settings table; hydrate() runs in ThemeRoot, which renders nothing until hydrated
- On web, "system" theme is resolved manually via matchMedia in theme-root.tsx (NativeWind system mode does not follow the browser with class dark mode)
- _layout.tsx: ThemeRoot wraps expo-router ThemeProvider, AnimatedSplashOverlay and AppTabs
- Tabs: native app-tabs.tsx (NativeTabs: Expenses, Settings) and web app-tabs.web.tsx (custom pill header: Expenses, Settings, styled with NativeWind). Route file explore.tsx is the Settings screen; a dedicated settings icon asset is still to add
- Shared package: @etrak/shared (Zod schemas: currency, category, expense). category: name max 40, emoji max 8 chars
- Data layer (apps/mobile/src/db): expo-sqlite async API with plain SQL (NO Drizzle), Zod validation
  - migrations.ts: versioned SQL migrations via PRAGMA user_version (tables: categories, expenses, settings)
  - client.ts: getDb() singleton (etrak.db) on globalThis, newId(), getDeviceId()
  - categories-repo.ts: listCategories(includeDeleted), createCategory, updateCategory, softDeleteCategory, ensureDefaultCategories
  - expenses-repo.ts: createExpense, listExpenses(limit), updateExpense(id, {amountMinor, currency, categoryId, note, spentAt?}), softDeleteExpense. Sorted by spent_at DESC, created_at DESC
  - settings-repo.ts: getSetting, setSetting (keys: device_id, last_currency, main_currency, theme_mode, theme_accent)
- UI (apps/mobile/src):
  - app/index.tsx = expense list + floating + button; tapping a row opens it in the sheet
  - components/expense-sheet.tsx = entry/edit sheet: amount, currency chips, category chips, date (Today/Yesterday chips + YYYY-MM-DD field, no future dates), note, two-tap delete. New sheet starts with last_currency, else main_currency
  - components/category-manager.tsx = add/edit/delete categories with built-in emoji picker (lib/emojis.ts); deleting is a soft delete, old expenses keep the name
  - components/main-currency.tsx = main currency picker in Settings
  - components/db-error-banner.tsx = friendly "open in another tab" banner (matches access handle / invalid vfs state errors)
  - app/explore.tsx = Settings: ThemePanel, MainCurrency, CategoryManager (scrollable)
- Helpers: lib/currencies.ts, lib/money.ts (parseAmountToMinor, formatMinor), lib/emojis.ts, lib/dates.ts
- SQLite on web: OPFS; metro.config.js has NativeWind + wasm + COEP credentialless / COOP same-origin headers
- Planned: Reanimated, FlashList, Victory Native XL; Google Drive appDataFolder backup; Hono + zod-openapi + Swagger API; Google sign-in only in v1; static web output

## Decisions

- Multi-device: per-record change log (timestamp + deviceId), soft deletes, polling sync
- Multi-currency: each expense stores currency + rateToMain (1 for now). Totals are shown per currency until exchange rates exist
- Money as integer minor units; timestamps as epoch ms
- No backup password lock in v1
- Distribution: GitHub releases (Android APK) + PWA for iOS testing; store release later
- Performance: 60 fps web, 60/120Hz mobile; measure on a production build, not the dev server
- Commits: Conventional Commits via Husky + commitlint; SemVer, CHANGELOG later
- Git workflow: main = stable releases; develop = integration; feat/* merged locally with `git merge --no-ff`
- Drizzle dropped (needs sync SQLite, unavailable on web)
- Web hosting must send COEP credentialless + COOP same-origin
- Web limitation: only ONE browser tab can open the database at a time

## Known issues

- Web "system" theme did not follow the browser's dark setting for the user (matchMedia fix added in theme-root.tsx; unconfirmed). Check: run matchMedia('(prefers-color-scheme: dark)').matches in the browser console
- Dev server only: "Invalid VFS state" after hot reload. Fix: close all localhost:8081 tabs, pkill -f chrome, wipe localhost:8081 at chrome://settings/content/all, reopen in ONE tab. Avoid by pressing F5 after pasting files

## Environment notes

- pnpm installed with `sudo npm install -g pnpm` (no corepack)
- Do NOT run `pnpm dlx tailwindcss init` (pulls Tailwind 4)
- Start the app: `cd apps/mobile && pnpm start`, press w (or open http://localhost:8081). `pnpm exec expo start --clear` ONLY after changing config files
- ALWAYS run git commands and `cat > apps/mobile/...` blocks from the project root (prompt ends in ...Project1$). From apps/mobile they fail
- Use two terminals: one at the root (git, file blocks), one in apps/mobile (server)
- Paste in the terminal with Ctrl+Shift+V
- Git push over HTTPS needs a GitHub personal access token as the password; `git config --global credential.helper store` saves it
- Nothing edits project files automatically: every change is a terminal block or manual edit
- Reload in the BROWSER tab with F5 (F5 in VS Code starts the debugger)
- Git pager: `git config --global core.pager cat`

## Git

- Branches pushed: main, develop, feat/mobile-scaffold, theme-system, shared-schemas, local-database, data-layer, expense-entry, expense-edit, categories (empty merge), persist-settings, category-manager, main-currency, expense-date
- All merged into develop up to feat/expense-date
- Current branch: feat/month-filter

## Completed

- [x] Monorepo, commitlint, husky, GitHub remote
- [x] Expo app, NativeWind, theme system, persisted theme and accent
- [x] Shared Zod schemas, SQLite data layer on web
- [x] Expense entry, edit, delete, list
- [x] Category management with emoji picker
- [x] Main currency setting, friendly "another tab" banner
- [x] Web header rewritten (Expenses, Settings)
- [x] Expense date editing

## In Progress

- [ ] feat/month-filter: month navigation on the home screen plus per-currency totals for the month

## Exact Next Steps

1. Finish month filter and totals; commit and merge
2. Upgrade list to FlashList; group by day; proper settings tab icon
3. Dashboard charts (monthly, category donut, trend), PDF report export, exchange rates
4. Production web build and 60 fps measurement
5. Google sign-in + Drive backup/sync; Swagger API
