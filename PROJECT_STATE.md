## Decisions (Session #1, continued)
- Editor: VS Code for the whole project (.vscode/ settings and recommended extensions committed)

## Completed
- [x] Monorepo initialized (pending user confirmation)
- [ ] Expo app scaffolded in apps/mobile (pending user confirmation)

## In Progress
- Branch: feat/mobile-scaffold (NativeWind, Reanimated, iOS 120Hz flag)

## Next Steps
1. User confirms the app runs on web and phone/emulator
2. Add theme system: light/dark toggle with smooth transition + accent palettes
3. Create packages/shared with expense and currency Zod schemas
4. Set up expo-sqlite + Drizzle and the expense data model (id, amount, currency, rate, category, timestamps, deletedAt, deviceId)