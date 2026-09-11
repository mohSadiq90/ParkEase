# 🛠️ Built With: ParkEase Mobile Platform

This document outlines the **25 core technologies, frameworks, and architectural components** powering the **ParkEase Mobile Application**. These tags are prepared specifically for hackathon and project showcases (such as **Devpost**'s *"Built with"* section, which accepts up to 25 tags).

---

## 🏷️ Devpost Tags (Copy-Paste Formats)

### 📋 Comma-Separated (Single-Field Devpost Paste)
```text
react-native, expo, javascript, redux-toolkit, react-navigation, react-native-maps, axios, secure-store, barcode-scanner, google-signin, apple-sso, stripe, firebase, posthog, jest, react-native-testing-library, github-actions, android, ios, lpr-recognition, eventbus, linear-gradient, vector-icons, safe-area-insets, monorepo
```

### 🔘 Space-Separated / Tag Pills
`react-native` `expo` `javascript` `redux-toolkit` `react-navigation` `react-native-maps` `axios` `secure-store` `barcode-scanner` `google-signin` `apple-sso` `stripe` `firebase` `posthog` `jest` `react-native-testing-library` `github-actions` `android` `ios` `lpr-recognition` `eventbus` `linear-gradient` `vector-icons` `safe-area-insets` `monorepo`

---

## 🏗️ Detailed Breakdown of 25 Core Technologies

| # | Tag / Technology | Category | Role in ParkEase Mobile Architecture |
|---|---|---|---|
| 1 | `react-native` | Core Framework | Cross-platform native mobile foundation (v0.81.5) with high-performance concurrent rendering. |
| 2 | `expo` | Mobile Platform Engine | Managed Expo SDK 54 runtime enabling native module bridges, OTA configuration, and isolated builds. |
| 3 | `javascript` | Programming Language | Modern ECMAScript (ES2024) with asynchronous async/await flow and strict linting. |
| 4 | `redux-toolkit` | State Management | Centralized immutable store slices (`authSlice`, `parkingSlice`, `bookingSlice`, `adminSlice`, `corporateSlice`). |
| 5 | `react-navigation` | App Navigation | Type-safe native stack navigation, deep linking, 4-tab bottom navigation, and auth guard workflows. |
| 6 | `react-native-maps` | Geospatial & Maps | Interactive parking facility discovery, custom map markers, radius clustering, and route guidance. |
| 7 | `axios` | Networking / REST API | REST client with automated token interceptors, exponential backoff, and unified error handling. |
| 8 | `secure-store` | Security & Cryptography | Encrypted keychain and keystore storage for JWT tokens, session keys, and sensitive biometric hashes. |
| 9 | `barcode-scanner` | Hardware & Optics | Real-time QR code reader for digital parking passes, instant garage entry, and gate barrier scanning. |
| 10 | `google-signin` | Identity & Authentication | Native OAuth 2.0 single sign-on with Google Play Services and backend JWT exchange. |
| 11 | `apple-sso` | Identity & Authentication | Apple ID identity provider integration ensuring privacy-first biometric authentication on iOS. |
| 12 | `stripe` | Payment Processing | PCI-compliant mobile payment sheets, Apple Pay, Google Pay, and instant wallet transactions. |
| 13 | `firebase` | App Distribution & Cloud | Automated debug & release APK delivery via Firebase App Distribution with automated tester onboarding. |
| 14 | `posthog` | Telemetry & Product Analytics | Privacy-conscious user journey tracking, funnel conversion analytics, and screen dwell metrics. |
| 15 | `jest` | Automated QA Testing | Unit and integration test runner with 100% test pass rate across all 36 test suites. |
| 16 | `react-native-testing-library` | Component QA | User-centric UI component testing, user interaction simulation, and accessibility testing. |
| 17 | `github-actions` | CI / CD Automation | Continuous integration pipelines for linting, testing, and continuous Android APK distribution. |
| 18 | `android` | Operating System / Platform | Native Android 14+ release engine with deterministic debug/release keystores and Gradle optimizations. |
| 19 | `ios` | Operating System / Platform | Native Apple iOS CocoaPods integration with dynamic safe-area insets and Apple HIG layout compliance. |
| 20 | `lpr-recognition` | Computer Vision / Smart Parking | Automated License Plate Recognition (ALPR) for touchless gate barrier opening and vehicle registration. |
| 21 | `eventbus` | Reactive Architecture | Lightweight decoupled publish-subscribe event bus for cross-module banners and real-time alerts. |
| 22 | `linear-gradient` | UI / UX Design | Premium visual hero backgrounds, branded splash screens, and status gradients (`colors.gradients`). |
| 23 | `vector-icons` | Design System | Scalable Ionicons vector glyphs providing iconography across search, booking, and garage tabs. |
| 24 | `safe-area-insets` | Responsive Layout | Dynamic notch, dynamic island, and home indicator inset handling across all mobile screen form factors. |
| 25 | `monorepo` | Project Architecture | Monorepo isolation keeping mobile builds, caches, and test suites completely independent from web/backend. |

---

## 📱 In-App Access
Users and reviewers can view the complete list of 25 technologies directly inside the application:
1. Navigate to the **Menu** tab (bottom navigation).
2. Scroll to the **About & System** section.
3. Tap **Built With** (or tap the version footer at the bottom).
4. An interactive modal displays all 25 technologies, categories, and direct Devpost submission text.
