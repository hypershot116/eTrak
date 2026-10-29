# PROJECT_STATE.md
_Last updated: 2026-10-29 · Session #1_

## Project
eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code.

## Architecture & Tech Stack
- Monorepo: pnpm + (later) Turborepo; apps/mobile, packages/*
- App: Expo + Expo Router + TypeScript (template uses src/app/ and an AppTabs tab layout), NativeWind v4 + Tailwind ^3.4.17
- State: Zustand 5 (installed; theme store in src/theme/)
- Theming: NativeWind darkMode "class"; useColorScheme from 'nativewind' (setColorScheme for light/dark/system); accent color via CSS variable --accent (set with vars() in ThemeRoot), Tailwind color "accent"
- _layout.tsx: ThemeRoot wraps expo-router ThemeProvider (DarkTheme/DefaultTheme chosen from nativewind colorScheme), AnimatedSplashOverlay and AppTabs
- Animation/lists/charts (planned): Reanimated, FlashList, Victory Native XL
- Data (planned): expo-sqlite + Drizzle, local-first; backup/sync via Google Drive appDataFolder
- API (planned): Hono + zod-openapi + Swagger UI, stateless
- Auth: Google sign-in only in v1
- Web output: static (free hosting)

## Decisions
- Multi-device simultaneous use: per-record change log (timestamp + deviceId), soft deletes, polling sync
- Multi-currency: each expense stores currency + exchange rate used; user picks main currency
- No backup password lock in v1 (design allows adding later)
- Distribution: GitHub releases (Android APK) + PWA for iOS testing; store release later
- Web performance requirement: sustained 60 fps; mobile 60/120Hz
- iOS 120Hz flag set in app.json (CADisableMinimumFrameRateOnPhone)
- app.json: name eTrak, slug/scheme etrak, web.output "static"
- Commits: Conventional Commits via Husky + commitlint; SemVer, CHANGELOG later
- Theme and accent choice currently in memory only; to be persisted in local DB later

## Environment notes
- pnpm installed with `sudo npm install -g pnpm` (do NOT use corepack on this machine)
- Do NOT run `pnpm dlx tailwindcss init` (pulls Tailwind 4); tailwind.config.js created by hand
- NativeWind v4 needs react-native-css-interop resolvable by Metro: installed directly in apps/mobile; after config changes start with `pnpm exec expo start --clear`
- Terminal paste may add stray characters (^[[200~): paste with Ctrl+Shift+V
- Git commands run from project root (...Project1$); pnpm start/add run from apps/mobile (...Project1/apps/mobile$). cd ../.. goes from apps/mobile to root.
- Files can be created from the terminal with `cat > path << 'EOF' ... EOF` blocks
- Nothing edits project files automatically: every code change is either a terminal block the user runs or a manual edit

## Git
- main and develop pushed to origin (first commit 76a246f)
- feat/mobile-scaffold pushed and merged into develop (pending user confirmation)
- Current branch: feat/theme-system (to be confirmed with `git branch`); changes not yet committed

## Completed
- [x] Monorepo, commitlint, husky, GitHub remote
- [x] Expo app created in apps/mobile; NativeWind config; renders on web at localhost:8081
- [x] Scaffold committed and pushed on feat/mobile-scaffold
- [x] zustand 5.0.16 installed

## In Progress
- [ ] Theme files in src/theme/ (palettes.ts, theme-store.ts, theme-root.tsx) and theme preview in src/app/index.tsx (terminal blocks given; pending confirmation they were run)
- [ ] src/app/_layout.tsx replaced with ThemeRoot version (terminal block given)
- [ ] tailwind.config.js: add accent color to theme.extend.colors (manual edit, pending)
- [ ] Verify on web: light/dark/system switch and accent color change work
- [ ] Commit and push feat/theme-system

## Exact Next Steps
1. Run the _layout.tsx block, edit tailwind.config.js, run `pnpm exec expo start --clear`, press w
2. Report whether dark/light and accent colors work; fix issues
3. Commit, push, merge feat/theme-system into develop
4. packages/shared: Zod schemas for expense, category and currency
5. expo-sqlite + Drizzle data model (id, amount, currency, rate, category, timestamps, deletedAt, deviceId)
6. Expense entry bottom sheet, list screen with FlashList
