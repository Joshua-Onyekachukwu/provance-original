import PageHero from '../components/PageHero.jsx'

const sections = [
  {
    title: 'Acceptance of terms',
    paragraphs: [
      'These Terms of Service govern your access to and use of the Provance website, product, APIs, reports, and related services.',
      'By accessing, using, or receiving approved access to the service, you agree to these terms and any additional order form, enterprise agreement, or written policy that applies to your use case.',
    ],
  },
  {
    title: 'Eligibility and account access',
    paragraphs: [
      'You must use the service only if you have the legal authority to enter into these terms on your own behalf or on behalf of the organization you represent.',
      'You are responsible for maintaining the confidentiality of your credentials, restricting unauthorized account use, and ensuring that all information you provide is accurate and current.',
    ],
  },
  {
    title: 'Permitted use',
    paragraphs: [
      'Provance is provided for legitimate verification, review, and trust-related workflows. You may use the service only in compliance with applicable law, contractual obligations, and these terms.',
    ],
    bullets: [
      'Do not misuse the service to violate privacy, intellectual property, or legal rights',
      'Do not attempt to interfere with service security, availability, or integrity',
      'Do not reverse engineer, scrape, or systematically extract service data except as expressly authorized',
      'Do not use the service for unlawful surveillance, discrimination, fraud, or abusive moderation practices',
    ],
  },
  {
    title: 'Customer content and uploaded assets',
    paragraphs: [
      'You retain responsibility for the legality, accuracy, origin, and permissions associated with any files, content, metadata, prompts, or instructions you submit through the service.',
      'You grant Provance the limited rights necessary to host, process, transmit, analyze, secure, and display submitted materials for the purpose of operating the service, generating outputs, maintaining auditability, and providing support.',
    ],
  },
  {
    title: 'Outputs, reports, and decision making',
    paragraphs: [
      'Verification results, confidence indicators, evidence summaries, and generated reports are intended to support human review. They are not guarantees of authenticity, legal findings, or universal determinations suitable for every context without further review.',
      'You remain responsible for evaluating whether product outputs are sufficient for your workflow, regulatory obligations, internal review process, or external decisions.',
    ],
  },
  {
    title: 'Availability, changes, and beta features',
    paragraphs: [
      'Features, access levels, service limits, and supported workflows may change over time. Invitation, waitlist approval, or account access does not guarantee uninterrupted or permanent availability.',
      'We may modify, suspend, or discontinue parts of the service where reasonably necessary for security, operations, legal compliance, or product development.',
    ],
  },
  {
    title: 'Fees and commercial terms',
    paragraphs: [
      'Pricing, service levels, implementation support, and commercial commitments may be governed by a separate order form, subscription plan, or enterprise agreement. Where a separate written agreement applies, that agreement controls in the event of a conflict.',
    ],
  },
  {
    title: 'Intellectual property',
    paragraphs: [
      'Provance and its licensors retain all rights, title, and interest in the service, software, models, documentation, branding, and related materials, except for the rights you retain in your submitted content.',
      'These terms do not grant you any right to use Provance trademarks, logos, proprietary model outputs, or other protected materials except as expressly permitted.',
    ],
  },
  {
    title: 'Suspension and termination',
    paragraphs: [
      'We may suspend, limit, or terminate access where reasonably necessary to address misuse, non-payment, legal risk, security incidents, policy violations, or operational harm.',
      'You may stop using the service at any time. Provisions that by their nature should survive termination remain in effect, including those relating to intellectual property, confidentiality, disclaimers, limitations of liability, and dispute handling.',
    ],
  },
  {
    title: 'Disclaimers and limitation of liability',
    paragraphs: [
      'Except to the extent prohibited by law or expressly stated in a separate agreement, the service is provided on an as available and as provided basis. We do not warrant that the service will be uninterrupted, error free, or suitable for every workflow.',
      'To the maximum extent permitted by law, Provance is not liable for indirect, incidental, consequential, special, exemplary, or punitive damages, or for lost profits, revenues, goodwill, business opportunities, or data arising from use of the service.',
    ],
  },
  {
    title: 'Changes and contact',
    paragraphs: [
      'We may update these terms from time to time. Material changes will be reflected on this page with an updated effective date where appropriate.',
      'Questions about these terms can be submitted through the site contact flow.',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Terms for access and use"
        description="These terms govern access to the Provance site, related services, and any approved product access made available through the platform."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Terms of Service' }]}
      />

      <section className="section-padding bg-parchment">
        <div className="content-container max-w-4xl">
          <div className="mt-2 space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="legal-card p-7">
                <h2 className="font-serif text-2xl text-charcoal">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-charcoal-mid">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets && (
                    <ul className="space-y-2 pt-1">
                      {section.bullets.map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
