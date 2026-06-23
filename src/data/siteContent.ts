import {
  Activity,
  BadgeCheck,
  Binary,
  BriefcaseBusiness,
  FileSearch,
  FileText,
  Fingerprint,
  GanttChartSquare,
  Lock,
  Newspaper,
  ScanSearch,
  ShieldCheck,
  Video,
} from 'lucide-react'

export const primaryClaim =
  'The fastest trustworthy image and video verification platform with explainable evidence, downloadable forensic reports, and enterprise-ready trust workflows.'

export const navigation = [
  { label: 'Product', to: '/product' },
  { label: 'Solutions', to: '/solutions' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Methodology', to: '/methodology' },
  { label: 'Sample Report', to: '/sample-report' },
  { label: 'Docs', to: '/docs' },
]

export const trustPills = [
  'Image + video verification',
  'Explainable evidence',
  'Downloadable forensic reports',
  'Enterprise-ready workflows',
]

export const standoutClaims = [
  {
    title: 'Explainable Evidence',
    description:
      'Every verdict is paired with signal-level reasoning, visible confidence language, and an uncertainty posture designed for high-trust decisions.',
    icon: FileSearch,
  },
  {
    title: 'Forensic Report Downloads',
    description:
      'Users move from upload to a polished report artifact that can be saved, shared, and used inside legal, editorial, or enterprise review workflows.',
    icon: FileText,
  },
  {
    title: 'Unified Image + Video',
    description:
      'Provance supports image and video inside one product experience while keeping the underlying processing lanes optimized for speed and scale.',
    icon: Video,
  },
  {
    title: 'Trust Workflow Readiness',
    description:
      'The system is designed for operations teams, investigators, journalists, and developers who need repeatable workflows instead of novelty scans.',
    icon: GanttChartSquare,
  },
]

export const howItWorks = [
  {
    title: 'Upload Original Media',
    description:
      'Send an image or video through a private workflow built for direct action, low friction, and professional review contexts.',
    icon: Activity,
  },
  {
    title: 'Analyze Multiple Signals',
    description:
      'Provance combines forensic signals, model-driven analysis, metadata cues, and workflow logic rather than returning a single black-box score.',
    icon: Binary,
  },
  {
    title: 'Review Verdict And Report',
    description:
      'Read the verdict, understand the evidence, see uncertainty clearly, and download a full report designed for real-world teams.',
    icon: BadgeCheck,
  },
]

export const useCases = [
  {
    title: 'Journalism & Fact-Checking',
    description:
      'Verify suspicious media quickly enough for newsroom deadlines without sacrificing defensibility.',
    icon: Newspaper,
    to: '/solutions/journalism',
  },
  {
    title: 'Legal & Investigations',
    description:
      'Review media with traceable outputs, report-ready artifacts, and a stronger evidence narrative.',
    icon: BriefcaseBusiness,
    to: '/solutions/legal',
  },
  {
    title: 'Enterprise Trust & Fraud',
    description:
      'Bring verification into incident response, fraud review, and platform trust workflows with a path to APIs and team controls.',
    icon: ShieldCheck,
    to: '/solutions/enterprise',
  },
  {
    title: 'Developers & API Teams',
    description:
      'Embed verification into products, automate retrieval, and connect reports to internal systems through a clean integration path.',
    icon: ScanSearch,
    to: '/solutions/developers',
  },
]

export const pricingTiers = [
  {
    name: 'Trial',
    price: 'Free',
    description: 'For first scans, sample report review, and early product evaluation.',
    ctaLabel: 'Start Trial',
    ctaTo: '/signup?intent=trial',
    badge: 'Entry',
    features: ['5 guided scans', 'Sample report access', 'Single-user workspace'],
  },
  {
    name: 'Pro',
    price: 'From $49',
    description: 'For solo analysts, journalists, and investigators with repeat workflows.',
    ctaLabel: 'Create Account',
    ctaTo: '/signup?intent=pro',
    badge: 'Popular',
    features: ['Unlimited image scans', 'Priority report exports', 'Private history and notes'],
  },
  {
    name: 'Team',
    price: 'Custom',
    description: 'For collaborative review, shared history, and report operations.',
    ctaLabel: 'Request Demo',
    ctaTo: '/signup?intent=team',
    badge: 'Operations',
    features: ['Shared workspace', 'Approval flow', 'Usage controls and roles'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For API access, workflow integration, security reviews, and trust operations at scale.',
    ctaLabel: 'Talk To Sales',
    ctaTo: '/signup?intent=enterprise',
    badge: 'Flagship',
    features: ['API and webhooks', 'Custom retention controls', 'Security and procurement support'],
  },
]

export const pricingHighlights = [
  {
    title: 'Start lean',
    text: 'Let individual users evaluate the product before you force a sales process.',
  },
  {
    title: 'Upgrade with evidence',
    text: 'Higher plans should clearly unlock report quality, collaboration, and workflow depth.',
  },
  {
    title: 'Sell enterprise on control',
    text: 'API access, security posture, procurement support, and workflow integration should anchor the enterprise value story.',
  },
]

export const faqFramework = {
  eyebrow: 'C.L.E.A.R.',
  title: 'Clarity. Limits. Evidence. Access. Reliability.',
  description:
    'Instead of a generic FAQ label, the section should feel like a trust brief that answers the questions serious buyers actually ask.',
}

export const faqs = [
  {
    question: 'Does Provance support both image and video?',
    answer:
      'Yes. The platform is positioned around unified image and video verification, with separate processing lanes under the hood for speed and reliability.',
    tag: 'Clarity',
  },
  {
    question: 'What makes the result trustworthy?',
    answer:
      'Provance emphasizes explainable evidence, signal breakdowns, uncertainty handling, and report-ready outputs instead of just showing a raw score.',
    tag: 'Evidence',
  },
  {
    question: 'Can users download a report?',
    answer:
      'Yes. Downloadable forensic-style reports are part of the product story from the start and are central to the public positioning.',
    tag: 'Access',
  },
  {
    question: 'Is there an API path for technical teams?',
    answer:
      'Yes. The public experience includes a developer route and a clear enterprise-ready API narrative for teams integrating verification into existing systems.',
    tag: 'Reliability',
  },
  {
    question: 'Where does Provance draw the line on certainty?',
    answer:
      'Provance is designed to communicate uncertainty honestly. The goal is defensible judgment, not false absolute claims in edge cases.',
    tag: 'Limits',
  },
]

export const footerLinks = [
  {
    group: 'Platform',
    links: [
      { label: 'Product', to: '/product' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Sample Report', to: '/sample-report' },
    ],
  },
  {
    group: 'Solutions',
    links: [
      { label: 'Journalism', to: '/solutions/journalism' },
      { label: 'Legal', to: '/solutions/legal' },
      { label: 'Enterprise', to: '/solutions/enterprise' },
    ],
  },
  {
    group: 'Trust',
    links: [
      { label: 'Methodology', to: '/methodology' },
      { label: 'Security', to: '/security' },
      { label: 'Docs', to: '/docs' },
    ],
  },
]

export const footerMeta = {
  headline: 'For teams that cannot afford to guess.',
  note: 'Provance is being built as a verification system for serious workflows: evidence-led, report-grade, and operationally credible.',
  contact: 'founders@provance.ai',
}

export const detailPages = {
  product: {
    eyebrow: 'Product Surface',
    title: 'A verification workspace built for evidence, speed, and repeat use.',
    intro:
      'The product experience moves users from upload to verdict to downloadable report without feeling like a toy detector or a generic dashboard clone.',
    highlights: [
      {
        title: 'Upload To Verdict',
        description: 'A clean path from ingestion to result with strong processing-state feedback.',
        icon: ScanSearch,
      },
      {
        title: 'Report-Centric Outputs',
        description: 'Every result is designed to culminate in a report artifact that users can actually work with.',
        icon: FileText,
      },
      {
        title: 'Workflow-Ready Architecture',
        description: 'The interface is shaped around future team, API, and trust-operations expansion.',
        icon: GanttChartSquare,
      },
    ],
  },
  solutions: {
    eyebrow: 'Solutions',
    title: 'Different buyers, one trust platform.',
    intro:
      'Provance speaks to high-trust workflows across journalism, investigations, enterprise trust, and developer-led integration paths.',
  },
  pricing: {
    eyebrow: 'Pricing Direction',
    title: 'Flexible packaging that separates self-serve intent from enterprise value.',
    intro:
      'The pricing surface should guide visitors to the right next step without locking the business into premature packaging detail.',
  },
  methodology: {
    eyebrow: 'Methodology',
    title: 'Transparency without giving away the moat.',
    intro:
      'The methodology page builds trust by explaining signal categories, model discipline, uncertainty, and product limitations in plain language.',
    highlights: [
      {
        title: 'Signal Categories',
        description: 'Show what kinds of evidence the platform considers and why that matters.',
        icon: Fingerprint,
      },
      {
        title: 'Uncertainty Handling',
        description: 'Treat uncertainty as a mark of professional integrity rather than a weakness.',
        icon: ShieldCheck,
      },
      {
        title: 'Model Governance',
        description: 'Reference versioning, updates, and disciplined evaluation without revealing internal implementation details.',
        icon: Lock,
      },
    ],
  },
  docs: {
    eyebrow: 'Developer Path',
    title: 'A public API story that feels ready for real product teams.',
    intro:
      'Developers should understand how Provance fits into their stack before the full integration surface is released.',
  },
  security: {
    eyebrow: 'Security',
    title: 'Trust posture before the sales call.',
    intro:
      'Security and storage expectations should be answered publicly so enterprise and legal-adjacent buyers can qualify the platform quickly.',
  },
}
