<div align="center">

# eTrak

**A Local-First, Privacy-Preserving Financial Tracking System**

Built with Expo SDK 58, React Native, TypeScript, Embedded SQLite, and Sandboxed Cloud Sync.

[![Live Web App](https://img.shields.io/badge/Production%20Web-etrak.pages.dev-7c3aed?style=for-the-badge&logo=cloudflarepages&logoColor=white)](https://etrak.pages.dev)
[![Download APK](https://img.shields.io/badge/Android%20Binary-v0.5.0%20APK-059669?style=for-the-badge&logo=android&logoColor=white)](https://github.com/hypershot116/eTrak/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-3b82f6?style=for-the-badge)](LICENSE)

<br/>

<p align="center">
  <a href="#quick-demo--testing-instructions">Quick Testing</a> •
  <a href="#architectural-highlights">Architecture</a> •
  <a href="#privacy--security-guarantee">Security Model</a> •
  <a href="#technical-stack">Tech Stack</a> •
  <a href="#local-build--engineering">Build Pipeline</a> •
  <a href="#roadmap">Roadmap</a>
</p>

</div>

---

## Executive Summary

**eTrak** is an engineering project addressing the custodian risk in personal financial technology. Unlike typical expense apps that require user sign-ups and harvest transaction data into central relational databases, eTrak uses a **strict local-first architecture**.

Records are maintained in an embedded SQLite database on the client runtime, ensuring instant offline capability, zero external telemetry, and complete data ownership. For users requiring cross-device persistence, eTrak integrates client-side Google Drive synchronization restricted exclusively to an isolated sandbox (`appDataFolder`).

---

## Quick Demo & Testing Instructions

Recruiters and evaluators can test the project across both deployment targets:

### 1. Test Live Web App (Zero Setup Required)
* **URL:** **[https://etrak.pages.dev](https://etrak.pages.dev)**
* **Features to evaluate:**
  - Day-by-day continuous timeline swipe with reactive budget counters.
  - Transaction persistence across browser refreshes via client SQLite.
  - PDF financial summary statement generation.
  - Automated cloud backup and restoration via Google OAuth (isolated `appDataFolder` scope).
  - *PWA Installable:* On mobile Safari/Chrome, select **Add to Home Screen** for full standalone UI.

### 2. Test Native Android Application (.APK)
* **Direct Binary Release:** **[Download eTrak-v0.5.0-release.apk](https://github.com/hypershot116/eTrak/releases)**
* **Local Artifact Path:** `dist/eTrak-v0.5.0-release.apk`
* **Target Environment:** Compatible with Android 7.0 (API Level 24) through Android 15 (API Level 35+).
* **Installation via ADB:**
  ```bash
  adb install dist/eTrak-v0.5.0-release.apk
  ```

---

## Architectural Highlights

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                CLIENT RUNTIME                           │
│                                                                         │
│   ┌────────────────────────┐             ┌──────────────────────────┐   │
│   │   React Native (Web)   │             │   Native Android Runtime │   │
│   │  Tailwind CSS Theming  │             │   Expo SDK 58 Prebuild   │   │
│   └───────────┬────────────┘             └────────────┬─────────────┘   │
│               │                                       │                 │
│               └───────────────────┬───────────────────┘                 │
│                                   ▼                                     │
│                     ┌───────────────────────────┐                       │
│                     │   Local Embedded SQLite   │                       │
│                     │  (Encrypted local tables) │                       │
│                     └─────────────┬─────────────┘                       │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │ Direct OAuth 2.0 Client Auth
                                    ▼ (No intermediary server)
                      ┌───────────────────────────┐
                      │    Google Drive API       │
                      │    (appDataFolder only)   │
                      └───────────────────────────┘
```

1. **Zero Central Database**: No intermediary server, API gateway, or company storage exists. All operations execute strictly client-side.
2. **Monorepo Structure**: Managed via PNPM workspaces, isolating the core mobile and web build manifests while sharing universal types and validation models.
3. **Dual Deployment Pipeline**:
   - **Continuous Web Deployment**: Automated Git CI/CD integrated with Cloudflare Pages edge network on `main` branch pushes.
   - **Offline Native Compilation**: Native C++/Kotlin/Java toolchain configured on Ubuntu via Gradle 9.4.1 and Android NDK 27, compiling standalone binaries without cloud build dependencies.

---

## Privacy & Security Guarantee

* **Sandboxed Storage:** All transactions, categories, and account budgets are stored locally on the device in an embedded SQLite database.
* **Isolated Cloud Scope:** When Google backup is connected, the app requests only `https://www.googleapis.com/auth/drive.appdata`. It has **zero permission** to view, read, or modify any user files in personal Google Drive folders.
* **Zero Telemetry / Monetization:** No advertising identifiers, telemetry trackers, or external third-party SDKs are embedded.

---

## Technical Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React Native (0.88.1), Expo SDK 58, React 19, Expo Router |
| **Languages** | TypeScript, Kotlin, Java, Modern C++ (JNI bindings) |
| **Local Database** | Embedded SQLite (`@expo-sqlite`, `op-sqlite`) |
| **Styling & Design** | Tailwind CSS / NativeWind (Futuristic Violet & Dark Palette) |
| **Authentication & Cloud** | Google Identity Services OAuth 2.0 (`drive.appdata` scope) |
| **CI/CD & Hosting** | Cloudflare Pages, GitHub Actions / Git Versioning |
| **Toolchain & Build** | PNPM Monorepo, OpenJDK 17, Android SDK Platform 34/37, Gradle 9.4.1 |

---

## Local Build & Engineering Instructions

### Prerequisites
* Node.js v22+
* pnpm v12+
* OpenJDK 17 & Android Command-Line Tools (Platform 34+, NDK 26+)

### Installation & Web Development
```bash
# Clone the repository
git clone https://github.com/hypershot116/eTrak.git
cd eTrak

# Install monorepo dependencies
pnpm install

# Configure environment variables
cp apps/mobile/.env.example apps/mobile/.env

# Run local web development server
cd apps/mobile
pnpm start
```

### Local Standalone APK Compilation
```bash
# Generate native Android project files
npx expo prebuild --platform android

# Compile release APK using native Gradle toolchain
cd android
./gradlew clean
./gradlew assembleRelease
```

---

## Roadmap

- [x] **v0.1.0** — Monorepo setup with Expo Router and local SQLite schemas.
- [x] **v0.2.0** — Futuristic Violet/Dark theme, swipeable timeline, and PDF report export.
- [x] **v0.3.0** — Google Drive `appDataFolder` backup and restore logic.
- [x] **v0.4.0** — Continuous deployment setup on Cloudflare Pages (`etrak.pages.dev`).
- [x] **v0.5.0** — Local native Android standalone APK compilation and artifact standardization.
- [ ] **v0.6.0** — Native Android Google Play Services account picker and automated silent sync.
- [ ] **v0.7.0** — Live currency exchange rate integration and multi-currency converter.

---

## License

This project is open-source under the [MIT License](LICENSE).
