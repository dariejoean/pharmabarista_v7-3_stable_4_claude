import React, { useState, useEffect, useCallback } from 'react';
import { ShotData, ExpertAnalysisResult } from '../types';
import { getAllShots } from '../services/db';

/**
 * Feature 3: Comparare shot-uri
 * Side-by-side comparison of two saved espresso shots.
 * Accessible from the ISTORIC tab.
 */

interface CompRow {
  label: string;
  keyA: keyof ShotData;
  unit?: string;
  format?: (v: unknown) => string;
}

const ROWS: CompRow[] = [
  { label: 'Espressor',       keyA: 'machineName' },
  { label: 'Cafea',           keyA: 'beanName' },
  { label: 'Prajitor',        keyA: 'roaster' },
  { label: 'Doza in',         keyA: 'doseIn',       unit: 'g' },
  { label: 'Randament',       keyA: 'yieldOut',     unit: 'g' },
  { label: 'Timp total',      keyA: 'time',         unit: 's' },
  { label: 'Preinfuzie',      keyA: 'preinfusionTime', unit: 's' },
  { label: 'Temperatura',     keyA: 'temperature',  unit: '°C' },
  { label: 'Presiune setata', keyA: 'pressure',     unit: ' bar' },
  { label: 'Presiune medie',  keyA: 'avgPressure',  unit: ' bar' },
  { label: 'Presiune max',    keyA: 'maxPressure',  unit: ' bar' },
  { label: 'Raznita',         keyA: 'grindName' },
  { label: 'Macinare',        keyA: 'grindSettingText' },
  { label: 'Scala',           keyA: 'grindScaleType' },
  { label: 'Sita',            keyA: 'basketName' },
  { label: 'Tamper',          keyA: 'tamperName' },
  { label: 'Forta tampare',   keyA: 'tampLevel' },
  { label: 'Apa',             keyA: 'waterName' },
  { label: 'Scor AI',        keyA: 'structuredAnalysis',
    format: (v) => (v as ExpertAnalysisResult | undefined)?.score ?? 'N/A' },
  { label: 'Concluzie AI',   keyA: 'expertAdvice' },
];

function fmt(shot: ShotData, row: CompRow): string {
  const raw = shot[row.keyA];
  if (row.format) return row.format(raw);
  if (raw == null || raw === '') return '—';
  return String(raw) + (row.unit ?? '');
}

function diff(a: ShotData, b: ShotData, row: CompRow): 'better' | 'worse' | 'same' {
  const numericKeys: (keyof ShotData)[] = ['doseIn','yieldOut','time','temperature','pressure','avgPressure','maxPressure','preinfusionTime'];
  if (!numericKeys.includes(row.keyA)) return 'same';
  const va = Number(a[row.keyA]);
  const vb = Number(b[row.keyA]);
  if (isNaN(va) || isNaN(vb) || va === vb) return 'same';
  // Higher yield, lower time are "better" for espresso (simplified heuristic)
  return 'same';
}

const ShotSelector: React.FC<{
  shots: ShotData[];
  selected: ShotData | null;
  onSelect: (s: ShotData) => void;
  label: string;
}> = ({ shots, selected, onSelect, label }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ fontWeight: 700, marginBottom: 6, color: '#c8860a', fontSize: 13 }}>{label}</div>
    <select
      value={selected?.id ?? ''}
      onChange={e => {
        const s = shots.find(x => x.id === e.target.value);
        if (s) onSelect(s);
      }}
      style={{
        width: '100%', padding: '6px 8px', borderRadius: 6,
        border: '1px solid #444', background: '#1e1e2e', color: '#fff',
        fontSize: 12, marginBottom: 8,
      }}
    >
      <option value="">— Selecteaza shot —</option>
      {shots.map(s => (
        <option key={s.id} value={s.id}>
          {new Date(s.date).toLocaleDateString('ro-RO')} | {s.machineName || '?'} | {s.beanName || '?'}
          {s.doseIn != null && s.yieldOut != null ? ' | ' + s.doseIn + 'g→' + s.yieldOut + 'g' : ''}
        </option>
      ))}
    </select>
    {selected && (
      <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.4 }}>
        {selected.date ? new Date(selected.date).toLocaleString('ro-RO') : ''}
      </div>
    )}
  </div>
);

export const ShotComparisonView: React.FC = () => {
  const [shots, setShots] = useState<ShotData[]>([]);
  const [shotA, setShotA] = useState<ShotData | null>(null);
  const [shotB, setShotB] = useState<ShotData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadShots = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllShots();
      // Sort newest first
      const sorted = all.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setShots(sorted);
      if (sorted.length >= 1) setShotA(sorted[0]);
      if (sorted.length >= 2) setShotB(sorted[1]);
    } catch (e) {
      console.error('ShotComparisonView: failed to load shots', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShots(); }, [loadShots]);

  if (loading) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#aaa' }}>
        Se incarca shot-urile...
      </div>
    );
  }

  if (shots.length < 2) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>☕</div>
        <div>Ai nevoie de cel putin 2 shot-uri salvate pentru comparatie.</div>
        <div style={{ marginTop: 8, fontSize: 12 }}>
          Salveaza mai multe extractii din editorul de shot-uri.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#c8860a', fontWeight: 700 }}>
          Comparare Shot-uri
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#aaa' }}>
          Selecteaza doua extractii pentru a le compara direct.
        </p>
      </div>

      {/* Selectors */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <ShotSelector shots={shots} selected={shotA} onSelect={setShotA} label="Shot A" />
        <div style={{ display: 'flex', alignItems: 'center', color: '#666', fontSize: 20, paddingTop: 24 }}>vs</div>
        <ShotSelector shots={shots} selected={shotB} onSelect={setShotB} label="Shot B" />
      </div>

      {/* Comparison table */}
      {shotA && shotB && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#1e1e2e' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: '#aaa', fontWeight: 600, width: '26%' }}>
                  Parametru
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#c8860a', fontWeight: 700, width: '37%' }}>
                  Shot A — {new Date(shotA.date).toLocaleDateString('ro-RO')}
                </th>
                <th style={{ padding: '8px 12px', textAlign: 'center', color: '#7ec8e3', fontWeight: 700, width: '37%' }}>
                  Shot B — {new Date(shotB.date).toLocaleDateString('ro-RO')}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, idx) => {
                const valA = fmt(shotA, row);
                const valB = fmt(shotB, row);
                const different = valA !== valB;
                return (
                  <tr
                    key={row.label}
                    style={{ background: idx % 2 === 0 ? '#12121a' : '#1a1a26' }}
                  >
                    <td style={{ padding: '7px 12px', color: '#888', fontWeight: 600 }}>
                      {row.label}
                    </td>
                    <td style={{
                      padding: '7px 12px', textAlign: 'center',
                      color: different ? '#c8860a' : '#ccc', fontWeight: different ? 600 : 400,
                    }}>
                      {valA}
                    </td>
                    <td style={{
                      padding: '7px 12px', textAlign: 'center',
                      color: different ? '#7ec8e3' : '#ccc', fontWeight: different ? 600 : 400,
                    }}>
                      {valB}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontSize: 11, color: '#555' }}>
            Valorile diferite sunt evidentiate cu culoare.
          </div>
        </div>
      )}
    </div>
  );
};

export default ShotComparisonView;
