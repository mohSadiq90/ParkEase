# ParkEase Agent Rules & Standard Operating Procedures

## 1. Remote Repository Synchronization (Pre-Work Sync)
**MANDATORY BEFORE ANY WORK:**
1. Check `git status` and pull the latest changes from `origin/main`:
   ```bash
   git pull origin main
   ```
2. Verify clean working branch before modifying files or running test suites.

---

## 2. Progress Tracking & Default Context Loading
1. **Load Context:** Always load `PROGRESS.md` (along with `API_ENDPOINTS_MOBILE.md` and `README.md`) as the primary context when starting tasks in this repository.
2. **Log Maintenance:** Maintain daily dated entries in `PROGRESS.md` with:
   - Features implemented/updated across Mobile, Frontend, and Backend
   - Bug fixes, schema updates, and test additions
   - Key modified files
   - Current status and roadmap progress

---

## 3. Storage & Monorepo Build Rules (5GB Disk Limit)
- Ensure all npm/yarn caches and build outputs route to `/var/tmp/appdemo885_data/` or `/tmp/`.
- Ensure Android build outputs in `Mobile/android/app/build` route away from `/home` via global Gradle init script.

---

## 4. Keystore & CI/CD Hygiene
- Maintain deterministic debug keystore at `Mobile/debug.keystore` to prevent signature mismatches on device.
- CI/CD workflow in `.github/workflows/build-and-distribute.yml` builds debug APK and uploads to Firebase App Distribution with Slack alerts.

---

## 5. Post-Work Commit & Push (Mandatory Sync)
**MANDATORY AT CONCLUSION OF WORK:**
1. Update `PROGRESS.md` to reflect all completed changes.
2. Commit with meaningful conventional commit messages:
   ```bash
   git add .
   git commit -m "feat/fix: <description>"
   ```
3. Push to `origin main`:
   ```bash
   git push origin main
   ```
