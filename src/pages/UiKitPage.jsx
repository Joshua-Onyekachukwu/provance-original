import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CommandPalette,
  DataTable,
  Drawer,
  EmptyState,
  Popover,
  Skeleton,
  Spinner,
  StatCard,
  Tabs,
  useToast,
} from '../components/ui'
import { mockScans } from '../lib/mockData.js'
import { formatFileSize } from '../components/app/scanPresentation.js'
import ScanStatusBadge from '../components/app/ScanStatusBadge.jsx'

function Section({ title, description, children }) {
  return (
    <section className="ui-card p-6 sm:p-8">
      <p className="ui-eyebrow">Primitive</p>
      <h2 className="mt-2 font-serif text-2xl text-charcoal">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-mid">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function DemoRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-stone-light/70 py-4 first:border-t-0 first:pt-0">
      <span className="w-36 shrink-0 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-light">{label}</span>
      {children}
    </div>
  )
}

function ButtonsDemo() {
  return (
    <>
      <DemoRow label="Variants">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </DemoRow>
      <DemoRow label="Sizes">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </DemoRow>
      <DemoRow label="States">
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button
          iconLeft={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        >
          With icon
        </Button>
        <Button variant="secondary" fullWidth className="max-w-[10rem]">
          Full width
        </Button>
      </DemoRow>
      <DemoRow label="As link (to)">
        <Button to="/">Link button</Button>
        <Button variant="secondary" size="sm" to="/sample-report">
          Secondary link
        </Button>
        <Button variant="ghost" to="/pricing" iconRight={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        }>
          Icon link
        </Button>
      </DemoRow>
    </>
  )
}

function BadgesDemo() {
  return (
    <>
      <DemoRow label="Tones">
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="info">Queued</Badge>
        <Badge tone="success">Authentic</Badge>
        <Badge tone="warning">Suspicious</Badge>
        <Badge tone="danger">Failed</Badge>
      </DemoRow>
      <DemoRow label="Dots">
        <Badge tone="success" dot>Processing…</Badge>
        <Badge tone="warning" dot>Review needed</Badge>
        <Badge tone="danger" dot>Escalated</Badge>
      </DemoRow>
      <DemoRow label="Sizes">
        <Badge size="sm">Small</Badge>
        <Badge size="md">Medium</Badge>
      </DemoRow>
    </>
  )
}

function CardsDemo() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Card eyebrow="Default state" title="Report library" description="A populated card with header and body content.">
        <div className="space-y-2 text-sm text-charcoal-mid">
          <p>Body content renders here.</p>
          <p>Cards accept any children when in the default state.</p>
        </div>
      </Card>
      <Card
        eyebrow="Loading state"
        title="Verification queue"
        state="loading"
        loadingRows={4}
        description="Skeleton rows render while data loads."
      />
      <Card
        eyebrow="Empty state"
        title="Notifications"
        state="empty"
        emptyTitle="No notifications yet"
        emptyDescription="System, scan, and team updates will appear here."
        emptyAction={<Button variant="secondary" size="sm">Refresh</Button>}
      />
      <Card
        eyebrow="Error state"
        title="Activity feed"
        state="error"
        errorTitle="Could not load activity"
        errorDescription="The feed is temporarily unavailable. Try again in a moment."
        onRetry={() => {}}
      />
    </div>
  )
}

function StatCardsDemo() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Scans today" value="47" detail="Across all workspaces" tone="default" />
      <StatCard label="Completion rate" value="94%" trend={{ direction: 'up', value: '2.1%' }} tone="success" />
      <StatCard label="Suspicious flagged" value="22" trend={{ direction: 'down', value: '3' }} tone="warning" />
      <StatCard label="Failed scans" value="3" trend={{ direction: 'down', value: '1' }} tone="danger" />
      <StatCard label="Loading…" value="—" loading tone="info" />
      <StatCard label="Queue depth" value="Unavailable" error tone="danger" />
      <StatCard label="Small size" value="8" size="sm" detail="Compact metric" />
      <StatCard label="Large size" value="1,241" size="lg" detail="Headline metric" />
    </div>
  )
}

