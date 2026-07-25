# User Dashboard Home — Design & PRD Summary

**Route:** `/app`  
**Design Spec:** Delegation session `9c97b489-3229-4aef-93cd-3f0ce3a6465b`  
**PRD:** Delegation session `4b17865b-1a5f-400e-b8b9-672e9e12ba7c`  
**Build:** ⏳ Queued

## Sections

### Hero Panel (charcoal, rounded-[2rem])
- Personalized greeting with time-of-day context
- Workspace context indicator (Individual/Team)
- Last activity timestamp
- Quick action cards: Start Verification, View Reports, View History
- System Reading panel (glass-morphism): Queue posture, Report coverage, Risk watch
- API/Queue status dots
- Trust mark (subtle geometric emblem)

### StatCard Grid (4 cards)
Workspace, Queue, Completed, Flagged — unified StatCard, responsive grid (1→2→4 col)

### Recent Scans (Verification Ledger)
5 most recent scans as VerificationRow components — index, filename, verdict, report ID, status badge

### Right Column
- Workspace Notes: Auth status, collaboration status, latest activity
- Queue Posture: Queued/Processing counts, backlog indicator
- Storage Usage: Progress bar with percentage, limits summary
- System Status: API/Queue operational indicators

### Recent Reports
3 most recent completed reports as ReportCard components — verdict, confidence mini-bar, signals count

### Notifications Preview
3 most recent with unread dot, category, relative timestamp

## States
Loading: Full page skeleton grid | Empty: "Start your first verification" with CTA | Error: AppStatePanel with retry + upload workspace link | Partial: Sections fail independently

## Key Design Decisions
- Hero panel evolved from existing — larger typography, quick action cards, trust mark
- Storage bar color thresholds: <60% charcoal, 60-80% amber, 80-95% rose
- Quick actions are glass-morphism cards inside hero, not plain links
- All components follow UNIFIED design system
