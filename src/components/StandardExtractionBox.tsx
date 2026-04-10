import React, { useState, useEffect, useMemo } from 'react';
import { ShotData, ListItem } from '../types';
import { updateShot, getSetting } from '../services/db';
import { LiveExtractionChart } from './new-shot/LiveExtractionChart';
import { DetailRow, EditableDetailRow } from './EditableDetailRow';
import { EditableSelectionRow } from './EditableSelectionRow';
import { EditableGrindSettingRow } from './EditableGrindSettingRow';
import { getReconstructedTimes, formatGrindSetting } from '../utils/shotUtils';
import { SparklesIcon, DocumentTextIcon, PencilSquareIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { exportAnalysisToPdf } from '../utils/exportPdf';
import { BOX_STYLE, LABEL_STYLE, VALUE_WRAPPER_STYLE } from '../styles/common';

interface StandardExtractionBoxProps {
    shot: ShotData;
    onShotUpdated?: (updatedShot: ShotData) => void;
    editable?: boolean;
}

export const StandardExtractionBox: React.FC<StandardExtractionBoxProps> = ({ shot, onShotUpdated, editable = true }) => {
    const [localShot, setLocalShot] = useState<ShotData>(shot);
    const [modifiedFields, setModifiedFields] = useState<Partial<ShotData>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [tampersList, setTampersList] = useState<ListItem[]>([]);
    const [isLoadingTampers, setIsLoadingTampers] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            const list = await getSetting('tampers_list') as ListItem[] || [];
            setTampersList(list);
            setIsLoadingTampers(false);
        };
        fetchSettings();
    }, []);

    const availableTampLevels = useMemo(() => {
        const tamperName = modifiedFields.tamperName || localShot.tamperName;
        const selectedTamper = tampersList.find(t => t.label === tamperName);
        if (selectedTamper && selectedTamper.levels && selectedTamper.levels.length > 0) {
            return selectedTamper.levels.map((lvl, idx) => ({
                id: `custom-${idx}`,
                label: lvl,
                order: idx
            } as ListItem));
        }
        return [];
    }, [modifiedFields.tamperName, localShot.tamperName, tampersList]);

    const times = useMemo(() => getReconstructedTimes(localShot), [localShot]);

    useEffect(() => {
        setLocalShot(shot);
        setModifiedFields({});
        setIsDirty(false);

        // Auto-populate standardExtractionTime if missing for shots >= 2026-04-01
        if (new Date(shot.date) >= new Date('2026-04-01') && 
            shot.standardExtractionTime === undefined && 
            times.standardExtractionTime !== undefined && 
            times.standardExtractionTime > 0) {
            
            updateShot(shot.id, { standardExtractionTime: times.standardExtractionTime })
                .then(() => {
                    const updated = { ...shot, standardExtractionTime: times.standardExtractionTime };
                    setLocalShot(updated);
                    if (onShotUpdated) onShotUpdated(updated);
                })
                .catch(e => console.error("Failed to auto-populate standardExtractionTime", e));
        }
    }, [shot, times.standardExtractionTime]);

    const handleFieldChange = (field: keyof ShotData, value: string | number) => {
        // Validation: Ensure numeric fields are non-negative
        if (['doseIn', 'temperature', 'grindSetting'].includes(field)) {
            const numericValue = typeof value === 'string' ? parseFloat(value) : value;
            if (isNaN(numericValue) || numericValue < 0) return;
        }
        setModifiedFields(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleSave = async () => {
        try {
            await updateShot(localShot.id, modifiedFields);
            const updated = { ...localShot, ...modifiedFields };
            setLocalShot(updated);
            setModifiedFields({});
            setIsDirty(false);
            if (onShotUpdated) onShotUpdated(updated);
        } catch (e) {
            console.error("Failed to save changes", e);
            alert("Eroare la salvarea modificărilor.");
        }
    };

    const handleCancel = () => {
        setModifiedFields({});
        setIsDirty(false);
    };

    const grindDisplay = useMemo(() => {
        const val = modifiedFields.grindSetting !== undefined ? modifiedFields.grindSetting : localShot.grindSetting;
        if (val !== undefined && val !== null) {
            if (localShot.grindScaleType === 'eureka') {
                return formatGrindSetting(val);
            } else {
                return val.toFixed(2);
            }
        }
        return "-";
    }, [modifiedFields.grindSetting, localShot.grindSetting, localShot.grindScaleType]);

    const flowRate = localShot.time > 0 ? (localShot.yieldOut / localShot.time).toFixed(1) : "0.0";

    const showMarkers = new Date(localShot.date) >= new Date('2026-04-01');
    const timePoints = showMarkers ? {
        A: localShot.timeA,
        B: localShot.timeB,
        C: localShot.timeC,
        D: localShot.timeD,
        E: localShot.timeE,
        F: localShot.timeF
    } : undefined;

    return (
        <div className="flex flex-col gap-4">
            {/* Save/Cancel Buttons */}
            {editable && isDirty && (
                <div className="flex gap-4 mb-4">
                    <button onClick={handleSave} className="flex-1 py-3 bg-green-600 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-green-500">
                        Salvare modificări
                    </button>
                    <button onClick={handleCancel} className="flex-1 py-3 bg-red-600 text-white rounded-full font-bold text-xs uppercase tracking-widest hover:bg-red-500">
                        Anulare modificări
                    </button>
                </div>
            )}

            <LiveExtractionChart data={localShot.extractionProfile || []} timePoints={timePoints} />
            {/* Photos */}
            {localShot.images && localShot.images.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    {localShot.images.map((img, i) => (
                        <img key={i} src={localShot.thumbnails?.[i] || img} className="h-24 w-24 object-cover rounded-xl border border-white/10 shadow-md" alt="Shot" />
                    ))}
                </div>
            )}

            {/* Core Data */}
            <div className="flex flex-col bg-surface-container-high/30 rounded-xl p-4 border border-white/5 space-y-1">
                {editable ? (
                    <>
                        <EditableSelectionRow label="Espressor" field="machineName" value={modifiedFields.machineName || localShot.machineName || 'Nespecificat'} category="machine" onSave={handleFieldChange} />
                        <EditableSelectionRow label="Apă" field="waterName" value={modifiedFields.waterName || localShot.waterName || 'Nespecificat'} category="water" onSave={handleFieldChange} />
                        <EditableSelectionRow label="Cafea" field="beanName" value={modifiedFields.beanName || localShot.beanName || 'Nespecificat'} category="bean" onSave={handleFieldChange} />
                        {localShot.roaster && <DetailRow label="Prăjitoria" value={localShot.roaster} />}
                        {localShot.roastDate && <DetailRow label="Data prăjirii" value={localShot.roastDate} />}
                        <EditableSelectionRow label="Râșniță" field="grinderName" value={modifiedFields.grinderName || localShot.grinderName || '-'} category="grinder" onSave={handleFieldChange} />
                        <EditableGrindSettingRow label="Măcinare (Grad)" field="grindSetting" value={modifiedFields.grindSetting !== undefined ? modifiedFields.grindSetting : localShot.grindSetting || 0} onSave={handleFieldChange} />
                        <EditableSelectionRow label="Sită (Basket)" field="basketName" value={modifiedFields.basketName || localShot.basketName || '-'} category="basket" onSave={handleFieldChange} />
                        <EditableSelectionRow label="Tamper" field="tamperName" value={modifiedFields.tamperName || localShot.tamperName || '-'} category="tamper" onSave={handleFieldChange} />
                        <div className="flex flex-col border-b border-white/5 py-2.5">
                            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest text-left mb-0.5">TAMPARE (kgf)</span>
                            <div className="w-full">
                                {isLoadingTampers ? (
                                    <div className="w-full text-sm font-bold text-on-surface-variant p-0 italic">Se încarcă...</div>
                                ) : availableTampLevels.length > 0 ? (
                                    <select 
                                        value={modifiedFields.tampLevel || localShot.tampLevel || ''} 
                                        onChange={(e) => handleFieldChange('tampLevel', e.target.value)} 
                                        className="w-full bg-transparent text-sm font-bold text-on-surface outline-none appearance-none text-left cursor-pointer text-ellipsis uppercase p-0"
                                    >
                                        <option value="" disabled className="bg-surface-container text-on-surface-variant">Alege...</option>
                                        {availableTampLevels.map(t => <option key={t.id} value={t.label} className="bg-surface-container text-on-surface uppercase">{t.label}</option>)}
                                    </select>
                                ) : (
                                    <input 
                                        type="text" 
                                        value={modifiedFields.tampLevel || localShot.tampLevel || ''} 
                                        onChange={(e) => handleFieldChange('tampLevel', e.target.value)} 
                                        placeholder="Ex: 15kg" 
                                        className="w-full h-full bg-transparent text-sm font-bold text-on-surface text-left outline-none placeholder:text-on-surface-variant/30 uppercase p-0"
                                    />
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <DetailRow label="Espressor" value={localShot.machineName || 'Nespecificat'} />
                        <DetailRow label="Apă" value={localShot.waterName || 'Nespecificat'} />
                        <DetailRow label="Cafea" value={localShot.beanName || 'Nespecificat'} />
                        {localShot.roaster && <DetailRow label="Prăjitoria" value={localShot.roaster} />}
                        {localShot.roastDate && <DetailRow label="Data prăjirii" value={localShot.roastDate} />}
                        <DetailRow label="Râșniță" value={localShot.grinderName || '-'} />
                        <DetailRow label="Măcinare (Grad)" value={grindDisplay} />
                        <DetailRow label="Sită (Basket)" value={localShot.basketName || '-'} />
                        <DetailRow label="Tamper" value={localShot.tamperName || '-'} />
                        <DetailRow label="Tampare (kgf)" value={localShot.tampLevel || '-'} />
                    </>
                )}
                
                {editable && (
                    <>
                        <EditableDetailRow label="Doză Cafea (g)" field="doseIn" value={modifiedFields.doseIn || localShot.doseIn} onSave={handleFieldChange} />
                        <EditableDetailRow label="Temperatură (°C)" field="temperature" value={modifiedFields.temperature || localShot.temperature} onSave={handleFieldChange} />
                        <DetailRow label="Presiune Maximă (bar)" value={`${(localShot.maxPressure || localShot.pressure).toFixed(1)} bar`} />
                    </>
                )}
                {!editable && (
                    <>
                        <DetailRow label="Doză Cafea (g)" value={`${localShot.doseIn.toFixed(1)} g`} />
                        <DetailRow label="Temperatură (°C)" value={`${localShot.temperature.toFixed(1)} °C`} />
                        <DetailRow label="Presiune Maximă (bar)" value={`${(localShot.maxPressure || localShot.pressure).toFixed(1)} bar`} />
                    </>
                )}
                <DetailRow label="Presiune Medie (bar)" value={localShot.avgPressure !== undefined ? `${localShot.avgPressure.toFixed(1)} bar` : '-'} />
                <DetailRow label="Timp de Pre-extractie (s)" value={times.preinfusionTime !== undefined ? `${times.preinfusionTime.toFixed(1)} s` : '-'} />
                <DetailRow label="Timp de Extractie Efectiva (s)" value={times.effectiveExtractionTime !== undefined ? `${times.effectiveExtractionTime.toFixed(1)} s` : '-'} />
                <DetailRow label="Timp Total de Extractie (s)" value={times.totalExtractionTime !== undefined ? `${times.totalExtractionTime.toFixed(1)} s` : '-'} />
                <DetailRow label="Timp de Extractie Standard (s)" value={times.standardExtractionTime !== undefined ? `${times.standardExtractionTime.toFixed(1)} s` : '-'} />
                <DetailRow label="Cafea Extrasă (g)" value={`${localShot.yieldOut.toFixed(1)} g`} />
                <DetailRow label="Flux de lichid extras (g/s)" value={`${flowRate} g/s`} />
                <DetailRow label="Raport Extracție (g/g)" value={`1:${localShot.doseIn > 0 ? (localShot.yieldOut / localShot.doseIn).toFixed(1) : "0.0"}`} />
            </div>
            {/* Expert Analysis, Observations, Notes */}
            {localShot.structuredAnalysis && (
                <div className="bg-surface-container rounded-2xl p-4 border border-white/5 shadow-md">
                    <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-amber-400" />
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ANALIZĂ EXPERT</span>
                        </div>
                        {localShot.structuredAnalysis.score && (
                            <span className="text-xl font-black text-amber-400 drop-shadow-sm">{localShot.structuredAnalysis.score}</span>
                        )}
                    </div>
                    <p className="text-sm font-medium text-on-surface mb-3">{localShot.structuredAnalysis.diagnosis}</p>
                    {localShot.structuredAnalysis.suggestion && (
                        <p className="text-xs text-on-surface-variant mb-4 leading-relaxed border-t border-white/5 pt-3">{localShot.structuredAnalysis.suggestion}</p>
                    )}
                    <button
                        onClick={() => exportAnalysisToPdf(localShot.structuredAnalysis!, localShot)}
                        className="w-full py-3 bg-amber-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
                    >
                        <DocumentTextIcon className="w-4 h-4" />
                        EXPORT PDF ANALIZĂ
                    </button>
                </div>
            )}
            <div className="bg-surface-container rounded-2xl p-4 border border-white/5 shadow-md">
                <div className="flex items-center gap-2 mb-2">
                    <DocumentTextIcon className="w-4 h-4 text-on-surface-variant" />
                    <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">OBSERVAȚII</label>
                </div>
                <p className="text-sm text-on-surface">{localShot.notes || 'Fără observații.'}</p>
            </div>
            {editable && (
                <div className="bg-surface-container rounded-2xl p-4 border border-white/5 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                        <PencilSquareIcon className="w-4 h-4 text-on-surface-variant" />
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">NOTE POST-EXTRACȚIE</label>
                    </div>
                    <textarea 
                        value={modifiedFields.postExtractionNotes !== undefined ? modifiedFields.postExtractionNotes : localShot.postExtractionNotes || ''}
                        onChange={(e) => handleFieldChange('postExtractionNotes', e.target.value)}
                        className="w-full bg-surface-container-high rounded-xl border border-white/5 p-3 text-sm text-blue-400 outline-none"
                    />
                </div>
            )}
            {!editable && localShot.postExtractionNotes && (
                <div className="bg-surface-container rounded-2xl p-4 border border-white/5 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                        <PencilSquareIcon className="w-4 h-4 text-on-surface-variant" />
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">NOTE POST-EXTRACȚIE</label>
                    </div>
                    <p className="text-sm text-on-surface">{localShot.postExtractionNotes}</p>
                </div>
            )}
        </div>
    );
};