function DataTableDemo() {
  const columns = [
    { key: 'original_filename', header: 'File', sortable: true, width: '34%' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => <ScanStatusBadge status={row.status} />,
    },
    {
      key: 'file_size_bytes',
      header: 'Size',
      align: 'right',
      sortable: true,
      sortValue: (row) => row.file_size_bytes,
      render: (row) => formatFileSize(row.file_size_bytes),
    },
    {
      key: 'processing_mode',
      header: 'Mode',
      render: (row) => <Badge tone="neutral" size="sm">{row.processing_mode}</Badge>,
    },
    {
      key: 'report_id',
      header: 'Report ID',
      render: (row) => row.result_payload?.report_id || '—',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium text-charcoal">Populated — searchable, sortable, paginated</p>
        <DataTable
          columns={columns}
          rows={mockScans}
          keyField="id"
          searchable
          searchPlaceholder="Search files…"
          searchKeys={['original_filename']}
          pagination
          pageSize={6}
          onRowClick={(row) => window.alert(`Row clicked: ${row.original_filename}`)}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-medium text-charcoal">Loading state</p>
          <DataTable columns={columns} rows={[]} loading />
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-charcoal">Empty + error states</p>
          <div className="space-y-4">
            <DataTable columns={columns} rows={[]} emptyTitle="No scans found" emptyDescription="Uploads will appear here after your first verification." />
            <DataTable columns={columns} rows={[]} error="The verification feed could not be reached." onRetry={() => {}} />
          </div>
        </div>
      </div>
    </div>
  )
}

function TabsDemo() {
  const [tab, setTab] = useState('overview')
  const [pill, setPill] = useState('all')

  const items = [
    { value: 'overview', label: 'Overview' },
    { value: 'scans', label: 'Scans', badge: 25 },
    { value: 'reports', label: 'Reports', badge: 15 },
    { value: 'billing', label: 'Billing', disabled: true },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm font-medium text-charcoal">Underline variant (controlled)</p>
        <Tabs items={items} value={tab} onChange={setTab} ariaLabel="Demo tabs" />
        <div className="mt-4 rounded-xl border border-stone-light bg-parchment/60 p-4 text-sm text-charcoal-mid">
          Active panel: <span className="font-medium text-charcoal">{tab}</span>
        </div>
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-charcoal">Pill variant (uncontrolled)</p>
        <Tabs
          variant="pill"
          items={[
            { value: 'all', label: 'All' },
            { value: 'team', label: 'Team' },
            { value: 'individual', label: 'Individual' },
          ]}
          value={pill}
          onChange={setPill}
          ariaLabel="Scope tabs"
        />
        <div className="mt-4 rounded-xl border border-stone-light bg-parchment/60 p-4 text-sm text-charcoal-mid">
          Active scope: <span className="font-medium text-charcoal">{pill}</span>
        </div>
      </div>
    </div>
  )
}

function CommandPaletteDemo() {
  const navigate = useNavigate()
  const toast = useToast()

  const items = [
    {
      id: 'go-home',
      group: 'Navigation',
      label: 'Home page',
      hint: '/',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5" />
        </svg>
      ),
      onSelect: () => navigate('/'),
    },
    {
      id: 'go-ui-kit',
      group: 'Navigation',
      label: 'UI component kit',
      hint: '/ui-kit',
      keywords: ['primitives', 'gallery', 'components'],
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" />
        </svg>
      ),
      onSelect: () => navigate('/ui-kit'),
    },
    {
      id: 'go-benchmark',
      group: 'Navigation',
      label: 'Benchmark page',
      hint: '/benchmark',
      keywords: ['results', 'v0.1', 'catalog'],
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20.5V5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 5v15.5M8.5 9h2M13.5 9h2M8.5 13h2M13.5 13h2M8.5 17h7" />
        </svg>
      ),
      onSelect: () => navigate('/benchmark'),
    },
    {
      id: 'action-success',
      group: 'Actions',
      label: 'Show success toast',
      hint: 'action',
      keywords: ['toast', 'notify', 'notification'],
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
        </svg>
      ),
      onSelect: () => toast.success('Palette action', { description: 'This action was run from the command palette.' }),
    },
    {
      id: 'action-error',
      group: 'Actions',
      label: 'Show error toast',
      hint: 'action',
      keywords: ['toast', 'notify', 'error'],
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M10.3 3.8 2.5 17a1.8 1.8 0 0 0 1.6 2.7h15.8a1.8 1.8 0 0 0 1.6-2.7L13.7 3.8a1.8 1.8 0 0 0-3.4 0Z" />
        </svg>
      ),
      onSelect: () => toast.error('Palette action', { description: 'Simulated failure — this action errored on purpose.' }),
    },
  ]

  return (
    <DemoRow label="⌘K launcher">
      <CommandPalette
        items={items}
        trigger={({ open, triggerRef }) => (
          <button
            ref={triggerRef}
            type="button"
            onClick={open}
            className="ui-focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-stone-light bg-white-warm px-3.5 text-sm text-charcoal-mid transition hover:border-charcoal/25 hover:text-charcoal"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
            </svg>
            Search
            <kbd className="rounded-md border border-stone-light bg-parchment px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-charcoal-light">
              ⌘K
            </kbd>
          </button>
        )}
        placeholder="Search pages or run an action…"
      />
      <p className="w-full text-xs leading-relaxed text-charcoal-mid">
        Press <kbd className="rounded border border-stone-light bg-parchment px-1.5 font-mono text-[10px]">⌘K</kbd> from anywhere on
        this page, then type to fuzzy-search, arrow to navigate, and press{' '}
        <kbd className="rounded border border-stone-light bg-parchment px-1.5 font-mono text-[10px]">↵</kbd> to select. The panel
        scales from the trigger&apos;s screen origin (origin-aware Kowalski popover) and the whole
        dialog is fully keyboard-driven.
      </p>
    </DemoRow>
  )
}

