# ParkEase: Technical Architecture & Screen-by-Screen Specification

## 1. Executive Summary & Product Architecture

**ParkEase** is an enterprise-grade smart parking management ecosystem comprising a cross-platform mobile application (React Native / Expo SDK 54), a responsive web portal (React 18 / Vite), and a high-performance backend (.NET 9 Web API) supported by PostgreSQL, PostGIS, Upstash Redis caching, SignalR real-time communications, Stripe payment processing, and Cloudflare R2 object storage.

ParkEase unifies consumer parking discovery and booking, private host / vendor monetization, corporate fleet / employee quota parking, and hardware-integrated IoT operations (License Plate Recognition / LPR gates, OCPP EV charging stations) into a cohesive experience.

### 1.1 Platform & Tech Stack Overview
- **Mobile Client:** React Native (Expo SDK 54), Redux Toolkit, React Navigation v6, React Native Maps, Expo ImagePicker, Expo BarCodeScanner, PostHog Telemetry.
- **Web Frontend:** React 18, Vite, React Router v6, Tailwind CSS, Recharts, Leaflet, Axios.
- **Backend API:** .NET 9 Web API, C# 13, Clean Architecture + Domain-Driven Design (DDD), custom CQRS pipeline, Transactional Outbox.
- **Data Persistence:** PostgreSQL 16 + PostGIS extension, EF Core 9, Dapper read models.
- **Distributed Cache:** Upstash Redis (`rediss://`) via StackExchange.Redis with automatic in-memory fallback.
- **Real-Time & Push:** SignalR WebSockets (Notifications Hub, Chat Hub), Firebase Cloud Messaging (FCM) push tokens.
- **Hardware & IoT:** LPR barrier cameras (OCR plate whitelisting/blacklisting), OCPP 1.6J/2.0.1 EV charging stations.
- **Payments:** Stripe Payment Intents, Apple Pay, Google Pay, itemized GST/VAT tax invoices.
- **Delivery & CI/CD:** GitHub Actions -> Android Debug APK -> Firebase App Distribution -> Slack `#qa-builds-android`.

---

## 2. System Architecture & Domain Model

```
                    ┌───────────────────────────────────────────────┐
                    │               Client Interfaces               │
                    │  React Native (Mobile)  │  React 18 (Web SPA) │
                    └───────────────────────┬───────────────────────┘
                                            │ HTTPS / WSS
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │            ASP.NET Core Web API 9             │
                    │   JWT Authentication  │  Rate Limiting / CORS │
                    │   SignalR Hubs (/notifications, /chat)        │
                    └───────────────────────┬───────────────────────┘
                                            │
                     CQRS Command / Query Dispatcher Pipeline
                                            │
               ┌────────────────────────────┼────────────────────────────┐
               ▼                            ▼                            ▼
   ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
   │ Marketplace Slices    │   │ Corporate Slices      │   │ IoT & Smart Hub       │
   │ - Spaces & Search     │   │ - Companies & Orgs    │   │ - LPR Camera Keys     │
   │ - Bookings & Valet    │   │ - Leases & Allocs     │   │ - Plate OCR Rules     │
   │ - Payments & Passes   │   │ - Member Quotas       │   │ - EV Charging (OCPP)  │
   │ - Reviews & Ratings   │   │ - Billing & Invoices  │   │ - Event Pass Scanner  │
   └───────────┬───────────┘   └───────────┬───────────┘   └───────────┬───────────┘
               │                           │                           │
               └───────────────────────────┼───────────────────────────┘
                                           ▼
                    ┌───────────────────────────────────────────────┐
                    │              Infrastructure Layer             │
                    │  EF Core 9 (Write Aggregates)                 │
                    │  Dapper (Geo / Search Read Models)            │
                    │  PostgreSQL 16 + PostGIS (Spatial queries)    │
                    │  Upstash Redis (Distributed Cache)            │
                    │  Transactional Outbox (Domain Events)         │
                    │  Cloudflare R2 (S3-compatible Media Storage)  │
                    │  Stripe Gateway & Resend Email Services       │
                    └───────────────────────────────────────────────┘
```

### 2.1 Core Domain Entities
1. **User / Identity:** Roles: Member (Driver), Vendor (Host), Corporate Admin, Platform Admin. JWT bearer authentication with access and refresh token lifecycle.
2. **Parking Space (Listing):** Spatial coordinates (Point geometry), physical dimensions, parking type (Open, Covered, Garage, Street, Underground), listing category (Airport, Event, Transit, Residential, Commercial), dynamic pricing engine, EV charging capabilities, LPR barrier integration.
3. **Booking:** Reservation aggregate tracking states: `Pending`, `AwaitingPayment`, `Confirmed`, `InProgress`, `Completed`, `Cancelled`, `Rejected`, `Expired`. Supports valet requests, check-in/out stamps, duration extensions, itemized pricing breakdown.
4. **Access Pass:** Digital pass tokens (Daily, Weekly, Monthly, Corporate) with QR codes, NFC Apple Wallet (`.pkpass`), and Google Wallet support.
5. **Vehicle:** Registered driver garage asset (Make, Model, License Plate, Color, Vehicle Type, Default flag).
6. **Corporate Organization:** Multi-tenant company entity with member seats, allocated bays (Fixed vs Shared), quota enforcement, waitlists, and monthly billing invoices.
7. **IoT LPR Rule:** Camera device registration, OCR license plate whitelist/blacklist rules, automatic barrier trigger log.
8. **EV Charging Session:** kWh energy delivered, live charging power, rate per kWh, OCPP session connector status.
9. **Review & Rating:** 1-5 star ratings, textual feedback, multi-photo attachments, and host responses.

---

## 3. Navigation Architecture & Routing Pipeline

```
                                  ┌───────────────────────────┐
                                  │       RootNavigator       │
                                  └─────────────┬─────────────┘
                                                │
                              Is User Authenticated & Valid?
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
             ┌───────────────────┐                             ┌───────────────────┐
             │   AuthNavigator   │                             │  AppTabNavigator  │
             │  - LoginScreen    │                             │   (Bottom Tabs)   │
             │  - SignupScreen   │                             └─────────┬─────────┘
             └───────────────────┘                                       │
                                                                         │
       ┌────────────────┬────────────────┬───────────────────────────────┼────────────────┐
       ▼                ▼                ▼                               ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐              ┌────────────────┐ ┌──────────────┐
│   HomeTab    │ │  SearchTab   │ │ ListingsTab  │              │  BookingsTab   │ │   MenuTab    │
│  (Stack)     │ │  (Stack)     │ │ (Vendor)     │              │  (Stack)       │ │  (Hub Stack) │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘              └────────┬───────┘ └──────┬───────┘
       │                │                │                               │                │
 Dynamic Dash    Search & Detail  Listings & Wizard             Dynamic Bookings   Full Tools &
 (Role-Aware)    Booking & Pay    Pass Scanner & LPR            Detail, Pass, QR   Admin Portals
```

