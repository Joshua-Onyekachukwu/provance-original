# Technical Architecture Document

> Current-state note. Updated 2026-07-07.
>
> This document captures an earlier recommended architecture, not the exact stack now implemented in the repo.
>
> Current implementation differs in these ways:
> - frontend is React + Vite, not Next.js
> - backend is NestJS, not FastAPI
> - async processing is handled by a BullMQ worker on Fly.io
> - this document should be used for architectural direction only, not for setup or deployment truth

## 1. Architecture Principles

- Design for trust, not just throughput.
- Keep the MVP simple, but avoid dead-end architectural shortcuts.
- Prefer composable modules over hard-coded one-off pipelines.
- Make observability and security first-class from the start.
- Separate product claims from actual technical confidence thresholds.

## 2. Recommended Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- Component system built from tokens

### Backend

- Python with FastAPI for verification APIs
- Worker execution layer for asynchronous processing
- Background queue with Redis-compatible broker

### Data

- PostgreSQL
- Private object storage
- Vector retrieval layer for fingerprint similarity
- Analytics warehouse or event sink

### ML / Intelligence

- PyTorch for model serving and experimentation
- ONNX Runtime where inference optimization is required
- OpenCV, NumPy, SciPy for preprocessing and signal analysis

### Platform

- Containerized services
- GitHub Actions for CI/CD
- Managed secrets and environment configuration

## 3. Service Topology

### Required Services

- Web frontend
- Platform API
- Scan orchestration service
- Worker pool
- Report generation service
- Notification service
- Analytics pipeline

### Optional Later Services

- Attribution microservice
- Retraining pipeline service
- Customer-facing webhook gateway
- Enterprise integration service

## 4. API Architecture

### Public Surfaces

- Web app requests
- REST API for developer access
- Webhooks for asynchronous completion

### Contract Rules

- All responses include request IDs
- All async jobs expose deterministic status states
- All evidence payloads include model and methodology version
- Breaking changes require versioned endpoints

## 5. Database Architecture

### Operational Database

Use PostgreSQL as the source of truth for users, organizations, scans, entitlements, and result metadata.

### Storage Split

- relational metadata in Postgres
- large binary artifacts in object storage
- high-dimensional fingerprint vectors in vector-enabled store

### Data Lifecycle

- raw uploads retained based on plan and policy
- derived artifacts versioned by model release
- audit events append-only

## 6. Authentication And Authorization

### Auth Modes

- end-user JWT auth
- API key auth for integrations
- internal service auth for trusted backplane operations

### Authorization Model

- RBAC at organization and workspace level
- resource ownership checks for all scan artifacts
- internal admin roles isolated and auditable

## 7. File Storage Architecture

### Principles

- direct signed uploads
- private-by-default buckets
- hash-based deduplication
- retention and deletion policy by plan and compliance need

### Artifact Types

- raw uploads
- normalized preprocessing artifacts
- heatmaps and visual evidence
- exported reports

## 8. AI Architecture

### Layers

- signal extraction
- model inference
- ensemble logic
- attribution matching
- explanation synthesis

### Model Governance

- version every model
- store evaluation summary by version
- maintain rollback-capable model registry
- monitor drift and confidence distribution changes

## 9. Analytics Architecture

Separate analytics into:

- product analytics for growth and retention
- operational analytics for throughput and reliability
- model analytics for performance and drift
- audit-grade events for evidentiary workflows

## 10. Notification Architecture

Use an event-driven notification model:

- internal events emitted when scan state changes
- subscribers fan out to UI updates, webhooks, and email
- retry and dead-letter handling for failed deliveries

## 11. Monitoring Architecture

### Pillars

- logs
- metrics
- traces
- alerting
- synthetic health checks

### Additional Needs

- queue depth monitoring
- model latency and confidence monitoring
- storage and bandwidth cost observability

## 12. Environment Structure

### Local

- developer productivity
- mocked or low-cost dependencies

### Development

- shared integration environment
- relaxed data retention

### Staging

- production-like testing
- release candidate validation

### Production

- hardened controls
- monitored scaling
- formal change management

## 13. Deployment Strategy

- trunk-based or short-lived branch workflow
- automated tests on pull request
- staged deployments with migration gates
- feature flags for risky user-facing functionality
- rollback playbooks for app and model releases

## 14. Scaling Strategy

### Application

- scale frontend independently from workers
- separate compute pools by media type
- use queue-based smoothing for bursty workloads

### Data

- move heavy analytics off the operational database
- partition or archive historical scan data as needed

### ML

- separate CPU and GPU pipelines
- prioritize batch or deferred video processing where appropriate

## 15. Backup Strategy

- automated DB backups
- cross-region or provider-aware backup posture for critical artifacts
- periodic restore drills
- documented retention periods

## 16. Disaster Recovery Strategy

- define RPO and RTO per service tier
- recover core scan pipeline before secondary features
- maintain infra-as-code or reproducible environment setup

## 17. Compliance And Data Protection

### Core Requirements

- privacy policy and terms before public launch
- data retention controls
- deletion workflows
- customer-visible security posture
- audit log preservation

### Likely Future Requirements

- enterprise security questionnaires
- DPIA-style reviews for sensitive jurisdictions
- evidence handling standards for legal workflows

## 18. Key Technical Risks

- dataset drift
- confidence calibration
- high false-positive sensitivity in trust segments
- video cost inflation
- weak access control design causing evidence exposure

## 19. Architecture Recommendations

1. Replace API-server file ingestion with direct signed uploads early.
2. Introduce organization and RBAC entities before team plans launch.
3. Implement event contracts for status updates instead of relying on vendor-specific realtime semantics.
4. Treat model versioning and evaluation as production architecture, not research tooling.
