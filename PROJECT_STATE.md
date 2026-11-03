# PROJECT_STATE.md

_Last updated: 2026-11-03 · Session #1_

## Project

eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code.

## Architecture & Tech Stack

- Monorepo: pnpm + (later) Turborepo; apps/mobile, packages/shared
- App: Expo SDK 58 + Expo Router + TypeScript (src/app/), NativeWind v4 + Tailwind ^3.4.17
- State: Zustand 5 (theme store in src/theme/)
- Theming: NativeWind darkMode "class"; accent via CSS variable --accent (vars() in ThemeRoot), Tailwind color "accent". Do NOT use bg-accent inside react-native Modal on web: sheets are absolute overlays
- Theme persistence: theme-store.ts saves theme_mode and theme_accent in the settings table; hydrate() runs in ThemeRoot, which renders nothing until hydrated
- On web, "system" theme is resolved manually via matchMedia in theme-root.tsx
- Tabs: native app-tabs.tsx (NativeTabs: Expenses, Insights, Reports, Settings; Insights and Reports reuse explore.png icon, real icons still to add) and web app-tabs.web.tsx (custom pill header, NativeNind-styled, same four tabs). Routes: index, insights, reports, explore (= Settings)
- Shared package: @etrak/shared (Zod: currency, category, expense). category name max 40, emoji max 8
- Data layer (apps/mobile/src/db): expo-sqlite async API, plain SQL (NO Drizzle), Zod validation
  - migrations.ts (PRAGMA user_version; tables categories, expenses, settings), client.ts (getDb singleton, newId, getDeviceId)
  - categories-repo.ts: listCategories(includeDeleted), createCategory, updateCategory, softDeleteCategory, ensureDefaultCategories
  - expenses-repo.ts: createExpense, listExpenses, listExpensesInRange(startMs, endMs), updateExpense(id, {amountMinor, currency, categoryId, note, spentAt?}), softDeleteExpense
  - settings-repo.ts keys: device_id, last_currency, main_currency, theme_mode, theme_accent
- UI (apps/mobile/src):
  - app/index.tsx: expense list for a month, month navigation, per-currency totals card, + button
  - components/expense-sheet.tsx: add/edit (amount, currency, category, date with Today/Yesterday chips and YYYY-MM-DD, no future dates, note, two-tap delete)
  - components/category-manager.tsx (+ lib/emojis.ts), main-currency.tsx, db-error-banner.tsx (friendly "another tab" / invalid VFS state message)
  - app/insights.tsx: category donut + 6-month bars, per-currency chips; components/donut-chart.tsx and bar-chart.tsx use react-native-svg (donut rotation via transform string, not rotation/origin props)
  - app/reports.tsx + lib/report-html.ts: three styles (summary, detailed, by category), one section per currency. Web: hidden iframe + print dialog (Save as PDF). Native: expo-print printToFileAsync + expo-sharing
  - app/explore.tsx: Settings (ThemePanel, MainCurrency, CategoryManager)
- Helpers: lib/currencies.ts, money.ts (parseAmountToMinor, formatMinor), emojis.ts, dates.ts (toDateInput, dayOffset, dateInputToMs, monthRange, monthLabel)
- SQLite on web: OPFS; metro.config.js has NativeWind + wasm + COEP credentialless / COOP same-origin headers
- Planned: Reanimated, FlashList; Google Drive appDataFolder backup; Hono + zod-openapi + Swagger API; Google sign-in only in v1; static web output

## Decisions

- Multi-device: per-record change log (timestamp + deviceId), soft deletes, polling sync
- Multi-currency: each expense stores currency + rateToMain (1 for now). Totals, charts and reports are per currency until exchange rates exist
- Money as integer minor units; timestamps as epoch ms
- No backup password lock in v1
- Distribution: GitHub releases (Android APK) + PWA for iOS testing; store release later
- Performance: 60 fps web, 60/120Hz mobile; measure on a production build, not the dev server
- Charts: react-native-svg + plain Views (Victory Native XL skipped: needs Skia/Reanimated/Gesture Handler, wasm on web)
- Commits: Conventional Commits via Husky + commitlint; SemVer, CHANGELOG later
- Git workflow: main = stable releases; develop = integration; feat/* merged locally with `git merge --no-ff`. Run `git branch --show-current` before each commit
- Web hosting must send COEP credentialless + COOP same-origin
- Web limitation: only ONE browser tab can open the database at a time

## Known issues

- Web "system" theme did not follow the browser's dark setting for the user (matchMedia fix added, unconfirmed). Check in console: matchMedia('(prefers-color-scheme: dark)').matches
- Dev server only: "Invalid VFS state" after hot reload or new dependency. Fix: close all localhost:8081 tabs, pkill -f chrome, wipe localhost:8081 at chrome://settings/content/all, reopen in ONE tab. Avoid by pressing F5 after pasting files
- Git history: dashboard commits landed directly on develop (feat/dashboard branch has only the month filter). Harmless, not rewritten
- Native PDF share flow and native tabs not yet tested on a phone
- Bar chart shows no amounts; Insights/Reports tabs reuse the Settings icon

## Environment notes

- pnpm installed with `sudo npm install -g pnpm` (no corepack)
- Do NOT run `pnpm dlx tailwindcss init` (pulls Tailwind 4)
- Start the app: `cd apps/mobile && pnpm start`, press w (or open http://localhost:8081). `pnpm exec expo start --clear` ONLY after changing config files
- ALWAYS run git commands and `cat > apps/mobile/...` blocks from the project root (prompt ends in ...Project1$)
- Use two terminals: one at the root, one in apps/mobile (server). Paste with Ctrl+Shift+V
- Git push over HTTPS needs a GitHub personal access token; `git config --global credential.helper store` saves it
- After installing a dependency: stop server, close all localhost tabs, restart, open ONE tab
- Reload in the BROWSER tab with F5 (F5 in VS Code starts the debugger)
- Nothing edits project files automatically: every change is a terminal block or manual edit

## Git

- Merged into develop: everything up to feat/pdf-report
- Current branch: feat/production-build

## Completed

- [x] Monorepo, commitlint, husky, GitHub remote
- [x] Expo app, NativeWind, theme system with persistence
- [x] Shared schemas, SQLite data layer on web
- [x] Expense entry, edit, delete, date editing, list
- [x] Categories with emoji picker, main currency, tab-lock banner
- [x] Web header (Expenses, Insights, Reports, Settings)
- [x] Month filter and totals
- [x] Insights: category donut and 6-month trend
- [x] PDF reports (3 styles)

## In Progress

- [ ] feat/production-build: `expo export --platform web`, local static server with COEP/COOP headers (apps/mobile/scripts/serve-web.mjs), 60 fps check

## Exact Next Steps

1. Production build and 60 fps measurement; fix anything slow (FlashList, memoized rows)
2. Group list by day; real tab icons; bar chart amounts
3. Test on Android (Expo Go or dev build): native tabs, PDF share, haptics
4. Google sign-in + Drive appDataFolder backup/sync (requirements #9)
5. Hono API + Swagger UI (requirement #8); free hosting
6. Exchange rates for cross-currency totals; CHANGELOG and v0.1.0 release
