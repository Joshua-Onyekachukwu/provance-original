# Provance Frontend — Master Documentation Index

**Updated:** 2026-08-04  
**Purpose:** Single entry point for all design specs, PRDs, and process docs. Portable for external teams.

---

## Architecture & Process

| Document | File | Status |
|---|---|---|
| Team Workflow | `engineering/DEVELOPMENT_WORKFLOW_AND_RELEASE_PROCESS.md` | ✅ Current |
| Multi-Agent Operating Model | `ai-agents/HOW_TO_RUN_THE_ORG.md` + `ai-agents/RUNTIME_MAPPING.md` | ✅ Current |
| Engineering Standards | `engineering/ENGINEERING_STANDARDS.md` | ✅ Current |
| PR Review Guidelines | `engineering/PR_REVIEW_GUIDELINES.md` | ✅ Current |
| Decision Records | `decisions/001` … `decisions/004` | ✅ Current |
| Unified Design System Master Spec | `design-specs/UNIFIED-DESIGN-SYSTEM.md` | ✅ Current |
| Frontend Architecture (src tree) | `project-state/overall-project-architecture.md` + `engineering/CURRENT_IMPLEMENTATION_STATUS.md` | ✅ Current |

---

## Admin Dashboard (12 modules)

| # | Module | Route | Design Spec | PRD | Build |
|---|---|---|---|---|---|
| 1 | Overview | `/app/admin/overview` | `design-specs/admin-overview.md` | `prds/admin-overview.md` | ✅ Merged |
| 2 | Waitlist | `/app/admin/waitlist` | `design-specs/admin-waitlist.md` | `prds/admin-waitlist.md` | 🔴 PR #5 |
| 3 | User Management | `/app/admin/users` | `design-specs/admin-user-management.md` | `prds/admin-user-management.md` | 🔨 Building |
| 4 | Organizations | `/app/admin/organizations` | `design-specs/admin-org-management.md` | `prds/admin-org-management.md` | ⏳ |
| 5 | Verification Queue | `/app/admin/jobs` | 🔨 In progress | 🔨 In progress | ⏳ |
| 6 | Reports Management | `/app/admin/reports` | 🔨 In progress | 🔨 In progress | ⏳ |
| 7 | Analytics | `/app/admin/analytics` | — | — | — |
| 8 | System Monitoring | `/app/admin/monitoring` | — | — | — |
| 9 | Feature Flags | `/app/admin/feature-flags` | (included in org-management spec) | (included in org-management PRD) | ⏳ |
| 10 | Roles & Permissions | `/app/admin/roles` | — | — | — |
| 11 | Audit Logs | `/app/admin/audit-logs` | — | — | — |
| 12 | Admin Settings | `/app/admin/settings` | — | — | — |

---

## User Dashboard (10 pages)

| # | Page | Route | Design Spec | PRD | Build |
|---|---|---|---|---|---|
| 1 | Dashboard Home | `/app` | `design-specs/user-dashboard-home.md` | `prds/user-dashboard-home.md` | ✅ Built on ui kit |
| 2 | Upload & Verify | `/app/uploads` | — | — | ✅ Built (drag-drop, modes, queue state machine) |
| 3 | Reports Library | `/app/reports` | — | — | ✅ |
| 4 | Verification Queue | `/app/queue` | — | — | ✅ Built (stats + recent jobs) |
| 5 | Scan History | `/app/history` | — | — | ✅ |
| 6 | Notifications | `/app/notifications` | — | — | ⏳ |
| 7 | Team Workspace | `/app/team` | — | — | ⏳ |
| 8 | Profile + Settings | `/app/settings` | — | — | ⏳ |
| 9 | Developer Portal | `/app/developers` | — | — | ⏳ |
| 10 | Billing | `/app/billing` | — | — | ⏳ |

---

## Phase 2 UI Primitive Kit (built, `src/components/ui/`)

