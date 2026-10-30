# PROJECT_STATE.md

_Last updated: 2026-10-29 · Session #1_

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
- Data: expo-sqlite (installed on feat/local-database); Drizzle ORM planned after the web smoke test passes; backup/sync via Google Drive appDataFolder planned
- metro.config.js: NativeWind + wasm asset support + COEP (credentialless) / COOP (same-origin) headers for expo-sqlite on web
- Animation/lists/charts (planned): Reanimated, FlashList, Victory Native XL
- API (planned): Hono + zod-openapi + Swagger UI, stateless
- Auth: Google sign-in only in v1
- Web output: static (free hosting)

## Decisions

- Multi-device simultaneous use: per-record change log (timestamp + deviceId), soft deletes (deletedAt), polling sync
- Multi-currency: each expense stores currency + rateToMain (rate when saved); user picks main currency
- Money stored as integer minor units (amountMinor); timestamps as epoch milliseconds (integers)
- No backup password lock in v1 (design allows adding later)
- Distribution: GitHub releases (Android APK) + PWA for iOS testing; store release later
- Web performance requirement: sustained 60 fps; mobile 60/120Hz
- iOS 120Hz flag set in app.json (CADisableMinimumFrameRateOnPhone)
- app.json: name eTrak, slug/scheme etrak, web.output "static"
- Commits: Conventional Commits via Husky + commitlint; SemVer, CHANGELOG later
- Theme and accent choice currently in memory only; to be persisted in local DB later
- Git workflow: main = stable releases only; develop = integration branch; feat/\* = feature branches merged locally with `git merge --no-ff` (no pull requests for now)
- expo-sqlite web support is alpha (Expo docs): validate with smoke test first; plan B = IndexedDB adapter behind the same repository interface
- Web hosting (later) must send Cross-Origin-Embedder-Policy: credentialless and Cross-Origin-Opener-Policy: same-origin

## Environment notes

- pnpm installed with `sudo npm install -g pnpm` (do NOT use corepack on this machine)
- Do NOT run `pnpm dlx tailwindcss init` (pulls Tailwind 4); tailwind.config.js created by hand
- NativeWind v4 needs react-native-css-interop resolvable by Metro: installed directly in apps/mobile; after config changes start with `pnpm exec expo start --clear`
- Terminal paste may add stray characters (^[[200~): paste with Ctrl+Shift+V
- Git commands run from project root (...Project1$); pnpm start/add run from apps/mobile. cd ../.. goes from apps/mobile to root. Workspace installs from root: `pnpm --filter ./apps/mobile add <pkg>`
- Files can be created from the terminal with `cat > path << 'EOF' ... EOF` blocks
- Nothing edits project files automatically: every code change is either a terminal block the user runs or a manual edit
- To see latest work on GitHub, switch the branch dropdown from main to develop
- Git pager: press q to leave the ":" / "(END)" viewer; disable with `git config --global core.pager cat`

## Git

- GitHub branches: main, develop, feat/mobile-scaffold, feat/theme-system, feat/shared-schemas (+ feat/local-database once pushed)
- Verified history: 76a246f (main) -> scaffold merged -> theme merged (d1ca4d6) -> feat/shared-schemas (691eb80, pushed)
- Merge of feat/shared-schemas into develop: commands given, pending user confirmation
- Current branch: feat/local-database (after the merge commands)

## Completed

- [x] Monorepo, commitlint, husky, GitHub remote
- [x] Expo app created in apps/mobile; NativeWind configured; renders on web
- [x] Theme system code, merged into develop
- [x] packages/shared (currency, category, expense Zod schemas) committed and pushed

## In Progress

- [ ] Web check of the shared-schemas branch (accent title, dark/light, circles, no errors)
- [ ] feat/local-database: expo-sqlite installed, metro.config.js updated, src/db/smoke-test.tsx added to home screen
- [ ] SQLite web smoke test: "Database OK: N visit(s) saved", N increases after reload
- [ ] Commit and push feat/local-database

## Exact Next Steps

1. User reports the web check, the merge result, and the smoke test text (web, and Expo Go if possible)
2. If SQLite works on web: add Drizzle ORM + schema/migrations matching @etrak/shared (tables: expenses, categories, settings)
3. If SQLite fails on web: build an IndexedDB adapter behind the same repository interface
4. Repository layer (create/edit/soft-delete/list) and first expense entry sheet with category chips
5. Expense list screen with FlashList; replace the theme preview home screen
