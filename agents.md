# Agent Guidelines & Repository Architecture 🤖🚗

Welcome to the **ParkEase** repository. This document serves as the primary technical entry point and operating manual for autonomous AI agents, LLM coding assistants, and human engineers contributing to the codebase.

---

## 📚 Essential Documentation Links

- **Technical & Screen Specification:** [`SPECIFICATION.md`](./SPECIFICATION.md) — Exhaustive system architecture, domain models, navigation hierarchy, and detailed specification for every mobile screen and portal. **Refer to this document to understand, create, refactor, or verify any screen in ParkEase.**
- **Daily Work Tracker & Context:** [`PROGRESS.md`](./PROGRESS.md) — Daily dated entries detailing all implemented features, bug fixes, key modified files, and open roadmap items.
- **Mobile API Reference:** [`API_ENDPOINTS_MOBILE.md`](./API_ENDPOINTS_MOBILE.md) — Complete endpoint reference matching ASP.NET Core controllers (auth, bookings, parking, IoT, corporate, reviews, passes).
- **Project Overview & Tech Stack:** [`README.md`](./README.md) — Product documentation, architecture summary, local setup guide, and caching specifications.
- **Agent Operating Rules & SOPs:** [`GEMINI.md`](./GEMINI.md) — Mandatory pre-work git sync, 5GB VPS disk space constraints, mobile-only scope, keyboard handling checklist, and post-work commit/push rules.

---

## 🏛️ Codebase Structure & Key Files

```
ParkEase/
├── SPECIFICATION.md          # Complete technical architecture & screen-by-screen specification
├── agents.md                 # Agent onboarding and operational guidelines (this file)
├── PROGRESS.md               # Daily changelog and sprint progress tracker
├── GEMINI.md                 # Automated agent SOP rules and mobile-only scope
├── README.md                 # Product documentation and setup instructions
├── API_ENDPOINTS_MOBILE.md   # Exhaustive mobile REST API endpoint reference
├── Mobile/                   # React Native (Expo SDK 54) Mobile Application
│   ├── App.js                # Root application entry with Redux Provider & SafeArea
│   ├── app.json              # Expo configuration and Android package settings
│   ├── src/
│   │   ├── navigation/
│   │   │   ├── RootNavigator.js       # Auth conditional navigation & deep link listener
│   │   │   ├── AuthNavigator.js       # Login & Signup stack
│   │   │   └── AppTabNavigator.js     # Unified bottom tabs (Home, Search, Listings, Bookings, Menu)
│   │   ├── screens/
│   │   │   ├── Splash/                # Brand launch screen with session verification
│   │   │   ├── Auth/                  # LoginScreen, SignupScreen (Personal, Corporate, Google SSO)
│   │   │   ├── Member/                # MemberDashboardScreen, EventPackagesScreen
│   │   │   ├── Vendor/                # VendorDashboardScreen, MyListingsScreen, CreateParkingScreen,
│   │   │   │                          # VendorBookingsScreen, AccessPassScannerScreen, LprSettingsScreen
│   │   │   ├── Corporate/             # CorporateDashboard, Members, Allocations, Invoices, Leases
│   │   │   ├── Admin/                 # AdminDashboardScreen (KPIs, listing verification, outbox)
│   │   │   ├── Search/                # SearchScreen, MapViewComponent, ParkingDetailScreen
│   │   │   ├── Booking/               # BookingScreen, BookingDetailScreen, MyBookingsScreen
│   │   │   ├── Payment/               # PaymentScreen (Stripe mobile checkout)
│   │   │   ├── Chat/                  # ConversationListScreen, ChatScreen (SignalR messaging)
│   │   │   ├── Notifications/         # NotificationsScreen (Activity feed & direct deep links)
│   │   │   ├── Profile/               # ProfileScreen, EditProfileScreen, ChangePasswordScreen
│   │   │   ├── Vehicles/              # VehiclesScreen (My Garage)
│   │   │   ├── Favorites/             # FavoritesScreen (Saved spots)
│   │   │   ├── Passes/                # MyPassesScreen (Digital weekly, monthly, corporate passes)
│   │   │   ├── Review/                # ReviewsListScreen, CreateReviewScreen
│   │   │   ├── Tools/                 # LprSimulatorScreen, EvChargeSimulatorScreen
│   │   │   └── Menu/                  # MenuScreen (Central application directory)
│   │   ├── store/
│   │   │   └── slices/                # Redux Toolkit slices (auth, booking, parking, iot, etc.)
│   │   ├── services/                  # API client, SignalR hubs, PostHog, push notifications
│   │   └── styles/
│   │       └── globalStyles.js        # Color tokens, typography, spacing, shadows
│   └── android/                       # Native Android project (debug.keystore, build scripts)
├── backend/                  # .NET 9 Web API Clean Architecture backend
├── frontend/                 # React 18 / Vite web application
└── .github/workflows/
    └── build-and-distribute.yml # Remote CI/CD: compile, Firebase App Distribution, Slack alerts
```