function PopoverDemo() {
  const [count, setCount] = useState(0)
  return (
    <DemoRow label="Anchored panel">
      <Popover
        role="menu"
        ariaLabel="Demo popover"
        desktopClassName="sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-2 sm:w-72"
        trigger={({ open, triggerRef, isOpen }) => (
          <button
            ref={triggerRef}
            type="button"
            onClick={open}
            aria-haspopup="true"
            aria-expanded={isOpen}
            className="ui-focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-stone-light bg-white-warm px-3.5 text-sm text-charcoal-mid transition hover:border-charcoal/25 hover:text-charcoal"
          >
            Open popover
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9.5 6 6 6-6" />
            </svg>
          </button>
        )}
      >
        {({ close }) => (
          <div className="p-2">
            <p className="px-3 py-2 text-sm leading-relaxed text-charcoal-mid">
              Scales from the trigger&apos;s screen origin (origin-aware transform), 160ms entrance,
              and honours reduced motion. Click outside or press{' '}
              <kbd className="rounded border border-stone-light bg-parchment px-1 font-mono text-[10px]">Esc</kbd>{' '}
              to dismiss.
            </p>
            <button
              type="button"
              onClick={() => {
                close()
                setCount((c) => c + 1)
              }}
              className="ui-focus-ring w-full rounded-xl bg-charcoal px-3 py-2 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
            >
              Close and count ({count})
            </button>
          </div>
        )}
      </Popover>
      <p className="w-full text-xs leading-relaxed text-charcoal-mid">
        The same primitive behind the shell&apos;s notification bell and avatar menu. Position it with{' '}
        <code className="rounded border border-stone-light bg-parchment px-1.5 font-mono text-[11px] text-charcoal">desktopClassName</code>,
        style it via the trigger render-prop, and read the close event from the children render-prop.
      </p>
    </DemoRow>
  )
}

function DrawerDemo() {
  const [open, setOpen] = useState(false)
  return (
    <DemoRow label="Slide-over">
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Report details"
        description="A slide-over for context without leaving the page."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Export PDF</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm leading-relaxed text-charcoal-mid">
          <p>
            The drawer portals to <code className="font-mono text-charcoal">document.body</code>, traps focus, locks body
            scroll, and closes on <kbd className="rounded border border-stone-light bg-parchment px-1.5 font-mono text-[11px]">Esc</kbd>.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label="Confidence" value="94.7%" tone="warning" />
            <StatCard label="Risk" value="High" tone="danger" />
          </div>
          <p>Try tabbing — focus cycles within the drawer until it closes.</p>
        </div>
      </Drawer>
    </DemoRow>
  )
}

