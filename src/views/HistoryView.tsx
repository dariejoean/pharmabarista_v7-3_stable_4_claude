
import React from 'react';
import { 
    SECTION_HEADER_STYLE, 
    getDynamicSectionHeaderStyle,
    DEPTH_SHADOW
} from '../styles/common';
import { ShotData } from '../types';
import { HistoryList } from '../components/HistoryList';
import { StandardExtractionBox } from '../components/StandardExtractionBox';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useHistoryLogic } from '../hooks/useHistoryLogic';
import { getReconstructedTimes } from '../utils/shotUtils';
import { 
    ChartPieIcon,
    SparklesIcon,
    XMarkIcon,
    StarIcon,
    ArrowRightIcon,
    ArrowDownCircleIcon,
    ArrowPathIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    FunnelIcon,
    TrashIcon
} from '@heroicons/react/24/solid';

interface HistoryViewProps {
    shots: ShotData[];
    onDeleteShot: (id: string) => void;
    onViewShot: (id: string) => void;
    onOpenAnalysis: () => void;
}

const SORT_CONFIG = [
    { key: 'date', label: 'Dată / Recent' },
    { key: 'rating', label: 'Scor General' },
    { key: 'expert_score', label: 'Nota Expert' },
    { key: 'ratio', label: 'Rație' },
    { key: 'time', label: 'Timp' },
    { key: 'temp', label: 'Temperatură' },
    { key: 'grind', label: 'Măcinare' },
];

