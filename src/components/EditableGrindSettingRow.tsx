import React, { useState, useEffect } from 'react';
import { ShotData } from '../types';
import { PencilIcon } from '@heroicons/react/24/solid';
import { formatGrindSetting } from '../utils/shotUtils';

interface EditableGrindSettingRowProps {
    label: string;
    field: keyof ShotData;
    value: number;
    onSave: (field: keyof ShotData, val: number) => void;
}

export const EditableGrindSettingRow: React.FC<EditableGrindSettingRowProps> = ({ label, field, value, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(formatGrindSetting(value));

    useEffect(() => {
        setTempValue(formatGrindSetting(value));
    }, [value]);

    const parseGrindSetting = (text: string): number => {
        if (text.includes('R+')) {
            const parts = text.split('R+');
            const rotations = parseInt(parts[0]);
            const dial = parseFloat(parts[1]);
            return rotations * 20 + dial;
        }
        return parseFloat(text);
    };

    if (isEditing) {
        return (
            <div className="flex flex-col w-full border-b border-white/5 py-2.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest text-left mb-1">{label}</span>
                    <input 
                        type="text"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="bg-surface-container-high rounded-lg px-2 py-1 text-sm text-on-surface w-full outline-none border border-white/10 mb-2"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex gap-2">
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation();
                                onSave(field, parseGrindSetting(tempValue)); 
                                setIsEditing(false); 
                            }} 
                            className="flex-1 px-3 py-1 bg-on-surface text-surface rounded-lg text-xs font-bold hover:opacity-90 transition-colors"
                        >
                            SALVEAZĂ
                        </button>
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation();
                                setTempValue(formatGrindSetting(value));
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

    return (
        <div 
            onClick={() => setIsEditing(true)} 
            className="flex justify-between items-center border-b border-white/5 py-2.5 cursor-pointer group hover:bg-white/10 -mx-3 px-3 transition-colors rounded-lg"
        >
            <div className="flex flex-col">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest text-left">{label}</span>
                <span className="text-sm font-bold text-on-surface text-left truncate leading-tight">{formatGrindSetting(value)}</span>
            </div>
            <PencilIcon className="w-3 h-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};
