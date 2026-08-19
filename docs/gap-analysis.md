# ParkEase - Comprehensive Backend vs Mobile Gap Analysis

This document evaluates the complete state of implementation across the **ParkEase** platform, specifically performing a deep comparative analysis between the **Backend .NET 9 CQRS API** and the **Mobile React Native (Expo) Client Application**.

---

## 📊 High-Level Implementation Parity Matrix

| Feature Module | Backend (.NET 9) | Web Frontend (React) | Mobile Frontend (Expo) | Mobile Parity Status | Primary Gap |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Auth & Profile** | ✅ 100% | ✅ 100% | ⚠️ 90% | **Near Parity** | Account deletion (`DELETE /api/users/me`) not exposed in mobile UI. |
| **Vehicle Garage** | ✅ 100% | ✅ 100% | ⚠️ 80% | **Partial** | Garage CRUD exists, but not hooked into `BookingScreen` for 1-tap checkout. |
| **Saved Favorites** | ✅ 100% | ✅ 100% | ✅ 100% | **Full Parity** | Pinned favorites list & instant heart toggle fully functional. |
| **Search & Discovery** | ✅ 100% | ✅ 100% | ⚠️ 75% | **Partial** | Search & map work, but missing advanced filter modals (pricing tier, vehicle size, amenities). |
| **Spot Availability Forecast** | ✅ 100% | ✅ 100% | ⚠️ 80% | **Partial** | Summary forecast card rendered on detail screen; missing hourly 24h trend timeline graph. |
| **Booking Creation** | ✅ 100% | ✅ 100% | ⚠️ 70% | **Partial** | Date-time calculation & discount codes work, but lacks garage vehicle picker & slot number input. |
| **Booking Lifecycle (Check-in/out)**| ✅ 100% | ✅ 100% | ❌ 0% | **Missing** | Backend `check-in` and `check-out` endpoints not connected in `BookingDetailScreen`. |
| **Booking Extensions** | ✅ 100% | ✅ 100% | ❌ 0% | **Missing** | Driver cannot request extensions; Vendor cannot approve/reject extensions on mobile. |
| **Payments & Stripe** | ✅ 100% | ✅ 100% | ❌ 10% | **Missing** | Stripe SDK / Payment sheet not implemented; bookings created without payment gateway capture. |
| **Parking Passes (Subscriptions)** | ✅ 100% | ✅ 100% | ⚠️ 50% | **Partial** | Active pass viewing and gate tokens work, but pass subscription/purchase is web-only. |
| **Reviews & Feedback** | ✅ 100% | ✅ 100% | ⚠️ 75% | **Partial** | Users can rate/review; host responses displayed; hosts cannot reply to reviews from mobile. |
| **Chat & Messaging** | ✅ 100% | ✅ 100% | ⚠️ 80% | **Partial** | Chat works via 5s HTTP polling fallback instead of persistent SignalR WebSocket connection. |
| **Notification Center & Push (FCM)**| ✅ 100% | ✅ 100% | ❌ 10% | **Missing** | No Notification Center screen, no badge icon, no startup FCM token registration. |
| **Vendor Space Management** | ✅ 100% | ✅ 100% | ⚠️ 60% | **Partial** | Create & toggle active work; missing photo/video upload, editing listings, and deletion. |
| **Corporate Parking (B2B)** | ✅ 100% | ✅ 100% | ❌ 0% | **Web First** | Complete B2B suite (companies, employee/visitor bookings, waitlists, allocations, invoicing) absent on mobile. |

---

## 🔍 Detailed Breakdown of Identified Gaps

### 1. 🔄 Booking Operations: Check-In, Check-Out & Extension Workflow
- **Backend Implementation**:
  - `POST /api/bookings/{id}/check-in` (`CheckInCommand`): Validates booking time window and marks slot occupancy status as In-Progress.
  - `POST /api/bookings/{id}/check-out` (`CheckOutCommand`): Finalizes booking, frees up slot occupancy, and triggers review prompt.
  - `POST /api/bookings/{id}/extend` (`RequestExtensionCommand`): Calculates extension surcharge and creates pending extension request.
  - `POST /api/bookings/{id}/approve-extension` & `POST /api/bookings/{id}/reject-extension` (`ApproveExtensionCommand`, `RejectExtensionCommand`).
- **Mobile Gap**:
  - `BookingDetailScreen.js` displays booking info and cancel button, but lacks interactive **"Check In"** and **"Check Out"** buttons.
  - Drivers cannot extend active bookings from their mobile device.
  - `VendorBookingsScreen.js` allows approving initial bookings, but does not display or allow vendors to act on incoming extension requests.
- **Remediation**:
  - Add contextual action buttons in `BookingDetailScreen.js` based on status (`Confirmed` -> Check In, `InProgress` -> Check Out & Extend).
  - Add Extension Request modal in `BookingDetailScreen.js` with new end-time picker and recalculated cost.
  - Add Extension review banner in `VendorBookingsScreen.js`.

---

### 2. 💳 Native Payment Gateway Integration (Stripe)
- **Backend Implementation**:
  - `GET /api/payments/stripe-config`: Returns publishable key.
  - `POST /api/payments/create-order` & `POST /api/payments/verify`: Initiates payment intent and verifies digital signature/webhook.
  - `POST /api/payments/refund`: Triggers automated refund on cancellation.
- **Mobile Gap**:
  - `BookingScreen.js` creates a booking in the database directly without initiating or capturing payment via Stripe Mobile SDK / PaymentSheet.
  - Mobile users cannot view itemized receipts or GST breakdowns.