### 3.1 Adaptive Role-Based Navigation
- **Member Persona:** Bottom tabs show: `HomeTab`, `SearchTab`, `BookingsTab`, `MenuTab`.
- **Vendor / Host Persona:** Bottom tabs show: `HomeTab`, `BookingsTab`, `ListingsTab`, `MenuTab`.
- **Corporate Admin Persona:** Bottom tabs show: `HomeTab`, `CorporateInventoryTab`, `BookingsTab`, `MenuTab`.
- **Deep Linking Engine:** Supports `parkease://` custom URI scheme and universal HTTPS links for corporate SSO callbacks (`parkease://sso-callback?sso_code=...`) and direct push notification routing via `NotificationService`.

---

## 4. Design System & Global Standards

### 4.1 Color Tokens (`colors`)
- **Brand Primary:** `#2563EB` (Royal Blue)
- **Primary Accent / Interactive:** `#4F46E5` (Indigo)
- **Primary Dark:** `#1E40AF`
- **Surface / Background:** `#FFFFFF` (Light), `#0F172A` (Dark Slate Surface)
- **Card Background:** `#F8FAFC`
- **Text Primary:** `#0F172A`
- **Text Secondary:** `#475569`
- **Text Tertiary:** `#94A3B8`
- **Success:** `#10B981` (Emerald)
- **Warning:** `#F59E0B` (Amber)
- **Danger / Error:** `#EF4444` (Rose Red)
- **Border Light:** `#E2E8F0`

### 4.2 Form Visibility & Keyboard Handling Checklist
All screens, modals, and bottom sheets containing inputs strictly conform to the 7-point checklist:
1. Wrap container in `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>`.
2. Enclose fields in a `<ScrollView>` with `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="on-drag"`.
3. Constrain modal dimensions (`maxHeight: '85%'` or `'90%'` with `flexShrink: 1`).
4. Provide interactive backdrop dismissal on touch outside.
5. Persistent taps on buttons, chips, and radio pills.
6. Pinned, accessible modal headers.
7. Automated unit test verification for keyboard containment.

---

## 5. Detailed Screen-by-Screen Specification

---

### 5.1 SplashScreen
- **Identifier:** `SplashScreen`
- **File Path:** `Mobile/src/screens/Splash/SplashScreen.js`
- **Route:** Initial bootstrap screen inside `RootNavigator`
- **User Persona:** All users on cold launch or session verification
- **Purpose:** Present polished brand identity while `restoreSessionThunk` checks stored JWT tokens in SecureStore.
- **State & Data Sources:** Local `fadeAnim`, `scaleAnim`, `pulseAnim`, `progressAnim`. Listens to `authSlice.isSessionChecked`.
- **Layout & Components:** Fullscreen `LinearGradient` background (`#0F172A` to `#1E1B4B`), animated ParkEase emblem with ambient breathing pulse ring, animated progress indicator bar, version tag (`v1.0.0`), and brand tagline ("Smart Parking Made Effortless").
- **Interactions:** Automatic transition: if valid token exists, transitions to `AppTabNavigator`; otherwise mounts `AuthNavigator`.
- **Unit Tests:** `Mobile/src/screens/Splash/__tests__/SplashScreen.test.js`.

---

### 5.2 LoginScreen
- **Identifier:** `Login`
- **File Path:** `Mobile/src/screens/Auth/LoginScreen.js`
- **Route:** `AuthNavigator -> Login`
- **User Persona:** Returning drivers, hosts, corporate staff, and administrators
- **Purpose:** Authenticate users via credentials, corporate domain SSO, or social identity providers.
- **State & Data Sources:** `authSlice` (`login`, `loginCorporate`, `loginCorporateSso`, `loginExternal`, `loading`, `error`). Form state: `email`, `password`, `companyId`, `loginMode` ('personal' | 'corporate').
- **Layout & Components:**
  - Gradient header with brand emblem and welcome copy.
  - Mode switch tabs: "Personal Account" vs "Corporate Enterprise".
  - Form fields: Email input (with auto-capitalization off, email keyboard), Password input (with secure text toggle eye icon), optional Company Code input (in corporate mode).
  - Corporate SSO button ("Sign in with Corporate SSO / SAML").
  - Google Social Sign-In button (`googleAuthService.signIn()`).
  - Action button: Primary "Sign In" button with loading spinner.
  - Footer link: "Don't have an account? Sign Up".
- **Keyboard Handling:** Wrapped in `KeyboardAvoidingView` + `ScrollView` with `keyboardShouldPersistTaps="handled"`.
- **Unit Tests:** `Mobile/src/screens/Auth/__tests__/LoginScreen.test.js`.

---

### 5.3 SignupScreen
- **Identifier:** `Signup`
- **File Path:** `Mobile/src/screens/Auth/SignupScreen.js`
- **Route:** `AuthNavigator -> Signup`
- **User Persona:** New drivers and prospective parking space hosts
- **Purpose:** Onboard new users into the ParkEase ecosystem.
- **State & Data Sources:** `authSlice` (`registerThunk`). Local state: `fullName`, `email`, `phoneNumber`, `password`, `confirmPassword`, `role` (Member vs Vendor).
- **Layout & Components:** Header back button, role selector pills ("Driver / Member" vs "Space Host / Vendor"), validated text input fields, password strength indicator, Terms of Service agreement checkbox, and submit button.
- **Interactions:** Client-side validation for email syntax, phone length, password complexity (min 8 chars, numbers, symbols); on success, automatically persists JWT tokens and routes to the dashboard.
- **Keyboard Handling:** Auto-scrolls to focused input; dismisses keyboard on scroll drag.

---

### 5.4 MemberDashboardScreen
- **Identifier:** `MemberDashboard` / `Dashboard` (when role is Member)
- **File Path:** `Mobile/src/screens/Member/MemberDashboardScreen.js`
- **Route:** `AppTabNavigator -> HomeTab -> Dashboard`
- **User Persona:** Drivers and regular members
- **Purpose:** Primary command center for drivers: quick stats, upcoming bookings, active parking status, and rapid discovery shortcuts.
- **State & Data Sources:** `dashboardSlice` (`getMemberDashboardThunk`, `memberDashboard`, `memberLoading`), `authSlice.user`.
- **Layout & Components:**
  - Personalized greeting header with user avatar, name, and notification bell with unread badge.
  - Quick Search Bar: Tappable search pill triggering navigation to `SearchScreen`.
  - 2x2 Metric Cards: "Total Bookings", "Active Bookings", "Completed", "Total Spent" with trend indicators.
  - Active Parking Banner: If a booking is currently in progress, displays live countdown timer, parking space name, assigned bay, and quick "Open Gate Pass" / "Directions" buttons.
  - Quick Action Chips: "Find Parking", "My Garage", "My Passes", "Event Passes", "Saved Spots".
  - Recent Bookings List: Cards showing date, time, space title, vehicle plate, and status badge.
- **Interactions:** Pull-to-refresh (`EnhancedRefreshControl`); tapping any card navigates to the corresponding detail screen.
- **Unit Tests:** `Mobile/src/screens/Member/__tests__/MemberDashboardScreen.test.js`.

---

