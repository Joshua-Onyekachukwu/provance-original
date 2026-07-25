# Verification Queue (Jobs) + Reports Management — Design & PRD Summary

**Routes:** `/app/admin/jobs` and `/app/admin/reports`  
**Design Spec:** Delegation session `fbeba062-6a18-4b3e-9a06-b6f292c44a11`  
**PRD:** Delegation session `99b8a6d9-e5f8-49b9-9582-7d7f42007abe`  
**Build:** ⏳ Queued (both modules)

## Verification Jobs (`/app/admin/jobs`)

### KPI Cards (5)
Total Jobs, Queued, Processing, Failed, Avg Processing Time — unified StatCard.

### Filters
Status (queued/processing/complete/failed), Verdict (authentic/suspicious/inconclusive), MIME type, Date range, Processing mode (inline/queue)

### AdminTable
Columns: File, Status (badge), Verdict, Report ID, User, Date, Size, Mode — sortable, searchable by filename/scanId/reportId/user email

### Detail Drawer
- Job timeline: Created → Uploaded → Queued → Processing → Complete/Failed
- Status transitions with timestamps
- Failure reason (if failed)
- Retry count
- Report link (if complete)
- Actions: Retry job, Cancel job (if queued/processing), Mark for review, Add internal note

## Reports Management (`/app/admin/reports`)

### KPI Cards (4)
Total Reports, Authentic, Suspicious, Inconclusive — unified StatCard, verdict colors.

### Filters
Verdict, Date range

### AdminTable
Columns: Report ID, File, Verdict (badge), Confidence, Signals count, Date — sortable, searchable

### Detail Drawer
- Report metadata: ID, filename, user, created date
- Verdict summary with confidence score
- Top signals list (3-5 signals with scores)
- Link to printable report
- Actions: Export (future), Regenerate (future), Delete (future — gated)

## States (Both Pages)
Loading: skeleton KPI cards + skeleton table rows | Empty: appropriate per-module message | Error: AppStatePanel with retry | Drawer states handled independently

## Key Notes
- Zero new mock data needed — existing mockScans array (25 records) covers all job data
- Reports derived from scans with status=complete
- No write operations on reports in MVP (export/regenerate/delete all deferred)
