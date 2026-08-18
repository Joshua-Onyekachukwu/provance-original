import { lazy, Suspense } from 'react'
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import AppShellLayout from './components/app/AppShellLayout.jsx'
import AdminShell from './components/admin/AdminShell.jsx'
import ErrorBoundary from './components/app/ErrorBoundary.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'

// ── Lazy-loaded page components ──────────────────────────────────────────────
// Each page is its own chunk — only downloaded when the user navigates to it.
// Layout components (Navbar, Footer, Shells) stay static since they render on
// every page and are needed immediately.

// Public pages
const HomePage = lazy(() => import('./pages/HomePage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'))
const PricingPage = lazy(() => import('./pages/PricingPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const SampleReportPage = lazy(() => import('./pages/SampleReportPage'))
const BenchmarkPage = lazy(() => import('./pages/BenchmarkPage.jsx'))
const DocsPage = lazy(() => import('./pages/DocsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))
const CookiesPage = lazy(() => import('./pages/CookiesPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const WaitlistPage = lazy(() => import('./pages/WaitlistPage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'))
const RequestPasswordResetPage = lazy(() => import('./pages/RequestPasswordResetPage'))
const ResetPasswordConfirmPage = lazy(() => import('./pages/ResetPasswordConfirmPage'))
const SampleReportPrintPage = lazy(() => import('./pages/SampleReportPrintPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

// App pages
const AppDashboardPage = lazy(() => import('./pages/app/AppDashboardPage.jsx'))
const AppUploadsPage = lazy(() => import('./pages/app/AppUploadsPage.jsx'))
const AppReportsPage = lazy(() => import('./pages/app/AppReportsPage.jsx'))
const AppQueuePage = lazy(() => import('./pages/app/AppQueuePage.jsx'))
const AppHistoryPage = lazy(() => import('./pages/app/AppHistoryPage.jsx'))
const AppNotificationsPage = lazy(() => import('./pages/app/AppNotificationsPage.jsx'))
const AppBillingPage = lazy(() => import('./pages/app/AppBillingPage.jsx'))
const AppSecurityPage = lazy(() => import('./pages/app/AppSecurityPage.jsx'))
const AppApiKeysPage = lazy(() => import('./pages/app/AppApiKeysPage.jsx'))
const AppWebhooksPage = lazy(() => import('./pages/app/AppWebhooksPage.jsx'))
const AppHelpDocsPage = lazy(() => import('./pages/app/AppHelpDocsPage.jsx'))
const AppOrganizationPage = lazy(() => import('./pages/app/AppOrganizationPage.jsx'))
const AppReportPrintPage = lazy(() => import('./pages/app/AppReportPrintPage.jsx'))
const AppAccountPage = lazy(() => import('./pages/app/AppAccountPage.jsx'))
const AppTeamPage = lazy(() => import('./pages/app/AppTeamPage.jsx'))
const AppActivityPage = lazy(() => import('./pages/app/AppActivityPage.jsx'))
const AppAccessDeniedPage = lazy(() => import('./pages/app/AppAccessDeniedPage.jsx'))

// Admin pages
const AdminOverviewPage = lazy(() => import('./pages/admin/OverviewPage.jsx'))
const AdminWaitlistPage = lazy(() => import('./pages/admin/WaitlistPage.jsx'))
const AdminUsersPage = lazy(() => import('./pages/admin/UsersPage.jsx'))
const AdminOrganizationsPage = lazy(() => import('./pages/admin/OrganizationsPage.jsx'))
const AdminFeatureFlagsPage = lazy(() => import('./pages/admin/FeatureFlagsPage.jsx'))
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage.jsx'))
const AdminMonitoringPage = lazy(() => import('./pages/admin/MonitoringPage.jsx'))
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage.jsx'))
const AdminJobsPage = lazy(() => import('./pages/admin/JobsPage.jsx'))
const AdminReportsPage = lazy(() => import('./pages/admin/ReportsPage.jsx'))
const AdminRolesPage = lazy(() => import('./pages/admin/RolesPage.jsx'))
const AdminSettingsPage = lazy(() => import('./pages/admin/SettingsPage.jsx'))
const UiKitPage = lazy(() => import('./pages/UiKitPage.jsx'))

// ── Loading fallback ─────────────────────────────────────────────────────────
// Minimal skeleton shown while a page chunk downloads. Kept tiny so it doesn't
// flash on fast connections — just a centered spinner with the brand accent.
function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading page">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-light border-t-charcoal" />
    </div>
  )
}

function PublicLayout() {
  const location = useLocation()
  return (
    <div className="min-h-screen bg-parchment">
      <ScrollToTop />
      <div aria-hidden="true" className="grain-overlay" />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">
        <ErrorBoundary key={location.pathname}>
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <MotionConfig reducedMotion="user">
      <ErrorBoundary>
      <Analytics />
      <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/sample-report/print" element={<SampleReportPrintPage />} />

      <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/product" element={<ProductPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/sample-report" element={<SampleReportPage />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/waitlist" element={<WaitlistPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/reset-password" element={<RequestPasswordResetPage />} />
          <Route path="/reset-password/confirm" element={<ResetPasswordConfirmPage />} />
      </Route>

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShellLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AppDashboardPage />} />
        <Route path="uploads" element={<AppUploadsPage />} />
        <Route path="reports" element={<AppReportsPage />} />
        <Route path="reports/:scanId" element={<AppReportsPage />} />
        <Route path="reports/:scanId/print" element={<AppReportPrintPage />} />
        <Route path="account" element={<AppAccountPage />} />
        <Route path="activity" element={<AppActivityPage />} />
        <Route path="queue" element={<AppQueuePage />} />
        <Route path="history" element={<AppHistoryPage />} />
        <Route path="organization" element={<AppOrganizationPage />} />
        <Route path="billing" element={<AppBillingPage />} />
        <Route path="api-keys" element={<AppApiKeysPage />} />
        <Route path="webhooks" element={<AppWebhooksPage />} />
        <Route path="docs" element={<AppHelpDocsPage module="docs" />} />
        <Route path="security" element={<AppSecurityPage />} />
        <Route path="notifications" element={<AppNotificationsPage />} />
        <Route path="help" element={<AppHelpDocsPage module="help" />} />
        <Route path="access-denied" element={<AppAccessDeniedPage />} />
        <Route
          path="team"
          element={
            <ProtectedRoute requireTeam>
              <AppTeamPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/app/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="overview" element={<Navigate to="/app/admin" replace />} />
        <Route path="waitlist" element={<AdminWaitlistPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="organizations" element={<AdminOrganizationsPage />} />
        <Route path="jobs" element={<AdminJobsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="monitoring" element={<AdminMonitoringPage />} />
        <Route path="feature-flags" element={<AdminFeatureFlagsPage />} />
        <Route path="roles" element={<AdminRolesPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="/ui-kit" element={<UiKitPage />} />
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
      </MotionConfig>
    </ToastProvider>
  )
}
