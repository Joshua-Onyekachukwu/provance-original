import { InfoPage } from '@/components/marketing/InfoPage'
import { detailPages } from '@/data/siteContent'

export default function DocsPage() {
  return <InfoPage {...detailPages.docs} />
}
