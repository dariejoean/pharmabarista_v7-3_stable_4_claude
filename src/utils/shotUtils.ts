import { ChartDataPoint, ShotData } from "../types";

export function formatGrindSetting(val: number): string {
    return `${Math.floor(val / 20)}R+${(val % 20).toFixed(2)}`;
}

/**
 * Reconstructs extraction phase times from the extraction profile if they are missing.
 */
export function getReconstructedTimes(shot: ShotData, forceRecalculate: boolean = false) {
    const profile = shot.extractionProfile;
    
    // If we already have the values and not forcing recalculation, return them
    if (!forceRecalculate && shot.preinfusionTime !== undefined && shot.effectiveExtractionTime !== undefined && shot.standardExtractionTime !== undefined && shot.standardExtractionTime > 0) {
        return {
            preinfusionTime: shot.preinfusionTime,
            effectiveExtractionTime: shot.effectiveExtractionTime,
            totalExtractionTime: (shot.preinfusionTime + shot.effectiveExtractionTime),
            standardExtractionTime: shot.standardExtractionTime
        };
    }

    // Fallback: calculate from profile
    if (!profile || profile.length === 0) {
        return {
            preinfusionTime: shot.preinfusionTime || 0,
            effectiveExtractionTime: shot.effectiveExtractionTime || 0,
            totalExtractionTime: (shot.preinfusionTime || 0) + (shot.effectiveExtractionTime || 0),
            standardExtractionTime: shot.standardExtractionTime || 0
        };
    }

    let tpe = 0; // Time from start until flow start
    let tee = 0; // Time from flow start until flow stop
    let tstd = 0; // Time from start until pressure drop
    let hasFlowStarted = false;
    let flowStartTime = 0;
    const profileStart = profile[0]?.time || 0;

    for (let i = 0; i < profile.length; i++) {
        const p = profile[i];
        
        // Flow start: weight increases significantly (e.g., > 0.1g)
        if (!hasFlowStarted && p.weight > 0.1) {
            hasFlowStarted = true;
            flowStartTime = p.time;
            tpe = parseFloat((flowStartTime - profileStart).toFixed(1)); // Durată corectă
        }

        if (hasFlowStarted) {
            // Flow is active if weight is > 0.1g
            if (p.weight > 0.1) {
                tee = p.time - flowStartTime;
            }
        }
    }
    
    // Pressure drop detection (last significant drop >= 3 bar/s)
    tstd = profile[profile.length - 1].time; // Fallback to last time point
    
    for (let i = profile.length - 1; i > 0; i--) {
        const current = profile[i];
        const prev = profile[i - 1];
        const dt = current.time - prev.time;
        
        if (dt > 0) {
            const dp = prev.pressure - current.pressure;
            if (dp / dt >= 3.0) {
                tstd = current.time;
                break; // Found the inflexion point
            }
        }
    }
    
    // Find index for tstd to calculate infusionTime
    const dropStartIndex = profile.findIndex(p => p.time >= tstd);
    
    const infusionTime = (dropStartIndex !== -1) ? (profile[dropStartIndex].time - flowStartTime) : tee;
    const postinfusionTime = profile[profile.length - 1].time - (dropStartIndex !== -1 ? profile[dropStartIndex].time : profile[profile.length - 1].time);

    // Ensure TEE > TSE
    const effectiveTime = Math.max(tee, tstd + 0.1);

    return {
        preinfusionTime: parseFloat(tpe.toFixed(1)),
        infusionTime: parseFloat(infusionTime.toFixed(1)),
        postinfusionTime: parseFloat(postinfusionTime.toFixed(1)),
        effectiveExtractionTime: parseFloat(effectiveTime.toFixed(1)),
        totalExtractionTime: parseFloat((tpe + effectiveTime).toFixed(1)),
        standardExtractionTime: parseFloat(tstd.toFixed(1))
    };
}

/**
 * Generates a synthetic extraction profile from aggregate shot data.
 */
export function generateSyntheticProfile(shot: ShotData): ChartDataPoint[] {
    if (shot.time <= 0 || shot.yieldOut <= 0) return [];

    const profile: ChartDataPoint[] = [];
    const steps = Math.floor(shot.time * 10); // Pași de 100ms

    // Estimează granițele fazelor din timpii salvați, sau fallback la 30%/70% split
    const preinfusionDuration = shot.preinfusionTime && shot.preinfusionTime > 0
        ? shot.preinfusionTime
        : shot.time * 0.3;
    const postinfusionDuration = shot.postinfusionTime && shot.postinfusionTime > 0
        ? shot.postinfusionTime
        : 0;
    const extractionEnd = shot.time - postinfusionDuration;
    const maxPressure = shot.pressure && shot.pressure > 0 ? shot.pressure : 9;
    const extractionDuration = extractionEnd - preinfusionDuration;
    const avgFlow = extractionDuration > 0 ? shot.yieldOut / extractionDuration : 0;

    for (let i = 0; i <= steps; i++) {
        const t = parseFloat((i * 0.1).toFixed(1));
        let weight = 0;
        let pressure = 0;
        let flow = 0;

        if (t < preinfusionDuration) {
            // Faza 1: Preinfuzie — presiune urcă progresiv, fără curgere de lichid
            const progress = preinfusionDuration > 0 ? t / preinfusionDuration : 1;
            pressure = parseFloat((maxPressure * Math.min(1, progress) * 0.5).toFixed(1));
            weight = 0;
            flow = 0;
        } else if (t < extractionEnd) {
            // Faza 2: Extracție — presiune stabilă la max, flux constant
            pressure = maxPressure;
            const timeInExtraction = t - preinfusionDuration;
            weight = parseFloat(Math.min(shot.yieldOut, avgFlow * timeInExtraction).toFixed(1));
            flow = parseFloat(avgFlow.toFixed(2));
        } else {
            // Faza 3: Post-extracție — presiune scade, flux se oprește, greutate stabilă
            const timeAfterExtraction = t - extractionEnd;
            const remainingDuration = postinfusionDuration > 0 ? postinfusionDuration : 1;
            pressure = parseFloat(
                (maxPressure * Math.max(0, 1 - timeAfterExtraction / remainingDuration)).toFixed(1)
            );
            weight = parseFloat(shot.yieldOut.toFixed(1));
            flow = 0;
        }

        profile.push({ time: t, weight, flow, pressure });
    }

    return profile;
}
