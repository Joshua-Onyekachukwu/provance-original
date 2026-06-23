import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

describe('Landing surface', () => {
  it('renders the approved core claim on the homepage', () => {
    window.history.pushState({}, '', '/')
    render(<App />)

    expect(
      screen.getAllByText(
        /The fastest trustworthy image and video verification platform with explainable evidence, downloadable forensic reports, and enterprise-ready trust workflows\./i,
      ),
    ).not.toHaveLength(0)

    expect(
      screen.queryByRole('heading', {
        name: /The fastest trustworthy image and video verification platform with explainable evidence, downloadable forensic reports, and enterprise-ready trust workflows\./i,
      }),
    ).not.toBeInTheDocument()
  })

  it('renders the sample report route', () => {
    window.history.pushState({}, '', '/sample-report')
    render(<App />)

    expect(screen.getByText(/Forensic Analysis Summary/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Start Trial/i })).toBeInTheDocument()
  })

  it('submits the signup capture flow', () => {
    window.history.pushState({}, '', '/signup?intent=demo')
    render(<App />)

    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Jane Doe' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jane@example.com' } })
    fireEvent.submit(screen.getByRole('button', { name: /Continue/i }).closest('form')!)

    expect(screen.getByText(/Thanks. Your request has been staged./i)).toBeInTheDocument()
  })
})
