import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Analytics } from '@vercel/analytics/react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import AppShellLayout from './components/app/AppShellLayout.jsx'
import AdminShell from './components/admin/AdminShell.jsx'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import MethodologyPage from './pages/MethodologyPage'
import PricingPage from './pages/PricingPage'
import SecurityPage from './pages/SecurityPage'
import SampleReportPage from './pages/SampleReportPage'
import BenchmarkPage from './pages/BenchmarkPage.jsx'
import DocsPage from './pages/DocsPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import CookiesPage from './pages/CookiesPage'
import ResourcesPage from './pages/ResourcesPage'
import WaitlistPage from './pages/WaitlistPage'
import SignInPage from './pages/SignInPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import RequestPasswordResetPage from './pages/RequestPasswordResetPage'
import ResetPasswordConfirmPage from './pages/ResetPasswordConfirmPage'
import SampleReportPrintPage from './pages/SampleReportPrintPage.jsx'
import NotFoundPage from './pages/NotFoundPage'
import AppDashboardPage from './pages/app/AppDashboardPage.jsx'
import AppUploadsPage from './pages/app/AppUploadsPage.jsx'
import AppReportsPage from './pages/app/AppReportsPage.jsx'
import AppQueuePage from './pages/app/AppQueuePage.jsx'
import AppHistoryPage from './pages/app/AppHistoryPage.jsx'
import AppNotificationsPage from './pages/app/AppNotificationsPage.jsx'
import AppBillingPage from './pages/app/AppBillingPage.jsx'
import AppSecurityPage from './pages/app/AppSecurityPage.jsx'
import AppApiKeysPage from './pages/app/AppApiKeysPage.jsx'
import AppWebhooksPage from './pages/app/AppWebhooksPage.jsx'
import AppHelpDocsPage from './pages/app/AppHelpDocsPage.jsx'
import AppOrganizationPage from './pages/app/AppOrganizationPage.jsx'
import AppReportPrintPage from './pages/app/AppReportPrintPage.jsx'
import AppAccountPage from './pages/app/AppAccountPage.jsx'
import AppTeamPage from './pages/app/AppTeamPage.jsx'
import AppActivityPage from './pages/app/AppActivityPage.jsx'
import AppAccessDeniedPage from './pages/app/AppAccessDeniedPage.jsx'
import AdminOverviewPage from './pages/admin/OverviewPage.jsx'
import AdminWaitlistPage from './pages/admin/WaitlistPage.jsx'
import AdminUsersPage from './pages/admin/UsersPage.jsx'
import AdminOrganizationsPage from './pages/admin/OrganizationsPage.jsx'
import AdminFeatureFlagsPage from './pages/admin/FeatureFlagsPage.jsx'
import AdminAnalyticsPage from './pages/admin/AnalyticsPage.jsx'
import AdminMonitoringPage from './pages/admin/MonitoringPage.jsx'
import AdminAuditLogsPage from './pages/admin/AuditLogsPage.jsx'
import AdminJobsPage from './pages/admin/JobsPage.jsx'
import AdminReportsPage from './pages/admin/ReportsPage.jsx'
import AdminRolesPage from './pages/admin/RolesPage.jsx'
import AdminSettingsPage from './pages/admin/SettingsPage.jsx'
import UiKitPage from './pages/UiKitPage.jsx'
import ErrorBoundary from './components/app/ErrorBoundary.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'

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
        {/* Location-keyed so navigating away resets a crashed page while the
            layout (nav + footer) stays intact. */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
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
      </ErrorBoundary>
      </MotionConfig>
    </ToastProvider>
  )
}
