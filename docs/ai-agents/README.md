# Provance AI Agent Organization

This directory defines the working AI organization for Provance.

The goal is to give the company a lean, scalable, and reusable operating system for building, launching, operating, securing, marketing, funding, and supporting the product.

## Purpose

These documents define:

- the organizational hierarchy
- department ownership
- agent responsibilities
- handoff rules
- escalation paths
- prompt templates
- standard operating procedures
- token-efficiency rules

## Canonical Entry Point

Start here:

- [How To Run The Org](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/HOW_TO_RUN_THE_ORG.md)

Then use the department definitions:

- [Executive Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/executive-agents.md)
- [Engineering Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/engineering-agents.md)
- [Product And Design Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/product-and-design-agents.md)
- [Project Management Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/project-management-agents.md)
- [Operations Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/operations-agents.md)
- [Business Marketing And Sales Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/business-marketing-and-sales-agents.md)
- [Finance And Fundraising Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/finance-and-fundraising-agents.md)
- [Legal And Compliance Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/legal-and-compliance-agents.md)
- [Customer Support Agents](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/customer-support-agents.md)

## Machine-Readable Files

- Agent registry: [agent-registry.json](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/agent-registry.json)
- Routing rules: [agent-routing.json](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/agent-routing.json)
- Task packet template: [TASK_PACKET_TEMPLATE.md](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/TASK_PACKET_TEMPLATE.md)
- Decision log template: [DECISION_LOG_TEMPLATE.md](file:///c:/Users/Semek/Webstrom/provance-original-design/docs/ai-agents/DECISION_LOG_TEMPLATE.md)

## Design Principles

The Provance AI organization should remain:

- lean rather than bloated
- specialized rather than generic
- documentation-first rather than memory-first
- evidence-driven rather than opinion-driven
- low-cost to operate
- easy to audit
- easy to expand as the company grows

## Agent Specification Standard

Every agent definition in this directory follows the same structure:

1. Agent name
2. Department
3. Reports to
4. Primary role
5. Mission
6. Responsibilities
7. Scope of work
8. Inputs
9. Outputs
10. Tools they should use
11. When they should be called
12. Collaborators
13. Expected deliverables
14. Prompt template
15. Decision-making authority
16. Escalation rules

## Operating Rules

- `/docs` is the shared knowledge base and source of truth.
- Current engineering truth lives primarily in:
  - `README.md`
  - `docs/engineering/CURRENT_IMPLEMENTATION_STATUS.md`
  - `docs/engineering/ENGINEERING_HANDOFF_2026-07-07.md`
  - `docs/engineering/CREDENTIALS_AND_ENVIRONMENT_VARIABLES.md`
  - `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md`
- One agent owns each task packet.
- Specialists support the owner. They do not produce competing full solutions unless explicitly requested.
- Every material decision must either:
  - be recorded in task output, or
  - be logged in `docs/decisions/`

## Legacy Notes

Some older single-role files in this directory were created earlier in the project and may reflect narrower scopes or older roadmap assumptions.

Historical versions are preserved in:

- `docs/ai-agents/legacy/`

When there is a conflict, prefer:

1. `HOW_TO_RUN_THE_ORG.md`
2. the department definition files in this directory
3. the current engineering source-of-truth docs

## Recommended Use

- Founder directives should enter through the Chief of Staff.
- Product and company direction questions should route to Executive or Product.
- implementation work should route to Engineering through the VP Engineering or CTO path.
- fundraising work should route through Finance and Fundraising.
- legal, privacy, and claim-review work should route through Legal and Compliance before publication or launch.
