import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.12 * i, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

/**
 * NotFoundPage — the client-side 404 (react-router `*` catch-all).
 *
 * Deep links and hard refreshes are served this same page: Vercel rewrites
 * every unmatched path to `/index.html` (see `vercel.json`), so the SPA
 * mounts and this route renders instead of a platform 404.
 */
export default function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found · Provance'
  }, [])

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-parchment px-6 py-24">
      {/* Brand backdrop — same texture as the Hero */}
      <div aria-hidden="true" className="absolute inset-0 forensic-grid opacity-30" />
      <div aria-hidden="true" className="absolute inset-0 hero-gradient" />
      <div
        aria-hidden="true"
        className="absolute left-[10%] top-[16%] h-56 w-56 rounded-full bg-trust/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[12%] right-[8%] h-64 w-64 rounded-full bg-amber/10 blur-3xl"
      />

      <div className="content-container relative z-10 text-center">
        {/* Eyebrow */}
        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="eyebrow mb-8"
        >
          Error 404 · Route not found
        </motion.p>

        {/* Giant 404 with a scanning line */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="relative mx-auto inline-block"
        >
          <p className="font-serif text-[6.5rem] leading-none text-charcoal sm:text-[9rem] lg:text-[11rem]">
            4
            <span className="relative inline-block italic text-trust">
              0
              <motion.span
                aria-hidden="true"
                className="absolute -bottom-2 left-0 h-1 w-full rounded-full bg-trust/60 sm:-bottom-3 lg:-bottom-4"
                animate={{ x: ['-110%', '220%'], opacity: [0, 1, 1, 0] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
              />
            </span>
            4
          </p>
        </motion.div>

        {/* Verdict chip — the app's badge language */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mt-6 flex justify-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-rose-700">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Verdict · Not found
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mx-auto mt-8 max-w-2xl font-serif text-3xl leading-tight text-charcoal text-balance sm:text-5xl lg:text-6xl"
        >
          This signal couldn&apos;t be resolved.
        </motion.h1>

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
          className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-charcoal-mid text-pretty"
        >
          The page you&apos;re looking for doesn&apos;t exist, was moved, or never made
          it past evidence review. Head back to a known-good route — the rest of the
          system is fully operational.
        </motion.p>

        {/* Primary actions */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={5}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          <Link to="/" className="btn-primary min-w-[10.5rem]">
            Back to home
          </Link>
          <Link to="/sample-report" className="btn-secondary min-w-[10.5rem]">
            View a sample report
          </Link>
        </motion.div>

        {/* Secondary links */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
          className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm"
        >
          <Link
            to="/signin"
            className="inline-flex min-h-11 items-center text-charcoal-mid transition-colors hover:text-charcoal"
          >
            Sign in to your workspace
          </Link>
          <Link
            to="/docs"
            className="inline-flex min-h-11 items-center text-charcoal-mid transition-colors hover:text-charcoal"
          >
            Read the docs
          </Link>
          <Link
            to="/security"
            className="inline-flex min-h-11 items-center text-charcoal-mid transition-colors hover:text-charcoal"
          >
            Security center
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
