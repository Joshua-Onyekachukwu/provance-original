/**
 * report-pdf.ts — server-side PDF generation for verification reports using
 * pdfkit (pure JS, no native deps — runs fine on fly.io). Renders the same
 * document model that `report-document.ts` produces, in a compact branded A4
 * layout: header band, verdict banner, metrics grid, evidence sections,
 * recommendations, and a page-numbered footer.
 */

import PDFDocument from 'pdfkit';
import type { ReportDocument } from './report-document.js';

const INK = '#23201A';
const MUTED = '#6B6358';
const LINE = '#D8D2C4';
const PARCHMENT = '#F7F4ED';
const TONE_COLORS: Record<string, string> = {
  success: '#047857',
  warning: '#B45309',
  neutral: '#0369A1',
  default: '#6B6358',
};

const PAGE_W = 595.28; // A4 points
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

function toneColor(tone: string): string {
  return TONE_COLORS[tone] || TONE_COLORS.default;
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc
    .moveDown(1.2)
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(13)
    .text(title.toUpperCase(), { characterSpacing: 1.2 });
  doc
    .moveDown(0.25)
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_W - MARGIN, doc.y)
    .lineWidth(0.75)
    .strokeColor(LINE)
    .stroke();
}

function kvRows(doc: PDFKit.PDFDocument, rows: [string, string][], labelWidth = 132) {
  for (const [label, value] of rows) {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(label, MARGIN, y, {
      width: labelWidth,
      lineBreak: false,
      continued: false,
    });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(value, MARGIN + labelWidth, y, {
      width: CONTENT_W - labelWidth - 12,
    });
  }
}

function signalList(doc: PDFKit.PDFDocument, items: ReportDocument['aiDetectionResults']) {
  if (!items.length) {
    doc
      .moveDown(0.4)
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text('No signals were recorded for this group.');
    return;
  }

  for (const item of items) {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(item.label, MARGIN, y, {
      width: CONTENT_W - 64,
    });
    doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .fillColor(MUTED)
      .text(item.score, PAGE_W - MARGIN - 48, y, { width: 48, align: 'right' });
    doc
      .moveDown(0.15)
      .font('Helvetica-Oblique')
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(item.status, { width: CONTENT_W });
    doc
      .moveDown(0.15)
      .font('Helvetica')
      .fontSize(9)
      .fillColor(INK)
      .text(item.detail, { width: CONTENT_W });
    doc.moveDown(0.45);
  }
}

function renderCoverHeader(doc: PDFKit.PDFDocument, document: ReportDocument) {
  // Brand band
  doc
    .rect(0, 0, PAGE_W, 74)
    .fill(INK);
  doc
    .fillColor(PARCHMENT)
    .font('Helvetica-Bold')
    .fontSize(22)
    .text('PROVANCE', MARGIN, 24, { characterSpacing: 2.5 });
  doc
    .fillColor('#C9C2B4')
    .font('Helvetica')
    .fontSize(9)
    .text('VERIFICATION REPORT', MARGIN, 52, { characterSpacing: 1.4 });

  doc
    .fillColor(INK)
    .font('Helvetica-Bold')
    .fontSize(20)
    .text(document.meta.reportId, MARGIN, 96, { width: CONTENT_W });

  doc
    .moveDown(0.35)
    .font('Helvetica')
    .fontSize(9)
    .fillColor(MUTED)
    .text(
      `Generated ${new Date(document.meta.analysisTimestampIso).toISOString()} · ${document.meta.methodologyVersion} · ${document.meta.documentVersion}`,
      { width: CONTENT_W },
    );
}

function renderVerdictBanner(doc: PDFKit.PDFDocument, document: ReportDocument) {
  const { cover } = document;
  const color = toneColor(cover.verdictTone);

  doc
    .moveDown(1.4)
    .rect(MARGIN, doc.y, CONTENT_W, 6)
    .fill(color);

  doc.moveDown(0.9);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(MUTED)
    .text('OVERALL VERDICT', { characterSpacing: 1.2 });
  doc
    .moveDown(0.15)
    .font('Helvetica-Bold')
    .fontSize(24)
    .fillColor(color)
    .text(cover.verdict, { width: CONTENT_W });
  doc
    .moveDown(0.3)
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(INK)
    .text(document.executiveSummary.summary, { width: CONTENT_W });
}