| Component | File | Status |
|---|---|---|
| Button (with router-link `to` prop) | `src/components/ui/Button.jsx` | ✅ |
| Badge | `src/components/ui/Badge.jsx` | ✅ |
| Card (loading/empty/error states) | `src/components/ui/Card.jsx` | ✅ |
| StatCard | `src/components/ui/StatCard.jsx` | ✅ |
| DataTable | `src/components/ui/DataTable.jsx` | ✅ |
| Tabs | `src/components/ui/Tabs.jsx` | ✅ |
| Drawer | `src/components/ui/Drawer.jsx` | ✅ |
| Toast + useToast | `src/components/ui/Toast.jsx` + `useToast.js` | ✅ |
| EmptyState / Skeleton / Spinner | `src/components/ui/` | ✅ |
| Popover (origin-aware, reduced-motion safe) | `src/components/ui/Popover.jsx` + `popoverOrigin.js` | ✅ |
| CommandPalette + CommandRegistry | `src/components/ui/CommandPalette.jsx` + `commandRegistry*.js` | ✅ |

## Shared Components (built)

| Component | File | Status |
|---|---|---|
| AdminShell | `src/components/admin/AdminShell.jsx` | ✅ |
| AdminTable | `src/components/admin/AdminTable.jsx` | ✅ |
| AdminDrawer | `src/components/admin/AdminDrawer.jsx` | ✅ |
| AdminSearch | `src/components/admin/AdminSearch.jsx` | ✅ |
| StatCard (UNIFIED) | `src/components/admin/StatCard.jsx` | ✅ (legacy, migrating to ui kit) |
| ConfirmDialog | `src/components/admin/ConfirmDialog.jsx` | ✅ |
| AttentionCard | `src/components/admin/AttentionCard.jsx` | ✅ |
| ActivityRow | `src/components/admin/ActivityRow.jsx` | ✅ |
| HealthCheckRow | `src/components/admin/HealthCheckRow.jsx` | ✅ |
| AdminOverviewSkeleton | `src/components/admin/AdminOverviewSkeleton.jsx` | ✅ |
| QueueSnapshotPanel | `src/components/admin/QueueSnapshotPanel.jsx` | ✅ |
| SystemHealthPanel | `src/components/admin/SystemHealthPanel.jsx` | ✅ |
| AppStatePanel | `src/components/app/AppStatePanel.jsx` | ✅ |
| ScanStatusBadge | `src/components/app/ScanStatusBadge.jsx` | ✅ |
| ForensicMediaFrame | `src/components/ForensicMediaFrame.jsx` | ✅ |

---

## Mock Data Infrastructure

| File | Purpose |
|---|---|
| `src/lib/mockData.js` | All sample data (users, orgs, waitlist, scans, reports, audit, flags, etc.) |
| `src/lib/mockApi.js` | Mock API functions with delays + error injection; live scan store |
| `src/lib/useMockData.js` | React hook: `{ data, loading, error, refetch }` |
| `src/lib/api.js` | USE_MOCK gate — toggle to switch between mock and real API (ADR 004) |
| `src/lib/useResource.js` | Shared per-slice loader hook (loading/error/ready + reload) |
| `src/lib/useDemoState.js` | Dev-only `?state=` forcing for loading/empty/error review |

---

## Delegation Session Reference (for full reports)

| Content | Session ID |
|---|---|
| Unified Design System Master Spec | `f06961ef-4100-4fcd-930c-26f84334d622` |
| Design Audit | `2403a5cd-0c26-45e9-8def-01658af85e7e` |
| A2 Admin Overview Design Spec | `3f16174e-b40f-4c9c-8fe3-68c175ee69e2` |
| U1 User Dashboard Home Spec | `9c97b489-3229-4aef-93cd-3f0ce3a6465b` |
| A4 User Management Spec | `4b2c523d-6731-4c9e-9ef6-2b06eacd4595` |
| A5 Org Management Spec | `7795a0f3-df87-44b2-9a99-1130fbbc5c15` |
| Admin Overview PRD | `3ca400d8-0d12-45bb-9157-23905377377b` |
| Waitlist PRD | `fe7e20b1-4926-436a-a29c-96dc0c867e61` |
| User Management PRD | `7270a175-f69c-4e6d-9b6b-b4ba1a44c590` |
| User Dashboard Home PRD | `4b17865b-1a5f-400e-b8b9-672e9e12ba7c` |
| Org Management + Feature Flags PRD | `0e3d3179-e0be-4bc9-ba1a-126a84133305` |
