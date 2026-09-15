# Solari Systems: Enterprise Agentic Projects Blueprint & Implementation Plan

## 1. Executive Summary & Solari Platform Deep Dive

Following a deep analysis of [changelog.getsolari.com](https://changelog.getsolari.com), [docs.getsolari.com](https://docs.getsolari.com), and the Solari developer ecosystem, Solari provides a unified agent infrastructure platform accessed via a single endpoint (`api.getsolari.com`) and single API key format (`slr_live_...`).

### Core Platform Capabilities
1. **Cloud Browsers**:
   - Ephemeral or persistent Chromium instances on Cloud Hypervisor microVMs booting in ~1s.
   - **Stealth Mode**: Real hardware GPU rendering that evades sophisticated bot detection (Cloudflare Turnstile, DataDome, Akamai, PerimeterX).
   - **Managed Egress Proxies**: Residential, ISP, and mobile IP pools across 15 countries with sticky sessions and geo-targeting.
   - **Automated Captcha Solving**: Native bypass for reCaptcha, hCaptcha, and Turnstile.
   - **Profiles & Login Handoff**: `POST /profiles/{id}/login-handoff` generates secure, single-use login links for end-users to authenticate third-party services without exposing credentials to backend systems.
   - **Audit Replays**: Automatic MP4 session recording and playback URLs for compliance and debugging.

2. **Sandboxes (Headless MicroVMs)**:
   - Sub-second boot times (~1s) from memory snapshots.
   - Resource scalability: 1–16 vCPUs, up to 64 GB RAM, up to 20 GB disk (`disk_gb`).
   - **Stateful Kernels**: Interactive code execution (Python) with stdout, stderr, inline plots, and structured chart responses.
   - **Filesystem & Git**: Native filesystem operations and authenticated git operations (clone, branch, commit, push, pull).
   - **Snapshots & Safe Reverts**: Save state, branch into forks, and roll back safely without dropping running VMs.
   - **Persistent Volumes**: Org-scoped storage volumes mountable across machine lifecycles.
   - **Port Previews**: Dynamic public URLs (`*.preview.getsolari.com`) for dev servers and webhooks.

3. **Desktops (GUI MicroVMs)**:
   - Full Linux desktop environment over low-latency VNC (`streamUrl` via noVNC).
   - Computer-use tools: mouse control (click, doubleClick, right/middle click, drag), keyboard input, hotkeys, and screenshot capture.
   - Native OS control: process execution, clipboard synchronization, application launching, and window resizing.
   - Session screen recording to MP4 for audits.

4. **MCP Server Integration (`@solarisdk/mcp`)**:
   - 27 ready-to-use MCP tools for Claude Desktop, Cursor, Windsurf, or custom agent runtimes via hosted URL (`https://mcp.getsolari.com/mcp`) or local `npx @solarisdk/mcp`.

---

## 2. Selected High-Impact Project Proposals

### Project 1: LegacyBridge — Autonomous Desktop ERP & Legacy System Automation Agent
- **Target Market**: Supply chain, logistics, manufacturing, insurance, and healthcare enterprises running on legacy desktop software (SAP GUI, AS/400 terminals, custom Windows/Linux thick clients) with no REST APIs.
- **The Problem**: Traditional RPA (UiPath, Automation Anywhere) is brittle, requires months of rigid scripting, costs $10,000+ per bot/year, and breaks on interface tweaks.
- **The Solari Solution**:
  - Uses **Solari Desktops** and computer-use MCP tools (`solari_open_app`, `solari_screenshot`, `solari_click`, `solari_type`, `solari_key`).
  - An LLM agent autonomously navigates legacy desktop software, inputs invoices, reconciles bills of lading, and extracts data.
  - **Login Handoff** enables human operators to sign into protected VPN/SSO portals once, persisting the profile.
  - **Session Recording (`record: true`)** creates tamper-proof MP4 video audit logs for regulatory and compliance adherence.
  - **Memory Snapshots** allow instant state revert if an ERP transaction validation fails, preventing corrupted database records.
- **Key Business ROI**: Cuts manual back-office processing by 80%; eliminates $50k+ custom legacy API integration contracts.

---

### Project 2: Solari Hunter — Anti-Bot Resilient Competitive Intelligence & Automated Procurement Engine
- **Target Market**: E-commerce aggregators, dropshippers, procurement teams, and hotel/travel booking platforms.
- **The Problem**: Modern target sites use aggressive anti-bot protection (DataDome, Cloudflare, Akamai) that immediately flags and blocks traditional scrapers (Puppeteer, Scrapy, standard Playwright), while residential proxies and captcha services are complex to maintain.
- **The Solari Solution**:
  - Leverages **Solari Cloud Browsers** with stealth GPU rendering and residential proxy pools in 15 countries.
  - Built-in automatic CAPTCHA solving handles Turnstile and reCaptcha without external vendor latency.
  - When supplier pricing or inventory drops below target thresholds, the agent automatically executes wholesale replenishment orders.
  - Solari's **Login Handoff** links allow procurement managers to link authenticated supplier accounts securely without sharing credentials.
  - Produces MP4 video replays for every executed transaction for reconciliation and order verification.
- **Key Business ROI**: Real-time pricing intelligence with 99.8% extraction reliability and automated margin arbitrage.

---

### Project 3: PreviewPulse — Autonomous Pull Request Live Preview & Visual Regression Sandbox
- **Target Market**: Engineering teams, developer tools companies, and open-source maintainers.
- **The Problem**: Reviewing full-stack or frontend PRs requires engineers to pull branches locally, install dependencies, configure databases, and boot dev servers just to test UI or API behavior.
- **The Solari Solution**:
  - On GitHub PR webhook, provisions a **Solari Sandbox** in ~1s using pre-warmed templates.
  - Runs git clone, dependency installation, and spins up the dev server.
  - Exposes an ephemeral live testing environment using **Solari Port Preview (`previewUrl`)**.
  - A parallel **Solari Cloud Browser** runs automated visual checks, captures full-page screenshots, compares against baseline images, and posts before/after diffs along with the live preview link directly on the PR.
  - Integrates with Cursor and Claude via MCP so reviewers can attach directly to the running sandbox to debug failing tests.
- **Key Business ROI**: Eliminates 60% of PR review friction, reduces QA cycles, and prevents visual regressions before staging.

---

### Project 4: QuantFlow — Autonomous Financial Modeling & Data Science Sandbox
- **Target Market**: Hedge funds, private equity analysts, FP&A teams, and corporate strategy groups.
- **The Problem**: Financial analysts receive large, messy datasets (CSV, Parquet, Excel) requiring statistical analysis and forecasting. Running unvetted agentic code locally poses security risks, while cloud notebooks (Databricks, Colab) are slow to orchestrate via agents.
- **The Solari Solution**:
  - Deploys **Solari Sandboxes** equipped with stateful Python kernels (`solari_run_code`) supporting typed chart outputs.
  - Mounts **Persistent Volumes** storing proprietary financial datasets across isolated sessions.
  - Harnesses **Snapshot Forking**: When evaluating multiple forecasting hypotheses (e.g. ARIMA vs. XGBoost vs. Prophet), the agent snapshots the cleaned dataset state and forks into 3 parallel microVMs to compute simultaneously.
  - Generates executive dashboards and HTML reports served directly through Solari preview URLs.
- **Key Business ROI**: Transforms hours of repetitive spreadsheet and notebook analysis into a sub-minute autonomous pipeline.

---

## 3. Recommended Project to Build First: "PreviewPulse" or "Solari Hunter"

### Top Recommendation: **PreviewPulse (Autonomous PR Preview & Visual Regression Agent)**
1. **Immediate Developer Adoption**: Solves a universal pain point experienced by every engineering organization using GitHub/GitLab.
2. **Full-Spectrum Solari Utilization**: Harnesses all three pillars of Solari:
   - **Sandboxes**: Sub-second VM booting, git operations, and port preview dev servers.
   - **Cloud Browsers**: Headless verification, screenshot comparison, and E2E visual audits.
   - **MCP Server**: Seamless connection into developer IDEs (Cursor/Claude Code).
3. **Low Initial Complexity, High Extensibility**:
   - Phase 1: GitHub webhook -> Solari Sandbox spawn -> Port Preview URL -> PR comment.
   - Phase 2: Solari Browser automated screenshot capture & visual diffing.
   - Phase 3: MCP attachment for live in-sandbox debugging from Claude/Cursor.

### Alternative Top Recommendation: **Solari Hunter (Wholesale Procurement & Dynamic Pricing)**
If the business goal is immediate commercial revenue or procurement automation, Solari Hunter exploits Solari's stealth GPU rendering and residential proxy infrastructure where competing tools fail.