---

## 📱 Navigation & Screen Catalog Summary

The mobile architecture uses an adaptive tab navigator based on user role (`AppTabNavigator.js`), with full cross-access to all tools via `MenuScreen`:

| Tab / Stack | Key Screens & Components | Primary Capabilities | Key Reference File |
|---|---|---|---|
| **HomeTab** | `DynamicDashboardScreen` (`MemberDashboard`, `VendorDashboard`, `CorporateDashboard`) | Live occupancy, revenue KPIs, active booking timers, pending approval alerts, and quick action tiles. | `AppTabNavigator.js:HomeStack` |
| **SearchTab** | `SearchScreen`, `MapViewComponent`, `ParkingDetailScreen`, `BookParking` | Interactive map, address autocomplete, dynamic rate filters, spot availability forecast, and space details. | `AppTabNavigator.js:SearchStack` |
| **ListingsTab** | `MyListingsScreen`, `CreateParkingScreen`, `AccessPassScanner`, `LprSettings` | 4-step wizard to list spaces, manage hourly/daily rates, scan gate QR codes, and configure LPR barrier rules. | `AppTabNavigator.js:ListingsStack` |
| **BookingsTab** | `DynamicBookingsScreen` (`MyBookings`, `IncomingBookings`), `BookingDetailScreen` | Check-in/out, duration extensions, valet tracking, Apple/Google wallet passes, and payment receipts. | `AppTabNavigator.js:BookingsStack` |
| **CorporateTab** | `CorporateDashboard`, `CorporateMembers`, `CorporateAllocations`, `CorporateInvoices` | Multi-company enterprise quota management, fixed/shared bay allocations, and monthly billing statements. | `CorporateDashboardScreen.js` |
| **MenuTab** | `MenuScreen`, `ProfileScreen`, `VehiclesScreen`, `MyPassesScreen`, Simulators | Central hub for account settings, garage assets, LPR hardware simulator, EV charger simulator, and messages. | `MenuScreen.js` |

---

## 🛠️ Developer & Agent Rules of Engagement

1. **Remote Repository Synchronization:**
   - Always run `git status` and pull latest changes from `origin/main` before modifying any files:
     ```bash
     git pull origin main
     ```
2. **Exclusive Mobile Scope:**
   - All implementation tasks, features, and UI modifications are strictly scoped to the Mobile React Native application (`Mobile/`). Never modify backend or web frontend unless explicitly requested.
3. **5GB VPS Disk Limit:**
   - Keep all temporary build and package caches in `/tmp` or `/var/tmp/appdemo885_data/`. Never write heavy artifacts to local home directories.
4. **Automated Remote Builds:**
   - Do **NOT** run heavy build commands locally on the VPS host.
   - Compilation, testing, and Firebase distribution are automatically executed by GitHub Actions (`.github/workflows/build-and-distribute.yml`) upon push to `origin/main`.
5. **Keyboard Handling Checklist:**
   - All modals, bottom sheets, and forms with inputs MUST be wrapped in `KeyboardAvoidingView` + `ScrollView` with `keyboardShouldPersistTaps="handled"`, `maxHeight` constraints, and interactive backdrop dismissals.
6. **Mandatory Post-Work Commit & Push:**
   - Add a dated entry in `PROGRESS.md` under `## 📅 Daily Work & Progress Log`.
   - Commit changes with conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`).
   - Push to `origin main` to trigger the CI/CD pipeline and Slack notifications:
     ```bash
     git push origin main
     ```