### 5.5 VendorDashboardScreen
- **Identifier:** `VendorDashboard` / `Dashboard` (when role is Vendor)
- **File Path:** `Mobile/src/screens/Vendor/VendorDashboardScreen.js`
- **Route:** `AppTabNavigator -> HomeTab -> Dashboard`
- **User Persona:** Parking lot operators, private space hosts, and venue managers
- **Purpose:** Operational dashboard for hosts: revenue metrics, occupancy tracking, pending booking requests, and fast access to host tools.
- **State & Data Sources:** `dashboardSlice` (`getVendorDashboardThunk`, `vendorDashboard`, `vendorLoading`), `bookingSlice` (`approveBookingThunk`, `rejectBookingThunk`).
- **Layout & Components:**
  - Host KPI Grid: "Total Revenue" (formatted currency), "Total Bookings", "Active Listings", "Real-Time Occupancy Rate %".
  - Actionable Pending Nudge Banner: High-priority amber banner ("⚡ X bookings require host approval") linking directly to pending incoming bookings.
  - Live Occupancy Gauge: Progress bar illustrating Available vs Occupied vs Reserved bays.
  - Host Operations & Tools Grid (6 tiles): "Add Space", "My Listings", "Host Bookings", "Gate Scanner", "LPR Barrier", "Event Passes".
  - Testing & Simulators Section (2 tiles): "LPR Hardware Simulator", "EV Charge Simulator".
  - Recent Incoming Bookings: Displays booking cards with driver name, vehicle plate, requested time window, and 1-tap "Accept" and "Decline" buttons.
- **Interactions:** Instant booking approval/rejection updates Redux state optimistically and triggers background push notification to the driver.
- **Unit Tests:** `Mobile/src/screens/Vendor/__tests__/VendorDashboardScreen.test.js`.

---

### 5.6 CorporateDashboardScreen
- **Identifier:** `CorporateDashboard` / `Dashboard` (when role is Corporate)
- **File Path:** `Mobile/src/screens/Corporate/CorporateDashboardScreen.js`
- **Route:** `AppTabNavigator -> HomeTab -> CorporateDashboard`
- **User Persona:** Corporate facility managers and enterprise fleet administrators
- **Purpose:** Manage enterprise parking quotas, member allocations, company facilities, and invoices.
- **State & Data Sources:** `corporateSlice` (`fetchMyCompanies`, `myCompanies`, `activeCompanyId`, `isLoading`).
- **Layout & Components:**
  - Company Switcher: Dropdown selector allowing enterprise admins managing multiple entities to switch context.
  - Corporate Metric Cards: "Active Members", "Total Allocations", "Current Month Invoiced", "Total Spaces Owned/Leased".
  - Quick Operations: "Manage Members", "Manage Allocations", "Invoices & Billing", "Browse Marketplace Leases", "Facility Spaces".
  - Utilization Chart: Visual breakdown of fixed employee bays vs shared visitor pool usage.
- **Unit Tests:** `Mobile/src/screens/Corporate/__tests__/CorporateDashboardScreen.test.js`.

---

### 5.7 AdminDashboardScreen
- **Identifier:** `AdminDashboard`
- **File Path:** `Mobile/src/screens/Admin/AdminDashboardScreen.js`
- **Route:** `AppTabNavigator -> MenuTab -> AdminDashboard`
- **User Persona:** System super-administrators and platform operators
- **Purpose:** Oversee platform health, audit logs, listing verifications, and transactional outbox queues.
- **State & Data Sources:** `adminSlice` (`getAdminDashboardThunk`, `getAdminUsersThunk`, `getAdminListingsThunk`, `verifyListingThunk`, `unverifyListingThunk`, `processOutboxBatchThunk`).
- **Layout & Components:**
  - Global KPI Tiles: Total Users, Total Active Spaces, Gross Platform GMV, Pending Outbox Messages.
  - Outbox Health Card: Shows pending/failed outbox message count with manual "Process Outbox Batch" trigger.
  - Listing Verification Queue: Unverified parking spaces awaiting compliance review, with "Verify" and "Reject" actions.
  - System Audit Log: Rolling feed of security and billing events.
- **Unit Tests:** `Mobile/src/screens/Admin/__tests__/AdminDashboardScreen.test.js`.

---

### 5.8 UnifiedDashboardScreen
- **Identifier:** `UnifiedDashboard`
- **File Path:** `Mobile/src/screens/Home/UnifiedDashboardScreen.js`
- **Route:** `AppTabNavigator -> HomeTab -> UnifiedDashboard`
- **User Persona:** Dual-role users (both driver and parking host)
- **Purpose:** Seamlessly toggle between Driver mode and Host mode without signing out.
- **State & Data Sources:** Local toggle state, `authSlice`, `dashboardSlice`.
- **Layout & Components:** Segmented control header ("Driver Mode" | "Host Mode"), dynamically rendering `MemberDashboardScreen` or `VendorDashboardScreen` with shared cached state.

---

### 5.9 SearchScreen & MapViewComponent
- **Identifier:** `Search`
- **File Path:** `Mobile/src/screens/Search/SearchScreen.js`, `Mobile/src/screens/Search/MapViewComponent.js`
- **Route:** `AppTabNavigator -> SearchTab -> Search`
- **User Persona:** Drivers searching for nearby or destination parking
- **Purpose:** Discover parking spaces via interactive map, address search, and comprehensive amenity filtering.
- **State & Data Sources:** `parkingSlice` (`searchParkingThunk`, `parkingList`, `searchLoading`).
- **Layout & Components:**
  - Search Header: Search input with location autocomplete (`locationAutocompleteService`), clear button, and filter modal trigger.
  - View Toggle: Floating button toggling between List View (`FlatList`) and Map View (`MapViewComponent`).
  - Interactive Map: Native map rendering parking pins with price callouts; clusters markers; auto-centers on user GPS coordinates or searched city.
  - Parking Result Cards: Image preview, distance in km, dynamic rate badge (`⚡ ₹X/hr`), category tag, instant book badge, rating stars.
  - Filter Modal (Keyboard-avoiding): Price slider (min/max), radius filter (1km - 50km), vehicle type selector (Compact, Sedan, SUV, EV, Motorcycle, Truck), amenities toggles (CCTV, Covered, Guard, EV Charger, Disabled, Valet, LPR Barrier), category filter (Airport, Arena, Transit, Residential, Commercial).
- **Unit Tests:** `Mobile/src/screens/Search/__tests__/SearchScreen.test.js`, `MapViewComponent.test.js`.

---

