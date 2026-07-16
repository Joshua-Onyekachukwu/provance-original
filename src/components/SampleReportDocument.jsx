import { sampleAiDetectionResults, sampleAnalysisScope, sampleAppendix, sampleChainOfCustody, sampleCrossValidationResults, sampleDisclaimer, sampleExecutiveSummary, sampleFrameAnalysis, sampleManipulationIndicators, sampleMediaInformation, sampleMetadataAnalysis, sampleMetrics, sampleModelResults, sampleRecommendedNextSteps, sampleReportCover, sampleReportMeta, sampleReportPreviewImage, sampleReviewerNotes, sampleTechnicalFindings, sampleTimeline, sampleWatermarkAndProvenance } from '../lib/sampleReportContent.js'

function MetricCard({ item }) {
  const toneClasses = {
    default: 'border-stone-light bg-parchment/80 text-charcoal',
    warning: 'border-amber-200/80 bg-amber-50 text-amber-900',
  }

  return (
    <div className={`rounded-[1.35rem] border p-4 ${toneClasses[item.tone] || toneClasses.default}`}>
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
        {item.label}
      </div>
      <div className="mt-2 font-serif text-2xl">{item.value}</div>
      <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">{item.detail}</p>
    </div>
  )
}

function KeyValueGrid({ items, columns = 'md:grid-cols-2' }) {
  return (
    <div className={`grid gap-3 ${columns}`}>
      {items.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-stone-light bg-white-warm/92 p-4">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
            {label}
          </div>
          <div className="mt-2 text-sm leading-relaxed text-charcoal">{value}</div>
        </div>
      ))}
    </div>
  )
}

function SignalCard({ item }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-white-warm/92 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-charcoal">{item.label}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-charcoal-light">
            {item.status}
          </p>
        </div>
        <p className="font-mono text-sm text-charcoal">{item.score}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">{item.detail}</p>
    </div>
  )
}

