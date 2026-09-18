# ParkEase Mobile: Comprehensive End-to-End Test Plan & Feature Matrix

## 1. Executive Summary & Architecture Overview
This document catalogs every feature, screen, user persona, and end-to-end flow within the ParkEase Mobile application (`Mobile/`). Each screen is mapped with its corresponding success scenarios, failure scenarios, inline validation, loading states, listing capabilities, navigation transitions, and edge cases.

### Personas & Navigation Roles:
- **Member / Driver**: Discovery (Search & Map), Reservations (Booking & Payment), Passes & QR Access, Active Booking Controls, Vehicle Fleet, Reviews.
- **Vendor / Space Host**: Listing Management (Create, Edit, Toggle Active/Inactive), Incoming Bookings (Accept, Reject, Check-In), QR Scanner, LPR Settings, Event Surge Packages.
- **Corporate Fleet Admin**: Corporate Dashboard, Employee Directory, Spot Allocations, Monthly Invoicing, Bulk Leases, Dedicated Inventory.
- **System Admin**: Platform metrics and global operational health.

---

## 2. Comprehensive Screen & Feature Test Matrix

### 2.1 Authentication & Session Management
#### Screens: `LoginScreen.js`, `SignupScreen.js`, `SplashScreen.js`
- **Success Scenarios:**
  - Valid Member login credentials navigates to Member Dashboard and mounts Member Tab Navigator (`SearchTab`, `BookingsTab`, `MenuTab`).
  - Valid Vendor login credentials navigates to Vendor Dashboard and mounts Vendor Tab Navigator (`BookingsTab`, `ListingsTab`, `MenuTab`).
  - Switch to Corporate mode, enter corporate credentials, navigates to Corporate Dashboard and mounts Corporate Tab Navigator (`CorporateInventoryTab`, `BookingsTab`, `MenuTab`).
  - SSO discovery: Entering an enterprise domain discovers SSO provider and initiates OAuth/SAML redirect.
  - New user registration (Signup): Valid input creates account and automatically authenticates.
  - Session restoration on app launch: Stored token automatically restores session and renders authenticated home stack without showing login.
- **Failure Scenarios:**
  - 401 Unauthorized (invalid email/password): Displays prominent error banner; does not navigate; retains entered email.
  - Network disconnection / 500 server error: Displays network failure alert or toast; prevents submission lock.
  - Expired session on resume: 401 response on session restore clears local credentials and safely routes to `LoginScreen`.
- **Inline Validation:**
  - Empty email / empty password trigger red helper text before API dispatch.
  - Malformed email format (missing `@` or `.domain`) triggers immediate inline error.
  - Signup password confirmation mismatch triggers instant inline warning.
- **Loading Scenarios:**
  - Submit button shows `ActivityIndicator` and disables interactive touches to prevent double-submission.
  - `SplashScreen` displays brand logo and loader while verifying SecureStore token.
- **Navigation:**
  - Deep-link handling: `parkease://sso-callback?sso_code=...` captures token and transitions to Dashboard.
  - "Don't have an account? Sign Up" transitions smoothly between Auth screens.

---

### 2.2 Member Discovery & Search Flow
#### Screens: `SearchScreen.js`, `MapViewComponent.js`, `ParkingDetailScreen.js`
- **Success Scenarios:**
  - Search by keyword/city/address returns list of available parking spots with distance, price/hr, and rating badges.
  - Filter by price range, parking type (covered, open, valet), and 24/7 availability filters the list dynamically.
  - Toggle between List View and Map View smoothly renders interactive map pins with price callouts.
  - Tapping a parking card or map pin callout navigates to `ParkingDetailScreen` with spot metadata.
  - Favorite button toggle adds/removes spot from user favorites with instant visual bookmark feedback.
- **Failure Scenarios:**
  - Location permission denied: Falls back to default city search coordinates without crashing.
  - Search API 500 error: Displays error message with retry button.
  - Details API failure: Displays error banner and allows navigating back safely.
- **Inline Validation:**
  - Search query sanitization (handles special characters, empty query returns nearby/all spots).
