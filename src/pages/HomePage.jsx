import Hero from '../components/Hero'
import WhyProvance from '../components/WhyProvance'
import HowItWorks from '../components/HowItWorks'
import SampleReport from '../components/SampleReport'
import UseCases from '../components/UseCases'
import Pricing from '../components/Pricing'
import CLEARAnswers from '../components/CLEARAnswers'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <WhyProvance />
      <SampleReport />
      <HowItWorks />
      <UseCases />
      <Pricing />
      <CLEARAnswers />
    </main>
  )
}
