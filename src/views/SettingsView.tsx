
import React from 'react';
import { ShotData, AppTheme, CustomThemeColors, BeforeInstallPromptEvent } from '../types';
import { EspressorEditor } from '../components/EspressorEditor';
import { CoffeeEditor } from '../components/CoffeeEditor';
import { ListEditor } from '../components/ListEditor';
import { TamperEditor } from '../components/TamperEditor';
import { GrinderEditor } from '../components/GrinderEditor';
import { OtherAccessoriesEditor } from '../components/OtherAccessoriesEditor';
import { BasketEditor } from '../components/BasketEditor';
import { MaintenanceEditor } from '../components/MaintenanceEditor';
import { WaterEditor } from '../components/WaterEditor';
import { THEME_METADATA } from '../constants';
import { useDataManagement } from '../hooks/useDataManagement';
import { useSettingsController } from '../hooks/useSettingsController';

import { 
    TrashIcon, 
    ArrowDownTrayIcon, 
    ArrowUpTrayIcon, 
    TableCellsIcon,
    SwatchIcon,
    PaintBrushIcon,
    HandThumbUpIcon,
    HandThumbDownIcon,
    SparklesIcon,
    DevicePhoneMobileIcon,
    ExclamationTriangleIcon,
    CheckBadgeIcon,
    CloudArrowUpIcon,
    WrenchScrewdriverIcon,
    BoltIcon,
    FunnelIcon
} from '@heroicons/react/24/solid';
import { 
    EspressoMachineIcon, 
    TamperIcon, 
    CoffeeBeansIcon, 
    WaterDropIcon, 
    GrinderIcon,
    AccessoriesIcon 
} from '../components/CustomIcons';
import { SECTION_HEADER_STYLE, getDynamicSectionHeaderStyle } from '../styles/common';

