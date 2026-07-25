# Organization Management + Feature Flags — Design & PRD Summary

**Routes:** `/app/admin/organizations` and `/app/admin/feature-flags`  
**Design Spec:** Delegation session `7795a0f3-df87-44b2-9a99-1130fbbc5c15`  
**PRD:** Delegation session `0e3d3179-e0be-4bc9-ba1a-126a84133305`  
**Build:** ⏳ Queued (both modules)

## Organization Management

### KPI Cards (5)
Total Orgs, Total Members, Total Admins, Storage Used, Scan Volume — 5-col grid at xl.

### AdminTable
Columns: Org Name, Members, Admins, Storage, Scans, Created — sortable, searchable

### AdminDrawer (row click)
- **3 tabs:** Members, Settings, Activity Log
- **Members tab:** Nested AdminTable — Name, Email, Role (badge), Status (dot)
- **Settings tab:** Read-only org metadata with storage progress bar (future: editable)
- **Activity tab:** Scoped ActivityRow feed filtered to org events
- Role badges: Admin (charcoal), Member (stone), Owner (amber)

## Feature Flags

### KPI Cards (4)
Total Flags, Enabled, Disabled, High Exposure

### AdminTable
Columns: Key (mono), Label, Description, Enabled (toggle switch), Exposure (badge), Owner — sortable, searchable. NO row-click drawer — toggle is inline.

### Toggle Interaction
- Click toggle → ConfirmDialog with "blast radius" guidance
- Shows: flag key/label, affected scans/orgs/users, exposure level, guidance text
- Enable: emerald confirm button | Disable: rose confirm button
- Optimistic: wait for confirm, then API call, revert on error

### Exposure Badges
High (rose), Medium (amber), Low (emerald)

## States
Loading: skeleton StatCards + skeleton table rows | Empty: appropriate message per module | Error: AppStatePanel with retry | Toggle error: inline revert with retry

## Out of Scope
Rename/delete org, manage membership, create/delete flags, change exposure level, percentage rollout
