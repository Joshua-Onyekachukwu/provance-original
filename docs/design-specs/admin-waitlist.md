# Admin Waitlist Management — Design & PRD Summary

**Route:** `/app/admin/waitlist`  
**Design Spec:** Follows UNIFIED design system + AdminShell/AdminTable/AdminDrawer pattern  
**Full PRD:** Delegation session `fe7e20b1-4926-436a-a29c-96dc0c867e61`  
**Decisions:** `/home/team/shared/prd-waitlist-decisions.md`  
**Build:** PR #5 (awaiting review)

## Page Structure

### KPI Stat Cards (6)
Registrations, Pending, Approved, Rejected, Invites Open, Activated — unified StatCard, responsive grid.

### AdminTable
Columns: Name, Email, Company, Role, Status (badge), Submitted — sortable, searchable, filterable.
Date range filter (From/To), status dropdown filter.

### Bulk Actions
Checkbox selection → "N selected" bar → Approve/Reject/Defer with ConfirmDialog.

### Detail Drawer (AdminDrawer)
- Applicant info: Email, Company, Role, Status
- Use case block
- Status history timeline (chronological with timestamps and actor)
- Operator notes textarea with explicit "Save notes" button
- Review actions: Under Review, Approve, Defer, Reject (all with ConfirmDialog)
- Create access invite (enabled when approved) with copyable URL

### CSV Export
Respects current filters, downloads as `provance-waitlist-[date].csv`.

## Key Decisions
- Notes: Explicit save button (not auto-save)
- Pagination: Client-side, 10 per page
- Bulk invites: Deferred

## States
Loading: skeleton StatCards + skeleton table rows | Empty: "No waitlist applications" | Error: AppStatePanel with retry | Filtered empty: "No applications match filters"
