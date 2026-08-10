# Report PDF Export Contract

The server-side report-to-PDF endpoint — **`GET /v1/reports/:id/pdf`** — returns a
server-generated PDF artifact instead of relying on the browser print dialog.
The frontend routes to it behind the `USE_MOCK` gate (`src/lib/api.js` →
`exportReportPdf` → `src/lib/reportPdfDownload.js`); this document is the
contract the backend implements (`backend/src/reports/`) and the render pipeline
it feeds.

## Flow

```
┌──────────┐  exportReportPdf(id)  ┌────────────────────┐   GET /reports/:id/pdf   ┌──────────────┐
│  Report  │ ────────────────────► │ reportPdfDownload  │ ───────────────────────► │  Backend     │
│ surface  │                       │ (src/lib)          │  (Bearer session)        │  (NestJS)     │
└──────────┘                       └────────────────────┘                          └──────────────┘
        ▲                                │                                                 │
        │  { kind: 'download' }  toast   │  { kind: 'mock', printPath }                    │
        │  (file saved to downloads)     │  → navigate to /app/reports/:id/print           │
        └────────────────────────────────┘     (browser print dialog = mock fallback)      │
                                                                                            ▼
                                                                              scan row (user-scoped, status=complete)
                                                                                    │
                                                                         buildReportDocument (result_payload → document)
                                                                                    │
                                                                        generateReportPdf (pdfkit, A4 branded)
                                                                                    │
                                                                         application/pdf blob (StreamableFile)
```

## Endpoint

Base path: `/v1` (global NestJS prefix). Requires a valid Supabase bearer
session (`SupabaseAuthGuard`) and is throttled at 60 req/min.

| Method | Path                  | Frontend function | Purpose                          |
| ------ | --------------------- | ----------------- | -------------------------------- |
| GET    | `/reports/:reportId`  | `getReport`       | Report payload (signal-by-signal evidence) |
| GET    | `/reports/:reportId/pdf` | `exportReportPdf` | Server-generated PDF blob        |

### Response

- `200` — `application/pdf`; `Content-Disposition: attachment; filename="provance-report-<scanId>.pdf"`; `Cache-Control: private, max-age=0, must-revalidate`; body is the generated PDF (`%PDF-` magic).
- `401` — missing/invalid session (auth guard).
- `404` — scan not found **or not owned by the user** (user-scoped lookup — foreign rows are indistinguishable from missing ones) **or** the scan has no `result_payload` yet (`Report is not ready yet`).
- `503` — Supabase unavailable.

## Backend pipeline (`backend/src/reports/`)

| File | Role |
| ---- | ---- |
| `reports.controller.ts` | `@Get(':reportId/pdf')` — auth guard, throttle, response headers, `StreamableFile` |
| `reports.service.ts` | `getReportPdf(userId, reportId)` → `getReportDocument` (user-scoped scan lookup + `result_payload` presence check) → `generateReportPdf` |
| `report-document.ts` | Pure mapper: stored `result_payload` → `ReportDocument` (cover, metrics, per-signal evidence, findings, next steps, custody chain). Values that cannot be derived honestly render as "Not assessed". No Nest/Supabase deps — unit-testable in isolation. |
| `report-pdf.ts` | pdfkit renderer — pure JS, no native deps (runs on fly.io). Branded A4 layout: header band, verdict banner, metrics grid, evidence sections, page-numbered footer via `bufferPages` + `switchToPage`. |

Deduplicated reports (migration 0013) export normally: `buildReportDocument`
reads the regenerated `report.report_id` from the reused payload, so the PDF
carries the new scan's identity. The `deduplicated_from` marker itself is a
report-detail surface concern (the "Reused from" badge) and is not duplicated
into the PDF body.

## Frontend wiring (`src/`)

| File | Role |
| ---- | ---- |
| `lib/api.js` | `exportReportPdf(reportId)` — owns the `USE_MOCK` branch: mock → `{ mock: true, printPath }`; real → fetch + blob + `{ url, filename }` object URL. |
| `lib/reportPdfDownload.js` | `downloadReportPdf(reportId)` — shared Export PDF action: mock → `{ kind: 'mock', printPath }`; real → `triggerObjectUrlDownload` (temporary anchor click + 1s-delayed `URL.revokeObjectURL`) → `{ kind: 'download', filename }`. |
| `pages/app/AppReportsPage.jsx` | Report detail Export PDF button + ⌘K `reports.export-pdf` command. Mock: navigates to the print view + toast. Real: downloads the server PDF + success/error toasts. |
| `pages/app/AppReportPrintPage.jsx` | Print-view Export PDF button. Mock: print-dialog flow (toast.info → deferred `window.print()` → afterprint → toast.success). Real: server PDF download + toasts. |

The public sample report print page (`/sample-report/print`) intentionally stays
on browser print — sample content has no backend scan row.

## Tests

- `backend/src/reports/report-pdf.spec.ts` — pdfkit output: valid `%PDF-` buffer, structural completeness (metadata/streams/trailer), minimal-document guard.
- `backend/src/reports/reports.controller.spec.ts` — route contract: `application/pdf` + `Content-Disposition` headers, service error propagation.
- `backend/test/scans-flow.e2e-spec.ts` — full lifecycle incl. `GET /v1/reports/:id/pdf`: `%PDF-` magic, content-type, content-disposition, 404 when the report is not ready, user-scoping 404s.
- `src/lib/reportPdfDownload.test.js` — mock branch passthrough (no DOM), single anchor download + filename, object-URL revocation timing, error propagation, `triggerObjectUrlDownload` mechanics.
