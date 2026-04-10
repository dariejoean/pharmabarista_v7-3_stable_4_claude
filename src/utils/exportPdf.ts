import { jsPDF } from 'jspdf';
import { ExpertAnalysisResult, ShotData } from '../types';

/**
 * Feature 2: Export PDF al analizei Gemini
 * Uses jsPDF (already in project deps) to generate a formatted A4 PDF report.
 */
export async function exportAnalysisToPdf(
  result: ExpertAnalysisResult,
  shot: Partial<ShotData>
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 36;

  // ── Helper: wrapped text block ───────────────────────────────────────────
  const addText = (
    text: string,
    fontSize: number,
    bold = false,
    hexColor = '#000000'
  ): void => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    // jsPDF setTextColor accepts hex string
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    doc.setTextColor(r, g, b);
    const lines = doc.splitTextToSize(text, contentW) as string[];
    doc.text(lines, margin, y);
    y += lines.length * (fontSize * 0.38) + 2;
  };

  const addLine = (): void => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  const addSection = (title: string): void => {
    if (y > pageH - 40) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(240, 240, 248);
    doc.rect(margin, y - 4, contentW, 8, 'F');
    addText(title, 10, true, '#1a1a2e');
    y += 2;
  };

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(26, 26, 46); // #1a1a2e
  doc.rect(0, 0, pageW, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaBarista AI', margin, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Raport Analiza Expert Gemini', margin, 23);

  // Date line
  const dateStr = new Date().toLocaleDateString('ro-RO', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFontSize(9);
  doc.text(dateStr, pageW - margin, 23, { align: 'right' });

  // ── Shot info line ────────────────────────────────────────────────────────
  y = 36;
  addText(
    [
      shot.machineName ? 'Espressor: ' + shot.machineName : null,
      shot.beanName   ? 'Cafea: ' + shot.beanName : null,
      shot.doseIn != null && shot.yieldOut != null
        ? 'Raport: ' + shot.doseIn + 'g → ' + shot.yieldOut + 'g'
        : null,
    ].filter(Boolean).join('  |  ') || 'Shot neinregistrat',
    9, false, '#555555'
  );
  addLine();

  // ── Score ─────────────────────────────────────────────────────────────────
  addSection('SCOR & DIAGNOSTIC');
  addText(result.score || 'N/A', 24, true, '#c8860a');
  y += 1;

  // ── Diagnosis ─────────────────────────────────────────────────────────────
  addText('Diagnostic:', 10, true, '#1a1a2e');
  addText(result.diagnosis || 'N/A', 10, false, '#333333');
  y += 3;

  // ── Suggestion ───────────────────────────────────────────────────────────
  addText('Recomandare pentru urmatoarea extractie:', 10, true, '#1a1a2e');
  addText(result.suggestion || 'N/A', 10, false, '#333333');
  y += 4;
  addLine();

  // ── Parameters ───────────────────────────────────────────────────────────
  if (result.parameters) {
    addSection('PARAMETRI TEHNICI');
    if (result.parameters.extractionRate) {
      addText('Rata extractie: ' + result.parameters.extractionRate, 10);
    }
    if (result.parameters.ratioAnalysis) {
      addText('Analiza raport doza/randament: ' + result.parameters.ratioAnalysis, 10);
    }
    if (result.parameters.timeAnalysis) {
      addText('Analiza timp: ' + result.parameters.timeAnalysis, 10);
    }
    if (result.parameters.issues && result.parameters.issues.length > 0) {
      y += 2;
      addText('Probleme identificate:', 10, true);
      result.parameters.issues.forEach((issue, i) => {
        addText('  ' + (i + 1) + '. ' + issue, 10, false, '#cc3333');
      });
    }
    y += 4;
    addLine();
  }

  // ── Shot extraction data ──────────────────────────────────────────────────
  addSection('DATE EXTRACTIE');

  const fields: Array<[string, string | null]> = [
    ['Doza in',           shot.doseIn       != null ? shot.doseIn + 'g'        : null],
    ['Randament',         shot.yieldOut     != null ? shot.yieldOut + 'g'      : null],
    ['Timp total',        shot.time         != null ? shot.time + 's'          : null],
    ['Timp preinfuzie',   shot.preinfusionTime != null ? shot.preinfusionTime + 's' : null],
    ['Temperatura',       shot.temperature  != null ? shot.temperature + ' C'  : null],
    ['Presiune setata',   shot.pressure     != null ? shot.pressure + ' bar'   : null],
    ['Presiune medie',    shot.avgPressure  != null ? shot.avgPressure + ' bar': null],
    ['Presiune maxima',   shot.maxPressure  != null ? shot.maxPressure + ' bar': null],
    ['Raznita',           shot.grindName    || null],
    ['Setare macinare',   shot.grindSettingText || (shot.grindSetting != null ? String(shot.grindSetting) : null)],
    ['Scala macinare',    shot.grindScaleType   || null],
    ['Sita',              shot.basketName   || null],
    ['Tamper',            shot.tamperName   || null],
    ['Forta tampare',     shot.tampLevel    || null],
    ['Apa',               shot.waterName    || null],
    ['Prajitor',          shot.roaster      || null],
  ];

  fields.forEach(([label, value]) => {
    if (value !== null && value !== undefined) {
      // Two-column layout using tab stop
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(value, margin + 52, y);
      y += 5;
    }
  });

  // ── Notes ────────────────────────────────────────────────────────────────
  if (shot.notes) {
    y += 3;
    addLine();
    addSection('NOTE PERSONALE');
    addText(shot.notes, 10, false, '#333333');
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(
    'Generat de PharmaBarista AI v7.3  •  ' + new Date().toISOString().substring(0, 10),
    pageW / 2,
    pageH - 8,
    { align: 'center' }
  );

  // ── Save ─────────────────────────────────────────────────────────────────
  const saveName = 'PharmaBarista_Analiza_' + new Date().toISOString().substring(0, 10) + '.pdf';
  doc.save(saveName);
}