export default function SampleReportDocument({ compact = false, showPrintControls = false }) {
  return (
    <article className={`report-paper mx-auto overflow-hidden rounded-[2rem] border border-stone-light bg-white-warm shadow-[0_30px_80px_rgba(19,22,29,0.08)] ${compact ? 'max-w-6xl' : 'max-w-5xl'}`}>
      {showPrintControls ? (
        <div className="print:hidden flex items-center justify-between gap-4 border-b border-stone-light bg-parchment/70 px-6 py-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-charcoal-light">
              Printable report
            </p>
            <p className="mt-1 text-sm text-charcoal-mid">
              Use your browser print dialog to save this sample as a PDF.
            </p>
          </div>
          <button type="button" onClick={() => window.print()} className="btn-primary">
            Print / Save PDF
          </button>
        </div>
      ) : null}

      <div className={`${compact ? 'p-6 md:p-8 lg:p-10' : 'p-6 md:p-10 lg:p-12'} space-y-8`}>
        <section className="rounded-[1.75rem] border border-stone-light bg-parchment/65 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-charcoal-light">
                Provance forensic analysis report
              </div>
              <h1 className={`${compact ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl'} mt-3 font-serif text-charcoal`}>
                {sampleReportCover.verdict}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-charcoal-mid">
                {sampleExecutiveSummary.summary}
              </p>
            </div>
            <div className="min-w-[16rem] rounded-[1.5rem] border border-stone-light bg-white-warm p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Report identity
              </div>
              <div className="mt-3 space-y-2 text-sm text-charcoal">
                <div><span className="font-medium">Report ID:</span> {sampleReportMeta.reportId}</div>
                <div><span className="font-medium">Verification ID:</span> {sampleReportMeta.verificationId}</div>
                <div><span className="font-medium">Generated:</span> {sampleReportMeta.analysisTimestamp}</div>
                <div><span className="font-medium">Methodology:</span> {sampleReportMeta.methodologyVersion}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-stone-light bg-charcoal">
              <img
                src={sampleReportPreviewImage}
                alt="Representative frame from the analyzed sample media."
                className="aspect-[16/9] w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {sampleMetrics.map((item) => (
                <MetricCard key={item.label} item={item} />
              ))}
            </div>
          </div>
        </section>

        {compact ? (
          <>
            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Executive summary and explanation
                </div>
                <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
                  {sampleExecutiveSummary.summary}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
                  {sampleExecutiveSummary.explanation}
                </p>
              </section>

              <section className="rounded-[1.75rem] border border-stone-light bg-charcoal p-5 text-parchment">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-stone">
                  Timeline of analysis
                </div>
                <div className="mt-4 space-y-3">
                  {sampleTimeline.slice(0, 4).map(([time, step]) => (
                    <div key={time} className="grid grid-cols-[58px_1fr] gap-3">
                      <div className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 text-center font-mono text-[11px] text-amber">
                        {time}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-stone">
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Technical findings
                </div>
                <div className="mt-4 grid gap-3">
                  {sampleTechnicalFindings.slice(0, 2).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-stone-light bg-white-warm/92 p-4">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-light">
                        {item.id}
                      </div>
                      <h3 className="mt-2 font-serif text-lg text-charcoal">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Report footer data
                </div>
                <div className="mt-4">
                  <KeyValueGrid
                    items={[
                      ['Media type', sampleReportCover.mediaType],
                      ['Report owner', sampleReportCover.owner],
                      ['Methodology version', sampleReportMeta.methodologyVersion],
                      ['Processing time', sampleReportMeta.processingTime],
                    ]}
                  />
                </div>
              </section>
            </section>
          </>
        ) : (
          <>
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Executive summary
              </div>
              <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
                {sampleExecutiveSummary.summary}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
                {sampleExecutiveSummary.explanation}
              </p>
            </section>

            <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Verification outcome and verdict explanation
              </div>
              <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
                Provance classified the reviewed asset as likely synthetic or materially manipulated. The current evidence package is strong enough to justify escalation and downstream caution, but it does not replace editorial, legal, or security review. The report is designed to preserve both what the system knows and what remains unresolved.
              </p>
            </section>

            <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Media information
              </div>
              <div className="mt-4">
                <KeyValueGrid items={sampleMediaInformation} />
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Metadata analysis
              </div>
              <div className="mt-4">
                <KeyValueGrid items={sampleMetadataAnalysis} />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-stone-light bg-charcoal p-5 text-parchment">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-stone">
                Risk assessment
              </div>
              <h2 className="mt-3 font-serif text-2xl">High workflow risk with strong synthetic indicators.</h2>
              <p className="mt-4 text-sm leading-relaxed text-stone">
                This asset should not be relied upon as a clean source without recovery of the original media, provenance reconciliation, and human review of the evidence cited in this report.
              </p>
            </section>

            <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Timeline of analysis
              </div>
              <div className="mt-4 space-y-3">
                {sampleTimeline.map(([time, step]) => (
                  <div key={time} className="grid grid-cols-[58px_1fr] gap-3">
                    <div className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 text-center font-mono text-[11px] text-amber">
                      {time}
                    </div>
                    <div className="rounded-2xl border border-stone-light bg-white-warm/92 px-4 py-3 text-sm text-charcoal-mid">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Version information
              </div>
              <div className="mt-4">
                <KeyValueGrid
                  items={[
                    ['Methodology version', sampleReportMeta.methodologyVersion],
                    ['Report engine version', sampleReportMeta.reportEngineVersion],
                    ['Model catalog version', sampleReportMeta.modelCatalogVersion],
                    ['Generated by', sampleReportMeta.generatedBy],
                  ]}
                />
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
              AI detection results
            </div>
            <div className="mt-4 space-y-3">
              {sampleAiDetectionResults.map((item) => (
                <SignalCard key={item.label} item={item} />
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
              Manipulation indicators
            </div>
            <div className="mt-4 space-y-3">
              {sampleManipulationIndicators.map((item) => (
                <SignalCard key={item.label} item={item} />
              ))}
            </div>
          </section>
        </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Watermark and provenance checks
                </div>
                <div className="mt-4">
                  <KeyValueGrid items={sampleWatermarkAndProvenance} />
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Frame analysis
                </div>
                <div className="mt-4">
                  <KeyValueGrid items={sampleFrameAnalysis} columns="grid-cols-1" />
                </div>
              </section>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Model results
                </div>
                <div className="mt-4">
                  <KeyValueGrid items={sampleModelResults} columns="grid-cols-1" />
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Cross-validation results
                </div>
                <div className="mt-4">
                  <KeyValueGrid items={sampleCrossValidationResults} columns="grid-cols-1" />
                </div>
              </section>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Analysis scope
                </div>
                <div className="mt-4">
                  <KeyValueGrid items={sampleAnalysisScope} columns="grid-cols-1" />
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Chain of custody and export notes
                </div>
                <div className="mt-4">
                  <KeyValueGrid items={sampleChainOfCustody} columns="grid-cols-1" />
                </div>
              </section>
            </section>

            <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Technical findings
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {sampleTechnicalFindings.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-stone-light bg-white-warm/92 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-light">
                        {item.id}
                      </span>
                      <span className="rounded-full border border-stone-light bg-parchment px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-mid">
                        Technical finding
                      </span>
                    </div>
                    <h3 className="mt-3 font-serif text-lg text-charcoal">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Recommended next steps
                </div>
                <div className="mt-4 space-y-3">
                  {sampleRecommendedNextSteps.map((item) => (
                    <div key={item} className="rounded-2xl border border-stone-light bg-white-warm/92 p-4 text-sm leading-relaxed text-charcoal-mid">
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                  Appendix
                </div>
                <div className="mt-4">
                  <KeyValueGrid items={sampleAppendix} columns="grid-cols-1" />
                </div>
              </section>
            </section>

            <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
                Reviewer notes
              </div>
              <div className="mt-4 space-y-3">
                {sampleReviewerNotes.map((item) => (
                  <div key={item} className="rounded-2xl border border-stone-light bg-white-warm/92 p-4 text-sm leading-relaxed text-charcoal-mid">
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        <section className="rounded-[1.75rem] border border-stone-light bg-parchment/55 p-5">
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">
            Disclaimer
          </div>
          <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">{sampleDisclaimer}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-stone-light bg-white-warm/92 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">Report ID</div>
              <div className="mt-2 text-sm text-charcoal">{sampleReportMeta.reportId}</div>
            </div>
            <div className="rounded-2xl border border-stone-light bg-white-warm/92 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">Timestamp</div>
              <div className="mt-2 text-sm text-charcoal">{sampleReportMeta.analysisTimestamp}</div>
            </div>
            <div className="rounded-2xl border border-stone-light bg-white-warm/92 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">Version</div>
              <div className="mt-2 text-sm text-charcoal">{sampleReportMeta.documentVersion}</div>
            </div>
            <div className="rounded-2xl border border-stone-light bg-white-warm/92 p-4">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">Processing time</div>
              <div className="mt-2 text-sm text-charcoal">{sampleReportMeta.processingTime}</div>
            </div>
          </div>
        </section>
      </div>
    </article>
  )
}
