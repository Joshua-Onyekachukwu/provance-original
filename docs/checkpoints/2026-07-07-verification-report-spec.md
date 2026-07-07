# Provance Verification Report Spec

Last updated: 2026-07-07

## MVP Report Sections

### Report Identity

- report ID
- scan ID
- generated timestamp

### Verdict Summary

- verdict label
- confidence score
- plain-language summary

### Media Fingerprint

- original filename
- MIME type
- dimensions
- SHA-256
- MD5

### Metadata Overview

- capture timestamp
- software tag
- device make and model
- color-space and orientation context

### Signal Analysis

- file integrity
- metadata forensics
- visual statistics
- provenance credentials

Each signal includes:

- status
- score
- confidence
- explanation
- supporting finding

### Recommendations

- preserve original file and fingerprint
- escalate suspicious cases to manual review
- request original source assets when provenance is missing

## MVP Output Formats

- in-app report detail
- printable report route

## Later-Phase Upgrades

- PDF export
- share links
- report watermarking
- evidence appendix graphics
- methodology appendix
- report version history