- **Loading Scenarios:**
  - Initial load renders `ShimmerPlaceholder` skeleton cards before data resolves.
  - Pull-to-refresh on `FlatList` activates `EnhancedRefreshControl`.
- **Listing:**
  - Empty state: When no spots match search criteria, renders `EmptyState` component with "No parking spaces found" and reset filters CTA.
  - FlatList pagination / infinite scroll loads next page of spots seamlessly.
- **Navigation:**
  - Navigates from `SearchScreen` -> `ParkingDetailScreen` -> `BookingScreen`.

---

### 2.3 Booking, Pricing & Payment Flow
#### Screens: `BookingScreen.js`, `PaymentScreen.js`
- **Success Scenarios:**
  - Select start date/time and end date/time dynamically calculates duration and total price breakdown (base price + valet fee + tax).
  - Select registered vehicle from vehicle dropdown automatically attaches vehicle license plate to reservation.
  - Valet service add-on checkbox dynamically recalculates total amount.
  - Promo code input applies valid discount code and recalculates final total.
  - Proceed to `PaymentScreen`: User selects payment method (Credit Card, Digital Wallet, or Corporate Account), clicks Pay, receives payment confirmation and navigates to `BookingDetailScreen` with active pass.
- **Failure Scenarios:**
  - Spot already booked for selected time window (409 Conflict): Displays alert informing user the slot is no longer available.
  - Payment gateway decline (402/400): Displays payment failure dialog with option to retry or use alternate card.
  - Network timeout during payment: Prevents duplicate charges by disabling payment action button.
- **Inline Validation:**
  - End time earlier than start time triggers inline validation error "End time must be after start time".
  - Duration less than minimum booking period (e.g. 1 hour) prevents submission.
  - Empty vehicle selection prompts user to select or add a vehicle before checkout.
- **Loading Scenarios:**
  - "Processing Payment" modal overlay with spinner prevents user dismissal during transaction.
- **Navigation:**
  - Cancel payment navigates back to booking summary without losing selected parameters.
  - Payment success navigates directly to `BookingsTab` with toast confirmation.

---

### 2.4 My Bookings & Live Pass Management Flow
#### Screens: `MyBookingsScreen.js`, `BookingDetailScreen.js`
- **Success Scenarios:**
  - Tabs: Active, Upcoming, Completed, and Cancelled bookings render appropriate categorized reservations.
  - Active booking card displays live countdown timer, QR access pass thumbnail, and navigation action.
  - Tapping booking opens `BookingDetailScreen`: renders full resolution QR Code for gate entry, exact slot number, parking rules, directions button (Google Maps / Apple Maps integration).
  - Extend Booking Modal: User can select additional hours and pay differential amount to extend reservation.
  - Request Valet Modal: User can notify valet of arrival or request vehicle retrieval.
  - Cancel Booking: User can cancel eligible upcoming booking; displays refund confirmation dialog.
- **Failure Scenarios:**
  - Extend booking conflict (subsequent slot reserved by another driver): Displays error modal stating extension is unavailable.
  - Cancellation past grace period: Displays non-refundable warning before action.
- **Inline Validation & Keyboard Handling:**
  - Modals (`Extend Booking`, `Request Valet`, `Receipt`) properly utilize `KeyboardAvoidingView` and `ScrollView` with `keyboardShouldPersistTaps="handled"` ensuring input fields never hide behind keyboard.
- **Loading Scenarios:**
  - Pull-to-refresh syncs booking status from backend.
  - Action buttons show loading indicator during cancellation or extension.
- **Listing:**
  - Empty state renders custom illustrations for "No active bookings" with "Find Parking" button.
- **Navigation:**
  - Back button safely returns to `MyBookingsScreen`.
  - Tapping parking address opens external navigation app.

---

