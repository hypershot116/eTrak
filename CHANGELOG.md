# Changelog

All notable changes to eTrak are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added
- README with setup instructions for running the project on any PC, and an example settings file (apps/mobile/.env.example)

### Planned
- Android APK shared through a Google Drive link
- Free cloud hosting for the web version (Cloudflare Pages)
- Hono API with Swagger UI, and a longer-lived Google sign-in through the API
- Android and iOS Google sign-in
- Optional monthly budget per currency for the Expenses ring
- Card outlines and icon headers on Settings and Reports, readable text on very light accent colors in every screen

## [0.4.0] - 2026-11-05

### Added
- Free accent color: nine preset colors and a Custom color picker (hue, intensity, brightness, hex)
- Background styles: Midnight (deep navy), Matched (tinted by the accent) and Pure black
- Everything accent-related is derived from the chosen color: glow, tints, gradients and a
  readable text color for accent-filled buttons
- Hexagon "e" logo in the Expenses header
- Gradient progress ring on the Expenses day card, showing the day as a share of the month
- Glowing donut chart with category colors taken from the accent, gradient bars in Insights
- Glow and accent borders on cards and the add button

### Changed
- Saved accent colors from earlier versions (indigo, emerald, rose, amber, sky) still load
- Welcome screen was considered and dropped: the app opens straight into Expenses

## [0.3.0] - date not recorded

### Added
- Day view on the Expenses screen with swipe, arrows, calendar popup and a Today button
- Expenses can be dated on any day, including future days (shown as "Planned")
- Instant categories: type a new category name in the expense sheet and Save creates it
- Category emoji is optional
- Automatic Google Drive sync: after every change, every 2 minutes and when the tab becomes visible
- Delete cloud backup, restore message on the first sync of a device, sync status line

### Fixed
- Saving an expense with a newly typed category now creates that category instead of using the selected one

## [0.2.0] - date not recorded

### Added
- Google sign-in on the web
- Manual backup and restore through the user's own Google Drive (hidden app data folder)
- Erase data on this device
- Hosting headers for static deployment

## [0.1.0] - date not recorded

### Added
- Monorepo with a shared validation package
- Expenses: add, edit, delete, choose the date
- Categories: add, edit, delete, built-in emoji choices
- Main currency setting
- Month filter, totals, and day grouping
- Insights: category donut chart and six-month bars
- PDF reports in three styles
- Light and dark mode with a saved theme
- Responsive layout for any browser window size
- Local-first SQLite storage
