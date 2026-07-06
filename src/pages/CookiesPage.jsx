const sections = [
  {
    title: 'What this policy covers',
    paragraphs: [
      'This Cookies Policy explains how Provance uses cookies, local storage, pixels, SDKs, and similar browser technologies across the public site and authenticated areas of the platform.',
      'These technologies help us operate the service, protect accounts, maintain session continuity, understand site performance, and improve reliability.',
    ],
  },
  {
    title: 'Categories of cookies and similar technologies',
    paragraphs: [
      'We may use strictly necessary technologies required for core functionality, such as page routing, load balancing, fraud prevention, form continuity, and secure account access.',
      'We may also use performance, analytics, and diagnostic technologies to understand site reliability, usage patterns, traffic sources, and activation flows. If additional categories are introduced, we will document them here.',
    ],
    bullets: [
      'Strictly necessary technologies for security and core service operation',
      'Session and authentication technologies for signed-in experiences',
      'Preferences and continuity technologies where needed',
      'Performance, analytics, and diagnostic technologies where enabled',
    ],
  },
  {
    title: 'Session and security use',
    paragraphs: [
      'When authenticated product access is enabled, cookies or related technologies may be used to maintain secure sessions, reduce repeated sign-ins, validate state transitions, and help prevent abuse or unauthorized access.',
      'Security-related technologies may also be used to investigate suspicious activity, preserve auditability, and enforce access controls.',
    ],
  },
  {
    title: 'Third-party technologies',
    paragraphs: [
      'Some technologies may be provided by infrastructure, analytics, authentication, support, or security vendors that help us operate the service. Those providers may process limited technical data in accordance with their role in delivering the service.',
      'We do not permit third-party advertising cookies on the basis of this policy alone. If advertising or remarketing technologies are later introduced, they will be documented clearly before broader use.',
    ],
  },
  {
    title: 'Your choices',
    paragraphs: [
      'Depending on your location, browser, and device settings, you may be able to control cookies through browser preferences, operating system settings, or consent controls made available on the site.',
      'Blocking some technologies may affect the functionality, security, or availability of parts of the service, especially for sign-in, session continuity, and form handling.',
    ],
  },
  {
    title: 'Changes and contact',
    paragraphs: [
      'We may update this policy from time to time to reflect operational, product, legal, or security changes. Material updates will be reflected on this page with an updated effective date where appropriate.',
      'Questions about this policy can be submitted through the site contact flow.',
    ],
  },
]

export default function CookiesPage() {
  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment">
        <div className="content-container max-w-4xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
            Cookies Policy
          </p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl text-charcoal">
            Cookies and similar technologies
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-charcoal-mid">
            This page describes how Provance uses cookies and related browser
            technologies across the public site and authenticated areas of the platform.
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