function ToastsDemo() {
  const toast = useToast()
  return (
    <DemoRow label="Notifications">
      <Button variant="secondary" onClick={() => toast.success('Scan completed', { description: 'Report PRV-20260716-041 is ready to review.' })}>
        Success
      </Button>
      <Button variant="secondary" onClick={() => toast.info('Report exported', { description: 'PDF download started.' })}>
        Info
      </Button>
      <Button variant="secondary" onClick={() => toast.warning('Storage at 80%', { description: 'Consider archiving old scans.' })}>
        Warning
      </Button>
      <Button variant="danger" onClick={() => toast.error('Upload failed', { description: 'The file exceeded the 500 MB limit.' })}>
        Error
      </Button>
    </DemoRow>
  )
}

function MiscDemo() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-3 text-sm font-medium text-charcoal">Skeleton</p>
        <div className="space-y-3 rounded-2xl border border-stone-light bg-white-warm p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-charcoal">Spinner + EmptyState</p>
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-stone-light bg-white-warm p-5">
          <Spinner size="sm" />
          <Spinner />
          <Spinner size="lg" className="text-charcoal" />
        </div>
        <EmptyState
          title="No team members yet"
          description="Invite teammates to start sharing scans and reports."
          action={<Button size="sm">Invite members</Button>}
        />
      </div>
    </div>
  )
}

export default function UiKitPage() {
  return (
    <div className="app-shell-surface min-h-screen bg-parchment-light">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
        <header className="mb-10">
          <p className="ui-eyebrow">Phase 2 · Foundation</p>
          <h1 className="mt-3 font-serif text-4xl text-charcoal sm:text-5xl">UI Component Kit</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-charcoal-mid">
            Reusable primitives built on the UNIFIED design system tokens. Every component
            handles loading, empty, error, and populated states. Demo data comes from{' '}
            <code className="rounded border border-stone-light bg-parchment px-1.5 font-mono text-[11px] text-charcoal">src/lib/mockData.js</code>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" to="/">← Back to site</Button>
          </div>
        </header>

        <div className="space-y-8">
          <Section title="Button" description="Primary, secondary, ghost, and danger variants with sizes, loading, disabled, and icon support. Press feedback uses scale(0.97) with a 150ms transition.">
            <ButtonsDemo />
          </Section>
          <Section title="Badge" description="Semantic status chips with tone, dot, and size options — the single badge used across admin and user surfaces.">
            <BadgesDemo />
          </Section>
          <Section title="Card" description="Unified section card with header block and built-in loading, empty, and error states.">
            <CardsDemo />
          </Section>
          <Section title="StatCard" description="Unified metric card with tone accents, trend chips, and loading/error states — API-compatible with the admin StatCard.">
            <StatCardsDemo />
          </Section>
          <Section title="DataTable" description="Generic table with client sort, search, pagination, row click, and full states. Backend-ready: swap mock rows for API data later.">
            <DataTableDemo />
          </Section>
          <Section title="Tabs" description="Accessible tablist with roving tabindex, arrow-key navigation, and an animated indicator (transform-only, 200ms).">
            <TabsDemo />
          </Section>
          <Section title="Drawer" description="Accessible slide-over: portal, focus trap, Esc to close, body scroll lock, transform-only animation.">
            <DrawerDemo />
          </Section>
          <Section title="CommandPalette" description="⌘K fuzzy launcher for routes and actions. Keyboard-driven (arrows, Enter, Esc), portal + focus management, and an origin-aware Kowalski popover that scales from the trigger element.">
            <CommandPaletteDemo />
          </Section>
          <Section title="Popover" description="Origin-aware anchored panel primitive: transform-origin computed from the trigger, sub-300ms entrance, reduced-motion aware, dismiss on outside click / Esc, focus moved in and restored on close. Powers the shell's notification bell and avatar menu.">
            <PopoverDemo />
          </Section>
          <Section title="Toast" description="Global notification system via ToastProvider. Auto-dismisses, stacks, and announces politely to assistive tech.">
            <ToastsDemo />
          </Section>
          <Section title="Skeleton · Spinner · EmptyState" description="Supporting primitives used by every stateful component.">
            <MiscDemo />
          </Section>
        </div>
      </div>
    </div>
  )
}