### 2.5 Vendor Space Hosting & Listing Lifecycle Flow
#### Screens: `VendorDashboardScreen.js`, `MyListingsScreen.js`, `CreateParkingScreen.js`, `VendorBookingsScreen.js`
- **Success Scenarios:**
  - `VendorDashboardScreen`: Displays total earnings, occupancy rate, active listings count, and today's incoming reservations.
  - `MyListingsScreen`: Lists all hosted parking spaces with active/inactive status toggle, price per hour, and occupied spots counter.
  - Toggle Active/Inactive Switch: Optimistically updates status, syncs with backend API, and retains correct toggled state.
  - `CreateParkingScreen`: Form accepts title, description, address, city, state, zip code, total spots, hourly rate, amenities (EV Charging, Covered, Security, 24/7), and photo upload. Submitting successfully creates space and redirects to listings.
  - Edit Listing: Pre-populates all fields and updates existing listing upon submit.
  - `VendorBookingsScreen`: Lists incoming member bookings; allows host to approve, reject, or mark vehicle as arrived/departed.
- **Failure Scenarios:**
  - Space creation API 400 error (e.g. invalid zip or address): Highlights failed fields with FluentValidation error mapping.
  - Active toggle failure: Reverts switch to original state and alerts vendor.
  - Deleting space with active reservations: Rejects with descriptive error alert.
- **Inline Validation:**
  - Missing title, address, city, state, or zip code prevents form submission and highlights fields in red.
  - Hourly rate <= $0 or total spots <= 0 triggers validation warnings.
- **Loading Scenarios:**
  - Toggle switch shows inline spinner during asynchronous update.
  - Pull-to-refresh on listings list.
- **Navigation:**
  - Floating action button (FAB) or Header "+" navigates directly to `CreateParkingScreen`.

---

### 2.6 Gate Access & Smart Hardware Operations
#### Screens: `AccessPassScannerScreen.js`, `LprSettingsScreen.js`, `LprSimulatorScreen.js`, `EvChargeSimulatorScreen.js`
- **Success Scenarios:**
  - `AccessPassScannerScreen`: Scanner view uses camera or manual pass code input; validating a valid pass displays check-in confirmation and logs entry.
  - `LprSettingsScreen`: Vendor configures LPR camera IP/gateway and automatic barrier lift thresholds.
  - `LprSimulatorScreen`: Simulates license plate scan event; displays recognized plate, matched booking, and gate status (Open/Closed).
  - `EvChargeSimulatorScreen`: Simulates EV station plug-in, real-time power delivery (kW), charging duration, and fee calculation.
- **Failure Scenarios:**
  - Invalid or expired QR pass scanned: Displays prominent red warning dialog "Invalid / Expired Pass".
  - Camera permissions denied: Gracefully provides manual alphanumeric code entry fallback.
- **Loading Scenarios:**
  - QR Code scanning shows real-time viewfinder overlay with scanning indicator.

---

### 2.7 Corporate Fleet & Enterprise Invoicing Flow
#### Screens: `CorporateDashboardScreen.js`, `CompanyManagementScreen.js`, `CorporateMembersScreen.js`, `CorporateAllocationsScreen.js`, `CorporateBookingsScreen.js`, `CorporateInvoicesScreen.js`, `CorporateLeaseBrowseScreen.js`, `CorporateParkingSpacesScreen.js`
- **Success Scenarios:**
  - `CorporateDashboardScreen`: Renders key enterprise metrics (Allocated Bays, Active Employees, Monthly Spend, Outstanding Invoices).
  - `CorporateParkingSpacesScreen`: Lists dedicated company inventory and current occupancy status.
  - `CorporateMembersScreen`: Lists company employees with roles (Admin, Member); allows inviting employee via email.
  - `CorporateAllocationsScreen`: Assigns designated parking bay to specific employee for set date range.
  - `CorporateInvoicesScreen`: Displays billing statements with Paid/Unpaid filter, invoice PDF download, and payment processing.
  - `CorporateLeaseBrowseScreen`: Explores bulk parking lot leases with discount tiers and request lease proposal.
  - `CorporateBookingsScreen`: Audits all employee parking reservations with date range and employee search filters.
- **Failure Scenarios:**
  - Duplicate employee invite: Returns conflict error with inline message.
  - Allocating an already reserved bay: Displays collision error.
- **Inline Validation:**
  - Email format validation for employee invites.
  - Start date cannot be after end date for bay allocations.
