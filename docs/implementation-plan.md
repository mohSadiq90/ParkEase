# ParkEase - Implementation Plan & Progress Tracking

This document outlines all core features, architectural status, implementation roadmaps, completed deliverables, and pending milestones across the **ParkEase** platform (Backend .NET 9 API, Frontend React SPA, and Mobile React Native Expo App).

---

## 📊 Platform Feature Status Matrix

| Module | Capability / Endpoint | Backend (.NET 9) | Web (React) | Mobile (Expo) | Current Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Auth & Identity** | JWT Login, Register, Refresh Token, Password Change | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Auth & Identity** | User Profile Update & Avatar Display | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Auth & Identity** | Account Deletion (`DELETE /users/me`) | ✅ Completed | ✅ Completed | ⚠️ API Ready | **Pending Mobile UI** |
| **Vehicle Management** | My Garage: CRUD for registered vehicles & plates | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Favorites** | Toggle & Pinned Favorites List | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Parking Discovery** | Geolocation Search, Filters, Radius, Map Clusters | ✅ Completed | ✅ Completed | ⚠️ Basic Map/Search | **Pending Filter Modals** |
| **Spot Availability Forecast**| ML & Deterministic 24-hr Occupancy Forecast API | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Spot Availability Forecast**| Hourly Occupancy Projection & Peak Prediction Bar | ✅ Completed | ✅ Completed | ⚠️ Card Only | **Pending Hourly Chart** |
| **Booking Creation** | Price calculation, dynamic pricing, discount codes | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Booking Creation** | 1-Tap Garage Vehicle Picker & Slot Selection | ✅ Completed | ✅ Completed | ⚠️ Generic Inputs | **Pending Garage Link** |
| **Booking Operations** | Check-in / Check-out Occupancy State Tracking | ✅ Completed | ✅ Completed | ❌ Not Implemented | **High Priority Gap** |
| **Booking Operations** | Booking Extensions (Driver Request & Vendor Actions)| ✅ Completed | ✅ Completed | ❌ Not Implemented | **High Priority Gap** |
| **Payments & Receipts** | Stripe Payment Gateway Integration | ✅ Completed | ✅ Completed | ❌ Stubbed | **High Priority Gap** |
| **Payments & Receipts** | Digital Receipt Breakdown with Itemized GST | ✅ Completed | ✅ Completed | ⚠️ In Booking Detail| **Pending Receipt Modal**|
| **Parking Passes** | Active Pass Display & QR Gate Access Tokens | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Parking Passes** | Weekly & Monthly Pass Subscription Purchase Flow | ✅ Completed | ✅ Completed | ❌ Web Only | **Pending Mobile Checkout**|
| **Reviews & Feedback** | Multi-media User Ratings & Reviews Creation | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Reviews & Feedback** | Owner/Host Review Responses ("👑 Response from Host")| ✅ Completed | ✅ Completed | ⚠️ Display Only | **Pending Vendor Reply** |
| **Chat & Messaging** | SignalR WebSocket Real-time 1-on-1 Chat with Hosts | ✅ Completed | ✅ Completed | ⚠️ HTTP Polling | **Pending SignalR Hookup** |
| **Notifications & Push** | In-app Notification Center (List, Mark Read, Clear) | ✅ Completed | ✅ Completed | ❌ Not Implemented | **High Priority Gap** |
| **Notifications & Push** | FCM Device Token Registration (`POST /device-tokens`)| ✅ Completed | ✅ Completed | ❌ Not Implemented | **High Priority Gap** |
| **Vendor Management** | Create Parking Space & Toggle Active Status | ✅ Completed | ✅ Completed | ✅ Completed | **100% Done** |
| **Vendor Management** | Multi-photo/video Media Upload (Local & R2 Storage) | ✅ Completed | ✅ Completed | ❌ Not Implemented | **Pending Media Picker** |
| **Vendor Management** | Edit & Delete Parking Space Listings | ✅ Completed | ✅ Completed | ❌ Not Implemented | **Pending Edit Screen** |
| **Corporate Parking (B2B)**| Organizations, Team Members, Invitations | ✅ Completed | ✅ Completed | ❌ Web First | **Web Complete (Phase 2 Mobile)** |
| **Corporate Parking (B2B)**| Employee & Visitor Parking Reservations | ✅ Completed | ✅ Completed | ❌ Web First | **Web Complete (Phase 2 Mobile)** |
| **Corporate Parking (B2B)**| Fixed/Shared Slot Allocations, Waitlist Promotion | ✅ Completed | ✅ Completed | ❌ Web First | **Web Complete (Phase 2 Mobile)** |
| **Corporate Parking (B2B)**| Monthly Invoicing, Mark Paid Offline, CSV Exports | ✅ Completed | ✅ Completed | ❌ Web First | **Web Complete (Phase 2 Mobile)** |
| **Admin Operations** | Transactional Outbox Monitor, Requeue, Event Process | ✅ Completed | ✅ Completed | ❌ Web First | **Web Complete** |

