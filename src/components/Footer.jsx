export default function Footer() {
  return (
    <footer className="border-t border-stone-light bg-charcoal text-stone">
      <div className="content-container px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-md bg-parchment flex items-center justify-center">
                <span className="text-charcoal text-sm font-serif font-bold">P</span>
              </div>
              <span className="font-serif text-xl text-parchment font-medium tracking-tight">Provance</span>
            </div>
            <p className="text-stone text-sm leading-relaxed max-w-sm">
              Trust infrastructure for verifying synthetic media. Explainable evidence, forensic reports, and enterprise-ready workflows.
            </p>
          </div>
          <div>
            <h4 className="text-parchment text-sm font-medium mb-4">Product</h4>
            <ul className="space-y-2.5">
              {['Why Provance', 'How It Works', 'Pricing', 'API Docs'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-stone text-sm hover:text-parchment transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-parchment text-sm font-medium mb-4">Company</h4>
            <ul className="space-y-2.5">
              {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-stone text-sm hover:text-parchment transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone/60">
          <span>&copy; 2026 Provance. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-parchment transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-parchment transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-parchment transition-colors">SOC 2</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
