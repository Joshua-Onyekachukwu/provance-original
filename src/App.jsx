import { Routes, Route, Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
import ProtectedRoute from './components/auth/ProtectedRoute.jsx'
import AppShellLayout from './components/app/AppShellLayout.jsx'
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
import NotFoundPage from './pages/NotFoundPage'
import AppDashboardPage from './pages/app/AppDashboardPage.jsx'
import AppUploadsPage from './pages/app/AppUploadsPage.jsx'
import AppReportsPage from './pages/app/AppReportsPage.jsx'
import AppAccountPage from './pages/app/AppAccountPage.jsx'
import AppTeamPage from './pages/app/AppTeamPage.jsx'
import AppAccessDeniedPage from './pages/app/AppAccessDeniedPage.jsx'

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
        <Route path="account" element={<AppAccountPage />} />
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

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
