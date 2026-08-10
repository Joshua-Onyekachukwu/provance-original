// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tabs from './Tabs'

const items = [
  { value: 'all', label: 'All' },
  { value: 'scans', label: 'Scans' },
  { value: 'team', label: 'Team' },
]

describe('Tabs', () => {
  it('renders a labelled tablist with one tab per item, first selected by default', () => {
    render(<Tabs items={items} ariaLabel="Filter" />)

    expect(screen.getByRole('tablist', { name: 'Filter' })).toBeInTheDocument()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)

    // Roving tabindex: only the active tab is focusable.
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')

    // Accessibility contract: each tab names the panel it controls.
    expect(tabs[0]).toHaveAttribute('aria-controls', expect.stringMatching(/-panel-all$/))
  })

  it('switches selection on click in uncontrolled mode', async () => {
    const user = userEvent.setup()
    render(<Tabs items={items} />)

    await user.click(screen.getByRole('tab', { name: 'Scans' }))

    expect(screen.getByRole('tab', { name: 'Scans' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Scans' })).toHaveAttribute('tabindex', '0')
  })

  it('calls onChange and reflects the controlled value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<Tabs items={items} value="all" onChange={onChange} />)

    await user.click(screen.getByRole('tab', { name: 'Scans' }))
    expect(onChange).toHaveBeenCalledWith('scans')

    // Controlled: the parent owns the active value.
    rerender(<Tabs items={items} value="scans" onChange={onChange} />)
    expect(screen.getByRole('tab', { name: 'Scans' })).toHaveAttribute('aria-selected', 'true')
  })

  it('navigates with arrow keys and Home/End (roving tabindex)', async () => {
    const user = userEvent.setup()
    render(<Tabs items={items} />)

    const allTab = screen.getByRole('tab', { name: 'All' })
    allTab.focus()

    await user.keyboard('{ArrowRight}')
    const scansTab = screen.getByRole('tab', { name: 'Scans' })
    expect(scansTab).toHaveFocus()
    expect(scansTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveFocus()

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Team' })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveFocus()
  })

  it('wraps around at the ends of the tablist', async () => {
    const user = userEvent.setup()
    render(<Tabs items={items} />)

    const allTab = screen.getByRole('tab', { name: 'All' })
    allTab.focus()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Team' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveFocus()
  })

  it('does not select a disabled tab on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Tabs
        items={[{ value: 'all', label: 'All' }, { value: 'locked', label: 'Locked', disabled: true }]}
        onChange={onChange}
      />,
    )

    const locked = screen.getByRole('tab', { name: 'Locked' })
    expect(locked).toBeDisabled()

    // NOTE: keyboard nav is intentionally NOT asserted for disabled tabs —
    // the component's onKeyDown selects by index without skipping disabled
    // items (a known a11y quirk tracked separately). Click is the safe path
    // to lock here; a fix should come with its own regression test.
    await user.click(locked)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
  })

  it('renders item badges next to the label', () => {
    render(<Tabs items={[{ value: 'all', label: 'All', badge: '12' }]} />)

    // The badge is part of the accessible name: "All 12".
    expect(screen.getByRole('tab', { name: /All/ })).toHaveTextContent('12')
  })

  it('applies the pill variant container classes', () => {
    render(<Tabs items={items} variant="pill" />)

    expect(screen.getByRole('tablist')).toHaveClass('rounded-2xl')
  })
})
