# ParkEase Mobile Automated Flow Testing (Maestro & Jest)

This directory contains declarative end-to-end (E2E) automation flows for the ParkEase React Native Mobile application using **Maestro** and **Jest + React Native Testing Library**.

## 1. Fast Automated Integration Flow Tests (In-Repo / CI-Friendly)
We have a comprehensive automated flow test suite in `Mobile/src/__tests__/e2e/`:
- `AuthAndRoleFlows.test.js`: Covers Member, Vendor, Corporate logins, 401 invalid credentials error banner, network error handling, form validation edge cases, session restore on cold start, expired token fallback, full logout flow, and Corporate SSO discovery.
- `MemberBookingFlows.test.js`: End-to-end member discovery, search filtering, spot detail metadata, pricing/duration calculation, 409 conflict handling, payment gateway processing, booking tabs, and live QR passes.
- `VendorManagementFlows.test.js`: End-to-end vendor dashboard metrics, listings lifecycle, active/inactive toggle sync, creation form validation, booking approvals/rejections, and QR pass scanner.
- `CorporateFlows.test.js`: End-to-end corporate dashboard, bay inventory, employee directory & invites, member removal, bay allocations, and invoice offline payments.
- `UserFeaturesFlows.test.js`: End-to-end user profile, edit profile validation, password rotation, vehicle garage management, review submission, chat messaging, and notifications.
- `MemberFlow.test.js`: Full signup to booking discovery flow and offline network resilience.
- `VendorFlow.test.js`: Full listing creation and booking approval flow.

### Running Jest Flow Tests:
```bash
cd Mobile
npm run test:flows
```

---

## 2. On-Device / Emulator Black-Box Automation (Maestro)
For testing real Android APK builds (such as debug/release builds produced in `.github/workflows/build-and-distribute.yml`), Maestro executes declarative YAML flows against real devices or emulators.

### Prerequisites:
1. Install Maestro:
   ```bash
   curl -FsSL "https://get.maestro.mobile.dev" | bash
   ```
2. Ensure Android emulator or physical device is connected (`adb devices`).

### Running Flows:
- **Run all automated flows:**
  ```bash
  maestro test .maestro/flows/
  ```
- **Run Member login flow:**
  ```bash
  maestro test .maestro/flows/01_member_login_flow.yaml
  ```
- **Run Vendor login flow:**
  ```bash
  maestro test .maestro/flows/02_vendor_login_flow.yaml
  ```
- **Run Invalid credentials failure test:**
  ```bash
  maestro test .maestro/flows/03_invalid_login_failure.yaml
  ```
- **Run Corporate Enterprise flow:**
  ```bash
  maestro test .maestro/flows/04_corporate_login_flow.yaml
  ```