### 5.10 ParkingDetailScreen
- **Identifier:** `ParkingDetail`
- **File Path:** `Mobile/src/screens/Search/ParkingDetailScreen.js`
- **Route:** `SearchStack -> ParkingDetail`, `HomeStack -> ParkingDetail`
- **User Persona:** Drivers reviewing a spot before booking; hosts reviewing their own listing
- **Purpose:** Comprehensive space details, photos, occupancy forecasts, reviews, and booking initiation.
- **State & Data Sources:** `parkingSlice` (`getParkingDetailThunk`, `selectedParking`, `getParkingForecastThunk`, `forecast`), `reviewSlice` (`getReviewsThunk`), `favoriteSlice` (`toggleFavoriteThunk`).
- **Layout & Components:**
  - Hero Image Carousel: Full-width Cloudflare R2 images with pagination dots, back button, share icon, and heart favorite toggle.
  - Title & Address Section: Standardized title, resolved address text, distance badge, and navigation shortcut.
  - Pricing Card: Hourly, daily, and monthly rate cards with dynamic pricing surge indicator if active.
  - Availability Forecast Chart: Time-bucketed bar visualization predicting spot availability for next 24 hours (ML.NET / deterministic algorithm).
  - Amenities & Specs Grid: Badge chips for all supported amenities and vehicle dimensions.
  - Ancillary Services Available: Add-ons offered at this location (e.g. Car wash, Valet, Detailing).
  - Host Profile & Contact: Host name, rating, response time, and "Message Host" button (opens `ChatScreen`).
  - Reviews & Ratings Section: Star breakdown, recent driver reviews with photos, and host replies.
  - Sticky Bottom Bar: Display effective hourly rate and prominent "Book Now" CTA button (or "Manage Listing" if viewed by space owner).
- **Unit Tests:** `Mobile/src/screens/Search/__tests__/ParkingDetailScreen.test.js`.

---

### 5.11 BookingScreen
- **Identifier:** `BookParking`
- **File Path:** `Mobile/src/screens/Booking/BookingScreen.js`
- **Route:** `SearchStack -> BookParking`
- **User Persona:** Drivers reserving a parking space
- **Purpose:** Select reservation date/time, vehicle, add-on services, apply discount coupons, and calculate total price.
- **State & Data Sources:** `bookingSlice` (`calculatePriceThunk`, `createBookingThunk`, `priceBreakdown`, `priceLoading`).
- **Layout & Components:**
  - Date & Time Pickers: Start and End datetime selectors (`@react-native-community/datetimepicker`) with duration counter.
  - Pricing Mode Selector: Hourly vs Daily vs Monthly billing tabs.
  - Vehicle Selector: Horizontal carousel of driver's saved vehicles from My Garage with "+ Add Vehicle" shortcut.
  - Bay / Slot Selector: Optional preferred slot selection if space provides individual numbered bays.
  - Ancillary Services Checklist: Optional checkboxes for add-ons (Car wash, EV charging session, Valet assistance) with add-on prices.
  - Discount Coupon Code: Text input with "Apply" button validating promotional vouchers.
  - Itemized Price Breakdown Card: Base price, duration, service fee, tax/GST, discount deduction, and grand total.
  - Action Button: "Confirm & Proceed to Payment" button.
- **Keyboard Handling:** Enclosed in `ScrollView` with `keyboardShouldPersistTaps="handled"`.
- **Unit Tests:** `Mobile/src/screens/Booking/__tests__/BookingScreen.test.js`.

---

### 5.12 BookingDetailScreen
- **Identifier:** `BookingDetail`
- **File Path:** `Mobile/src/screens/Booking/BookingDetailScreen.js`
- **Route:** `BookingsStack -> BookingDetail`
- **User Persona:** Drivers managing their active/past bookings; hosts managing guest reservations
- **Purpose:** Manage lifecycle of a specific booking: check-in, check-out, extension, valet retrieval, payment, access pass QR, and receipts.
- **State & Data Sources:** `bookingSlice` (`getBookingDetailThunk`, `selectedBooking`, `cancelBookingThunk`, `checkInThunk`, `checkOutThunk`, `extendBookingThunk`, `requestValetThunk`, `assignBayThunk`), `paymentSlice`.
- **Layout & Components:**
  - Header: Booking reference code with 1-tap copy to clipboard and status badge (`Confirmed`, `Active`, `Completed`, `Cancelled`).
  - Access Pass QR Card: Digital QR code token for gate scanner, with "Add to Apple Wallet" and "Add to Google Wallet" buttons.
  - Location & Bay Card: Address, directions button, and assigned bay number (with host "Assign Bay" modal).
  - Time & Duration Card: Start time, end time, total elapsed time, and live countdown.
  - Valet Tracking Card: If valet requested, displays stage tracker (Requested -> In Progress -> Ready for Pickup -> Completed) and "Request Valet Retrieval" button.
  - EV Charging Live Monitor: Real-time charging power, kWh delivered, and charging fee tally.
  - Action Buttons: "Pay Now" (if awaiting payment), "Check In", "Check Out", "Extend Booking" (modal with +1h, +2h, +3h selectors), "Cancel Booking" (with refund calculation).
  - Tax Receipt Modal: Full itemized receipt with invoice download.
  - "Write Review" button: Appears when booking reaches `Completed` status.
- **Unit Tests:** `Mobile/src/screens/Booking/__tests__/BookingDetailScreen.test.js`.

---

### 5.13 MyBookingsScreen
- **Identifier:** `MyBookings` / `BookingsHome` (Driver)
- **File Path:** `Mobile/src/screens/Booking/MyBookingsScreen.js`
- **Route:** `AppTabNavigator -> BookingsTab -> MyBookings`
- **User Persona:** Drivers tracking their reservations
- **Purpose:** List all personal reservations filtered by status.
- **State & Data Sources:** `bookingSlice` (`getMyBookingsThunk`, `myBookings`, `myBookingsLoading`).
- **Layout & Components:**
  - Filter Tabs: Horizontal pills for "All", "Pending", "Active", "Completed", "Cancelled / Rejected" with badge counts.
  - Booking Card: Space photo, title, date range, formatted price, vehicle license plate, status badge, and chevron.
  - Empty State: Friendly illustration and "Find Parking" button when no reservations match filter.
- **Interactions:** Pull-to-refresh; tapping card opens `BookingDetailScreen`.
- **Unit Tests:** `Mobile/src/screens/Booking/__tests__/MyBookingsScreen.test.js`.

---

### 5.14 VendorBookingsScreen
- **Identifier:** `IncomingBookings` / `BookingsHome` (Vendor)
- **File Path:** `Mobile/src/screens/Vendor/VendorBookingsScreen.js`
- **Route:** `AppTabNavigator -> BookingsTab -> IncomingBookings`
- **User Persona:** Parking space hosts and facility attendants
- **Purpose:** Review, approve, reject, and manage incoming guest reservations across all hosted spaces.
- **State & Data Sources:** `bookingSlice` (`getVendorBookingsThunk`, `approveBookingThunk`, `rejectBookingThunk`, `approveExtensionThunk`, `rejectExtensionThunk`).
- **Layout & Components:**
  - Status Filter Tabs: "All", "Pending Approval", "Active Guests", "Completed", "Cancelled".
  - Host Booking Cards: Driver name, phone shortcut, space title, vehicle plate, requested duration, and total payout.
  - Quick Action Buttons: Prominent "Approve" (emerald) and "Reject" (rose) buttons on pending cards.
- **Unit Tests:** `Mobile/src/screens/Vendor/__tests__/VendorBookingsScreen.test.js`.

---