- **Remediation**:
  - Integrate `@stripe/stripe-react-native` or an in-app browser checkout sheet using `createPaymentOrder`.
  - Add receipt view / breakdown modal matching Web `MyBookings.jsx`.

---

### 3. 🚗 Garage Vehicle Selection & Slot Picker in Booking Flow
- **Backend Implementation**:
  - `POST /api/bookings` accepts `slotNumber`, `vehicleNumber`, `vehicleModel`, `vehicleColor`, and `vehicleType`.
  - `GET /api/vehicles` provides user's registered vehicles.
- **Mobile Gap**:
  - `BookingScreen.js` has generic vehicle type selector (Car, Motorcycle, Truck), but does not query user's vehicles (`/api/vehicles`) for 1-tap selection.
  - No slot number selection or allocated slot confirmation.
- **Remediation**:
  - Add a "Select Vehicle from Garage" horizontal card list in `BookingScreen.js` with an "Add New Vehicle" quick button.
  - Pre-populate vehicle details during booking creation.

---

### 4. 🔔 In-App Notification Center & FCM Device Registration
- **Backend Implementation**:
  - `GET /api/notifications`, `PUT /api/notifications/{id}/read`, `PUT /api/notifications/read-all`, `DELETE /api/notifications/{id}`.
  - `POST /api/device-tokens/register` (`RegisterDeviceTokenCommand`): Registers device push token with platform metadata.
  - SignalR `NotificationHub` at `/hubs/notifications`.
- **Mobile Gap**:
  - No Notification Center screen or history feed exists in the mobile application.
  - No header bell icon with unread count badge.
  - App boot sequence does not register FCM/APNS push token with backend.
- **Remediation**:
  - Create `NotificationsScreen.js` with read/unread filters, mark all read, and clear actions.
  - Wire push token listener in `App.js` calling `POST /api/device-tokens/register`.

---

### 5. 🎫 In-App Parking Pass Subscription & Purchase
- **Backend Implementation**:
  - `POST /api/passes` (`CreateParkingPassCommand`): Creates Weekly or Monthly parking subscriptions with automatic discount tiers (15% weekly, 25% monthly).
- **Mobile Gap**:
  - `MyPassesScreen.js` displays active passes and gate tokens, but includes a notice stating *"Visit the web app to subscribe."* There is no purchase UI.
- **Remediation**:
  - Add "Subscribe to Pass" modal in `MyPassesScreen.js` allowing space/zone selection, duration choice (Weekly/Monthly), and payment checkout.

---

### 6. 📸 Multi-Media Photo & Video Upload for Parking Listings
- **Backend Implementation**:
  - Direct multipart upload (`POST /api/files/parking/{id}/upload`) and Cloudflare R2 presigned signed URLs (`POST /api/files/parking/{id}/sign-upload` + `confirm-upload`).
- **Mobile Gap**:
  - `CreateParkingScreen.js` only accepts text inputs and amenity checkboxes; no image picker or camera integration.
  - `ParkingDetailScreen.js` renders a static placeholder icon instead of remote photo gallery/carousel.
- **Remediation**:
  - Add `expo-image-picker` to `CreateParkingScreen.js` for camera and photo gallery uploads.
  - Add Image Carousel slider to `ParkingDetailScreen.js`.

---

### 7. 🛠️ Vendor Listing Management & Host Review Responses
- **Backend Implementation**:
  - `PUT /api/parking/{id}` (Update listing details and pricing).
  - `DELETE /api/parking/{id}` (Delete listing).
  - `POST /api/reviews/{id}/owner-response` (Host review replies).
  - `GET /api/parking-availability/my-listings` (Vendor forecast telemetry).
- **Mobile Gap**:
  - `MyListingsScreen.js` only supports toggling active switch; edit handler is a no-op `() => {}` and there is no edit screen or delete button.
  - Space owners cannot reply to customer reviews from the mobile app.
- **Remediation**:
  - Create `EditParkingScreen.js` and delete confirmation dialog.
  - Add "Reply as Host" modal in `ParkingDetailScreen.js` when user is the listing owner.

---

### 8. 🏢 Corporate Parking Module (Employee & Visitor Flow)
- **Backend Implementation**:
  - Full B2B Corporate suite under `/api/v1/corporate`: Company profiles, team members, employee reservations (`/bookings/employee`), visitor reservations (`/bookings/visitor`), waitlists, allocations, and monthly invoicing.
- **Mobile Gap**:
  - Mobile app currently only supports Consumer Member and Private Space Vendor roles. Corporate employee parking and visitor passes are completely absent.
- **Remediation**:
  - Phase 1: Support Corporate Employee mode (switch organization, view corporate quotas, book corporate slots, display corporate digital gate passes).
  - Phase 2: Host / Corporate Admin tools (Allocations, invoices).

---

### 9. ⚡ Real-Time WebSocket Streaming (SignalR)
- **Backend Implementation**:
  - Real-time SignalR hubs at `/hubs/chat` and `/hubs/notifications` with auto-reconnect and JWT query auth.
- **Mobile Gap**:
  - `ChatScreen.js` uses HTTP polling every 5 seconds as a fallback.
- **Remediation**:
  - Implement `@microsoft/signalr` client in Mobile `chatService.js` and `notificationService.js` for instant push without polling battery drain.

---

### 10. 🐞 Minor Polish & Bug Fixes
- `MemberDashboardScreen.js` (Line 124): Booking cards have empty `onPress={() => {}}` instead of navigating to `BookingDetail`.
- `ProfileScreen.js`: Missing Account Deletion option (`DELETE /api/users/me`).

