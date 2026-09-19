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

## 5. Continuous Commit & Push On Passing Tests (Mandatory Sync)
**MANDATORY AT EVERY STEP ONCE TESTS PASS:**
1. **Commit and Push at Every Step:** Whenever automated test suites pass after completing any implementation step, feature addition, bug fix, or documentation update, immediately stage, commit, and push to `origin/main`. Never leave uncommitted changes or unpushed commits between steps or across turns.
2. **Update Progress Log:** Ensure `PROGRESS.md` reflects all completed changes before committing and pushing.
3. **Commit with meaningful conventional commit messages:**
   ```bash
   git add .
   git commit -m "feat/fix: <description>"
   ```
4. **Push to Remote:** Immediately push to `origin main` to trigger the Android Release APK build & Firebase App Distribution pipeline:
   ```bash
   git push origin main
   ```

---

## 6. Exclusive Mobile Engineering & Android Build Scope (Strict Rule)
- **Mobile-Only Scope**: All implementation tasks, features, UI/UX enhancements, bug fixes, and architectural changes are strictly scoped to the Mobile React Native application (`Mobile/`). Never modify, build, or touch `backend/` or `frontend/` unless explicitly requested by the user.
- **Test Execution Scope**: Only run Mobile test suites:
  ```bash
  cd Mobile && npm test -- --watchAll=false
  ```
  Never run backend .NET tests (`dotnet test`) or web frontend tests (`vitest`).
- **Build & CI Target**: The exclusive deployment pipeline is the **Android Release APK Build & Firebase App Distribution** (`.github/workflows/build-and-distribute.yml`). Pushes to `main` must only trigger the Android build and distribution pipeline for mobile changes.

---

## 7. Keyboard Handling & Form Visibility Checklist (Mobile Best Practice)
**MANDATORY FOR ALL MODALS, SCREENS, AND FORMS WITH TEXT INPUTS:**
Whenever creating or modifying any modal, screen, bottom-sheet, or dialog containing `TextInput` or `Input` components, agents MUST enforce the following checklist to ensure typography, labels, and form fields never hide behind the on-screen keyboard:
1. **Wrap in `KeyboardAvoidingView`**:
   - Wrap the modal overlay or container with `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>`.
   - On iOS, use `padding`; on Android, use `height` or `adjustResize` compatible offset to lift the sheet above the soft keyboard.
2. **Enclose Content in a Scroll Container**:
   - Wrap all form contents (inputs, selectors, labels, and action buttons) inside a `<ScrollView>` with `keyboardShouldPersistTaps="handled"` and `keyboardDismissMode="on-drag"`.
   - Ensure `showsVerticalScrollIndicator={false}` and configure appropriate `contentContainerStyle` padding (`paddingBottom: spacing.md` or `spacing.xl`).
3. **Constrain Modal Dimensions (`maxHeight`)**:
   - Give bottom-sheet and modal containers an explicit maximum height (e.g. `maxHeight: '90%'` or `'85%'`) and `flexShrink: 1` so that when the soft keyboard lifts the container, the top of the modal remains within screen bounds and does not get clipped off the status bar.
4. **Interactive Backdrop Dismissal**:
   - Provide an interactive backdrop (`<TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => { Keyboard.dismiss(); closeModal(); }} />`) so tapping outside dismisses both the soft keyboard and the modal.
5. **Persistent Taps (`keyboardShouldPersistTaps="handled"`)**:
   - Set `keyboardShouldPersistTaps="handled"` on both vertical and horizontal `ScrollView`s so buttons, chips, and radio pills respond immediately to the first touch without needing a prior tap to dismiss the keyboard.
6. **Fixed Accessible Modal Header**:
   - Keep the modal header (`modalHeader` with title and close X button) outside the scroll view or prominently pinned so users can always close the dialog even when the keyboard is active.
7. **Automated Unit Test Verification**:
   - Add unit tests verifying `KeyboardAvoidingView` and `ScrollView` with `keyboardShouldPersistTaps="handled"` are configured on modal/form components.

---

## 8. Prioritize User Inquiries & Clear Explanations Before Automation Runs
**MANDATORY WHEN USER PROMPTS CONTAIN QUESTIONS OR INQUIRIES:**
- Whenever a user request contains a question, request for clarification, architectural critique, or inquiry, the agent MUST prioritize answering the query clearly, directly, and comprehensively before initiating long-running automated test suites or builds.
- Never let background automation block or delay answering the user's specific questions.
