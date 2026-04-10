import type { VercelRequest, VercelResponse } from '@vercel/node';

// Subset of ShotData relevant for AI analysis
interface ShotPayload {
        machineName?: string;
        beanName?: string;
        roaster?: string;
        roastDate?: string;
        waterName?: string;
        grindSetting?: number;
        grindSettingText?: string;
        grindScaleType?: string;
        grindName?: string;
        doseIn?: number;
        yieldOut?: number;
        time?: number;
        timeA?: number;
        timeB?: number;
        timeC?: number;
        preinfusionTime?: number;
        temperature?: number;
        pressure?: number;
        avgPressure?: number;
        maxPressure?: number;
        flowControlSetting?: number;
        tamperName?: string;
        tampLevel?: string;
        basketName?: string;
        otherAccessories?: string[];
        tags?: Record<string, string[]>;
        ratingAspect?: number;
        ratingAroma?: number;
        ratingTaste?: number;
        ratingBody?: number;
        ratingOverall?: number;
        notes?: string;
        tasteConclusion?: string;
}

interface GeminiAnalysisResult {
        score: string;
        diagnosis: string;
        suggestion: string;
        parameters?: {
            extractionRate?: string;
            ratioAnalysis?: string;
            timeAnalysis?: string;
            issues?: string[];
        };
}

// Simple in-memory rate limiter: max 10 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
        const now = Date.now();
        const entry = rateLimitMap.get(ip);
        if (!entry || now > entry.resetAt) {
                    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
                    return false;
        }
        if (entry.count >= RATE_LIMIT) return true;
        entry.count++;
        return false;
}

