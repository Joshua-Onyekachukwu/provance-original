# System Design Document

## 1. System Objective

Design a trustworthy, scalable platform for AI-generated media verification that supports self-serve product usage, API-driven workflows, and evidence-oriented reporting.

## 2. High-Level Architecture

```text
Client Web App / API Client
        |
   Edge / CDN / WAF
        |
Frontend App (Next.js)
        |
API Gateway / Backend-for-Frontend
        |
Verification Platform Services
| Upload Service | Scan Orchestrator | Results Service | Report Service |
        |
Worker & Intelligence Layer
| Signal Workers | Attribution Engine | Explanation Engine |
        |
Data Platform
| Postgres | Object Storage | Cache / Queue | Vector Store | Analytics |
        |
Observability & Governance
| Logs | Metrics | Traces | Audit Log | Security Events |
```

## 3. Core Subsystems

### Frontend

- Marketing site
- Authenticated product app
- Dashboard and result views
- Admin / internal review interface

### Platform Services

- Upload ingestion
- Scan lifecycle management
- Result aggregation
- Report generation
- Billing and entitlement checks
- API key and webhook management

### Intelligence Layer

- Signal execution workers
- Ensemble scoring
- Attribution retrieval
- Explanation generation
- Retraining and evaluation pipeline

### Data Layer

- Operational relational database
- Private object storage
- Queue and caching services
- Vector retrieval for fingerprints
- Warehouse / analytics layer for product and model telemetry

## 4. Recommended Request Flow

### Web Product

1. User authenticates.
2. Client requests an upload session.
3. File uploads directly to private storage using signed URL.
4. Frontend submits scan job metadata to backend.
5. Orchestrator validates entitlement and creates scan record.
6. Worker pipeline processes signals asynchronously.
7. Result service aggregates outputs.
8. Client receives status updates via realtime event channel.
9. User opens structured result and optional report export.

### API Product

1. API client authenticates with key.
2. Client submits file reference or direct upload flow.
3. Job is queued and traceable by request ID.
4. Completion is available by polling, webhook, or event stream.

## 5. Frontend Design

### Public Experience

- Homepage
- Solutions pages
- Pricing
- Docs
- Blog
- Demo or sample report flow

### Authenticated Experience

- Upload
- Results
- Scan history
- API / billing settings
- Team workspace

### Frontend Principles

- Use server components where beneficial for performance and SEO
- Use client components selectively for upload, progress, and live updates
- Keep evidence rendering deterministic and consistent with backend payloads

## 6. Backend Design

### Service Domains

- Identity and access
- Upload and storage
- Verification orchestration
- Results and reports
- Billing and plans
- Admin and governance

### Preferred Pattern

Start with a modular monolith for speed, but preserve clean service boundaries in code and contracts. Split services only when scale or ownership requires it.

## 7. Data Design

### Primary Entities

- users
- organizations
- memberships
- scans
- signal_results
- attribution_results
- forensic_reports
- api_keys
- usage_events
- audit_events

### Storage Strategy

- Postgres for transactional entities
- Private object storage for uploads and report artifacts
- Vector index for fingerprint similarity
- Warehouse tables or analytics store for aggregate reporting

## 8. Authentication Design

### Requirements

- User auth for web app
- API key auth for integrations
- Role-based access for organizations and internal operations
- Support migration path to enterprise SSO

### Recommendation

Use managed auth initially with strong JWT verification server-side. Do not trust client-supplied user identifiers. All protected actions must derive identity from verified tokens or internal service credentials.

## 9. Notification Design

### Use Cases

- Scan status updates
- Billing notifications
- Trial conversion prompts
- Webhook events for API customers
- Admin alerts for failures

### Channels

- In-app status
- Email
- Webhooks
- Internal alerting

## 10. Analytics Design

Track:

- acquisition and activation
- scan throughput and latency
- model confidence distribution
- false positive investigations
- conversion and retention
- support and failure patterns

Separate product analytics from evidence-grade audit events.

## 11. Monitoring Design

### Minimum Stack

- Structured application logs
- Metrics dashboard
- Distributed tracing
- Error reporting
- Queue health monitoring
- Model performance monitoring

### Critical Alerts

- queue backlog
- scan failure spikes
- storage failure
- auth anomalies
- webhook delivery failure
- model drift indicators

## 12. Security Design

### Controls

- signed uploads
- private buckets
- malware scanning hook
- server-side token verification
- RBAC
- audit logging
- encryption in transit and at rest
- secret management
- rate limiting and abuse detection

### Evidence Integrity

- hash uploaded artifacts
- track chain-of-custody events
- version result methodology
- sign generated reports where applicable

## 13. Infrastructure Design

### Environments

- local
- development
- staging
- production

### Hosting Strategy

- frontend on managed edge platform
- backend and workers on container-friendly compute
- managed Postgres and object storage early
- optional GPU nodes introduced only after justified by demand

### CI/CD

- lint, test, build on pull request
- deploy preview environments for frontend
- staged deploy pipeline with migrations and rollback plan

## 14. Scalability Strategy

### Early Stage

- modular monolith
- async workers
- managed services

### Growth Stage

- separate worker pools by media type
- introduce event bus where necessary
- scale vector retrieval and warehouse workloads independently

### Migration Triggers

- sustained queue backlog
- storage costs exceed target economics
- enterprise requirements exceed current auth or audit capabilities

## 15. Disaster Recovery And Backup

- daily database backups minimum
- object storage versioning where possible
- tested restore procedures
- RPO and RTO targets defined before enterprise launch

## 16. Key Design Decisions

1. Trust direct-to-storage upload over sending large files through app servers.
2. Prefer uncertain results over overconfident false claims.
3. Keep auditability separate from marketing claims.
4. Design for evidence workflows before enterprise scale complexity.
