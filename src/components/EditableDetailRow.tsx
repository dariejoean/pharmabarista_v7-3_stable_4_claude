import React, { useState, useEffect } from 'react';
import { ShotData } from '../types';
import { PencilIcon } from '@heroicons/react/24/solid';

// --- Detail Row Helper Component ---
export const DetailRow = ({ label, value, onClick, editable = false, className = "", blueValue = false }: { label: string, value: string, onClick?: (e: React.MouseEvent) => void, editable?: boolean, className?: string, blueValue?: boolean }) => (
    <div 
        onClick={onClick} 
        className={`flex flex-col border-b border-white/5 last:border-0 py-2.5 ${className} ${editable ? 'cursor-pointer group hover:bg-white/10 -mx-3 px-3 transition-colors rounded-lg' : ''}`}
    >
        <div className="flex justify-between items-center mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-widest text-left ${editable ? 'text-on-surface-variant' : 'text-on-surface-variant opacity-60'}`}>{label}</span>
            {editable && <PencilIcon className="w-3 h-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />}
        </div>
        <span className={`text-sm font-bold text-left truncate leading-tight ${blueValue ? 'text-on-surface' : 'text-on-surface'}`}>{value || '-'}</span>
    </div>
);

export const EditableDetailRow = ({ label, field, value, type = 'number', onSave }: { label: string, field: keyof ShotData, value: string | number, type?: 'number' | 'text', onSave: (field: keyof ShotData, val: string | number) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);

    useEffect(() => {
        setTempValue(value);
    }, [value]);

    if (isEditing) {
        return (
            <div className="flex flex-col w-full border-b border-white/5 py-2.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest text-left mb-1">{label}</span>
                    <input 
                        type={type}
                        value={tempValue}
                        onChange={(e) => setTempValue(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                        className="bg-surface-container-high rounded-lg px-2 py-1 text-sm text-on-surface w-full outline-none border border-white/10 mb-2"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation();
                                onSave(field, tempValue); 
                                setIsEditing(false); 
                            }} 
                            className="flex-1 px-3 py-1 bg-on-surface text-surface rounded-lg text-xs font-bold hover:opacity-90 transition-colors"
                        >
                            SALVEAZĂ
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation();
                                setTempValue(value);
                                setIsEditing(false); 
                            }} 
                            className="flex-1 px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
                        >
                            ANULEAZĂ
                        </button>
                    </div>
            </div>
        );
    }
    return <DetailRow label={label} value={String(value)} onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} editable={true} blueValue={false} />;
};
