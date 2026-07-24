# Development Priorities

Last updated: 2026-07-23

## Purpose

This document records the active development priorities in execution order.

## Priority 1

Complete the working MVP application.

This means:

- strengthen dashboard utility
- strengthen admin utility
- improve report workflow usability
- improve account and session experience
- remove weak or placeholder app states

## Priority 2

Improve system reliability for repeated internal and early-user testing.

This means:

- validate upload, queue, processing, and report flows end to end
- reduce infrastructure waste in the async pipeline
- improve failure handling and retry clarity
- expose enough diagnostics for rapid testing and debugging

## Priority 3

Prepare the MVP security and observability baseline without overbuilding.

This means:

- plan session hardening at the right phase
- prepare Sentry and product analytics integration
- review admin protections, rate limits, and file-validation posture

## Priority 4

Keep the documentation set synchronized with the implementation and roadmap.

This means:

- update roadmap and checklist docs alongside each phase
- keep setup and environment guides current
- prevent drift between current-state docs and historical material

## Explicitly Deferred For Now

- OpenAI integration
- Anthropic integration
- billing and subscription work
- team and organization workflows
- video and audio verification