function renderMetrics(doc: PDFKit.PDFDocument, document: ReportDocument) {
  sectionTitle(doc, 'Key metrics');
  doc.moveDown(0.5);

  const colW = (CONTENT_W - 12) / 2;
  const rowH = 74;
  const startY = doc.y;

  document.metrics.forEach((metric, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + col * (colW + 12);
    const y = startY + row * (rowH + 12);

    doc.rect(x, y, colW, rowH).fill(PARCHMENT);
    doc
      .fillColor(MUTED)
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text(metric.label.toUpperCase(), x + 12, y + 10, {
        width: colW - 24,
        characterSpacing: 0.8,
      });
    doc
      .fillColor(toneColor(metric.tone))
      .font('Helvetica-Bold')
      .fontSize(15)
      .text(metric.value, x + 12, y + 26, { width: colW - 24 });
    doc
      .fillColor(MUTED)
      .font('Helvetica')
      .fontSize(7.5)
      .text(metric.detail, x + 12, y + 48, { width: colW - 24, lineGap: 1 });

    if (index === 3) doc.y = y + rowH + 12;
  });
}

function renderPdf(doc: PDFKit.PDFDocument, document: ReportDocument) {
  renderCoverHeader(doc, document);
  renderVerdictBanner(doc, document);
  renderMetrics(doc, document);

  sectionTitle(doc, 'Executive summary');
  doc
    .moveDown(0.4)
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(INK)
    .text(document.executiveSummary.summary, { width: CONTENT_W, lineGap: 2 });
  doc
    .moveDown(0.4)
    .font('Helvetica')
    .fontSize(9.5)
    .fillColor(MUTED)
    .text(document.executiveSummary.explanation, { width: CONTENT_W, lineGap: 2 });

  sectionTitle(doc, 'Media information');
  doc.moveDown(0.4);
  kvRows(doc, document.mediaInformation);

  sectionTitle(doc, 'AI detection results');
  doc.moveDown(0.2);
  signalList(doc, document.aiDetectionResults);

  sectionTitle(doc, 'Manipulation indicators');
  doc.moveDown(0.2);
  signalList(doc, document.manipulationIndicators);

  if (document.technicalFindings.length) {
    sectionTitle(doc, 'Technical findings');
    for (const finding of document.technicalFindings) {
      doc
        .moveDown(0.3)
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(INK)
        .text(`${finding.id} — ${finding.title}`, { width: CONTENT_W });
      doc
        .moveDown(0.12)
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(finding.detail, { width: CONTENT_W });
    }
  }

  if (document.recommendedNextSteps.length) {
    sectionTitle(doc, 'Recommended next steps');
    document.recommendedNextSteps.forEach((step, index) => {
      doc
        .moveDown(0.25)
        .font('Helvetica')
        .fontSize(9)
        .fillColor(INK)
        .text(`${index + 1}. ${step}`, { width: CONTENT_W, lineGap: 2 });
    });
  }

  sectionTitle(doc, 'Chain of custody');
  doc.moveDown(0.4);
  kvRows(doc, document.chainOfCustody);

  sectionTitle(doc, 'Analysis timeline');
  doc.moveDown(0.4);
  kvRows(doc, document.timeline);

  sectionTitle(doc, 'Appendix — Methodology');
  doc.moveDown(0.3);
  document.appendix.methodology.forEach((point, index) => {
    doc
      .moveDown(0.2)
      .font('Helvetica')
      .fontSize(9)
      .fillColor(INK)
      .text(`${index + 1}. ${point}`, { width: CONTENT_W, lineGap: 2 });
  });

  sectionTitle(doc, 'Appendix — Limitations');
  doc.moveDown(0.3);
  document.appendix.limitations.forEach((point, index) => {
    doc
      .moveDown(0.2)
      .font('Helvetica')
      .fontSize(9)
      .fillColor(INK)
      .text(`${index + 1}. ${point}`, { width: CONTENT_W, lineGap: 2 });
  });

  doc.moveDown(1.6);
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_W - MARGIN, doc.y)
    .lineWidth(0.75)
    .strokeColor(LINE)
    .stroke();
  doc
    .moveDown(0.4)
    .font('Helvetica')
    .fontSize(7.5)
    .fillColor(MUTED)
    .text(
      `Generated by the Provance verification pipeline. Verification ID ${document.meta.verificationId}. This document is an automated export and should be reviewed alongside human judgment.`,
      { width: CONTENT_W, lineGap: 1 },
    );
}

/**
 * Generate a branded A4 verification report PDF for the given document.
 */
export function generateReportPdf(document: ReportDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: MARGIN,
        bufferPages: true,
        info: {
          Title: `Provance verification report ${document.meta.reportId}`,
          Author: 'Provance verification pipeline',
          Subject: 'Media authenticity verification report',
          Keywords: 'provance, verification, authenticity, report',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      renderPdf(doc, document);

      // Footer with page numbers on every page. bufferPages + switchToPage is
      // the canonical pdfkit pattern — writing inside a pageAdded handler
      // below the bottom margin would trigger an addPage recursion.
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        doc
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor(MUTED)
          .text(
            `${document.meta.reportId} · Page ${i - range.start + 1} of ${range.count} · Provance`,
            MARGIN,
            PAGE_H - 72,
            { lineBreak: false },
          );
      }

      doc.end();
    } catch (error) {
      reject(error as Error);
    }
  });
}