export const HistoryView: React.FC<HistoryViewProps> = React.memo(({ shots, onDeleteShot, onViewShot, onOpenAnalysis }) => {
    
    const logic = useHistoryLogic(shots);

    // Helpers
    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return {
            date: d.toLocaleDateString('ro-RO', {day: '2-digit', month: '2-digit', year: 'numeric'}),
            time: d.toLocaleTimeString('ro-RO', {hour: '2-digit', minute: '2-digit'})
        };
    };

    const latestExpertScoreDisplay = () => {
        if (!logic.latestShot) return "N/A";
        if (logic.latestShot.structuredAnalysis?.score) {
            const scoreNum = logic.latestShot.structuredAnalysis.score.split('/')[0].trim();
            return `${scoreNum}/10`;
        } else if (logic.latestShot.expertAdvice && logic.latestShot.expertAdvice.includes('/10')) {
            const match = logic.latestShot.expertAdvice.match(/(\d+(\.\d)?)\/10/);
            if (match) return `${match[1]}/10`;
        }
        return "N/A";
    };

    // Calculate Grind Display for Latest Shot
    let latestGrindDisplay = "-";
    if (logic.latestShot) {
        if (logic.latestShot.grindSettingText) {
            latestGrindDisplay = logic.latestShot.grindSettingText;
        } else if (logic.latestShot.grindSetting !== undefined && logic.latestShot.grindSetting !== null) {
            if (logic.latestShot.grindScaleType === 'eureka') {
                const rotations = Math.floor(logic.latestShot.grindSetting / 20);
                const dial = logic.latestShot.grindSetting % 20;
                latestGrindDisplay = `${rotations}R+${dial.toFixed(2)}`;
            } else {
                latestGrindDisplay = logic.latestShot.grindSetting.toFixed(2);
            }
        }
    }

    const calculatePressureTime = (shot: ShotData) => {
        if (!shot.extractionProfile || shot.extractionProfile.length < 2) return 0;
        const points = shot.extractionProfile.filter(p => p.pressure > 0.1);
        if (points.length < 2) return 0;
        return Math.max(0, points[points.length - 1].time - points[0].time);
    };

    const LatestMetric = ({ label, val }: { label: string, val: string | number }) => (
        <div className="bg-black/10 backdrop-blur-sm rounded-xl p-2 text-center border border-white/10 shadow-sm flex flex-col justify-center h-full min-h-[50px]">
            <div className="text-[9px] font-bold text-on-surface-variant uppercase opacity-90 drop-shadow-sm mb-0.5 line-clamp-1">{label}</div>
            <div className="text-sm font-black text-on-surface drop-shadow-md leading-tight break-all line-clamp-1">{val}</div>
        </div>
    );

    const latestTimes = logic.latestShot ? getReconstructedTimes(logic.latestShot) : null;

    const HistoryDetailRow = ({ label, value }: { label: string, value: string }) => (
        <div className="flex flex-col w-full border-b border-white/10 last:border-0 py-2">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest opacity-60 text-left mb-0.5">{label}</span>
            <span className="text-sm font-bold text-on-surface text-left truncate">{value || '-'}</span>
        </div>
    );

    const isFilterActive = logic.activeFilterCount > 0;

    return (
        <div className="animate-fade-in space-y-5 pb-10">
            {logic.activeModal === 'filter_dashboard' && (
                <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in sm:p-4">
                    <div className="bg-surface-container w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] flex flex-col max-h-[90vh] shadow-2xl border-t sm:border border-white/10 overflow-hidden relative">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface/50 backdrop-blur-xl shrink-0">
                            <h2 className="text-sm font-black text-on-surface uppercase tracking-widest">FILTRARE AVANSATĂ</h2>
                            <button onClick={() => logic.setActiveModal('none')} className="p-2 text-on-surface-variant hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-safe-bottom">
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60 block mb-2">PERIOADĂ</span>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'all', label: 'TOT' },
                                            { id: 'week', label: '7 ZILE' },
                                            { id: 'month', label: '30 ZILE' }
                                        ].map(opt => (
                                            <button 
                                                key={opt.id} 
                                                onClick={() => logic.setFilters(prev => ({...prev, dateRange: opt.id as any}))}
                                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${logic.filters.dateRange === opt.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-surface-container-high text-on-surface border-white/5'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60 block mb-2">SCOR MINIM</span>
                                    <div className="flex gap-2">
                                        {[
                                            { id: null, label: 'ORICE' },
                                            { id: 3, label: '3+ STELE' },
                                            { id: 4, label: '4+ STELE' },
                                            { id: 5, label: '5 STELE' }
                                        ].map(opt => (
                                            <button 
                                                key={String(opt.id)} 
                                                onClick={() => logic.setFilters(prev => ({...prev, minRating: opt.id}))}
                                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${logic.filters.minRating === opt.id ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-surface-container-high text-on-surface border-white/5'}`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">ESPRESSOR</span>
                                    {logic.filters.machine && <button onClick={() => logic.setFilters(prev => ({...prev, machine: null}))} className="text-[9px] font-bold text-red-400 uppercase"><TrashIcon className="w-3 h-3 inline mr-1"/>Șterge</button>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {logic.uniqueMachines.map(m => (
                                        <button 
                                            key={m}
                                            onClick={() => logic.setFilters(prev => ({ ...prev, machine: prev.machine === m ? null : m }))}
                                            className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${logic.filters.machine === m ? 'bg-on-surface text-surface border-transparent' : 'bg-surface-container-high border-white/5 text-on-surface-variant'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">TIP CAFEA</span>
                                    {logic.filters.bean && <button onClick={() => logic.setFilters(prev => ({...prev, bean: null}))} className="text-[9px] font-bold text-red-400 uppercase"><TrashIcon className="w-3 h-3 inline mr-1"/>Șterge</button>}
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar">
                                    {logic.uniqueBeans.map(bean => (
                                        <button 
                                            key={bean}
                                            onClick={() => logic.setFilters(prev => ({ ...prev, bean: prev.bean === bean ? null : bean }))}
                                            className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${logic.filters.bean === bean ? 'bg-on-surface text-surface border-transparent' : 'bg-surface-container-high border-white/5 text-on-surface-variant'}`}
                                        >
                                            {bean}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60 block mb-3">ORDONARE</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {SORT_CONFIG.map(opt => {
                                        const isSelected = logic.filters.sort.startsWith(opt.key);
                                        const isAsc = logic.filters.sort.endsWith('_asc');
                                        return (
                                            <button 
                                                key={opt.key}
                                                onClick={() => logic.toggleSort(opt.key)}
                                                className={`h-12 rounded-xl flex items-center justify-between px-4 transition-all active:scale-95 border
                                                    ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-surface-container-high border-white/5 text-on-surface hover:bg-surface-container-high/80'}
                                                `}
                                            >
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{opt.label}</span>
                                                {isSelected && (isAsc ? <ArrowUpIcon className="w-3.5 h-3.5" /> : <ArrowDownIcon className="w-3.5 h-3.5" />)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/10 bg-surface/90 backdrop-blur-xl flex gap-3">
                            <button onClick={() => logic.setFilters(logic.DEFAULT_FILTERS)} className="w-14 h-14 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95 border border-white/5">
                                <ArrowPathIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => logic.setActiveModal('none')} className="flex-1 h-14 bg-on-surface text-surface rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity active:scale-95 flex items-center justify-center gap-2">
                                APLICĂ FILTRE ({logic.processedShots.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div id="section-history-analysis" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>ANALIZE ȘI DISCUȚII</div>
            <div className="space-y-3">
                <button onClick={onOpenAnalysis} className="w-full py-4 bg-indigo-600 text-white rounded-full font-bold text-sm uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-[0_8px_20px_rgba(79,70,229,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-95 active:shadow-inner border border-white/10 flex items-center justify-center gap-2 group">
                    <ChartPieIcon className="w-5 h-5 drop-shadow-md group-hover:scale-110 transition-transform" /> <span>ANALIZE EXTRACȚII</span>
                </button>
            </div>

            {logic.latestShot && !isFilterActive && (
                <>
                    <div id="section-history-latest" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>EXTRACȚIA ANTERIOARĂ</div>
                    <ErrorBoundary>
                        <StandardExtractionBox shot={logic.latestShot!} editable={false} />
                    </ErrorBoundary>
                </>
            )}
            
            <div id="section-history-log" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>
                {isFilterActive ? `REZULTATE FILTRATE (${logic.processedShots.length})` : 'JURNAL COMPLET'}
            </div>
            
            <button 
                onClick={() => logic.setActiveModal('filter_dashboard')}
                className={`w-full h-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-[0.98] border font-black text-xs uppercase tracking-widest gap-2
                    ${isFilterActive 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-blue-900/20' 
                        : 'bg-surface-container text-on-surface border-white/5 hover:bg-surface-container-high'
                    }
                `}
            >
                {isFilterActive ? <FunnelIcon className="w-4 h-4"/> : null}
                {isFilterActive ? `Filtre Active (${logic.activeFilterCount})` : 'Filtrare Extractii'}
            </button>

            <HistoryList shots={logic.visibleShots} onDelete={onDeleteShot} onView={onViewShot} />

            {logic.hasMore && (
                <div className="flex justify-center pt-2 pb-8">
                    <button onClick={logic.handleLoadMore} className="flex items-center gap-2 px-8 py-3 bg-surface-container text-on-surface font-bold text-xs uppercase tracking-widest rounded-full border border-white/10 shadow-lg hover:bg-surface-container-high transition-all active:scale-95">
                        <ArrowDownCircleIcon className="w-5 h-5 text-on-surface-variant" />
                        Vezi mai multe ({logic.processedShots.length - logic.displayLimit})
                    </button>
                </div>
            )}
        </div>
    );
});
