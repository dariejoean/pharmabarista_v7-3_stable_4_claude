
import React from 'react';
import { ShotData } from '../types';
import { StandardExtractionBox } from './StandardExtractionBox';
import { ErrorBoundary } from './ErrorBoundary';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface ShotDetailModalProps {
    shot: ShotData;
    onClose: () => void;
    onViewImage: (img: string) => void;
    onShotUpdated?: (updatedShot: ShotData) => void;
}

export const ShotDetailModal: React.FC<ShotDetailModalProps> = ({ shot, onClose, onShotUpdated }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className={`bg-surface w-full max-w-lg rounded-[2rem] shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden`} onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-surface-container/50">
                    <h2 className="text-xl font-black text-on-surface uppercase tracking-wide leading-tight">
                        Extracția din {new Date(shot.date).toLocaleDateString('ro-RO')} {new Date(shot.date).toLocaleTimeString('ro-RO', {hour: '2-digit', minute:'2-digit'})}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
                    <ErrorBoundary>
                        <StandardExtractionBox shot={shot} onShotUpdated={onShotUpdated} />
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );
};