### 5.15 PaymentScreen
- **Identifier:** `PaymentScreen`
- **File Path:** `Mobile/src/screens/Payment/PaymentScreen.js`
- **Route:** `SearchStack -> PaymentScreen`, `BookingsStack -> PaymentScreen`
- **User Persona:** Drivers paying for reservations or booking extensions
- **Purpose:** Secure checkout via Stripe mobile SDK or stored payment methods.
- **State & Data Sources:** `paymentSlice` (`processPaymentThunk`, `createPaymentOrderThunk`, `paymentResult`, `loading`, `error`).
- **Layout & Components:**
  - Order Summary Card: Space title, reservation duration, itemized price, tax, and total payable amount.
  - Payment Method Selector: Credit/Debit Card (Stripe Elements), Apple Pay, Google Pay, Net Banking.
  - Security Assurance: "256-bit SSL encrypted & PCI-DSS compliant" badge with lock icon.
  - Submit Button: "Pay ₹X.XX" with loading activity indicator.
- **Interactions:** On success, displays animated green checkmark modal and navigates to `BookingDetailScreen` with active pass.

---

### 5.16 MyListingsScreen
- **Identifier:** `MyListings`
- **File Path:** `Mobile/src/screens/Vendor/MyListingsScreen.js`
- **Route:** `AppTabNavigator -> ListingsTab -> MyListings`
- **User Persona:** Space hosts and lot owners
- **Purpose:** Catalog, monitor, and configure all parking spaces owned by the host.
- **State & Data Sources:** `parkingSlice` (`getMyListingsThunk`, `myListings`, `toggleParkingActiveThunk`, `deleteParkingThunk`).
- **Layout & Components:**
  - Header: Listing summary counts and prominent "+ Add Space" button.
  - Filter Tabs: "All", "Active", "Inactive / Paused".
  - Listing Cards: Hero thumbnail, space title, address, hourly/daily rates, total spots, live occupancy counter, and an active/inactive toggle switch (`Switch`).
  - Card Action Buttons: "Edit Details", "LPR Settings", "Ancillary Services", "Share Listing".
- **Unit Tests:** `Mobile/src/screens/Vendor/__tests__/MyListingsScreen.test.js`.

---

### 5.17 CreateParkingScreen
- **Identifier:** `CreateParking`
- **File Path:** `Mobile/src/screens/Vendor/CreateParkingScreen.js`
- **Route:** `ListingsStack -> CreateParking`, `HomeStack -> CreateParking`
- **User Persona:** Space hosts listing a new space or updating an existing space
- **Purpose:** 4-step wizard to create or edit parking listings with progressive disclosure.
- **State & Data Sources:** `parkingSlice` (`createParkingThunk`, `updateParkingThunk`), `fileUploadService` (Cloudflare R2 image upload).
- **Layout & Components:**
  - Step Indicator: Visual 4-step progress header:
    - Step 1: Basics (Title, description, address with autocomplete, city, state, coordinates, parking type, listing category).
    - Step 2: Access (Total spots, vehicle types supported, LPR enabled switch, automatic barrier switch, instant book switch, entry access instructions).
    - Step 3: Pricing (Hourly, daily, monthly rates, dynamic pricing toggle with surge multipliers, EV charging rate & per-kWh pricing mode).
    - Step 4: Review (Photo upload picker with image reordering, amenities multi-select grid, final summary preview).
  - Navigation Footer: "Back" and "Next / Publish Space" buttons.
- **Keyboard Handling:** Form inputs wrapped in `KeyboardAvoidingView` + `ScrollView` with guaranteed tap targets.
- **Unit Tests:** `Mobile/src/screens/Vendor/__tests__/CreateParkingScreen.test.js`.

---

### 5.18 AccessPassScannerScreen
- **Identifier:** `AccessPassScanner`
- **File Path:** `Mobile/src/screens/Vendor/AccessPassScannerScreen.js`
- **Route:** `AppTabNavigator -> ListingsTab -> AccessPassScanner`, `MenuTab -> AccessPassScanner`
- **User Persona:** Gate attendants, valet staff, and parking lot hosts
- **Purpose:** Scan and verify driver QR access tokens at entry/exit gates.
- **State & Data Sources:** API endpoint `POST /api/bookings/access-pass/verify`.
- **Layout & Components:**
  - Camera Viewfinder: Native barcode scanner overlay (`expo-barcode-scanner`) with targeting reticle.
  - Manual Token Entry: Text input for typing alphanumeric token codes manually.
  - Real-Time Decision Card: Emerald "ACCESS GRANTED" banner (with driver name, vehicle plate, bay number) or Rose "ACCESS DENIED" banner (with refusal reason: expired, unpaid, wrong date).
  - Scan History Feed: Recent 10 scans with timestamps and outcomes.
- **Unit Tests:** `Mobile/src/screens/Vendor/__tests__/AccessPassScannerScreen.test.js`.

---

### 5.19 AncillaryServicesScreen
- **Identifier:** `AncillaryServices`
- **File Path:** `Mobile/src/screens/Vendor/AncillaryServicesScreen.js`
- **Route:** `ListingsStack -> AncillaryServices`
- **User Persona:** Parking space hosts offering value-added services
- **Purpose:** Configure upsell add-ons for a listing (Car Wash, EV Charging, Valet, Detailing).
- **State & Data Sources:** `ancillarySlice` (`fetchAncillaryServices`, `createAncillaryService`, `deleteAncillaryService`).
- **Layout & Components:** List of active services with pricing, description, enable/disable switches, and "+ Add New Service" modal form.

---

### 5.20 LprSettingsScreen
- **Identifier:** `LprSettings`
- **File Path:** `Mobile/src/screens/Vendor/LprSettingsScreen.js`
- **Route:** `ListingsStack -> LprSettings`, `MenuTab -> LprSettings`
- **User Persona:** Facility operators with automated camera barrier systems
- **Purpose:** Manage hardware camera API keys and vehicle license plate whitelist / blacklist rules.
- **State & Data Sources:** `iotSlice` (`fetchCameraKeys`, `fetchPlateRules`, `createCameraKeyThunk`, `createPlateRuleThunk`, `deletePlateRuleThunk`).
- **Layout & Components:**
  - Camera Keys Tab: Registered camera IDs, API tokens, webhook endpoints, and "+ Register Camera" button.
  - License Plate Rules Tab: Whitelist (auto-open barrier) and Blacklist (deny entry & sound alarm) rules with plate number, notes, and delete buttons.
- **Unit Tests:** `Mobile/src/screens/Vendor/__tests__/LprSettingsScreen.test.js`.

---

### 5.21 LprSimulatorScreen
- **Identifier:** `LprSimulator`
- **File Path:** `Mobile/src/screens/Tools/LprSimulatorScreen.js`
- **Route:** `MenuTab -> LprSimulator`, `HomeTab -> LprSimulator`
- **User Persona:** Developers, QA engineers, and hosts testing gate automation
- **Purpose:** Simulate license plate OCR camera scans and automated barrier open/close events without physical hardware.
- **State & Data Sources:** `iotSlice`, mock event dispatchers.
- **Layout & Components:** License plate input with quick presets (known booked plates, whitelisted VIP plates, blacklisted plates), "Simulate Entry Scan" and "Simulate Exit Scan" buttons, live barrier animation (Barrier Closed -> Authenticating -> Barrier Open), and JSON webhook inspection log.
- **Unit Tests:** `Mobile/src/screens/Tools/__tests__/LprSimulatorScreen.test.js`.

