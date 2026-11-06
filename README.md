# eTrak

> A modern, private, cross-platform expense tracker built with Expo, React Native Web, TypeScript, and local SQLite.

[![Live Web App](https://img.shields.io/badge/Live%20Web-etrak.pages.dev-7c3aed?style=flat-square)](https://etrak.pages.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/badge/Release-v0.4.0-success?style=flat-square)](https://github.com/hypershot116/eTrak/releases)

---

## Live Web Application

Access the official web application on any modern desktop or mobile browser:
**[https://etrak.pages.dev](https://etrak.pages.dev)**

_iOS / Safari Users:_ Tap **Share** -> **Add to Home Screen** to install eTrak as a standalone Progressive Web App (PWA).

---

## Privacy & Security Guarantee

eTrak is engineered around a **strict local-first architecture**. Your financial data belongs exclusively to you:

- **Zero Central Database**: There is no central backend server, company API, or remote database tracking your identity or expenses.
- **Sandboxed Local-First Storage**: All records, categories, and settings are stored locally on your device within an encrypted SQLite database.
- **Isolated Cloud Backups**: When Google backup is connected, backups are written directly to your personal Google Drive inside a hidden system directory (`appDataFolder`).
- **Minimal OAuth Scopes**: The application only requests access to its own private directory (`https://www.googleapis.com/auth/drive.appdata`). It has zero permission to view, read, or modify any other files in your Google Drive.
- **Zero Telemetry / Monetization**: No advertising SDKs, data brokers, or third-party trackers are bundled.

---

## Key Features

- **Day-by-Day Financial Tracking**: Intuitive swipe navigation across consecutive days with spending progress indicators.
- **Custom Categories with Emoji**: Organize transactions with rich category identifiers.
- **Multi-Currency Ready**: Track expenses across global currencies.
- **Futuristic Dark & Violet Design**: Polished, responsive interface optimized for desktop, tablet, and mobile screens.
- **PDF Report Generation**: Instant exportable financial statements and spending summaries.
- **Google Drive Sync (Web)**: Seamless backup and restore without giving third-party servers custody of your financial records.

---

## Release Notes & Roadmap

### Current Release: v0.4.0

- Local-first SQLite database layer with instant hot-reload persistence.
- Dark + Violet UI theme with custom accent color picker.
- Continuous deployment configured via Cloudflare Pages.
- Google Drive `appDataFolder` backup and automatic restoration on Web.

### Upcoming Milestones

- **v0.5.0**: Standalone Android APK download link via Google Drive.
- **v0.6.0**: Native Android Google Play Services account picker and automated sync.
- **v0.7.0**: Live currency exchange rates and automated conversion.

---

## Local Development

```bash
# Clone the repository
git clone [https://github.com/hypershot116/eTrak.git](https://github.com/hypershot116/eTrak.git)
cd eTrak

# Install dependencies
pnpm install

# Configure environment variables
cp apps/mobile/.env.example apps/mobile/.env

# Run local development server
cd apps/mobile
pnpm start
```
