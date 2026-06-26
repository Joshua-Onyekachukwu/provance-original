# Design System Guide

## 1. Brand Foundation

### Mission

Help people and institutions verify digital media with clarity, rigor, and defensible evidence.

### Vision

Become the trusted verification layer for the synthetic media era.

### Brand Personality

- rigorous
- calm
- trustworthy
- modern
- precise

### Brand Voice

- evidence-first
- confident but not exaggerated
- technical when needed, readable by default
- transparent about uncertainty

### Brand Positioning

Provance should look and feel like professional trust infrastructure, not a novelty AI tool.

## 2. Visual Design System

### Color System

- Background: deep graphite / near-black
- Surface: layered charcoal
- Primary accent: electric cyan or blue
- Success: restrained green
- Warning: amber
- Danger: muted red
- Neutral text: high-contrast white and cool gray

### Typography System

- Primary UI: Inter
- Technical accents / data: JetBrains Mono

### Spacing System

- 4px base unit
- tight spacing for data density
- generous spacing in marketing sections to preserve premium feel

### Grid System

- 12-column desktop grid
- 8-column tablet adaptation
- single-column mobile stack

### Iconography

- minimal line-based icons
- forensic and verification motifs where appropriate
- avoid playful or cartoon styles

### Component Library

- buttons
- badges
- alerts
- cards
- data tables
- upload zone
- evidence chips
- timeline
- modal
- navigation shell

### Design Tokens

- semantic tokens for surface, text, border, accent, state colors
- typography scale tokens
- spacing and radius tokens
- motion duration tokens

## 3. UX Principles

- explain before you persuade
- show evidence before summary claims
- represent uncertainty honestly
- minimize cognitive load in high-stakes workflows
- optimize for trust and clarity over visual novelty

## 4. Accessibility Requirements

- WCAG AA contrast minimum
- keyboard navigability
- screen-reader labels for interactive controls
- non-color indication for statuses
- reduced-motion support

## 5. Mobile-First Strategy

- critical flows must work on mobile web
- compress evidence summaries for smaller screens
- avoid large dense tables without responsive alternatives

## 6. Responsive Behavior

- marketing pages reflow cleanly across breakpoints
- upload and result cards stack vertically on small screens
- dashboards switch to card list view where tables are not viable

## 7. Interaction Guidelines

- provide immediate status after upload action
- use progress and state indicators consistently
- reserve animation for state change clarity, not decoration
- treat warnings and uncertainty states with careful copy

## 8. UI Standards

### Buttons

- primary for key conversion or confirmation
- secondary for non-destructive alternatives
- destructive style only for irreversible actions

### Forms

- short labels
- explicit validation messages
- secure defaults

### Cards

- use cards for grouped summaries and evidence modules
- avoid excessive nested containers

### Tables

- prioritize readability and filterability
- support export for operational workflows

### Dashboards

- summary first, drill-down second
- surface queue, failures, confidence, and usage where relevant

### Navigation

- persistent top nav for marketing
- left rail or combined nav shell for app dashboard

### Modals

- use sparingly for confirmation or detail expansion
- avoid critical multi-step workflows in modal-only flows

### Notifications

- distinguish status, error, success, and warning clearly
- notifications must direct the user toward a next step when relevant

## 9. Design Governance

- one shared token source of truth
- components documented before widespread reuse
- product and engineering review for any new core component
- no ad hoc marketing styles that diverge from app trust language