---

### 5.22 EvChargeSimulatorScreen
- **Identifier:** `EvChargeSimulator`
- **File Path:** `Mobile/src/screens/Tools/EvChargeSimulatorScreen.js`
- **Route:** `MenuTab -> EvChargeSimulator`, `HomeTab -> EvChargeSimulator`
- **User Persona:** Developers and hosts verifying EV billing
- **Purpose:** Simulate OCPP smart charger energy delivery and calculate metered kWh utility fees.
- **State & Data Sources:** `iotService`, `apiClient` (`ENDPOINTS.BOOKINGS.MY_BOOKINGS`).
- **Layout & Components:** Booking selector, mock charger station ID, energy delivered input (in kWh), live tariff calculation, "Simulate Plug-In & Metering" button, and itemized billing settlement card.
- **Unit Tests:** `Mobile/src/screens/Tools/__tests__/EvChargeSimulatorScreen.test.js`.

---

### 5.23 EventPackagesScreen
- **Identifier:** `EventPackages`
- **File Path:** `Mobile/src/screens/Member/EventPackagesScreen.js`
- **Route:** `HomeTab -> EventPackages`, `MenuTab -> EventPackages`
- **User Persona:** Drivers attending stadium matches, concerts, or festivals
- **Purpose:** Browse and purchase venue parking packages tied to scheduled events.
- **State & Data Sources:** `eventPackageSlice` (`fetchOnSalePackages`, `fetchMyEventPackages`, `purchaseEventPackage`).
- **Layout & Components:** Segmented tabs ("On Sale Packages" vs "My Event Passes"), event package cards with venue name, event date, guaranteed bay, package perks, and "Purchase Pass" checkout modal with license plate binding.
- **Unit Tests:** `Mobile/src/screens/Member/__tests__/EventPackagesScreen.test.js`.

---

### 5.24 VendorEventPackagesScreen
- **Identifier:** `VendorEventPackages`
- **File Path:** `Mobile/src/screens/Vendor/VendorEventPackagesScreen.js`
- **Route:** `ListingsStack -> VendorEventPackages`, `MenuTab -> VendorEventPackages`
- **User Persona:** Venue lot hosts and stadium parking managers
- **Purpose:** Create and manage high-density parking packages for specific events.
- **State & Data Sources:** `eventPackageSlice`.
- **Layout & Components:** Active event package listings, remaining quota progress bar, sales revenue summary, and "+ Create Event Package" modal.
- **Unit Tests:** `Mobile/src/screens/Vendor/__tests__/VendorEventPackagesScreen.test.js`.

---

### 5.25 ConversationListScreen
- **Identifier:** `ConversationList`
- **File Path:** `Mobile/src/screens/Chat/ConversationListScreen.js`
- **Route:** `AppTabNavigator -> MenuTab -> ConversationList`, `HomeStack -> ConversationList`
- **User Persona:** Drivers and hosts communicating about parking arrangements
- **Purpose:** Central inbox for direct messaging threads.
- **State & Data Sources:** `chatSlice` (`getConversationsThunk`, `conversations`, `unreadCount`).
- **Layout & Components:**
  - Search conversations filter bar.
  - Conversation list items: Participant avatar, name, parking space title, last message snippet, timestamp, and unread badge.
  - Real-time SignalR connection status indicator.
- **Unit Tests:** `Mobile/src/screens/Chat/__tests__/ConversationListScreen.test.js`.

---

### 5.26 ChatScreen
- **Identifier:** `ChatScreen`
- **File Path:** `Mobile/src/screens/Chat/ChatScreen.js`
- **Route:** `MessagesStack -> ChatScreen`, `SearchStack -> ChatScreen`
- **User Persona:** Drivers asking hosts questions or coordinating arrival
- **Purpose:** Real-time messaging thread between driver and host.
- **State & Data Sources:** `chatService` (SignalR WebSocket + HTTP fallback), local message buffer.
- **Layout & Components:**
  - Header: Participant name, parking space title, and phone call shortcut.
  - Message Thread: Bubbles with sent/delivered/read receipts, date separators, and failed-message retry affordances.
  - Quick Suggestion Chips: "Hi, is this space available now?", "What are the entry instructions?", "Can I park an SUV here?".
  - Input Toolbar: Text input, camera/attachment button, and send button.
- **Keyboard Handling:** Dynamically hides parent bottom tab bar on mount; wrapped in `KeyboardAvoidingView` to maintain scroll position on soft keyboard appearance.
- **Unit Tests:** `Mobile/src/screens/Chat/__tests__/ChatScreen.test.js`.

---

### 5.27 NotificationsScreen
- **Identifier:** `Notifications`
- **File Path:** `Mobile/src/screens/Notifications/NotificationsScreen.js`
- **Route:** `HomeStack -> Notifications`, `MenuTab -> Notifications`
- **User Persona:** All users
- **Purpose:** Activity feed of bookings, payments, gate approvals, and system announcements.
- **State & Data Sources:** `notificationSlice` (`getNotificationsThunk`, `markAsReadThunk`, `markAllAsReadThunk`, `deleteNotificationThunk`, `clearAllNotificationsThunk`).
- **Layout & Components:**
  - Header with "Mark All Read" and "Clear All" actions.
  - Notification List: Cards with category icons (Calendar, Payment, Gate, Alert), title, body message, time elapsed, and unread indicator dot.
- **Interactions:** Tapping any notification marks it read and deep-links directly to the relevant `BookingDetailScreen` or chat.
- **Unit Tests:** `Mobile/src/screens/Notifications/__tests__/NotificationsScreen.test.js`.

---

### 5.28 ProfileScreen
- **Identifier:** `Profile`
- **File Path:** `Mobile/src/screens/Profile/ProfileScreen.js`
- **Route:** `AppTabNavigator -> MenuTab -> Profile`, `ProfileStack -> Profile`
- **User Persona:** All users
- **Purpose:** User account overview, settings navigation, and session control.
- **State & Data Sources:** `authSlice` (`user`, `logout`, `deleteAccountThunk`).
- **Layout & Components:**
  - Profile Header: Avatar with initials/photo, full name, email, phone, and role badge ("Verified Driver", "Host", "Corporate").
  - Account Section: "Edit Profile", "Change Password".
  - Assets Section: "My Garage (Vehicles)", "Saved Favorites", "Digital Parking Passes".
  - Role Management: Shortcut to Host Listings or Corporate Dashboard depending on permissions.
  - Danger Zone: "Delete Account" and "Sign Out" buttons.
- **Unit Tests:** `Mobile/src/screens/Profile/__tests__/ProfileScreens.test.js`.

---

### 5.29 EditProfileScreen
- **Identifier:** `EditProfile`
- **File Path:** `Mobile/src/screens/Profile/EditProfileScreen.js`
- **Route:** `ProfileStack -> EditProfile`
- **User Persona:** Users updating personal information
- **Purpose:** Update full name, phone number, and avatar image.
- **State & Data Sources:** `authSlice` (`updateProfileThunk`).
- **Layout & Components:** Avatar picker (`ImagePicker`), Name input, Phone input, and "Save Changes" button.

