// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DataTable from './DataTable'

const columns = [
  { key: 'filename', header: 'File' },
  { key: 'status', header: 'Status' },
]

const rows = [
  { id: '1', filename: 'press_briefing.jpg', status: 'complete' },
  { id: '2', filename: 'cctv_clip.mp4', status: 'failed' },
]

describe('DataTable', () => {
  it('renders populated rows with column headers', () => {
    render(<DataTable columns={columns} rows={rows} />)

    expect(screen.getByRole('columnheader', { name: 'File' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByText('press_briefing.jpg')).toBeInTheDocument()
    expect(screen.getByText('cctv_clip.mp4')).toBeInTheDocument()
    expect(screen.getByText('failed')).toBeInTheDocument()
  })

  it('renders skeleton rows in the loading state', () => {
    render(<DataTable columns={columns} rows={[]} loading />)

    expect(screen.getByRole('status', { name: 'Loading table' })).toBeInTheDocument()
    // No cell content renders while loading.
    expect(screen.queryByText('press_briefing.jpg')).toBeNull()
  })

  it('renders the empty state with the default title', () => {
    render(<DataTable columns={columns} rows={[]} />)

    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('renders a custom empty title', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        emptyTitle="No verifications yet"
        emptyDescription="Upload a file to start."
      />,
    )

    expect(screen.getByText('No verifications yet')).toBeInTheDocument()
    expect(screen.getByText('Upload a file to start.')).toBeInTheDocument()
  })

  it('renders the error state with a retry action', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<DataTable columns={columns} rows={[]} error="The feed is unavailable." onRetry={onRetry} />)

    expect(screen.getByText('Could not load data')).toBeInTheDocument()
    expect(screen.getByText('The feed is unavailable.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('filters rows by the search query', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={columns} rows={rows} searchable searchKeys={['filename']} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'cctv')

    expect(screen.getByText('cctv_clip.mp4')).toBeInTheDocument()
    expect(screen.queryByText('press_briefing.jpg')).toBeNull()
  })

  it('shows a no-matches empty state when search finds nothing', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={columns} rows={rows} searchable searchKeys={['filename']} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzz')

    expect(screen.getByText('No matches found')).toBeInTheDocument()
  })

  it('calls onRowClick with the clicked row', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(<DataTable columns={columns} rows={rows} onRowClick={onRowClick} />)

    await user.click(screen.getByText('press_briefing.jpg'))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('paginates rows when pagination is enabled', async () => {
    const user = userEvent.setup()
    const manyRows = Array.from({ length: 15 }, (_, i) => ({
      id: `r-${i}`,
      filename: `file_${i}.jpg`,
      status: 'complete',
    }))
    render(<DataTable columns={columns} rows={manyRows} pagination pageSize={10} />)

    // First page shows the first 10 rows.
    expect(screen.getByText('file_0.jpg')).toBeInTheDocument()
    expect(screen.queryByText('file_14.jpg')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    // Second page shows the remaining 5.
    expect(screen.getByText('file_14.jpg')).toBeInTheDocument()
    expect(screen.queryByText('file_0.jpg')).toBeNull()
  })
})
