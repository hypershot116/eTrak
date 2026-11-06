# eTrak - Project State & Architecture

**Last Updated:** November 6, 2026  
**Current Version:** v0.5.0 (Release Candidate)  
**Live Production URL:** https://etrak.pages.dev  
**Repository:** https://github.com/hypershot116/eTrak  

---

## 1. System Architecture & Guarantee

eTrak follows a strict local-first paradigm with zero custodian backend servers.

* **Local Storage Layer:** Encrypted local SQLite via `@expo-sqlite` and `op-sqlite`.
* **State Management:** React Native hooks, context providers, and localized synchronous persistence.
* **Cloud Backup Layer:** Direct client-to-Google Drive synchronization via the isolated `appDataFolder` scope (`https://www.googleapis.com/auth/drive.appdata`). No central database has access to financial records.
* **Web Hosting:** Cloudflare Pages with automated Git continuous deployment targeting the `main` branch.
* **Android Packaging:** Standalone native release APK compiled locally using offline Gradle toolchains.

---

## 2. Infrastructure & Environment Specifications

* **Operating System:** Ubuntu Linux x86_64
* **Node Runtime:** Node.js v22.22.1
* **Package Manager:** pnpm v12.16.1
* **Framework:** Expo SDK 58 / React Native 0.88.1 / React 19
* **Java Development Kit:** OpenJDK 17 (headless)
* **Android SDK Tools:** `cmdline-tools` 12.0
* **Android Build Tools:** 34.0.0, 36.0.0, 37.0.0
* **Android Target Platforms:** `android-34`, `android-37`
* **Android NDK:** Version 26.1.10909125 and 27.1.12297006 side-by-side
* **Build System:** Gradle 9.4.1 (Kotlin Gradle Plugin 2.2.10)

---

## 3. Milestones & Progress Log

### Milestone v0.1.0 – Foundation
- Initialized pnpm monorepo structure with Expo, TypeScript, and Tailwind CSS.
- Configured local SQLite database schemas for transactions, categories, and account settings.

### Milestone v0.2.0 – Core UI & Theming
- Implemented futuristic Dark + Violet theme with dynamic accent support.
- Built day-by-day swipe timeline navigation and category expense aggregation.
- Implemented exportable PDF summary reports.

### Milestone v0.3.0 – Cloud Sync (Web)
- Integrated Google OAuth 2.0 Web Client authentication.
- Implemented automated SQLite backup and restore workflows directly against Google Drive's hidden `appDataFolder`.
- Restored user data successfully from cloud sync.

### Milestone v0.4.0 – Production Web Deployment
- Configured Cloudflare Pages Git integration.
- Added live domain (`etrak.pages.dev`) to Google Cloud Console Authorized JavaScript Origins and Authorized Redirect URIs.
- Production web application verified and live.

### Milestone v0.5.0 – Standalone Android Release Build (Current)
- Configured native Android toolchain on Ubuntu without reliance on third-party cloud build queues.
- Resolved native NDK header definitions and `source.properties` structure.
- Resolved Metro bundling conflict by hoisting `babel-preset-expo` to monorepo and workspace root.
- Generated standalone production APK:
  `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
- Validated native SQLite bindings, offline assets, and JavaScript bundles.

---

## 4. Immediate Next Tasks

1. **Device Verification:** Sideload `app-release.apk` to physical Android device via USB/ADB and confirm SQLite operations.
2. **Version Control Finalization:** Commit local build configuration fixes and push release tag `v0.5.0` to remote `develop` and `main` branches.
3. **Distribution Setup:** Upload release APK to GitHub Releases and Google Drive public download link.
