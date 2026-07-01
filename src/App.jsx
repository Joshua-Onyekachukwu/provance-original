import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import ProductPage from './pages/ProductPage'
import MethodologyPage from './pages/MethodologyPage'
import PricingPage from './pages/PricingPage'
import SecurityPage from './pages/SecurityPage'
import SampleReportPage from './pages/SampleReportPage'
import DocsPage from './pages/DocsPage'

export default function App() {
  return (
    <div className="min-h-screen bg-parchment">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/product" element={<ProductPage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/sample-report" element={<SampleReportPage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Routes>
      <Footer />
    </div>
  )
}
