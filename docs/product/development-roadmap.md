# Development Roadmap

> Current-state note. Updated 2026-08-04.
>
> This roadmap still captures the intended order of work, but several items from early phases are already complete in the repo.
>
> Already shipped or substantially in place:
> - public site foundation
> - sign-in and protected app shell
> - API-backed scan creation
> - queue-backed async processing foundation
> - scan history, dashboard metrics, and report detail foundations
> - the full user workspace (dashboard, uploads, queue, history, reports, account, team, notifications, security, API keys, billing, help/docs, organization, activity)
> - Organization Management (member roster, roles, team access, invites) — approved feature #4
>
> Still ahead:
> - richer evidence payloads
> - report export
> - the approved feature set (see below)
> - internal admin tooling
> - backend integration
> - video workflows

## Roadmap Principles

- Prove trust before scale.
- Build image workflows before heavy video infrastructure.
- Prioritize explainability, security, and evidence handling alongside model quality.
- Use milestone gates tied to outcomes, not just feature completion.

## Approved Feature Set (2026-08-04)

All ten features recommended in `docs/reports/2026-08-04-frontend-completion-review.md` were approved by the Founder:

1. Global error boundary + crash recovery — High, MVP
2. Report PDF export (client-side) — High, MVP
3. Scan deduplication (hash-based) — Medium, MVP
4. Organization invites + roles — High, MVP (**shipped**)
5. Webhooks UI — Medium, Later
6. Admin analytics + monitoring pages — Medium, MVP (admin) (**shipped**: pages + real `GET /admin/analytics` endpoint)
7. Session hardening (httpOnly cookies) — High, Before beta
8. Sentry + PostHog baseline — Medium, Before beta
9. Usage/entitlement enforcement — Medium, Later
10. Evidence appendix in reports — Medium, Later

Targets are tracked in `docs/roadmap/MASTER_DEVELOPMENT_ROADMAP.md` (Approved Feature Set table) and `docs/project-state/current-feature-status.md`.

## Phase 1: Foundation

### Objective

Establish the data, product, and platform foundations required for a trustworthy MVP.

### Deliverables

- Finalized naming and positioning
- Dataset acquisition and labeling plan
- Benchmark suite and evaluation harness
- Baseline image detection pipeline
- Initial repository, environments, and CI
- Security baseline and governance baseline

### Timeline

- 4 to 6 weeks

### Team Requirements

- Founding product/technical lead
- ML engineer
- Full-stack engineer
- Fractional designer or product designer

### Dependencies

- Access to representative datasets
- Cloud accounts and environment setup
- Agreement on MVP scope

### Risks

- Dataset quality delays
- Premature UI work before model viability
- Naming confusion in public-facing assets

### Success Metrics

- Working baseline pipeline
- Benchmark framework operating
- Clear MVP scope approved

## Phase 2: Core Platform

### Objective

Ship a usable image verification product for internal and controlled pilot usage.

### Deliverables

- Authenticated web app
- Secure upload workflow
- Background processing
- Result page with explanation layer
- Scan history dashboard
- Internal admin visibility
- Observability and audit logging

### Timeline

- 6 to 8 weeks

### Team Requirements

- ML engineer
- Full-stack engineer
- Backend/platform engineer
- Product designer

### Dependencies

- Baseline model threshold met
- Core architecture approved
- Infrastructure and secrets configured

### Risks

- False positives undermine trust
- Result experience too technical for pilot users
- Upload and queue performance instability

### Success Metrics

- Pilot users complete end-to-end scans
- Scan completion rate meets target
- Trust feedback is positive from early users

## Phase 3: Advanced Features

### Objective

Reach product-market fit with monetization, attribution, and repeat professional workflows.

### Deliverables

- Billing and entitlements
- API program and documentation
- Attribution intelligence
- Report export
- Team workspace basics
- Customer support and feedback operations

### Timeline

- 8 to 10 weeks

### Team Requirements

- ML engineer
- Backend engineer
- Frontend engineer
- Product designer
- Technical PM / founder

### Dependencies

- Stable result UX
- Reliable metrics and logging
- Pricing approval

### Risks

- Attribution confidence too weak for launch messaging
- Pricing not aligned to buyer value
- Support burden rises faster than team capacity

### Success Metrics

- First paid conversions
- API activation from qualified users
- Repeat workspace usage

## Phase 4: Optimization

### Objective

Improve defensibility, performance, and high-trust workflows.

### Deliverables

- Video analysis MVP
- Stronger evidence workflow
- Chain-of-custody features
- Report hardening
- Improved queue and compute optimization
- Model retraining process

### Timeline

- 8 to 12 weeks

### Team Requirements

- ML engineer
- Platform engineer
- Backend engineer
- QA / test support
- Legal/compliance advisor

### Dependencies

- Revenue signal or funded runway
- GPU strategy approval
- Expanded dataset operations

### Risks

- Video costs outpace revenue
- Legal claims overreach actual product maturity
- Complexity slows product velocity

### Success Metrics

- Video benchmark threshold met
- Report trust improves among target professionals
- Gross margin remains viable

## Phase 5: Scale & Growth

### Objective

Evolve from product to trust platform with enterprise readiness and ecosystem expansion.

### Deliverables

- Enterprise controls and SSO
- Retraining and model lifecycle platform
- Browser extension
- Provenance / C2PA integrations
- Expanded analytics and policy automation
- Scale migration if required

### Timeline

- 3 to 6 months

### Team Requirements

- Platform lead
- ML lead
- Frontend engineer
- Backend engineer
- DevOps / SRE support
- GTM and customer success support

### Dependencies

- Strong retention in core segments
- Scalable infrastructure plan
- Clear enterprise demand

### Risks

- Spreading too broad too early
- Infrastructure migration risk
- Governance complexity

### Success Metrics

- Enterprise pilots convert
- Usage growth remains operationally stable
- Brand becomes associated with trusted verification

## Recommended Immediate Sequence

1. Approve strategy, naming, and MVP scope.
2. Start Phase 1 dataset and benchmark work.
3. Build minimal but production-minded architecture skeleton.
4. Launch controlled pilots before broad public release.
