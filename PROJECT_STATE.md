# Project State — eTrak (Offline-First Personal Expense Tracker)

**Status:** Completed (Learning & Architectural Exploration)  
**Latest Version:** `v2.0.5`  
**Platform:** Web (PWA / Cloudflare Pages) & Mobile (Expo / React Native)

---

## 1. Architectural Overview

eTrak is an offline-first, client-side personal finance tracker built with zero recurring infrastructure costs. All core application logic, database storage, and query execution reside directly on the client.

* **Frontend:** Expo (SDK 52+), React Native for Web, Expo Router.
* **Styling & Theming:** NativeWind v4 (Tailwind CSS) with dynamic CSS variables for custom palette and dark/light surface derivation.
* **Local Database:** SQLite running in the browser via WebAssembly (WASM) backed by the browser's **Origin Private File System (OPFS)**.
* **Cloud Sync & Backup:** User-authorized Google Drive AppData folder (`drive.appdata` scope) via OAuth 2.0 Implicit Grant / Token Flow.
* **Hosting:** Static edge export deployed on Cloudflare Pages.

---

## 2. Key Components & Implementation Details

### Client-Side Database & Deduplication
* Schema migrations initialize SQLite tables (`categories`, `expenses`, `settings`) on first boot.
* Automated deduplication logic runs during startup to clean up duplicate seed categories across multiple devices while reassigning historical expense foreign keys.
* Transactions use UUID primary keys and millisecond-precision timestamps (`created_at`, `updated_at`, `deleted_at`) supporting soft deletes for consistent audit trails.

### Google Drive Sync Engine
* Synchronizes encrypted snapshot payloads directly into the hidden `appdata` partition of the user's personal Google Drive.
* Implements a 2.5-second write debounce and 2-minute periodic polling when active.
* Automatically captures OAuth tokens, extracts user profile information (`name`, `given_name`, `email`), and broadcasts authentication state changes across browser contexts.
* Sync indicator automatically disappears after 4 seconds of idle connection to keep the UI clean.

### Responsive UI / UX
* **Inline Expense Card:** Replaced floating pop-up modals with an inline view swap to eliminate viewport shifting and mobile keyboard input overflow issues caused by native input sizing.
* **Left-Aligned Financial Summary:** Clean, scannable typography displaying major daily spend totals by active currency.
* **Theme System:** Supports Dark, Light, and System modes with user-configurable dynamic accent color palettes.

---

## 3. Findings & Platform Constraints (OPFS Multi-Tab Concurrency)

* **Behavior:** When opening multiple tabs on the same origin simultaneously, secondary tabs cannot access the database.
* **Root Cause:** Modern web browsers enforce an exclusive file-system lock on individual files stored within OPFS to prevent database corruption from concurrent WASM SQLite writes.
* **Resolution in v2.0.5:** Instead of failing silently with blank records, secondary tabs detect the `locked` / `Invalid VFS state` error and render a clear warning prompt instructing the user to return to the active primary tab.
* **Future Extension:** Bridging concurrent multi-tab access in this offline architecture would involve a `SharedWorker` to centralize the OPFS lock while piping queries across tabs via `MessageChannel`.

---

## 4. Current Repository Status

* Working tree clean, fully functional build.
* Ready for testing and portfolio demonstration.
