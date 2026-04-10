
import React from 'react';
import { ShotData } from '../types';
import { StandardExtractionBox } from './StandardExtractionBox';
import { TrashIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

interface HistoryListProps {
  shots: ShotData[];
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = React.memo(({ shots, onDelete, onView }) => {
  
  if (shots.length === 0) {
    return (
      <div className="text-center text-on-surface-variant py-10 flex flex-col items-center opacity-60 text-sm">
        <p>Nu există înregistrări care să corespundă criteriilor.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-20">
       {shots.map((shot, index) => {
            const isBest = (shot.ratingOverall || 0) >= 4.5;
            
            return (
              <div 
                key={shot.id} 
                className={`flex flex-col p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.99] relative overflow-hidden cursor-pointer animate-slide-up-fade
                    ${isBest 
                        ? 'bg-surface-container border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                        : 'bg-surface-container border-black/5 dark:border-white/5'
                    }
                `}
                style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s`, animationFillMode: 'both' }}
                onClick={() => onView(shot.id)}
              >
                <div className="flex justify-between items-start mb-3 relative z-10">
                    <h3 className="text-sm font-black text-on-surface uppercase tracking-wide leading-tight">
                        Extracția din {new Date(shot.date).toLocaleDateString('ro-RO')} {new Date(shot.date).toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})}
                    </h3>
                    <div className="flex gap-2 shrink-0">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onView(shot.id); }}
                            className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors shadow-sm border border-black/5"
                        >
                            <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(shot.id); }}
                            className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-sm border border-black/5"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <StandardExtractionBox shot={shot} editable={false} />
              </div>
            );
       })}
    </div>
  );
});
