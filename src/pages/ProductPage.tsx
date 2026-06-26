import { InfoPage } from '@/components/marketing/InfoPage'
import { detailPages } from '@/data/siteContent'

export default function ProductPage() {
  return <InfoPage {...detailPages.product} />
}