interface SettingsViewProps {
    engineMode: 'expert' | 'manual'; 
    onSetEngineMode: (mode: 'expert' | 'manual') => void;
    machineName: string;
    beanName: string;
    onClearData: () => void; 
    shots: ShotData[];
    onOpenThemeEditor: () => void;
    onOpenThemeSelector: () => void;
    onGenerateRandomTheme: (slot: AppTheme) => void;
    currentCustomizations: Record<string, CustomThemeColors>;
    managerType: 'machine' | 'bean' | 'tamper' | 'grinder' | 'accessory' | 'water' | 'basket' | null;
    onSetManagerType: (type: 'machine' | 'bean' | 'tamper' | 'grinder' | 'accessory' | 'water' | 'basket' | null) => void;
    initialManagerView: 'list' | 'form';
    onNavigate: (tab: 'history' | 'new' | 'maintenance' | 'settings') => void;
    installPrompt: BeforeInstallPromptEvent | null;
    onInstall: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = React.memo((props) => {
    
    const ctrl = useSettingsController();

    // Use Custom Hook for Data Logic
    const { 
        isExporting,
        handleExportExcel, 
        handleBackupLocal, 
        handleRestore,
        handleClearAllData 
    } = useDataManagement(props.shots);

    // --- Sub-Views (Editors) ---
    if (props.managerType === 'machine') return <div className="h-full"><EspressorEditor onClose={() => props.onSetManagerType(null)} initialView={props.initialManagerView} /></div>;
    if (props.managerType === 'bean') return <div className="h-full"><CoffeeEditor onClose={() => props.onSetManagerType(null)} initialView={props.initialManagerView} /></div>;
    if (props.managerType === 'tamper' || ctrl.showTamperEditor) return <TamperEditor onClose={() => { props.onSetManagerType(null); ctrl.setShowTamperEditor(false); }} initialView={props.managerType === 'tamper' ? props.initialManagerView : 'list'} />;
    if (props.managerType === 'grinder') return <GrinderEditor onClose={() => props.onSetManagerType(null)} initialView={props.initialManagerView} />;
    if (props.managerType === 'basket') return <BasketEditor onClose={() => props.onSetManagerType(null)} initialView={props.initialManagerView} />;
    if (props.managerType === 'accessory') return <OtherAccessoriesEditor onClose={() => props.onSetManagerType(null)} initialView={props.initialManagerView} />;
    if (ctrl.showMaintenanceEditor) return <MaintenanceEditor onClose={() => ctrl.setShowMaintenanceEditor(false)} />;
    if (ctrl.showWaterEditor) return <WaterEditor onClose={() => ctrl.setShowWaterEditor(false)} />;
    if (ctrl.editorConfig) return <ListEditor title={ctrl.editorConfig.title} settingKey={ctrl.editorConfig.key} onClose={() => ctrl.setEditorConfig(null)} />;

    // --- STYLES ---
    const BIG_BUTTON_STYLE = "bg-surface-container h-28 rounded-2xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all border border-white/5 shadow-md hover:shadow-lg hover:bg-surface-container-high relative overflow-hidden group";
    const getIconStyle = (colorClass: string) => `w-12 h-12 ${colorClass} group-hover:scale-110 transition-transform drop-shadow-md brightness-110`;
    const BUTTON_TEXT_STYLE = "text-[10px] font-bold text-[var(--color-box-label)] uppercase tracking-widest drop-shadow-sm text-center px-1";
    const FOOTER_TEXT_STYLE = "text-[11.5px] font-bold text-on-surface uppercase tracking-widest drop-shadow-sm text-center";

    const SensoryCategoryBlock = ({ label, posKey, negKey }: { label: string, posKey: string, negKey: string }) => (
        <div className="bg-surface-container rounded-2xl p-4 border border-white/5 space-y-3 shadow-md">
            <div className="text-[10px] font-bold text-[var(--color-box-label)] uppercase tracking-widest text-center w-full drop-shadow-sm">{label}</div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => ctrl.setEditorConfig({ title: `${label} - NEGATIVE`, key: negKey })} className="bg-surface h-16 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 hover:brightness-110 transition-all active:scale-95 group shadow-sm">
                    <HandThumbDownIcon className="w-5 h-5 text-red-400 drop-shadow-sm" />
                    <span className="text-[9px] font-bold text-on-surface-variant group-hover:text-on-surface uppercase tracking-wider">NEGATIVE</span>
                </button>
                <button onClick={() => ctrl.setEditorConfig({ title: `${label} - POZITIVE`, key: posKey })} className="bg-surface h-16 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-1 hover:brightness-110 transition-all active:scale-95 group shadow-sm">
                    <HandThumbUpIcon className="w-5 h-5 text-green-400 drop-shadow-sm" />
                    <span className="text-[9px] font-bold text-on-surface-variant group-hover:text-on-surface uppercase tracking-wider">POZITIVE</span>
                </button>
            </div>
        </div>
    );

    const renderCustomThemeButton = (slot: AppTheme, label: string) => {
        const currentColors = props.currentCustomizations[slot] || THEME_METADATA[slot].defaults;
        return (
            <button onClick={() => props.onGenerateRandomTheme(slot)} className="w-full py-4 bg-surface-container text-on-surface rounded-full flex items-center justify-between px-6 shadow-[0_8px_20px_rgba(0,0,0,0.2)] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-surface-container-high active:scale-[0.98] transition-all border border-white/5 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                <div className="flex items-center gap-3 relative z-10">
                    <SparklesIcon className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300 transition-colors drop-shadow-sm" />
                    <span className="text-xs font-bold uppercase tracking-widest drop-shadow-sm">{label}</span>
                </div>
                <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm relative z-10" style={{ backgroundColor: currentColors.surface }}></div>
            </button>
        );
    };

    return (
        <div className="animate-fade-in pb-20 space-y-6">
            
            {/* 1. SECTION: TEHNICA */}
            <div id="section-tehnica" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>TEHNICĂ</div>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => props.onSetManagerType('machine')} className={BIG_BUTTON_STYLE}><EspressoMachineIcon className={getIconStyle('text-slate-300')} /><span className={BUTTON_TEXT_STYLE}>ESPRESSOR</span></button>
                <button onClick={() => ctrl.setShowTamperEditor(true)} className={BIG_BUTTON_STYLE}><TamperIcon className={getIconStyle('text-red-500')} /><span className={BUTTON_TEXT_STYLE}>TAMPER</span></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => props.onSetManagerType('grinder')} className={BIG_BUTTON_STYLE}><GrinderIcon className={getIconStyle('text-amber-200')} /><span className={BUTTON_TEXT_STYLE}>RÂȘNIȚĂ</span></button>
                <button onClick={() => props.onSetManagerType('basket')} className={BIG_BUTTON_STYLE}><FunnelIcon className={getIconStyle('text-purple-400')} /><span className={BUTTON_TEXT_STYLE}>SITE (BASKETS)</span></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => props.onSetManagerType('accessory')} className={BIG_BUTTON_STYLE}><AccessoriesIcon className={getIconStyle('text-purple-400')} /><span className={BUTTON_TEXT_STYLE}>ALTE ACCESORII</span></button>
                <button onClick={() => ctrl.setShowMaintenanceEditor(true)} className={BIG_BUTTON_STYLE}><WrenchScrewdriverIcon className={getIconStyle('text-teal-400')} /><span className={BUTTON_TEXT_STYLE}>MENTENANȚĂ</span></button>
            </div>

            {/* 2. SECTION: MATERII PRIME */}
            <div id="section-materii-prime" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>MATERII PRIME</div>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => props.onSetManagerType('bean')} className={BIG_BUTTON_STYLE}><CoffeeBeansIcon className={getIconStyle('text-orange-400')} /><span className={BUTTON_TEXT_STYLE}>CAFEA</span></button>
                <button onClick={() => ctrl.setShowWaterEditor(true)} className={BIG_BUTTON_STYLE}><WaterDropIcon className={getIconStyle('text-sky-400')} /><span className={BUTTON_TEXT_STYLE}>APĂ</span></button>
            </div>

            {/* 3. SECTION: DATE */}
            <div id="section-extractii" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>BAZĂ DE DATE</div>
            <div className="grid grid-cols-2 gap-4">
                <button onClick={handleBackupLocal} className={BIG_BUTTON_STYLE}>
                    <ArrowDownTrayIcon className={getIconStyle('text-indigo-400')} />
                    <span className={BUTTON_TEXT_STYLE}>BACKUP LOCAL</span>
                </button>

                <button onClick={handleExportExcel} disabled={isExporting} className={BIG_BUTTON_STYLE}>
                    {isExporting ? <div className="animate-spin w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full"/> : <TableCellsIcon className={getIconStyle('text-emerald-400')} />}
                    <span className={BUTTON_TEXT_STYLE}>{isExporting ? 'SE EXPORTĂ...' : 'EXPORT EXCEL'}</span>
                </button>

                <label className={`${BIG_BUTTON_STYLE} cursor-pointer`}>
                    <ArrowUpTrayIcon className={getIconStyle('text-teal-400')} />
                    <span className={BUTTON_TEXT_STYLE}>RESTAURARE DATE</span>
                    <input type="file" onChange={handleRestore} className="hidden" accept=".json, .txt" />
                </label>
            </div>

            <button onClick={handleClearAllData} className="w-full py-4 bg-red-600 text-white rounded-full flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(220,38,38,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-red-500 active:scale-[0.98] active:shadow-inner transition-all border border-white/10 group mt-2">
                <TrashIcon className="w-5 h-5 text-white drop-shadow-md" /><span className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-sm">RESETARE ISTORIC EXTRACȚII</span>
            </button>

            {/* 4. SECTION: INTERFATA */}
            <div id="section-interfata" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>INTERFAȚĂ</div>
            
            <div className="space-y-3">
                <button onClick={props.onOpenThemeSelector} className="w-full py-4 bg-indigo-600 text-white rounded-full flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(79,70,229,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-indigo-500 active:scale-[0.98] active:shadow-inner transition-all border border-white/10 group"><SwatchIcon className="w-5 h-5 drop-shadow-sm" /><span className="text-xs font-bold uppercase tracking-widest drop-shadow-sm">SCHIMBARE TEMĂ</span></button>
                <button onClick={props.onOpenThemeEditor} className="w-full py-4 bg-indigo-600 text-white rounded-full flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(79,70,229,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-indigo-500 active:scale-[0.98] active:shadow-inner transition-all border border-white/10 group"><PaintBrushIcon className="w-5 h-5 drop-shadow-sm group-hover:rotate-12 transition-transform" /><span className="text-xs font-bold uppercase tracking-widest drop-shadow-sm">PERSONALIZARE TEMĂ</span></button>
                <button onClick={() => { document.cookie.split(";").forEach(c => { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); }); window.location.reload(); }} className="w-full py-4 bg-amber-600 text-white rounded-full flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(217,119,6,0.4)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-amber-500 active:scale-[0.98] active:shadow-inner transition-all border border-white/10 group"><TrashIcon className="w-5 h-5 drop-shadow-sm" /><span className="text-xs font-bold uppercase tracking-widest drop-shadow-sm">ȘTERGE COOKIES</span></button>
                {renderCustomThemeButton('custom-dark', 'GENERARE TEMA CUSTOM DARK')}
                {renderCustomThemeButton('custom-light', 'GENERARE TEMA CUSTOM LIGHT')}
                {renderCustomThemeButton('custom-random', 'GENERARE TEMA CUSTOM RANDOM')}
            </div>

            {/* 5. SECTION: TAGURI */}
            <div id="section-taguri" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>TAGURI</div>
            <div className="space-y-4">
                 <SensoryCategoryBlock label="ASPECT" posKey="tags_aspect_positive" negKey="tags_aspect_negative" />
                 <SensoryCategoryBlock label="AROMĂ" posKey="tags_aroma_positive" negKey="tags_aroma_negative" />
                 <SensoryCategoryBlock label="GUST" posKey="tags_taste_positive" negKey="tags_taste_negative" />
                 <SensoryCategoryBlock label="CORP" posKey="tags_body_positive" negKey="tags_body_negative" />
            </div>


            {/* 7. SECTION: REALIZARE & INSTALL */}
            <div id="section-realizare" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>REALIZARE</div>
            <div className="flex flex-col items-center gap-1 pb-4">
                <span className={FOOTER_TEXT_STYLE}>PHARMABARISTA v7.3</span>
                <span className={FOOTER_TEXT_STYLE}>COPYRIGHT DARIE JOEAN 2026</span>
            </div>

            <div className="h-12"></div>
            
            <div className="w-full mb-6">
                {ctrl.isStandalone ? (
                    <div className="w-full p-4 bg-green-500/20 border border-green-500/30 rounded-2xl flex items-center justify-center gap-3"><CheckBadgeIcon className="w-5 h-5 text-green-500" /><span className="text-[10px] font-bold text-on-surface uppercase tracking-wide">Aplicația este instalată corect</span></div>
                ) : !ctrl.isSecure ? (
                    <div className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col gap-1 items-center text-center">
                        <div className="flex items-center gap-2 text-red-400"><ExclamationTriangleIcon className="w-5 h-5" /><span className="text-xs font-bold uppercase tracking-wide">CONEXIUNE NESECURIZATĂ</span></div>
                        <p className="text-[10px] text-red-300 opacity-80 leading-relaxed">Nu poți instala aplicația de pe link-uri "http://".<br/>Folosește un link "https://" (ex: prin Ngrok sau Vercel).</p>
                    </div>
                ) : props.installPrompt ? (
                    <button onClick={props.onInstall} className="w-full py-4 bg-green-600 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-green-500 hover:shadow-xl active:scale-[0.98] transition-all border border-white/10 group animate-pulse"><DevicePhoneMobileIcon className="w-6 h-6 text-white drop-shadow-md" /><span className="text-xs font-bold text-white uppercase tracking-widest drop-shadow-sm">INSTALEAZĂ APLICAȚIA</span></button>
                ) : (
                    <div className="w-full p-4 bg-surface-container border border-white/5 rounded-2xl text-center"><span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Opțiunea de instalare nu este disponibilă.</span></div>
                )}
            </div>
        </div>
    );
});