---

## 🛠️ Prioritized Mobile Implementation Roadmap

### Phase 1: Core Operational Parity (Highest Priority)
1. **Check-In & Check-Out Execution**:
   - Add Check-In button to `BookingDetailScreen.js` for bookings in `Confirmed` status within arrival window.
   - Add Check-Out button for bookings in `InProgress` status.
2. **Booking Extension Flow**:
   - Driver: Add "Extend Booking" modal in `BookingDetailScreen.js` calling `POST /api/bookings/{id}/extend`.
   - Vendor: Add Extension Approval/Rejection banners in `VendorBookingsScreen.js` calling `POST /api/bookings/{id}/approve-extension` and `POST /api/bookings/{id}/reject-extension`.
3. **Garage Integration in Booking Creation**:
   - In `BookingScreen.js`, fetch user's saved vehicles (`GET /api/vehicles`) and render horizontal selector cards for 1-tap plate selection.
4. **Member Dashboard Navigation Fix**:
   - Fix `MemberDashboardScreen.js` to navigate to `BookingDetail` on booking card click.

---

### Phase 2: Engagement & Communication Parity
1. **Notification Center Screen**:
   - Create `NotificationsScreen.js` linked to navigation headers with unread badge.
   - Connect endpoints `GET /api/notifications`, `PUT /api/notifications/{id}/read`, `PUT /api/notifications/read-all`, `DELETE /api/notifications/clear-all`.
2. **FCM Push Token Registration**:
   - Integrate `expo-notifications` on mobile app boot to register device token via `POST /api/device-tokens/register`.
3. **SignalR WebSocket Client**:
   - Replace 5s HTTP polling in `chatService.js` with persistent SignalR connection.
4. **Host Review Reply**:
   - Allow space owners to write replies to user reviews from mobile.

---

### Phase 3: Vendor Capabilities & Monetization
1. **Listing Media & Image Picker**:
   - Add `expo-image-picker` to `CreateParkingScreen.js` with multi-image selection and upload to `POST /api/files/parking/{id}/upload`.
   - Add remote image carousel in `ParkingDetailScreen.js`.
2. **Listing Edit & Delete**:
   - Create `EditParkingScreen.js` and delete flow in `MyListingsScreen.js`.
3. **In-App Pass Subscriptions**:
   - Add Weekly/Monthly Pass purchase sheet in `MyPassesScreen.js` calling `POST /api/passes`.
4. **Payment Gateway Integration**:
   - Integrate Stripe Payment Sheet for mobile checkout.

---

### Phase 4: Corporate B2B Mobile Module (Future Extension)
1. **Corporate Employee Mode**:
   - Organization switcher in Profile.
   - Corporate employee slot booking (`POST /corporate/companies/{id}/bookings/employee`) and digital corporate passes.
2. **Visitor Pass Requests**:
   - Pre-register visitor plates with QR gate passes.

