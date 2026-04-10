import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../services/db';
import { GeminiShotAnalysis } from '../types';
import { SparklesIcon, ClockIcon, LanguageIcon } from '@heroicons/react/24/solid';

export const GeminiHistoryPanel: React.FC = () => {
  const history = useLiveQuery(
    () => db.table('geminiHistory').orderBy('date').reverse().limit(20).toArray() as Promise<GeminiShotAnalysis[]>,
    [],
    [] as GeminiShotAnalysis[]
  );

  if (!history || history.length === 0) {
    return (
      <div className="bg-surface-container rounded-2xl p-6 border border-white/5 text-center">
        <SparklesIcon className="w-8 h-8 text-on-surface-variant/30 mx-auto mb-2" />
        <p className="text-xs text-on-surface-variant opacity-50 uppercase tracking-widest font-bold">
          Nicio analiză AI salvată încă
        </p>
        <p className="text-[10px] text-on-surface-variant/40 mt-1">
          Analizele Gemini apar aici după prima extracție
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {history.map((entry, idx) => {
        const date = new Date(entry.date);
        const score = entry.result?.score || 'N/A';
        const diagnosis = entry.result?.diagnosis || '';
        const preview = diagnosis.length > 80 ? diagnosis.substring(0, 80) + '...' : diagnosis;
        const isRO = entry.language === 'ro' || !entry.language;

        return (
          <div
            key={entry.shotHash + idx}
            className="bg-surface-container rounded-2xl p-4 border border-white/5 shadow-sm flex flex-col gap-2"
          >
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5 text-on-surface-variant/50" />
                <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                  {date.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {' '}
                  {date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Language badge */}
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest ${
                  isRO
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}>
                  <LanguageIcon className="w-2.5 h-2.5 inline mr-0.5" />
                  {isRO ? 'RO' : 'EN'}
                </span>
                {/* Score badge */}
                {score && score !== 'N/A' && (
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    {score}
                  </span>
                )}
              </div>
            </div>

            {/* Diagnosis preview */}
            {preview && (
              <p className="text-xs text-on-surface/80 leading-relaxed">{preview}</p>
            )}

            {/* Suggestion preview */}
            {entry.result?.suggestion && (
              <p className="text-[10px] text-on-surface-variant/70 leading-relaxed border-t border-white/5 pt-2 mt-1">
                {entry.result.suggestion.substring(0, 100)}{entry.result.suggestion.length > 100 ? '...' : ''}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