- **Loading Scenarios:**
  - Shimmer loaders across dashboard cards and employee tables.

---

### 2.8 User Profile, Fleet & Preferences Flow
#### Screens: `ProfileScreen.js`, `EditProfileScreen.js`, `ChangePasswordScreen.js`, `VehiclesScreen.js`, `FavoritesScreen.js`, `MyPassesScreen.js`
- **Success Scenarios:**
  - `ProfileScreen`: Displays user avatar, name, email, role badge, and navigation links.
  - `EditProfileScreen`: Updates full name, phone number, avatar URL; saves to Redux store and backend.
  - `ChangePasswordScreen`: Enters current password, new password, confirm password; successfully rotates password.
  - `VehiclesScreen`: Lists registered vehicles; "Add Vehicle" modal accepts make, model, license plate, color, EV flag; sets default vehicle; deletes vehicle.
  - `FavoritesScreen`: Displays bookmarked spaces; allows instant navigation to booking.
  - `MyPassesScreen`: Displays recurring digital monthly passes with QR codes.
- **Failure Scenarios:**
  - Incorrect current password: 400 error banner displayed.
  - Duplicate license plate: Validation alert.
- **Inline Validation:**
  - Password strength validation (minimum 6 characters).
  - License plate required and sanitized (uppercase conversion).
- **Loading Scenarios:**
  - Saving indicators on form submission buttons.

---

### 2.9 Social Reviews & Messaging Flow
#### Screens: `ReviewsListScreen.js`, `CreateReviewScreen.js`, `ConversationListScreen.js`, `ChatScreen.js`, `NotificationsScreen.js`
- **Success Scenarios:**
  - `ReviewsListScreen`: Displays average star rating, star breakdown, and user reviews.
  - `CreateReviewScreen`: Submits 1-5 star rating and comments for completed parking booking; immediately updates review list.
  - `ConversationListScreen`: Lists active chats with vendors/drivers with unread message badges.
  - `ChatScreen`: Real-time chat messages display sent/received bubbles; input sends new message and scrolls to bottom.
  - `NotificationsScreen`: Lists system and booking push notifications; "Mark All Read" updates unread counter badge on `MenuTab`.
- **Failure Scenarios:**
  - Sending message while offline: Displays failed delivery indicator with retry option.
  - Submitting review without rating: Rejects with inline prompt.

---

### 2.10 Event Packages & Admin Operations
#### Screens: `EventPackagesScreen.js`, `VendorEventPackagesScreen.js`, `AdminDashboardScreen.js`, `MenuScreen.js`
- **Success Scenarios:**
  - `EventPackagesScreen`: Drivers browse venue parking bundles for concerts/sports games with guaranteed spots.
  - `VendorEventPackagesScreen`: Vendors create time-limited surge packages for nearby stadium events.
  - `AdminDashboardScreen`: Displays platform-wide user counts, system revenue, and infrastructure status.
  - `MenuScreen`: Comprehensive categorized directory linking to all features, settings, simulators, and one-tap Logout.

---

## 3. End-to-End Test Implementation Roadmap
To guarantee 100% test reliability and cover all required scenarios (success, failure, inline validation, loading, listing, navigation), the automated tests will be implemented across targeted, modular E2E test suites in `Mobile/src/__tests__/e2e/`:

1. `AuthAndRoleFlows.test.js` (Completed: 10 flows covering Auth, Roles, Validation, Session Restore, Logout, SSO).
2. `MemberBookingFlows.test.js` (New: Search, Filtering, Spot Details, Booking Creation, Payment Success & Failures, Booking Detail & Actions, Modals).
3. `VendorManagementFlows.test.js` (New: Vendor Dashboard, Listings Lifecycle, Create Space Form Validation, Toggle Active/Inactive, Incoming Bookings, Pass Scanner).
4. `CorporateFlows.test.js` (New: Corporate Dashboard, Bay Inventory, Employee Directory, Spot Allocations, Invoicing & Payments).
5. `UserFeaturesFlows.test.js` (New: Edit Profile, Change Password, Vehicles Management, Reviews, Messaging & Chat, Notifications).
