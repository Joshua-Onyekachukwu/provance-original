const sections = [
  {
    title: 'Scope',
    paragraphs: [
      'This Privacy Policy explains how Provance collects, uses, stores, discloses, and protects information across the public website, waitlist and contact flows, authenticated product access, and related support interactions.',
      'This policy applies to information that identifies or can reasonably be linked to an individual, organization, account, uploaded asset, or operational event tied to use of the service.',
    ],
  },
  {
    title: 'Information we collect',
    paragraphs: [
      'We collect information you provide directly, including your name, work email, company, role, use case details, support requests, waitlist submissions, and other information you choose to send through forms or product interactions.',
      'We also collect service data generated through use of the platform, which may include account identifiers, authentication events, audit records, uploaded media, generated reports, metadata, device and browser information, IP address, and operational logs required to run, secure, and improve the service.',
    ],
    bullets: [
      'Account and profile information',
      'Waitlist, invite, and onboarding records',
      'Uploaded files, metadata, and generated report outputs',
      'Security, usage, and auditability logs',
      'Communications and support history',
    ],
  },
  {
    title: 'How we use information',
    paragraphs: [
      'We use information to operate the service, review access requests, authenticate users, process uploads, generate verification outputs, maintain audit trails, respond to support needs, improve reliability, investigate abuse, and comply with legal or contractual obligations.',
      'Where appropriate, we may also use information to communicate product updates, onboarding steps, security notices, service announcements, and administrative messages related to your use of Provance.',
    ],
  },
  {
    title: 'How we share information',
    paragraphs: [
      'We do not sell personal information. We may disclose information to service providers, infrastructure partners, professional advisers, law enforcement, regulators, or other parties when reasonably necessary to operate the service, protect rights and security, investigate misuse, or comply with law.',
      'If you use Provance through an employer, team, customer account, or enterprise arrangement, authorized administrators or account owners may be able to access account, workflow, and reporting information associated with that environment.',
    ],
  },
  {
    title: 'Media handling and report data',
    paragraphs: [
      'Uploaded media, derived metadata, model outputs, and report artifacts are handled according to the storage, retention, deletion, and access controls that apply to the relevant account, environment, or workflow.',
      'Media and report data may be processed by systems required to generate verification results, maintain auditability, improve operational integrity, or support security review. Internal access is limited to personnel and systems with a legitimate operational, support, security, or compliance need.',
    ],
  },
  {
    title: 'Retention',
    paragraphs: [
      'We retain information for as long as necessary to provide the service, maintain security and audit records, comply with legal obligations, resolve disputes, and enforce our agreements.',
      'Retention periods may differ depending on the type of information, the applicable workflow, your organization settings, legal requirements, and whether an account, report, or investigation remains active.',
    ],
  },
  {
    title: 'Security',
    paragraphs: [
      'We use administrative, technical, and organizational safeguards designed to protect data in transit, stored artifacts, authentication flows, and operational access paths.',
      'No service can guarantee absolute security. You are responsible for protecting your credentials, using secure devices and networks, and notifying us promptly if you believe your account or data has been compromised.',
    ],
  },
  {
    title: 'Your choices and rights',
    paragraphs: [
      'Depending on your location and the context in which you use Provance, you may have rights to request access, correction, deletion, restriction, portability, or objection relating to certain personal information.',
      'You may also update some account information directly through the product once those features are available. To submit a privacy request, use the contact page and include enough detail for us to verify and process your request.',
    ],
  },
  {
    title: 'Children',
    paragraphs: [
      'Provance is intended for business, professional, and organizational use. The service is not directed to children, and we do not knowingly collect personal information from children in connection with the product.',
    ],
  },
  {
    title: 'Changes and contact',
    paragraphs: [
      'We may update this Privacy Policy from time to time to reflect product changes, legal obligations, security practices, or operational needs. Material updates will be reflected on this page with an updated effective date where appropriate.',
      'If you have privacy-related questions, requests, or concerns, contact us through the site contact flow and we will route the matter through the appropriate support, legal, or security channel.',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment">
        <div className="content-container max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
            Privacy Policy
          </p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl text-charcoal">
            Privacy and data handling
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-charcoal-mid">
            This policy explains how Provance handles personal information, service
            data, uploaded assets, and related records across the public site and the
            product experience.
          </p>
          <div className="mt-6 rounded-2xl border border-stone-light bg-white-warm p-5 text-sm text-charcoal-mid">
            Effective date: 2026-07-06
          </div>

          <div className="mt-12 space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-stone-light bg-white-warm p-7">
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
