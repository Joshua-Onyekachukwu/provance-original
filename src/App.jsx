import { Routes, Route, Outlet, Navigate } from 'react-router-dom'
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
import AppReportPrintPage from './pages/app/AppReportPrintPage.jsx'
import AppAccountPage from './pages/app/AppAccountPage.jsx'
import AppTeamPage from './pages/app/AppTeamPage.jsx'
import AppAccessDeniedPage from './pages/app/AppAccessDeniedPage.jsx'
import AdminOverviewPage from './pages/admin/OverviewPage.jsx'
import AdminWaitlistPage from './pages/admin/WaitlistPage.jsx'
import PlaceholderPage from './pages/admin/PlaceholderPage.jsx'

function PublicLayout() {
  return (
    <div className="min-h-screen bg-parchment">
      <ScrollToTop />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
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
        <Route path="access-denied" element={<AppAccessDeniedPage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="waitlist" element={<AdminWaitlistPage />} />
          <Route path="users" element={<PlaceholderPage module="users" />} />
          <Route path="organizations" element={<PlaceholderPage module="organizations" />} />
          <Route path="jobs" element={<PlaceholderPage module="jobs" />} />
          <Route path="reports" element={<PlaceholderPage module="reports" />} />
          <Route path="analytics" element={<PlaceholderPage module="analytics" />} />
          <Route path="monitoring" element={<PlaceholderPage module="monitoring" />} />
          <Route path="feature-flags" element={<PlaceholderPage module="feature-flags" />} />
          <Route path="roles" element={<PlaceholderPage module="roles" />} />
          <Route path="audit-logs" element={<PlaceholderPage module="audit-logs" />} />
          <Route path="settings" element={<PlaceholderPage module="settings" />} />
        </Route>
        <Route
          path="team"
          element={
            <ProtectedRoute requireTeam>
              <AppTeamPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
