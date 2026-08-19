# ParkEase - Step-by-Step Implementation & Execution Plan

This document tracks the step-by-step implementation of all identified feature gaps, corresponding unit tests, and git commits across the **ParkEase Mobile Application**.

---

## 📋 Execution Roadmap & Milestones

### 🏁 Foundational Milestones (Completed)
- [x] **Milestone 1: Gap Documentation & Plan Setup**
  - Create `docs/gap-analysis.md` and `docs/step-by-step-implementation-plan.md`.
  - Git commit: `docs: initialize gap analysis and step-by-step implementation plan`.

- [x] **Milestone 2: Mobile Spot Availability Forecast & Review Responses**
  - Implement real-time occupancy forecasting widget in Mobile `ParkingDetailScreen.js`.
  - Render verified Host Responses (`👑 Response from Host`) in Mobile review cards.
  - Git commit: `feat(mobile): add occupancy forecast and host review response to ParkingDetailScreen`.

- [x] **Milestone 3: Mobile Gate Pass, Slot Details & Refund Alerts**
  - Add digital gate access tokens and allocated slot number badges in `BookingDetailScreen.js`.
  - Add automated refund tracking alert on cancelled / rejected bookings.
  - Git commit: `feat(mobile): add gate pass token and refund status in BookingDetailScreen`.

- [x] **Milestone 4: Unit Test Suites for Mobile Profile & Search Screens**
  - Write test suite `Mobile/src/screens/Profile/__tests__/ProfileScreens.test.js` covering `MyVehiclesScreen`, `FavoritesScreen`, and `MyPassesScreen`.
  - Write tests for updated `ParkingDetailScreen` and `BookingDetailScreen`.
  - Git commit: `test(mobile): add unit tests for profile, vehicles, favorites, passes, and booking details`.

- [x] **Milestone 5: Backend Unit Tests & Full CI/CD Pipeline**
  - `backend/tests/ParkingApp.UnitTests/PassesTests.cs` domain tests.
  - `.github/workflows/ci.yml` full-stack automated build & test pipeline.
  - Git commit: `ci: add full-stack CI workflow for Backend, Mobile, and Frontend`.

- [x] **Milestone 6: Upstream Synchronization & 100% Test Parity**
  - Synchronized `upstream/main` (23 commits ahead), resolved all 8 file conflicts across backend, frontend, mobile, and documentation.
  - Integrated upstream's unified `AppTabNavigator.js`, corporate mobile screens, valet & bay assignment thunks, and photo carousel.
  - Fixed test store configurations and mock E2E navigation fixtures: 17/17 test suites (66/66 tests) passing (100%).
  - Git commit: `fix(mobile): resolve upstream merge conflicts and ensure 100% test suite pass`.

---

### 🚀 Sprint 1: Operational Parity & Booking Lifecycle (Completed)
- [x] **Step 1.1: Driver Check-in & Check-out in Booking Detail**
  - Connect `POST /api/bookings/{id}/check-in` & `POST /api/bookings/{id}/check-out` in `BookingDetailScreen.js`.
  - Display dynamic "Check In" button for confirmed bookings and "Check Out" for in-progress sessions.
  - Added `checkInThunk` and `checkOutThunk` in `bookingSlice.js`.
  - Written unit tests in `Mobile/src/screens/Booking/__tests__/BookingDetailScreen.test.js`.

- [x] **Step 1.2: Booking Extension Workflow (Driver & Vendor)**
  - Driver side: Added "Extend Booking" action modal in `BookingDetailScreen.js` calling `POST /api/bookings/{id}/extend` via `extendBookingThunk`.
  - Vendor side: Added pending extension request banner with Approve/Decline actions in `VendorBookingsScreen.js` calling `approveExtensionThunk` and `rejectExtensionThunk`.
  - Added unit tests covering extension lifecycle and pending extension notices.

- [x] **Step 1.3: Garage Vehicle Selection & Slot in Booking Flow**
  - Fetch user's registered vehicles (`GET /api/vehicles`) in `BookingScreen.js`.
  - Render 1-tap horizontal selector chips with plate, make, model, and color pre-fill.
  - Added slot number input support.
  - Fixed `MemberDashboardScreen.js` booking item `onPress` to navigate to `BookingDetail`.
  - Git commit: `feat(mobile): implement check-in/out, booking extension workflow, and garage vehicle picker`.

---

### 🚀 Sprint 2: Communications & Notifications (Completed)
- [x] **Step 2.1: Mobile Notification Center**
  - Updated `NotificationsScreen.js` with list, mark-as-read, delete, and clear-all actions.
  - Linked notification navigation to `BookingDetailScreen`.
  - Added unit test suite in `Mobile/src/screens/Notifications/__tests__/NotificationsScreen.test.js`.

- [x] **Step 2.2: Device Push Token Lifecycle**
  - Implemented `NotificationService.js` with device registration (`POST /api/device-tokens/register`) and deregistration on logout (`POST /api/device-tokens/deregister`).
  - Added platform identification for APNs (iOS: 1) and FCM (Android: 2).

- [x] **Step 2.3: Chat & Host Review Replies**
  - Integrated chat conversation loading, messaging thread, and HTTP auto-polling fallback.
  - Added `respondToReviewThunk` in `reviewSlice.js` and "Reply as Host" modal on `ParkingDetailScreen.js` for listing owners.
  - Git commit: `feat(mobile): implement notification center, device push token lifecycle, and host review response`.

---

### 🚀 Sprint 3: Vendor Media & Pass Monetization (Next Priority)
- [ ] **Step 3.1: Multi-Image Photo Upload for Listings**
  - Add `expo-image-picker` to `CreateParkingScreen.js` and upload photos to `/api/files/parking/{id}/upload`.
  - Implement remote image carousel in `ParkingDetailScreen.js`.

- [ ] **Step 3.2: Listing Edit & Deletion**
  - Implement `EditParkingScreen.js` for updating title, pricing, and available spots.
  - Add delete space confirmation in `MyListingsScreen.js`.

- [ ] **Step 3.3: In-App Pass Subscription Purchase & Stripe Sheet**
  - Build purchase modal in `MyPassesScreen.js` calling `POST /api/passes`.
  - Integrate Stripe checkout sheet for mobile bookings and passes.

---

### 🚀 Sprint 4: Corporate Enterprise Mobile Extension
- [ ] **Step 4.1: Corporate Employee Mode**
  - Company context switch in Profile.
  - Book employee parking (`POST /corporate/companies/{id}/bookings/employee`) and corporate digital gate token.

