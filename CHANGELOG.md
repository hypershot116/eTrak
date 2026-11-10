# Changelog

All notable changes to eTrak are documented in this file.

## [2.0.5] - 2026-11-10

### Fixed
- Handled browser OPFS tab locking constraint gracefully by surfacing an alert banner on secondary tabs instead of failing silently.

## [2.0.4] - 2026-11-09

### Added
- Integrated full logo lockup displaying both the hexagon icon and bold brand wordmark.
- Displayed user greeting and connected Google profile info inside settings.
- Added automatic vanishing sync status indicator (hides 4 seconds after initial sync).
- Added multi-tab sync notification broadcast over `BroadcastChannel`.

## [2.0.3] - 2026-11-09

### Fixed
- Resolved NativeWind / CSS-interop unmounted component state updates by deferring theme color-scheme applications.

## [2.0.2] - 2026-11-09

### Fixed
- Added automated category deduplication on boot to merge redundant seed entries and protect against race conditions.

## [2.0.1] - 2026-11-09

### Changed
- Replaced central gradient ring with clean, left-aligned typography for daily spending summaries.

## [2.0.0] - 2026-11-09

### Changed
- Redesigned expense logging from a floating modal into an inline card to resolve mobile input overflow and viewport panning issues.
- Added wrapping pill grid for currency selection.
