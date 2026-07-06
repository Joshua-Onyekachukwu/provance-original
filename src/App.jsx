import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'
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

export default function App() {
  return (
    <div className="min-h-screen bg-parchment">
      <ScrollToTop />
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">
        <Routes>
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