---

### 5.30 ChangePasswordScreen
- **Identifier:** `ChangePassword`
- **File Path:** `Mobile/src/screens/Profile/ChangePasswordScreen.js`
- **Route:** `ProfileStack -> ChangePassword`
- **User Persona:** Users changing their credentials
- **Purpose:** Update account password with validation.
- **State & Data Sources:** `authSlice` (`changePasswordThunk`).
- **Layout & Components:** Current password, new password, confirm new password fields, password requirements checklist, and submit button.

---

### 5.31 VehiclesScreen (My Garage)
- **Identifier:** `Vehicles` / `MyVehicles`
- **File Path:** `Mobile/src/screens/Vehicles/VehiclesScreen.js`
- **Route:** `MenuTab -> Vehicles`, `ProfileStack -> Vehicles`
- **User Persona:** Drivers managing their vehicles
- **Purpose:** Store multiple vehicles for faster 1-tap booking checkouts.
- **State & Data Sources:** `vehicleService` (`getVehicles`, `addVehicle`, `deleteVehicle`, `setDefaultVehicle`).
- **Layout & Components:**
  - Saved Vehicle Cards: Make, model, formatted license plate badge, vehicle type icon (Car, SUV, Motorcycle, Truck, EV), and "DEFAULT" pill.
  - Action Sheet / Form: Make, model, plate, color, vehicle type selector, and "Set as Default" toggle.
  - Card Actions: Set as default button and delete vehicle button with confirmation alert.
- **Unit Tests:** `Mobile/src/screens/Vehicles/__tests__/VehiclesScreen.test.js`.

---

### 5.32 FavoritesScreen
- **Identifier:** `Favorites`
- **File Path:** `Mobile/src/screens/Favorites/FavoritesScreen.js`
- **Route:** `MenuTab -> Favorites`, `HomeStack -> Favorites`
- **User Persona:** Drivers with frequent parking locations
- **Purpose:** Quick access to pinned parking spots (home, office, gym, airport).
- **State & Data Sources:** `favoriteSlice` (`getFavoritesThunk`, `toggleFavoriteThunk`).
- **Layout & Components:** List of saved parking cards with 1-tap "Book Now" and unfavorite heart icon.
- **Unit Tests:** `Mobile/src/screens/Favorites/__tests__/FavoritesScreen.test.js`.

---

### 5.33 MyPassesScreen
- **Identifier:** `MyPasses`
- **File Path:** `Mobile/src/screens/Passes/MyPassesScreen.js`
- **Route:** `MenuTab -> MyPasses`, `HomeStack -> MyPasses`
- **User Persona:** Commuters and regular parkers holding recurring passes
- **Purpose:** Display active digital parking passes (Weekly, Monthly, Corporate).
- **State & Data Sources:** `passSlice` (`getMyPassesThunk`, `createPassThunk`).
- **Layout & Components:**
  - Digital Pass Card: High-contrast card with barcode/QR code, pass type badge, valid date range, eligible facilities/zones, and usage policy.
  - Wallet Buttons: "Add to Apple Wallet" and "Save to Google Wallet".
  - "+ Buy New Pass" Modal: Zone selector, pass duration, and instant purchase.
- **Unit Tests:** `Mobile/src/screens/Passes/__tests__/MyPassesScreen.test.js`.

---

### 5.34 ReviewsListScreen & CreateReviewScreen
- **Identifier:** `ReviewsList`, `CreateReview`
- **File Path:** `Mobile/src/screens/Review/ReviewsListScreen.js`, `Mobile/src/screens/Review/CreateReviewScreen.js`
- **Route:** `SearchStack -> ReviewsList`, `BookingsStack -> CreateReview`
- **User Persona:** Drivers rating facilities; hosts reading customer feedback
- **Purpose:** Transparent community feedback and rating system.
- **State & Data Sources:** `reviewSlice` (`getReviewsThunk`, `createReviewThunk`, `respondToReviewThunk`).
- **Layout & Components:**
  - Reviews List: Overall star rating average, breakdown bars (5-star down to 1-star), individual driver reviews, photos, host reply thread.
  - Create Review: Interactive 5-star rating selector (`StarRating`), review title input, detailed comments text area, photo attachments, and submit button.
- **Unit Tests:** `Mobile/src/screens/Review/__tests__/ReviewsListScreen.test.js`.

---

### 5.35 MenuScreen
- **Identifier:** `MenuHome`
- **File Path:** `Mobile/src/screens/Menu/MenuScreen.js`
- **Route:** `AppTabNavigator -> MenuTab -> MenuHome`
- **User Persona:** All users
- **Purpose:** Comprehensive navigation directory for the entire application, system tools, and settings.
- **State & Data Sources:** `authSlice`, `notificationSlice`, `chatSlice`.
- **Layout & Components:**
  - User Summary Card with avatar, name, email, and "View Profile" link.
  - Sectioned Menu Groups:
    - Account & Garage: Profile, Vehicles, Passes, Favorites.
    - Host Operations: Add Space, My Listings, Host Bookings, Gate Scanner, LPR Settings, Event Passes.
    - Corporate Fleet: Corporate Dashboard, Company Hub, Allocations, Invoices.
    - System Tools & Simulators: LPR Hardware Simulator, EV Charger Simulator.
    - Communications: Notifications (with unread badge), Messages.
    - System & Legal: "Built With" technology stack modal (`PARKEASE_BUILT_WITH_TAGS`), version tag, terms & privacy.
    - Session: Role switcher, Logout.
- **Unit Tests:** `Mobile/src/screens/Menu/__tests__/MenuScreen.test.js`.

---

### 5.36 Corporate Suite Screens
The corporate suite consists of 7 specialized screens designed for enterprise company parking management:

1. **CompanyManagementScreen (`Mobile/src/screens/Corporate/CompanyManagementScreen.js`):** Company profile, enterprise domain verification, corporate billing address, and default parking policy configuration.
2. **CorporateMembersScreen (`Mobile/src/screens/Corporate/CorporateMembersScreen.js`):** Employee directory, invite member via email modal, role assignments (Admin vs Employee), and seat deactivations.
3. **CorporateAllocationsScreen (`Mobile/src/screens/Corporate/CorporateAllocationsScreen.js`):** Manage employee bay allocations (Fixed Reserved Bays vs Shared Flexible Pool) and quota limits.
4. **CorporateBookingsScreen (`Mobile/src/screens/Corporate/CorporateBookingsScreen.js`):** Real-time monitoring of all bookings created under corporate company accounts, with filter by employee and department.
5. **CorporateInvoicesScreen (`Mobile/src/screens/Corporate/CorporateInvoicesScreen.js`):** Monthly billing statements, invoice status (`Issued`, `Paid`, `Void`), PDF tax receipts, and offline payment recording.
6. **CorporateLeaseBrowseScreen (`Mobile/src/screens/Corporate/CorporateLeaseBrowseScreen.js`):** Corporate marketplace where company administrators can browse commercial parking lots to negotiate and secure multi-month or annual bulk leases.
7. **CorporateParkingSpacesScreen (`Mobile/src/screens/Corporate/CorporateParkingSpacesScreen.js`):** Inventory manager for company-owned or leased physical facilities and individual numbered bays.