function buildPrompt(shot: ShotPayload): string {
        const ratio =
                    shot.doseIn && shot.yieldOut
                ? (shot.yieldOut / shot.doseIn).toFixed(2)
                        : 'N/A';
        const tagsText = shot.tags
            ? Object.entries(shot.tags)
                        .filter(([, vals]) => vals && vals.length > 0)
                        .map(([cat, vals]) => `${cat}: ${vals.join(', ')}`)
                        .join(' | ')
                    : 'N/A';
        const ratings =
                    [
                                    shot.ratingAspect ? `Aspect: ${shot.ratingAspect}/5` : null,
                                    shot.ratingAroma ? `Aroma: ${shot.ratingAroma}/5` : null,
                                    shot.ratingTaste ? `Gust: ${shot.ratingTaste}/5` : null,
                                    shot.ratingBody ? `Corp: ${shot.ratingBody}/5` : null,
                                    shot.ratingOverall ? `Overall: ${shot.ratingOverall}/5` : null,
                                ]
                .filter(Boolean)
                .join(', ') || 'N/A';

    return `Esti un expert Q-Grader SCA cu experienta in analiza espresso-ului. Analizeaza urmatoarea extractie si returneaza EXCLUSIV un obiect JSON valid (fara markdown, fara explicatii suplimentare) cu urmatoarea structura exacta:
    {
      "score": "scor numeric 0-100 urmat de calificativ (ex: 78/100 - Bun spre Foarte Bun)",
        "diagnosis": "diagnostic detaliat in romana, 2-4 propozitii, despre ce s-a intamplat chimic si senzorial in aceasta extractie",
          "suggestion": "recomandare concreta si actionabila in romana, 1-3 propozitii, ce exact sa modifice la urmatoarea extractie",
            "parameters": {
                "extractionRate": "Subextras / Ideal / Supraextras",
                    "ratioAnalysis": "analiza raport doza/randament in romana",
                        "timeAnalysis": "analiza timp extractie in romana",
                            "issues": ["problema 1", "problema 2"]
                              }
                              }

                              DATE EXTRACTIE:
                              Espressor: ${shot.machineName || 'Nespecificat'}
                              Cafea: ${shot.beanName || 'Nespecificat'} | Prajitor: ${shot.roaster || 'N/A'} | Data prajire: ${shot.roastDate || 'N/A'}
                              Apa: ${shot.waterName || 'N/A'}
                              Raznitsa: ${shot.grindName || 'Nespecificata'} | Setare: ${shot.grindSettingText || shot.grindSetting || 'N/A'} (scala: ${shot.grindScaleType || 'liniara'})
                              Sita: ${shot.basketName || 'N/A'} | Tamper: ${shot.tamperName || 'N/A'} | Forta tampare: ${shot.tampLevel || 'N/A'}
                              Flow Control: ${shot.flowControlSetting != null ? shot.flowControlSetting : 'N/A'}
                              Accesorii: ${shot.otherAccessories?.join(', ') || 'N/A'}

                              PARAMETRI EXTRACTIE:
                              Doza in: ${shot.doseIn != null ? shot.doseIn + 'g' : 'N/A'}
                              Randament: ${shot.yieldOut != null ? shot.yieldOut + 'g' : 'N/A'}
                              Raport: 1:${ratio}
                              Timp total: ${shot.time != null ? shot.time + 's' : 'N/A'}
                              Timp preinfuzie: ${shot.preinfusionTime != null ? shot.preinfusionTime + 's' : 'N/A'}
                              Temperatura: ${shot.temperature != null ? shot.temperature + 'C' : 'N/A'}
                              Presiune setata: ${shot.pressure != null ? shot.pressure + ' bar' : 'N/A'}
                              Presiune medie: ${shot.avgPressure != null ? shot.avgPressure + ' bar' : 'N/A'}
                              Presiune maxima: ${shot.maxPressure != null ? shot.maxPressure + ' bar' : 'N/A'}

                              EVALUARE SENZORIALA:
                              Note senzoriale: ${tagsText}
                              Concluzie gust: ${shot.tasteConclusion || 'N/A'}
                              Ratinguri: ${ratings}
                              Note personale: ${shot.notes || 'N/A'}

                              Analizeaza riguros si ofera un diagnostic de nivel Q-Grader conform standardelor SCA.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
        // CORS: allow same-origin and localhost (for development)
    const origin = req.headers.origin as string | undefined;
        if (origin) {
                    try {
                                    const originHost = new URL(origin).hostname;
                                    const host = (req.headers.host || '').split(':')[0];
                                    const isAllowed = originHost === host || originHost === 'localhost' || originHost === '127.0.0.1';
                                    if (!isAllowed) {
                                                        return res.status(403).json({ error: 'Forbidden: cross-origin not allowed' });
                                    }
                                    res.setHeader('Access-Control-Allow-Origin', origin);
                    } catch {
                                    return res.status(403).json({ error: 'Forbidden: invalid origin' });
                    }
        }
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
                return res.status(200).end();
    }

    if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Rate limiting
    const clientIp =
                (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                (req.socket as { remoteAddress?: string })?.remoteAddress ||
                'unknown';
        if (isRateLimited(clientIp)) {
                    return res.status(429).json({
                                    score: 'Limita depasita',
                                    diagnosis: 'Prea multe cereri intr-un interval scurt. Incearca din nou peste un minut.',
                                    suggestion: 'Asteapta 60 de secunde inainte de a analiza urmatorul shot.',
                    } as GeminiAnalysisResult);
        }

    const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
                    return res.status(500).json({
                                    score: 'Config Error',
                                    diagnosis: 'Cheia API Gemini (GEMINI_API_KEY) nu este configurata in variabilele de mediu Vercel.',
                                    suggestion: 'Adauga GEMINI_API_KEY in dashboard-ul Vercel → Settings → Environment Variables.',
                    } as GeminiAnalysisResult);
        }

    const shot: ShotPayload = req.body || {};
        const prompt = buildPrompt(shot);

    // Abort after 25 seconds to avoid Vercel function timeout (30s limit)
    const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25_000);

    try {
                const geminiRes = await fetch(
                                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                    {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                                                contents: [{ parts: [{ text: prompt }] }],
                                                                generationConfig: {
                                                                                            temperature: 0.35,
                                                                                            maxOutputTokens: 1024,
                                                                                            responseMimeType: 'application/json',
                                                                },
                                        }),
                                        signal: controller.signal,
                    }
                            );

            clearTimeout(timeoutId);

            if (!geminiRes.ok) {
                            const errText = await geminiRes.text();
                            console.error('Gemini API HTTP error:', geminiRes.status, errText);
                            throw new Error(`Gemini HTTP ${geminiRes.status}`);
            }

            const data = await geminiRes.json();
                const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) {
                            console.error('Gemini: empty response', JSON.stringify(data));
                            throw new Error('Raspuns gol de la Gemini');
            }

            let result: GeminiAnalysisResult;
                try {
                                result = JSON.parse(rawText);
                } catch {
                                result = {
                                                    score: 'Analizat',
                                                    diagnosis: rawText.substring(0, 500),
                                                    suggestion: 'Vezi diagnosticul complet mai sus.',
                                };
                }

            return res.status(200).json(result);
    } catch (err: unknown) {
                clearTimeout(timeoutId);
                const isTimeout = err instanceof Error && err.name === 'AbortError';
                const message = isTimeout
                    ? 'Gemini nu a raspuns in 25 secunde (timeout)'
                                : err instanceof Error
                    ? err.message
                                : 'Eroare necunoscuta';
                console.error('Gemini handler error:', message);
                return res.status(isTimeout ? 504 : 500).json({
                                score: 'AI Indisponibil',
                                diagnosis: `Nu s-a putut conecta la Gemini AI. Eroare: ${message}`,
                                suggestion: 'Treci temporar la Modul Manual (Expert System offline) sau reincearca mai tarziu.',
                } as GeminiAnalysisResult);
    }
}
