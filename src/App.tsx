import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import DocsPage from '@/pages/DocsPage'
import Home from '@/pages/Home'
import MethodologyPage from '@/pages/MethodologyPage'
import PricingPage from '@/pages/PricingPage'
import ProductPage from '@/pages/ProductPage'
import SampleReportPage from '@/pages/SampleReportPage'
import SecurityPage from '@/pages/SecurityPage'
import SignInPage from '@/pages/SignInPage'
import SignUpPage from '@/pages/SignUpPage'
import SolutionDetailPage from '@/pages/SolutionDetailPage'
import SolutionsPage from '@/pages/SolutionsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<ProductPage />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/solutions/:slug" element={<SolutionDetailPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/methodology" element={<MethodologyPage />} />
          <Route path="/sample-report" element={<SampleReportPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