- **Unit Tests:** `Mobile/src/screens/Corporate/__tests__/CorporateDashboardScreen.test.js`, `CorporateParkingSpacesScreen.test.js`, `CorporateBookingsScreen.test.js`, `CorporateLeaseBrowseScreen.test.js`, `CorporateInvoicesScreen.test.js`.

---

### 5.37 Web Frontend Portals
For full platform context, the React 18 web application (`frontend/src/`) provides mirror desktop capabilities:
- **Driver Portal (`Search.jsx`, `ParkingDetails.jsx`, `MyBookings.jsx`, `MyGarage.jsx`):** Desktop web map search, checkout, booking management, and profile.
- **Vendor Portal (`VendorListings.jsx`, `VendorBookings.jsx`):** Comprehensive host management with bulk CSV export and listing analytics.
- **Corporate Web Portal (`Corporate/`):** Enterprise quota administration, bulk CSV member uploads, and financial invoice reconciliation.
- **Admin Portal (`Admin/`):** Full platform governance, KYC / host verification, and system settings.

---

## 6. API Integration & Real-Time Specifications

### 6.1 Authentication & Header Contracts
- All API requests use `Authorization: Bearer <accessToken>`.
- Token refresh lifecycle: Upon HTTP 401 response, client interceptor calls `POST /api/auth/refresh` with `{ refreshToken }` and retries the original request.
- Standard response envelope:
  ```json
  {
    "success": true,
    "message": "Operation completed successfully",
    "data": { ... },
    "errors": []
  }
  ```

### 6.2 Key API Endpoints
- **Auth:** `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/corporate-login`, `POST /api/auth/google`.
- **Parking:** `GET /api/parking/search`, `GET /api/parking/{id}`, `POST /api/parking`, `PUT /api/parking/{id}`, `GET /api/parking/{id}/forecast`.
- **Bookings:** `GET /api/bookings/my-bookings`, `GET /api/bookings/vendor-bookings`, `POST /api/bookings`, `POST /api/bookings/{id}/extend`, `POST /api/bookings/access-pass/verify`.
- **Payments:** `POST /api/payments/create-intent`, `POST /api/payments/confirm`.
- **Corporate:** `GET /api/corporate/companies`, `GET /api/corporate/{id}/allocations`, `GET /api/corporate/{id}/invoices`.
- **IoT & Hardware:** `GET /api/iot/camera-keys/{spaceId}`, `POST /api/iot/plate-rules`, `POST /api/iot/lpr-event`.

### 6.3 Real-Time WebSocket Hubs
- **Notifications Hub (`/hubs/notifications`):** Pushes live notifications: `BookingApproved`, `PaymentSuccess`, `ValetStatusChanged`, `GatePassScanned`.
- **Chat Hub (`/hubs/chat`):** Pushes live messages: `ReceiveMessage`, `MessageDelivered`, `MessageRead`.

---

## 7. Quality Assurance & Automated Test Matrix

The mobile test suite is organized into component, screen, slice, and integration tests using Jest and React Native Testing Library:
- `Mobile/src/screens/Splash/__tests__/SplashScreen.test.js`
- `Mobile/src/screens/Auth/__tests__/LoginScreen.test.js`
- `Mobile/src/screens/Member/__tests__/MemberDashboardScreen.test.js`
- `Mobile/src/screens/Member/__tests__/EventPackagesScreen.test.js`
- `Mobile/src/screens/Vendor/__tests__/VendorDashboardScreen.test.js`
- `Mobile/src/screens/Vendor/__tests__/MyListingsScreen.test.js`
- `Mobile/src/screens/Vendor/__tests__/CreateParkingScreen.test.js`
- `Mobile/src/screens/Vendor/__tests__/VendorBookingsScreen.test.js`
- `Mobile/src/screens/Vendor/__tests__/AccessPassScannerScreen.test.js`
- `Mobile/src/screens/Vendor/__tests__/LprSettingsScreen.test.js`
- `Mobile/src/screens/Vendor/__tests__/VendorEventPackagesScreen.test.js`
- `Mobile/src/screens/Corporate/__tests__/CorporateDashboardScreen.test.js`
- `Mobile/src/screens/Corporate/__tests__/CorporateParkingSpacesScreen.test.js`
- `Mobile/src/screens/Corporate/__tests__/CorporateBookingsScreen.test.js`
- `Mobile/src/screens/Corporate/__tests__/CorporateLeaseBrowseScreen.test.js`
- `Mobile/src/screens/Corporate/__tests__/CorporateInvoicesScreen.test.js`
- `Mobile/src/screens/Admin/__tests__/AdminDashboardScreen.test.js`
- `Mobile/src/screens/Search/__tests__/SearchScreen.test.js`
- `Mobile/src/screens/Search/__tests__/ParkingDetailScreen.test.js`
- `Mobile/src/screens/Search/__tests__/MapViewComponent.test.js`
- `Mobile/src/screens/Booking/__tests__/BookingScreen.test.js`
- `Mobile/src/screens/Booking/__tests__/BookingDetailScreen.test.js`
- `Mobile/src/screens/Booking/__tests__/MyBookingsScreen.test.js`
- `Mobile/src/screens/Chat/__tests__/ChatScreen.test.js`
- `Mobile/src/screens/Chat/__tests__/ConversationListScreen.test.js`
- `Mobile/src/screens/Notifications/__tests__/NotificationsScreen.test.js`
- `Mobile/src/screens/Profile/__tests__/ProfileScreens.test.js`
- `Mobile/src/screens/Vehicles/__tests__/VehiclesScreen.test.js`
- `Mobile/src/screens/Favorites/__tests__/FavoritesScreen.test.js`
- `Mobile/src/screens/Passes/__tests__/MyPassesScreen.test.js`
- `Mobile/src/screens/Review/__tests__/ReviewsListScreen.test.js`
- `Mobile/src/screens/Menu/__tests__/MenuScreen.test.js`
- `Mobile/src/screens/Tools/__tests__/LprSimulatorScreen.test.js`
- `Mobile/src/screens/Tools/__tests__/EvChargeSimulatorScreen.test.js`

---

## 8. Continuous Integration & Deployment Pipeline

Every push to `origin/main` targeting `Mobile/**` executes `.github/workflows/build-and-distribute.yml`:
1. **Dependency Installation:** `npm ci --legacy-peer-deps` with caching.
2. **Deterministic Keystore:** Configures `debug.keystore` (valid through 2054) to guarantee binary upgrade compatibility.
3. **Expo Prebuild & Android Assemble:** Generates native Android project and runs Gradle release build (`assembleRelease` / `assembleDebug`).
4. **Firebase App Distribution:** Uploads generated APK to Firebase App Distribution with release notes.
5. **Slack Notification:** Posts automated build completion notification with direct download link and changelog to `#qa-builds-android`.
