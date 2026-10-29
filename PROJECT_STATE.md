# PROJECT_STATE.md
_Last updated: 2026-10-29 · Session #1_

## Project
eTrak: cross-platform expense tracker (Web, Android, iOS). Local-first, zero hosting cost.
GitHub: github.com/hypershot116/eTrak (public). Local folder: ~/Desktop/Project/Project1. Editor: VS Code.

## Architecture & Tech Stack
- Monorepo: pnpm + (later) Turborepo; apps/mobile, packages/*
- App: Expo + Expo Router + TypeScript (template uses src/app/), NativeWind v4 + Tailwind ^3.4.17
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

## Environment notes
- pnpm installed with `sudo npm install -g pnpm` (do NOT use corepack on this machine)
- Do NOT run `pnpm dlx tailwindcss init` (pulls Tailwind 4); tailwind.config.js created by hand
- NativeWind v4 needs react-native-css-interop resolvable by Metro: installed directly in apps/mobile (`pnpm add react-native-css-interop`); after config changes start with `pnpm exec expo start --clear`
- Terminal paste may add stray characters (^[[200~): paste with Ctrl+Shift+V

## Git
- main and develop pushed to origin (first commit 76a246f)
- Current branch: feat/mobile-scaffold (changes not yet committed or pushed)

## Completed
- [x] Monorepo, commitlint, husky, GitHub remote
- [x] Expo app created in apps/mobile
- [x] NativeWind config files in apps/mobile root (tailwind.config.js, global.css, babel.config.js, metro.config.js, nativewind-env.d.ts)
- [x] global.css imported in src/app/_layout.tsx
- [x] App renders on web at localhost:8081 (css-interop resolution error fixed)

## In Progress
- [ ] Add temporary test line to src/app/index.tsx (import Text from react-native; <Text className="text-xl font-bold text-blue-500">Hello eTrak</Text>) and confirm it renders large, bold, blue
- [ ] Commit and push feat/mobile-scaffold

## Exact Next Steps
1. Confirm blue "Hello eTrak" on web
2. git add . && git commit -m "feat: scaffold expo app with nativewind" && git push -u origin feat/mobile-scaffold
3. Merge feat/mobile-scaffold into develop
4. Theme system: light/dark toggle with smooth transition + accent palettes
5. packages/shared: Zod schemas for expense and currency
6. expo-sqlite + Drizzle data model (id, amount, currency, rate, category, timestamps, deletedAt, deviceId)
