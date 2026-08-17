# Archived forensic components

This directory holds the **unreferenced illustrative forensic mockups** that were
built as static design previews during early development. They were never wired
into any route and are **not** part of the runtime app — nothing imports them, so
they are excluded from the production bundle.

## Why archived instead of deleted

These components were reviewed (2026-08-07) when deciding the fate of
`src/components/forensic/`. They are hardcoded showcase mockups — static
illustrative data (fabricated case references, signature catalog entries, mock
spectral plots) rather than data-driven report surfaces. Wiring `ForensicReportPreview`
into a real `/app/reports/:scanId` route would have shown **fake evidence on real
scans**, which is unacceptable for a product whose entire value proposition is
veracity. They were therefore archived rather than routed.

## What was kept and why

- `src/components/forensic/VeracitySeal.jsx` — kept: prop-driven (`size`/`className`),
  on-brand, reusable. Wired into the printable report header.
- `src/components/forensic/TransparencyFooter.jsx` — kept: prop-driven
  (`methodology`/`reportId`/`hash`/`node`/`c2paStatus`), on-brand chain-of-custody
  strip. Wired into the printable report footer with real scan metadata.

## Archived pieces

| File | What it was | Notes if resurrected |
| --- | --- | --- |
| `ForensicReportPreview.jsx` | 2-page static report mockup (executive summary, signal matrix, appendix) | Rebuild as a data-driven component consuming `result_payload` — the layout is a useful reference for the forensic report view |
| `EvidenceAppendix.jsx` | Hardcoded signal hotspots + processing log | The hotspot-over-media-map concept is worth rebuilding on real `signal.findings` |
| `PDFReportMediaAudit.jsx` | Mock crop zoom tiles + spectral density bars (`Math.random()`) | Spectral density should come from real pixel analysis |
| `SignalVisualizer.jsx` | Animated "scanning" hero visual | No data; superseded by `ForensicMediaFrame` (in use) |
| `SignatureCatalog.jsx` | Hardcoded model signature cards (Sora/Midjourney/Kling/Flux) | The taxonomy is a good seed for a real signature-catalog feature |

All files still lint-clean, their relative imports were re-pointed to the kept
locations (`../../components/app/scanPresentation.js`, `../../components/forensic/VeracitySeal`),
and they can be resurrected individually if a real, data-backed version is ever
needed.
