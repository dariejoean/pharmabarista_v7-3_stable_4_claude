
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { saveShot, getAllSettings, saveSettings, getSetting } from '../services/db';
import { evaluateShotLocally } from '../services/expertSystem';
import { createThumbnail } from '../utils/imageUtils';
import { ShotData, ExpertAnalysisResult, ProductItem, ListItem } from '../types';
import { useEditorStore } from '../store/editorStore';
import { formatGrindSetting } from '../utils/shotUtils';

import { useIsMounted } from './useIsMounted';

export const useShotEditor = (
    savedMachines: ProductItem[], 
    savedBeans: ProductItem[],
    tampersList: ListItem[],
    engineMode: 'expert' | 'manual'
) => {
    // Access State via Store
    const store = useEditorStore();

    // Local UI State (Not persisted in store)
    const [loading, setLoading] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [expertResult, setExpertResult] = useState<ExpertAnalysisResult | null>(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    
    // Grinders & Baskets list (loaded from settings)
    const [savedGrinders, setSavedGrinders] = useState<ListItem[]>([]);
    const [savedBaskets, setSavedBaskets] = useState<ListItem[]>([]);

    const isMounted = useIsMounted();
    const hasLoadedRef = useRef(false);
    const lastSavedRef = useRef<Record<string, unknown>>({});

    // 1. LOAD DEFAULTS & LISTS INTO STORE (Once)
    useEffect(() => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        const loadDefaults = async () => {
            const settings = await getAllSettings();
            
            // Fetch grinders
            const grindersData = await getSetting('grinders_list');
            if (isMounted.current && Array.isArray(grindersData)) {
                setSavedGrinders(grindersData);
            }
            
            // Fetch baskets
            const basketsData = await getSetting('baskets_list');
            if (isMounted.current && Array.isArray(basketsData)) {
                setSavedBaskets(basketsData);
            }

            if (!isMounted.current) return;

            if (typeof settings.defaultMachine === 'string') store.setMachineName(settings.defaultMachine);
            if (typeof settings.defaultBean === 'string') store.setBeanName(settings.defaultBean);
            if (typeof settings.defaultWater === 'string') store.setWaterName(settings.defaultWater);
            
            // Load Default Grinder
            if (typeof settings.defaultGrinder === 'string') store.setGrinderName(settings.defaultGrinder);
            
            // Load Default Basket
            if (typeof settings.defaultBasket === 'string') store.setBasketName(settings.defaultBasket);
            
            if (settings.lastTampLevel && typeof settings.lastTampLevel === 'string') store.setTampLevel(settings.lastTampLevel);
            if (settings.lastTamper && typeof settings.lastTamper === 'string') store.setTamperName(settings.lastTamper);
            if (typeof settings.lastGrindSetting === 'number') store.setGrindSetting(settings.lastGrindSetting);
            if (typeof settings.lastTemperature === 'number') store.setTemperature(settings.lastTemperature);
            
            // NEW: Load persisted values for Shot Extraction parameters
            if (typeof settings.lastDoseIn === 'number') store.setDoseIn(settings.lastDoseIn);
            if (typeof settings.lastYieldOut === 'number') store.setYieldOut(settings.lastYieldOut);
            if (typeof settings.lastPressure === 'number') store.setPressure(settings.lastPressure);
            if (typeof settings.lastFlowControlSetting === 'number') store.setFlowControlSetting(settings.lastFlowControlSetting);
            if (typeof settings.lastTime === 'number') store.setTime(settings.lastTime);
            if (typeof settings.lastGrindScaleType === 'string') store.setGrindScaleType(settings.lastGrindScaleType as any);
            
            // Restore Manual Yield Toggle State
            if (typeof settings.isYieldManuallySet === 'boolean') store.setIsYieldManuallySet(settings.isYieldManuallySet);
            
            // Initialize lastSavedRef with loaded values
            lastSavedRef.current = {
                defaultMachine: settings.defaultMachine,
                defaultBean: settings.defaultBean,
                defaultWater: settings.defaultWater,
                defaultGrinder: settings.defaultGrinder,
                defaultBasket: settings.defaultBasket,
                lastTampLevel: settings.lastTampLevel,
                lastTamper: settings.lastTamper,
                lastGrindSetting: settings.lastGrindSetting,
                lastTemperature: settings.lastTemperature,
                lastDoseIn: settings.lastDoseIn,
                lastYieldOut: settings.lastYieldOut,
                lastPressure: settings.lastPressure,
                lastFlowControlSetting: settings.lastFlowControlSetting,
                lastTime: settings.lastTime,
                lastGrindScaleType: settings.lastGrindScaleType,
                isYieldManuallySet: settings.isYieldManuallySet
            };

            setSettingsLoaded(true);
        };
        loadDefaults();
    }, []);

    // 2. AUTO-SAVE DEFAULTS (Sync Store to DB) - Consolidated for performance
    useEffect(() => {
        if (!settingsLoaded) return;
        
        const syncSettings = async () => {
            const settingsToSave = [
                { key: 'defaultMachine', value: store.machineName },
                { key: 'defaultBean', value: store.beanName },
                { key: 'defaultWater', value: store.waterName },
                { key: 'defaultGrinder', value: store.grinderName },
                { key: 'defaultBasket', value: store.basketName },
                { key: 'lastTampLevel', value: store.tampLevel },
                { key: 'lastTamper', value: store.tamperName },
                { key: 'lastGrindSetting', value: store.grindSetting },
                { key: 'lastTemperature', value: store.temperature },
                { key: 'lastDoseIn', value: store.doseIn },
                { key: 'lastYieldOut', value: store.yieldOut },
                { key: 'lastPressure', value: store.pressure },
                { key: 'lastFlowControlSetting', value: store.flowControlSetting },
                { key: 'lastTime', value: store.time },
                { key: 'lastGrindScaleType', value: store.grindScaleType },
                { key: 'isYieldManuallySet', value: store.isYieldManuallySet }
            ];
            
            // Dirty tracking: save only changed settings
            const changedSettings = settingsToSave.filter(s =>
                s.value !== undefined && s.value !== '' && s.value !== lastSavedRef.current[s.key]
            );

            if (changedSettings.length > 0) {
                await saveSettings(changedSettings);
                changedSettings.forEach(s => { lastSavedRef.current[s.key] = s.value; });
            }
        };
        
        // Debounce sync slightly to avoid excessive DB writes during rapid changes
        const timer = setTimeout(syncSettings, 1000);
        return () => clearTimeout(timer);
    }, [
        settingsLoaded, 
        store.machineName, store.beanName, store.waterName, store.grinderName, store.basketName,
        store.tampLevel, store.tamperName, store.grindSetting, store.temperature,
        store.doseIn, store.yieldOut, store.pressure, store.flowControlSetting, store.time, store.grindScaleType, store.isYieldManuallySet
    ]);

    // 3. LOGIC HANDLERS (Business Logic)

    // Ensure valid selections
    const uniqueMachines = useMemo(() => savedMachines.map(m => m.name).sort(), [savedMachines]);
    const uniqueBeans = useMemo(() => savedBeans.map(b => b.name).sort(), [savedBeans]);
    
    useEffect(() => { 
        if (uniqueMachines.length > 0 && !uniqueMachines.includes(store.machineName)) store.setMachineName(uniqueMachines[0]); 
    }, [uniqueMachines, store.machineName, store]);
    
    useEffect(() => { 
        if (uniqueBeans.length > 0 && !uniqueBeans.includes(store.beanName)) store.setBeanName(uniqueBeans[0]); 
    }, [uniqueBeans, store.beanName, store]);

    // Image Upload Logic - Keeps logic here but updates Store
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const remainingSlots = 5 - store.images.length;
            if (remainingSlots <= 0) return;
            
            const filesToProcess = Array.from(files).slice(0, remainingSlots) as File[];

            try {
                for (const file of filesToProcess) {
                    const reader = new FileReader();
                    await new Promise<void>((resolve) => {
                        reader.onloadend = async () => {
                            if (reader.result) {
                                const fullRes = reader.result as string;
                                const optimizedFull = await createThumbnail(fullRes, 600, 0.7);
                                const thumb = await createThumbnail(fullRes, 180, 0.6);
                                store.addImage(optimizedFull, thumb);
                            }
                            resolve();
                        };
                        reader.readAsDataURL(file);
                    });
                }
            } catch (err) { console.error("Image upload processing failed", err); }
            e.target.value = '';
        }
    };

    // SAVE & ANALYZE ACTION
    const handleSaveAndAnalyze = async (extraData?: Partial<ShotData>, onSuccess?: (shot: ShotData) => void) => {
        setErrorMsg(''); 
        setLoading(true); 
        setExpertResult(null);
        
        const shotId = crypto.randomUUID();
        const selectedMachine = savedMachines.find(m => m.name === store.machineName);
        const selectedBean = savedBeans.find(b => b.name === store.beanName);

        // Construct shot from STORE state
        const currentShot: ShotData = { 
            id: shotId, 
            date: new Date().toISOString(), 
            machineName: store.machineName, 
            beanName: store.beanName, 
            roaster: selectedBean?.roaster,
            roastDate: selectedBean?.roastDate,
            waterName: store.waterName,
            grinderName: store.grinderName,
            basketName: store.basketName,
            tampLevel: store.tampLevel,
            tamperName: store.tamperName,
            doseIn: store.doseIn, 
            yieldOut: store.yieldOut, 
            time: store.time, 
            timeA: store.timeA,
            timeB: store.timeB,
            timeC: store.timeC,
            timeD: store.timeD,
            timeE: store.timeE,
            timeF: store.timeF,
            preinfusionTime: store.preinfusionTime,
            infusionTime: store.infusionTime,
            postinfusionTime: store.postinfusionTime,
            effectiveExtractionTime: store.effectiveExtractionTime,
            temperature: store.temperature, 
            pressure: store.pressure, 
            avgPressure: store.avgPressure,
            maxPressure: store.maxPressure,
            flowControlSetting: store.flowControlSetting,
            otherAccessories: store.otherAccessories,
            grindSetting: store.grindSetting,
            grindSettingText: formatGrindSetting(store.grindSetting),
            grindScaleType: store.grindScaleType, 
            extractionProfile: store.extractionProfile,
            tags: store.tags, 
            ratingAspect: store.ratingAspect, 
            ratingAroma: store.ratingAroma, 
            ratingTaste: store.ratingTaste, 
            ratingBody: store.ratingBody, 
            ratingOverall: store.ratingOverall, 
            notes: store.notes, 
            images: store.images, 
            thumbnails: store.thumbnails,
            tasteConclusion: store.tasteConclusion,
            ...extraData 
        };

        try {
            let result: ExpertAnalysisResult | string;

                            if (engineMode === 'expert') {
                                                    // Expert mode: call Gemini AI via secure Vercel serverless proxy
                                                    const geminiResponse = await fetch('/api/gemini', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ ...currentShot, images: undefined, thumbnails: undefined })
                                                        });
                                                    if (!geminiResponse.ok) {
                                                                                const errData = await geminiResponse.json().catch(() => ({}));
                                                                                throw new Error(errData?.diagnosis || `Eroare Gemini API: HTTP ${geminiResponse.status}`);
                                                    }
                                                    result = await geminiResponse.json();
                            } else {
                                                    // Manual mode: local deterministic Expert System (offline, instant)
                                                    result = evaluateShotLocally(currentShot);
                            }
            if (!isMounted.current) return;
            
            const finalShot = { ...currentShot };
            
            setExpertResult(result); 
            finalShot.structuredAnalysis = result; 
            finalShot.expertAdvice = result.suggestion;
            await saveShot(finalShot); 
            if (onSuccess) onSuccess(finalShot);
            store.setIsExtracting(false);
            store.resetForm(false);

        } catch (e) { 
            if (isMounted.current) { 
                const msg = e instanceof Error ? e.message : "Eroare neașteptată la salvare.";                setErrorMsg(msg); 
                console.error(e); 
            } 
        } finally { 
            if (isMounted.current) setLoading(false); 
        }
    };

    return {
        // Expose logic state
        loading, errorMsg, expertResult,
        
        // Computed
        uniqueMachines,
        uniqueBeans,
        savedGrinders,
        savedBaskets,

        // Actions
        handleImageUpload,
        resetForm: store.resetForm,
        handleSaveAndAnalyze,
        applySuggestion: store.applySuggestion
    };
};
