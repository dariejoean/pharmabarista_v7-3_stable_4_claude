
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Timer } from '../Timer';
import { ArrowPathIcon, CameraIcon, PhotoIcon, TrashIcon, SignalIcon } from '@heroicons/react/24/solid';
import { useEditorStore } from '../../store/editorStore';
import { useBluetoothStore } from '../../services/bluetoothService';
import { LiveExtractionChart } from './LiveExtractionChart';
import { ChartDataPoint } from '../../types';
import { 
    BOX_STYLE, 
    VALUE_WRAPPER_STYLE, 
    NUMERIC_INPUT_STYLE, 
    UNIFIED_VALUE_STYLE,
    MULTILINE_LABEL_STYLE, 
    LABEL_STYLE,
    SECTION_HEADER_STYLE,
    getDynamicSectionHeaderStyle
} from '../../styles/common';

interface ShotExtractionProps {
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onViewImage: (img: string) => void;
}

// Compensează latența de răspuns a cântarului BT față de curgerea reală a lichidului.
// Valoarea de 2s este o estimare conservatoare pentru scântarele Bluetooth comune.
// Modele mai noi (Acaia Lunar, Bookoo) pot necesita 1.5s.
const SCALE_LATENCY_S = 2.0;

export const ShotExtraction: React.FC<ShotExtractionProps> = React.memo((props) => {
    // Store
    const time = useEditorStore(s => s.time);
    const setTime = useEditorStore(s => s.setTime);
    const preinfusionTimeStore = useEditorStore(s => s.preinfusionTime);
    const setPreinfusionTime = useEditorStore(s => s.setPreinfusionTime);
    const setPreinfusionTimeStore = useEditorStore(s => s.setPreinfusionTime);
    const setInfusionTime = useEditorStore(s => s.setInfusionTime);
    const setPostinfusionTime = useEditorStore(s => s.setPostinfusionTime);
    const effectiveExtractionTimeStore = useEditorStore(s => s.effectiveExtractionTime);
    const setEffectiveExtractionTime = useEditorStore(s => s.setEffectiveExtractionTime);
    const setEffectiveExtractionTimeStore = useEditorStore(s => s.setEffectiveExtractionTime);
    const standardExtractionTimeStore = useEditorStore(s => s.standardExtractionTime);
    const setStandardExtractionTime = useEditorStore(s => s.setStandardExtractionTime);
    const setStandardExtractionTimeStore = useEditorStore(s => s.setStandardExtractionTime);
    const setAvgPressureStore = useEditorStore(s => s.setAvgPressure);
    const yieldOut = useEditorStore(s => s.yieldOut);
    const setYieldOut = useEditorStore(s => s.setYieldOut);
    const doseIn = useEditorStore(s => s.doseIn);
    const pressure = useEditorStore(s => s.pressure);
    const maxPressure = useEditorStore(s => s.maxPressure);
    const setPressure = useEditorStore(s => s.setPressure);
    const setMaxPressureStore = useEditorStore(s => s.setMaxPressure);
    const setTimeA = useEditorStore(s => s.setTimeA);
    const setTimeB = useEditorStore(s => s.setTimeB);
    const setTimeC = useEditorStore(s => s.setTimeC);
    const setTimeD = useEditorStore(s => s.setTimeD);
    const setTimeE = useEditorStore(s => s.setTimeE);
    const setTimeF = useEditorStore(s => s.setTimeF);
    const setExtractionProfile = useEditorStore(s => s.setExtractionProfile);
    const isYieldManuallySet = useEditorStore(s => s.isYieldManuallySet);
    const setIsYieldManuallySet = useEditorStore(s => s.setIsYieldManuallySet);
    const images = useEditorStore(s => s.images);
    const thumbnails = useEditorStore(s => s.thumbnails);
    const removeImage = useEditorStore(s => s.removeImage);


    // Bluetooth
    const currentWeight = useBluetoothStore(s => s.currentWeight);
    const currentPressure = useBluetoothStore(s => s.currentPressure);
    const connectedScale = useBluetoothStore(s => s.connectedScale);
    const connectedPressureSensor = useBluetoothStore(s => s.connectedPressureSensor);

    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [smoothedPressureDisplay, setSmoothedPressureDisplay] = useState<number>(0);
    const isExtracting = useEditorStore(s => s.isExtracting);
    const setIsExtracting = useEditorStore(s => s.setIsExtracting);
    const avgPressureStore = useEditorStore(s => s.avgPressure);
    const extractionProfile = useEditorStore(s => s.extractionProfile);

    // Sync chartData with store's extractionProfile for existing shots
    useEffect(() => {
        if (!isExtracting) {
            setChartData(extractionProfile || []);
        }
    }, [extractionProfile, isExtracting]);
    const startTimeRef = useRef<number>(0);
    const flowStartedRef = useRef<boolean>(false);
    const lastWeightRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const lastPressureRef = useRef<number>(0);
    const pressureDroppedRef = useRef<boolean>(false);
    const flowRef = useRef<number>(0);
    const pressureRef = useRef<number>(0);
    const maxPressureRef = useRef<number>(0);
    const pressureSumRef = useRef<number>(0);
    const pressureCountRef = useRef<number>(0);
    
    // Refs for performance optimization
    const intervalRef = useRef<number | null>(null);
    const uiUpdateIntervalRef = useRef<number | null>(null);
    const weightRef = useRef<number>(0);
    const smoothedPressureRef = useRef<number>(0);

    useEffect(() => {
        console.log(`[Extraction] isExtracting changed to: ${isExtracting}`);
    }, [isExtracting]);

    // Polling and UI Update intervals
    useEffect(() => {
        if (isExtracting) {
            useBluetoothStore.getState().addLog('Interval de extracție pornit...');
            console.log('Extraction Interval Started');
            
            // 100ms Polling (fără re-render)
            intervalRef.current = window.setInterval(() => {
                const now = Date.now();
                const elapsed = (now - startTimeRef.current) / 1000;
                
                // Get latest values directly from stores to avoid closure stale state
                const weight = useBluetoothStore.getState().currentWeight;
                const rawPressure = useBluetoothStore.getState().currentPressure;
                
                const dt = elapsed - lastTimeRef.current;
                const dw = weight - lastWeightRef.current;
                
                let rawFlow = 0;
                if (dt > 0) {
                    rawFlow = Math.max(0, dw / dt);
                }
                
                // Exponential Moving Average to smooth the flow and pressure lines
                flowRef.current = flowRef.current * 0.8 + rawFlow * 0.2;
                pressureRef.current = pressureRef.current * 0.7 + rawPressure * 0.3;
                
                smoothedPressureRef.current = parseFloat(pressureRef.current.toFixed(1));
                setSmoothedPressureDisplay(smoothedPressureRef.current);
                
                // Track max pressure
                if (smoothedPressureRef.current > maxPressureRef.current) {
                    maxPressureRef.current = smoothedPressureRef.current;
                    setMaxPressureStore(maxPressureRef.current);
                }

                // Track average pressure
                if (smoothedPressureRef.current > 0.1) {
                    pressureSumRef.current += smoothedPressureRef.current;
                    pressureCountRef.current += 1;
                }
                
                lastWeightRef.current = weight;
                lastTimeRef.current = elapsed;
                weightRef.current = weight;

                // Standard extraction time detection
                const rawPressureDrop = lastPressureRef.current - rawPressure;
                if (!pressureDroppedRef.current && lastPressureRef.current > 4.0 && rawPressureDrop >= 3.0) {
                    setStandardExtractionTimeStore(parseFloat(lastTimeRef.current.toFixed(1)));
                    pressureDroppedRef.current = true;
                }
                lastPressureRef.current = rawPressure; // Stochează raw, nu smoothed

                // Update local chart data
                setChartData(prev => {
                    const newPoint = { 
                        time: parseFloat(elapsed.toFixed(1)), 
                        weight: parseFloat(weight.toFixed(1)),
                        flow: parseFloat(flowRef.current.toFixed(1)),
                        pressure: smoothedPressureRef.current
                    };
                    return [...prev, newPoint];
                });
            }, 100);

            // UI Update (la 500ms)
            uiUpdateIntervalRef.current = window.setInterval(() => {
                setYieldOut(parseFloat(weightRef.current.toFixed(1)));
                setPressure(smoothedPressureRef.current);
            }, 500);
        }
        
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (uiUpdateIntervalRef.current) clearInterval(uiUpdateIntervalRef.current);
            
            if (isExtracting) {
                console.log('Extraction Interval Stopped');
                useBluetoothStore.getState().addLog('Interval de extracție oprit.');
            }
        };
    }, [isExtracting]);

    // Calculated Metrics
    // Flow = Yield / Time (g/s)
    const flowRate = (time > 0 && yieldOut > 0) ? (yieldOut / time).toFixed(1) : "0.0";
    
    // Ratio = 1 : (Yield / Dose)
    const rawRatio = (doseIn > 0 && yieldOut > 0) ? (yieldOut / doseIn) : 0;
    const ratioDisplay = rawRatio > 0 ? `1:${parseFloat(rawRatio.toFixed(2))}` : "1:0";
    
    // Point B: Pressure starts increasing (> 0.1)
    const pointB = useMemo(() => {
        return chartData.find(p => p.pressure > 0.1);
    }, [chartData]);

    // Point C: Weight starts increasing (> 0.1)
    const pointC = useMemo(() => {
        return chartData.find(p => p.weight > 0.1);
    }, [chartData]);

    // Point D: Pressure drops back to 0 (last point with pressure > 0.1)
    const pointD = useMemo(() => {
        if (!pointB) return null;
        const reversed = [...chartData].reverse();
        return reversed.find(p => p.pressure > 0.1);
    }, [chartData, pointB]);

    // Point E: Weight stabilizes (no increase for at least 2 seconds) OR timer stop
    const pointE = useMemo(() => {
        if (chartData.length < 2) return null;
        
        // Find stabilization: no increase (> 0.05g) for at least 2 seconds
        for (let i = 0; i < chartData.length; i++) {
            const currentPoint = chartData[i];
            // We only look for stabilization AFTER Point C (when weight started increasing)
            if (pointC && currentPoint.time < pointC.time) continue;

            const futurePoints = chartData.slice(i + 1).filter(p => p.time <= currentPoint.time + 2);
            
            // If we have at least 2 seconds of data ahead in the recorded chart
            if (futurePoints.length > 0 && futurePoints[futurePoints.length - 1].time >= currentPoint.time + 1.9) {
                const maxWeightInFuture = Math.max(...futurePoints.map(p => p.weight));
                // If weight didn't grow by more than 0.05g in these 2 seconds
                if (maxWeightInFuture <= currentPoint.weight + 0.05) {
                    return currentPoint;
                }
            }
        }
        
        // If no stabilization found yet, use the last point (timer stop)
        return chartData[chartData.length - 1];
    }, [chartData, pointC]);

    // Derived Metrics based on Points A, B, C, D, E
    // Preinfusion: A to C
    const preinfusionTime = pointC ? pointC.time : 0;
    
    // Infusion: C to D
    const infusionTime = (pointC && pointD && pointD.time > pointC.time) ? (pointD.time - pointC.time) : 0;
    
    // Postinfusion: D to E
    const postinfusionTime = (pointD && pointE && pointE.time > pointD.time) ? (pointE.time - pointD.time) : 0;
    
    // Effective Extraction: C to E
    const effectiveExtractionTime = (pointC && pointE && pointE.time > pointC.time) ? (pointE.time - pointC.time) : 0;
    
    // Total Extraction: A to E
    const totalExtractionTimeCalculated = pointE ? pointE.time : 0;

    // Average Pressure from B to D
    const avgPressureCalculated = useMemo(() => {
        if (!pointB || !pointD) return 0;
        const pointsInRange = chartData.filter(p => p.time >= pointB.time && p.time <= pointD.time);
        if (pointsInRange.length === 0) return 0;
        const sum = pointsInRange.reduce((acc, p) => acc + p.pressure, 0);
        return parseFloat((sum / pointsInRange.length).toFixed(1));
    }, [chartData, pointB, pointD]);

    return (
        <div className="flex flex-col gap-4">
            <div id="section-new-extraction" className={`${SECTION_HEADER_STYLE} scroll-mt-24`} style={getDynamicSectionHeaderStyle()}>EXTRACȚIE</div>
            
            <Timer 
                seconds={time}
                isActive={isExtracting}
                onStart={() => {
                    setIsExtracting(true);
                    startTimeRef.current = Date.now();
                    flowStartedRef.current = false;
                    lastWeightRef.current = 0;
                    lastTimeRef.current = 0;
                    flowRef.current = 0;
                    pressureRef.current = 0;
                    maxPressureRef.current = 0;
                    pressureSumRef.current = 0;
                    pressureCountRef.current = 0;
                    lastPressureRef.current = 0;
                    pressureDroppedRef.current = false;
                    setAvgPressureStore(0);
                    setChartData([]);
                }}
                onStop={(t) => {
                    setIsExtracting(false);
                    // Reset refs to prevent stale updates
                    flowStartedRef.current = false;
                    lastWeightRef.current = 0;
                    lastTimeRef.current = 0;
                    flowRef.current = 0;
                    pressureRef.current = 0;
                    // maxPressureRef.current = 0; // DO NOT RESET MAX PRESSURE
                    pressureSumRef.current = 0;
                    pressureCountRef.current = 0;
                    lastPressureRef.current = 0;
                    pressureDroppedRef.current = false;

                    // Save time points
                    setTimeA(0);
                    setTimeB(pointB ? pointB.time : 0);
                    setTimeC(pointC ? pointC.time : 0);
                    setTimeD(pointD ? pointD.time : 0);
                    setTimeE(pointE ? pointE.time : 0);
                    setTimeF(t);

                    // Use the timer value as the primary source for total time (TTC)
                    // TTE is calculated based on flow start/stop points (Point C to E)
                    const adjustedTime = Math.max(0, t - SCALE_LATENCY_S);
                    setTime(adjustedTime);
                    setPreinfusionTime(Math.max(0, preinfusionTime - SCALE_LATENCY_S));
                    setEffectiveExtractionTime(Math.max(0, effectiveExtractionTime - SCALE_LATENCY_S));
                    setInfusionTime(infusionTime);
                    setPostinfusionTime(postinfusionTime);
                    
                    // CALCULATE TSE A POSTERIORI
                    // Find point where pressure drops by >= 3 bar/s
                    let tse = adjustedTime; // Fallback
                    for (let i = chartData.length - 1; i > 0; i--) {
                        const current = chartData[i];
                        const prev = chartData[i - 1];
                        const dt = current.time - prev.time;
                        if (dt > 0) {
                            const dp = prev.pressure - current.pressure;
                            if (dp / dt >= 3.0) {
                                tse = current.time;
                                break;
                            }
                        }
                    }
                    setStandardExtractionTime(parseFloat(tse.toFixed(1)));
                    
                    setAvgPressureStore(avgPressureCalculated);
                    setExtractionProfile(chartData.map(p => ({...p, time: Math.max(0, p.time - SCALE_LATENCY_S)})));
                }} 
                onTick={(t) => {
                    // Update metrics in real-time (no offset)
                    setTime(Math.max(0, t));
                    setPreinfusionTimeStore(Math.max(0, preinfusionTime));
                    setEffectiveExtractionTimeStore(Math.max(0, effectiveExtractionTime));
                    setAvgPressureStore(avgPressureCalculated);
                }}
                onReset={() => {
                    setIsExtracting(false);
                    flowStartedRef.current = false;
                    setChartData([]);
                    setExtractionProfile([]);
                    setYieldOut(0);
                    setTime(0);
                    setPreinfusionTimeStore(0);
                    setEffectiveExtractionTimeStore(0);
                    setStandardExtractionTimeStore(0);
                    setPressure(0);
                    lastWeightRef.current = 0;
                    lastTimeRef.current = 0;
                    lastPressureRef.current = 0;
                    pressureDroppedRef.current = false;
                    flowRef.current = 0;
                    pressureRef.current = 0;
                    maxPressureRef.current = 0;
                    pressureSumRef.current = 0;
                    pressureCountRef.current = 0;
                    setAvgPressureStore(0);
                }}
            />

            {/* EXPERIMENTAL: Unified Extraction Analysis Table */}
            <div className={`${BOX_STYLE} w-full !h-auto`}>
                <label className={LABEL_STYLE}>Analiză extracție</label>
                <div className="flex flex-col gap-3 mt-2">
                    {/* Presiuni */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-[var(--color-section-header)] uppercase border-b border-on-surface inline-block mb-1">Presiuni extractie</span>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">{isExtracting ? 'Presiune curentă (bar)' : 'Presiune finală (bar)'}</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{isExtracting ? currentPressure.toFixed(1) : (chartData.length > 0 ? chartData[chartData.length - 1].pressure.toFixed(1) : '0.0')}</span>
                        </div>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Presiune medie (bar)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{avgPressureStore.toFixed(1)}</span>
                        </div>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Presiune maximă (bar)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{maxPressure.toFixed(1)}</span>
                        </div>
                    </div>

                    {/* Timpi */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-[var(--color-section-header)] uppercase border-b border-on-surface inline-block mb-1">Timpi extractie</span>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Timp de pre-extractie (s)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{preinfusionTimeStore.toFixed(1)}</span>
                        </div>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Timp de extractie efectiva (s)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{effectiveExtractionTimeStore.toFixed(1)}</span>
                        </div>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Timp standard de extractie (s)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{standardExtractionTimeStore.toFixed(1)}</span>
                        </div>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Timp total de extractie (s)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{time.toFixed(1)}</span>
                        </div>
                    </div>

                    {/* Rezultate */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold text-[var(--color-section-header)] uppercase border-b border-on-surface inline-block mb-1">Rezultate extractie</span>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Cafea extrasa (g)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{yieldOut.toFixed(1)}</span>
                        </div>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Raport extractie (g/g)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{ratioDisplay}</span>
                        </div>
                        <div className="flex w-full items-center">
                            <span className="w-[90%] text-[11px] font-bold text-on-surface-variant uppercase">Flux lichid extras (g/s)</span>
                            <span className="w-[10%] text-[11px] font-black text-on-surface text-right">{flowRate}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bluetooth Live Status Bar */}
            {(connectedScale || connectedPressureSensor) && (
                <div className="flex gap-2 p-2 bg-surface-container-highest dark:bg-surface-container rounded-xl border border-on-surface/40 shadow-md animate-pulse">
                    {connectedScale && (
                        <div className="flex-1 flex items-center justify-center gap-2 text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">
                            <SignalIcon className="w-3 h-3" />
                            Cântar: {currentWeight.toFixed(2)}g
                        </div>
                    )}
                    {connectedPressureSensor && (
                        <div className="flex-1 flex items-center justify-center gap-2 text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest border-l border-on-surface/40">
                            <SignalIcon className="w-3 h-3" />
                            Presiune: {currentPressure.toFixed(1)} bar
                        </div>
                    )}
                </div>
            )}
            
            <LiveExtractionChart data={chartData} />

            {/* LIVE PRESSURE ROW: CURENTĂ & MEDIE */}
            <div className="grid grid-cols-2 gap-4">
                <div className={BOX_STYLE}>
                   <label className={MULTILINE_LABEL_STYLE}>PRESIUNE <span className="block leading-tight">CURENTĂ</span> <span className="block leading-tight">(bar)</span></label>
                   <div className={VALUE_WRAPPER_STYLE}>
                       <div className="flex items-center justify-center w-full">
                           <span className={`${UNIFIED_VALUE_STYLE} ${smoothedPressureDisplay >= 0.1 ? 'text-blue-400' : 'text-on-surface'}`}>
                               {smoothedPressureDisplay.toFixed(1)}
                           </span>
                       </div>
                   </div>
                </div>
                <div className={BOX_STYLE}>
                   <label className={MULTILINE_LABEL_STYLE}>PRESIUNE <span className="block leading-tight">MEDIE</span> <span className="block leading-tight">(bar)</span></label>
                   <div className={VALUE_WRAPPER_STYLE}>
                       <div className="flex items-center justify-center w-full">
                           <span className={UNIFIED_VALUE_STYLE}>{avgPressureStore.toFixed(1)}</span>
                       </div>
                   </div>
                </div>
            </div>

            {/* MAX PRESSURE ROW (FULL WIDTH) */}
            <div className={`${BOX_STYLE} w-full`}>
               <label className={MULTILINE_LABEL_STYLE}>PRESIUNE <span className="block leading-tight">MAXIMĂ</span> <span className="block leading-tight">(bar)</span></label>
               <div className={VALUE_WRAPPER_STYLE}>
                   <div className="flex items-center justify-center w-full">
                       <span className={UNIFIED_VALUE_STYLE}>{pressure.toFixed(1)}</span>
                   </div>
               </div>
            </div>

            {/* PRE-EXTRACTION & EFFECTIVE EXTRACTION ROW */}
            <div className="grid grid-cols-2 gap-4">
                <div className={BOX_STYLE}>
                   <label className={MULTILINE_LABEL_STYLE}>TIMP DE <span className="block leading-tight">PRE-EXTRACȚIE (s)</span></label>
                   <div className={VALUE_WRAPPER_STYLE}><div className="flex items-center justify-center w-full"><input type="number" step="0.1" value={preinfusionTimeStore.toFixed(1)} onChange={e => setPreinfusionTimeStore(parseFloat(e.target.value))} className={`${NUMERIC_INPUT_STYLE}`} /></div></div>
                </div>
                <div className={BOX_STYLE}>
                   <label className={MULTILINE_LABEL_STYLE}>TIMP DE EXTRACȚIE <span className="block leading-tight">EFECTIVĂ (s)</span></label>
                   <div className={VALUE_WRAPPER_STYLE}><div className="flex items-center justify-center w-full"><input type="number" step="0.1" value={effectiveExtractionTimeStore.toFixed(1)} onChange={e => setEffectiveExtractionTimeStore(parseFloat(e.target.value))} className={`${NUMERIC_INPUT_STYLE}`} /></div></div>
                </div>
            </div>

            {/* STANDARD & TOTAL EXTRACTION ROW */}
            <div className="grid grid-cols-2 gap-4">
                <div className={BOX_STYLE}>
                   <label className={MULTILINE_LABEL_STYLE}>TIMP STANDARD DE <span className="block leading-tight">EXTRACȚIE (s)</span></label>
                   <div className={VALUE_WRAPPER_STYLE}><div className="flex items-center justify-center w-full"><input type="number" step="0.1" value={standardExtractionTimeStore.toFixed(1)} onChange={e => setStandardExtractionTimeStore(parseFloat(e.target.value))} className={`${NUMERIC_INPUT_STYLE}`} /></div></div>
                </div>
                <div className={BOX_STYLE}>
                   <label className={MULTILINE_LABEL_STYLE}>TIMP TOTAL DE <span className="block leading-tight">EXTRACȚIE (s)</span></label>
                   <div className={VALUE_WRAPPER_STYLE}><div className="flex items-center justify-center w-full"><input type="number" step="0.1" value={time.toFixed(1)} onChange={e => setTime(parseFloat(e.target.value))} className={`${NUMERIC_INPUT_STYLE}`} /></div></div>
                </div>
            </div>

            {/* YIELD ROW (FULL WIDTH) */}
            <div className={`${BOX_STYLE} w-full ${isYieldManuallySet ? 'ring-1 ring-crema-500' : ''}`}>
               {isYieldManuallySet && <button onClick={() => { setIsYieldManuallySet(false); setYieldOut(parseFloat((doseIn * 2).toFixed(1))); }} className="absolute top-2 right-2 text-crema-500 hover:scale-110 transition-transform"><ArrowPathIcon className="w-4 h-4 drop-shadow-sm" /></button>}
               <label className={MULTILINE_LABEL_STYLE}>CAFEA EXTRASĂ <span className="block leading-tight">(g)</span></label>
               <div className={VALUE_WRAPPER_STYLE}><div className="flex items-center justify-center w-full"><input type="number" step="0.1" value={yieldOut.toFixed(1)} onChange={e => { setYieldOut(parseFloat(e.target.value)); setIsYieldManuallySet(true); }} className={`${NUMERIC_INPUT_STYLE}`} /></div></div>
            </div>

            {/* RATIO & FLOW ROW */}
            <div className="grid grid-cols-2 gap-4">
                <div className={BOX_STYLE}>
                   <label className={MULTILINE_LABEL_STYLE}>RAPORT <span className="block leading-tight">EXTRACȚIE</span> <span className="block leading-tight">(g/g)</span></label>
                   <div className={VALUE_WRAPPER_STYLE}>
                       <div className="flex items-center justify-center w-full">
                           <span className={UNIFIED_VALUE_STYLE}>{ratioDisplay}</span>
                       </div>
                   </div>
                </div>
                <div className={BOX_STYLE}>
                   <label className={MULTILINE_LABEL_STYLE}>
                       Flux lichid 
                       <span className="block leading-tight">extras</span> 
                       <span className="block leading-tight">(g/s)</span>
                   </label>
                   <div className={VALUE_WRAPPER_STYLE}>
                       <div className="flex items-center justify-center w-full">
                           <span className={UNIFIED_VALUE_STYLE}>{flowRate}</span>
                       </div>
                   </div>
                </div>
            </div>

            {/* FOTO */}
            <div className={`${BOX_STYLE} h-auto min-h-[140px] group hover:bg-surface-container/80 pb-6`}>
               <span className={LABEL_STYLE}>FOTOGRAFII SHOT</span>
               
               {/* Images Display */}
               <div className="flex-1 w-full flex items-center justify-center gap-3 pt-2 overflow-x-auto no-scrollbar mb-4">
                 {images.length === 0 ? <CameraIcon className="w-8 h-8 text-on-surface-variant/30 drop-shadow-sm" /> : (
                    images.map((img, idx) => (
                    <div key={idx} onClick={(e) => { e.preventDefault(); props.onViewImage(images[idx]); }} className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden shadow-md border border-white/10">
                        <img src={thumbnails[idx] || img} className="w-full h-full object-cover" alt={`Shot ${idx}`} />
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImage(idx); }} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4 text-white" /></button>
                    </div>
                    ))
                 )}
               </div>

               {/* Split Action Buttons using LABELS for native trigger */}
               {images.length < 5 && (
                   <div className="flex gap-3 justify-center">
                        {/* GALLERY BUTTON - LEFT */}
                        <label className="flex items-center justify-center gap-2 px-6 py-4 bg-surface-container-high hover:bg-blue-500 hover:text-white text-on-surface rounded-2xl border border-white/10 shadow-md active:scale-95 transition-all cursor-pointer flex-1">
                            <PhotoIcon className="w-8 h-8" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Galerie</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                multiple 
                                className="hidden" 
                                onChange={props.handleImageUpload} 
                            />
                        </label>

                        {/* CAMERA BUTTON - RIGHT */}
                        <label className="flex items-center justify-center gap-2 px-6 py-4 bg-surface-container-high hover:bg-crema-500 hover:text-coffee-900 text-on-surface rounded-2xl border border-white/10 shadow-md active:scale-95 transition-all cursor-pointer flex-1">
                            <CameraIcon className="w-8 h-8" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Cameră</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                className="hidden" 
                                onChange={props.handleImageUpload} 
                            />
                        </label>
                   </div>
               )}
            </div>
        </div>
    );
});
