import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Upload, Play, Pause, Settings, Mic, MicOff, RotateCcw,
    ChevronLeft, ChevronRight, Clock, BookOpen, Brain, Trophy,
    AlertCircle, Check, Square, Maximize2, Eye
} from 'lucide-react';
import { getCurrentAi } from '../services/geminiService';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ReadConfig {
    lapTimeSecs: number;      // seconds per line
    totalTimeSecs: number;    // global session time
    linesToRead: number;      // lines per session
    fontSize: number;         // px
    lineHeight: number;       // px
    trackingMode: 'eyes' | 'head';
}

interface LapRecord {
    lineIndex: number;
    targetMs: number;
    actualMs: number;
    diff: number; // positive = late
}

interface SessionRecord {
    date: string;
    linesRead: number;
    memoryScore: number;      // 0-100
    durationMs: number;
    pageStart: number;
    pageEnd: number;
}

type Phase = 'upload' | 'config' | 'reading' | 'recall' | 'result';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(ms: number) {
    const s = Math.abs(Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}
function fmtSecs(s: number) {
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface PdfReadingModeProps {
    onClose: () => void;
    initialFile?: File;
}

const PdfReadingMode: React.FC<PdfReadingModeProps> = ({ onClose, initialFile }) => {
    // ── state ──
    const [phase, setPhase] = useState<Phase>('upload');
    const [config, setConfig] = useState<ReadConfig>({
        lapTimeSecs: 8,
        totalTimeSecs: 120,
        linesToRead: 10,
        fontSize: 20,
        lineHeight: 48,
        trackingMode: 'eyes',
    });
    const [showConfig, setShowConfig] = useState(false);

    // PDF text
    const [pdfLines, setPdfLines] = useState<string[]>([]);
    const [pdfName, setPdfName] = useState('');
    const [currentPageStart, setCurrentPageStart] = useState(0); // global line offset to resume

    // Reading session
    const [sessionLines, setSessionLines] = useState<string[]>([]); // slice of pdfLines
    const [currentLineIdx, setCurrentLineIdx] = useState(0);
    const [highlightX, setHighlightX] = useState(0); // 0..1
    const [globalTimer, setGlobalTimer] = useState(0); // countdown secs
    const [lapTimer, setLapTimer] = useState(0);       // countdown secs per line
    const [lapRecords, setLapRecords] = useState<LapRecord[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sessionStartMs, setSessionStartMs] = useState(0);

    // Recall
    const [isRecording, setIsRecording] = useState(false);
    const [recallTranscript, setRecallTranscript] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [memoryScore, setMemoryScore] = useState<number | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);

    // Refs
    const globalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const highlightIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lineStartMsRef = useRef(0);
    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const readerRef = useRef<HTMLDivElement>(null);

    // ── cleanup ──
    const clearAllTimers = useCallback(() => {
        if (globalIntervalRef.current) clearInterval(globalIntervalRef.current);
        if (lapIntervalRef.current) clearInterval(lapIntervalRef.current);
        if (highlightIntervalRef.current) clearInterval(highlightIntervalRef.current);
    }, []);

    useEffect(() => () => clearAllTimers(), []);

    // ── Handle Initial File ──
    useEffect(() => {
        if (initialFile) {
            handleFileUploadInternal(initialFile);
        }
    }, [initialFile]);

    const handleFileUploadInternal = async (file: File) => {
        if (!file || !file.name.toLowerCase().endsWith('.pdf')) return;
        setPdfName(file.name);

        try {
            // Dynamically import pdfjs-dist
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            const allLines: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = content.items
                    .map((item: any) => item.str)
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                // Split into lines  ~70 chars each
                const words = pageText.split(' ');
                let line = '';
                for (const word of words) {
                    if ((line + ' ' + word).trim().length > 70) {
                        if (line.trim()) allLines.push(line.trim());
                        line = word;
                    } else {
                        line = line ? line + ' ' + word : word;
                    }
                }
                if (line.trim()) allLines.push(line.trim());
            }

            setPdfLines(allLines.filter(l => l.length > 3));
            setCurrentPageStart(0);
            setPhase('config');
        } catch (err) {
            console.error('PDF parse error', err);
            alert('Erro ao ler PDF. Tente outro arquivo.');
        }
    };

    // ── Start Reading ──
    const startReading = useCallback(() => {
        const slice = pdfLines.slice(currentPageStart, currentPageStart + config.linesToRead);
        if (!slice.length) return;

        setSessionLines(slice);
        setCurrentLineIdx(0);
        setHighlightX(0);
        setLapRecords([]);
        setGlobalTimer(config.totalTimeSecs);
        setLapTimer(config.lapTimeSecs);
        setIsPlaying(true);
        setSessionStartMs(Date.now());
        lineStartMsRef.current = Date.now();
        setRecallTranscript('');
        setAiAnalysis('');
        setMemoryScore(null);
        setPhase('reading');
    }, [pdfLines, currentPageStart, config]);

    // ── Timers & highlight ──
    useEffect(() => {
        if (phase !== 'reading' || !isPlaying) return;

        // Global countdown
        globalIntervalRef.current = setInterval(() => {
            setGlobalTimer(prev => {
                if (prev <= 1) {
                    setTimeout(() => {
                        clearAllTimers();
                        setIsPlaying(false);
                        setPhase('recall');
                    }, 0);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Lap countdown + auto-advance
        lapIntervalRef.current = setInterval(() => {
            setLapTimer(prev => {
                if (prev <= 1) {
                    setTimeout(() => advanceLine(), 0);
                    return config.lapTimeSecs;
                }
                return prev - 1;
            });
        }, 1000);

        // Smooth highlight (60fps-ish)
        const frames = config.lapTimeSecs * 30;
        let frame = 0;
        highlightIntervalRef.current = setInterval(() => {
            frame++;
            setHighlightX(Math.min(frame / frames, 1));
            if (frame >= frames) frame = 0;
        }, 1000 / 30);

        return () => clearAllTimers();
    }, [phase, isPlaying, config.lapTimeSecs]);

    const advanceLine = useCallback(() => {
        const now = Date.now();
        const actualMs = now - lineStartMsRef.current;
        lineStartMsRef.current = now;

        setLapRecords(prev => [...prev, {
            lineIndex: prev.length,
            targetMs: config.lapTimeSecs * 1000,
            actualMs,
            diff: actualMs - config.lapTimeSecs * 1000,
        }]);

        setHighlightX(0);

        setCurrentLineIdx(prev => {
            const next = prev + 1;
            if (next >= sessionLines.length) {
                clearAllTimers();
                setIsPlaying(false);
                setPhase('recall');
                return prev;
            }
            return next;
        });
    }, [config.lapTimeSecs, sessionLines.length]);

    const togglePause = () => {
        setIsPlaying(p => !p);
        if (isPlaying) clearAllTimers();
    };

    // ── Voice Recall ──
    const startRecall = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Seu navegador não suporta reconhecimento de voz. Digite o que lembrar.');
            return;
        }
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'pt-BR';

        recog.onresult = (e: any) => {
            let final = '';
            for (let i = 0; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript + ' ';
            }
            setRecallTranscript(final.trim());
        };

        recog.start();
        recognitionRef.current = recog;
        setIsRecording(true);
    }, []);

    const stopRecall = useCallback(() => {
        recognitionRef.current?.stop();
        setIsRecording(false);
    }, []);

    // ── AI Analysis ──
    const analyzeRecall = useCallback(async () => {
        setIsAnalyzing(true);
        const pageText = sessionLines.join(' ');
        const userRecall = recallTranscript || '(silêncio - usuário não disse nada)';

        try {
            const response = await getCurrentAi().models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `
Você é um assistente de memória e leitura. O usuário leu o seguinte trecho de um livro/PDF:

---TEXTO LIDO---
${pageText}
---FIM DO TEXTO---

Depois da leitura, o usuário disse de memória:
---O QUE O USUÁRIO LEMBROU---
${userRecall}
---FIM---

Sua tarefa:
1. Calcule um score de memória de 0 a 100 baseado em quantos conceitos/fatos importantes do texto o usuário mencionou.
2. Liste o que ele lembrou corretamente.
3. Liste o que ele ESQUECEU ou não mencionou (pontos importantes do texto).
4. Dê uma mensagem motivacional curta.

Responda em JSON com os campos: score (number 0-100), remembered (string[]), forgot (string[]), message (string).
                `.trim(),
                config: {
                    responseMimeType: 'application/json',
                }
            });

            const json = JSON.parse(response.text || '{}');
            const score = Math.min(100, Math.max(0, json.score || 0));
            setMemoryScore(score);
            setAiAnalysis(JSON.stringify(json));

            // Save session record
            const endPageIdx = currentPageStart + sessionLines.length - 1;
            const record: SessionRecord = {
                date: new Date().toLocaleString('pt-BR'),
                linesRead: sessionLines.length,
                memoryScore: score,
                durationMs: Date.now() - sessionStartMs,
                pageStart: currentPageStart,
                pageEnd: endPageIdx,
            };
            setSessionRecords(prev => [record, ...prev]);

        } catch (err) {
            console.error('AI analysis error', err);
            setAiAnalysis('{"score":0,"remembered":[],"forgot":["Erro ao conectar com IA"],"message":"Tente novamente."}');
        }
        setIsAnalyzing(false);
    }, [sessionLines, recallTranscript, currentPageStart, sessionStartMs]);

    // ── Continue reading ──
    const continueReading = () => {
        setCurrentPageStart(prev => Math.min(prev + sessionLines.length, pdfLines.length - 1));
        setPhase('config');
    };

    // ─── Parsed AI result ───
    let aiResult: any = null;
    try { aiResult = aiAnalysis ? JSON.parse(aiAnalysis) : null; } catch { }

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[310] bg-gray-950 flex flex-col overflow-hidden">
            {/* ── Top Bar ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X size={15} />
                    </button>
                    <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-emerald-400" />
                        <span className="text-sm font-black text-white uppercase tracking-widest">Leitura Ativa</span>
                        {pdfName && <span className="text-xs text-gray-500 truncate max-w-[180px]">{pdfName}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {phase === 'reading' && (
                        <>
                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-black tabular-nums ${globalTimer <= 15 ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-white'}`}>
                                <Clock size={13} />
                                {fmtSecs(globalTimer)}
                            </div>
                            <button onClick={togglePause} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                        </>
                    )}
                    <button onClick={() => setShowConfig(v => !v)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <Settings size={14} />
                    </button>
                </div>
            </div>

            {/* ── Config Overlay ── */}
            {showConfig && (
                <div className="absolute inset-0 z-50 bg-gray-950/95 backdrop-blur-sm flex items-center justify-center p-6 overflow-y-auto">
                    <div className="w-full max-w-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black text-white uppercase tracking-widest">Configurações</h2>
                            <button onClick={() => setShowConfig(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <ConfigCard label="Tempo por linha" sub="Segundos para ler cada linha" value={config.lapTimeSecs} min={2} max={30} onChange={v => setConfig(c => ({ ...c, lapTimeSecs: v }))} suffix="s" />
                        <ConfigCard label="Tempo total" sub="Duração máxima da sessão" value={config.totalTimeSecs} min={30} max={600} step={15} onChange={v => setConfig(c => ({ ...c, totalTimeSecs: v }))} suffix="s" />
                        <ConfigCard label="Linhas por sessão" sub="Quantas linhas ler antes do recall" value={config.linesToRead} min={3} max={40} onChange={v => setConfig(c => ({ ...c, linesToRead: v }))} />
                        <ConfigCard label="Tamanho da fonte" sub="Pixels" value={config.fontSize} min={14} max={36} step={2} onChange={v => setConfig(c => ({ ...c, fontSize: v }))} suffix="px" />
                        <button onClick={() => setShowConfig(false)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all">
                            Salvar
                        </button>
                    </div>
                </div>
            )}

            {/* ── PHASE: UPLOAD ── */}
            {phase === 'upload' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
                    <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
                        <BookOpen size={36} className="text-emerald-400" strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-black text-white uppercase tracking-widest">Leitura Ativa</h1>
                        <p className="text-gray-400 mt-2 text-sm leading-relaxed max-w-xs">
                            Faça upload de um PDF. O destaque visual guia seus olhos linha por linha. Depois, diga o que lembrou — a IA mede sua memória.
                        </p>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-emerald-500/25 transition-all active:scale-[0.98]">
                        <Upload size={20} />
                        Selecionar PDF
                    </button>
                    <input ref={fileInputRef} type="file" accept=".pdf" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUploadInternal(file);
                    }} className="hidden" />
                </div>
            )}

            {/* ── PHASE: CONFIG ── */}
            {phase === 'config' && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                        <BookOpen size={28} className="text-emerald-400" strokeWidth={1.5} />
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-1">
                            {currentPageStart > 0 ? `Linha ${currentPageStart + 1} em diante` : 'Pronto para começar'}
                        </p>
                        <h2 className="text-xl font-black text-white uppercase">{pdfName}</h2>
                        <p className="text-gray-500 text-sm mt-1">{pdfLines.length} linhas no total</p>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                        {[
                            { label: 'Por linha', value: `${config.lapTimeSecs}s` },
                            { label: 'Linhas', value: config.linesToRead },
                            { label: 'Tempo total', value: fmtSecs(config.totalTimeSecs) },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                                <p className="text-lg font-black text-white">{value}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Vertical Control */}
                    <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1.5 w-full max-w-sm">
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, trackingMode: 'eyes' }))}
                            className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition ${config.trackingMode === 'eyes' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'text-gray-500 hover:text-emerald-400'}`}>
                            <Eye size={16} />
                            <span className="text-[10px] font-black uppercase tracking-tighter mt-1">Visão</span>
                        </button>
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, trackingMode: 'head' }))}
                            className={`flex-1 flex flex-col items-center py-2.5 rounded-xl transition ${config.trackingMode === 'head' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' : 'text-gray-500 hover:text-emerald-400'}`}>
                            <Maximize2 size={16} />
                            <span className="text-[10px] font-black uppercase tracking-tighter mt-1">Cabeça</span>
                        </button>
                    </div>

                    {/* History */}
                    {sessionRecords.length > 0 && (
                        <div className="w-full max-w-sm">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Histórico</p>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {sessionRecords.slice(0, 5).map((r, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-xs">
                                        <span className="text-gray-400">{r.date}</span>
                                        <span className="text-gray-400">{r.linesRead} linhas</span>
                                        <span className={`font-black ${r.memoryScore >= 70 ? 'text-emerald-400' : r.memoryScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {r.memoryScore}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 w-full max-w-sm">
                        <button onClick={() => setShowConfig(true)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                            <Settings size={14} /> Config
                        </button>
                        <button onClick={startReading} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            <Play size={14} /> Iniciar
                        </button>
                    </div>
                </div>
            )}

            {/* ── PHASE: READING ── */}
            {phase === 'reading' && (
                <div className="flex-1 flex flex-col overflow-hidden" ref={readerRef}>
                    {/* Global progress bar */}
                    <div className="w-full h-1 bg-white/5 shrink-0">
                        <div
                            className={`h-full transition-all duration-1000 ${globalTimer <= 15 ? 'bg-red-500' : 'bg-emerald-500'}`}
                            style={{ width: `${(globalTimer / config.totalTimeSecs) * 100}%` }}
                        />
                    </div>

                    {/* Lap progress bar */}
                    <div className="w-full h-0.5 bg-white/5 shrink-0">
                        <div
                            className="h-full bg-blue-400 transition-all duration-1000"
                            style={{ width: `${(lapTimer / config.lapTimeSecs) * 100}%` }}
                        />
                    </div>

                    {/* Lines */}
                    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-3 max-w-3xl mx-auto w-full">
                        {sessionLines.map((line, idx) => {
                            const isCurrent = idx === currentLineIdx;
                            const isDone = idx < currentLineIdx;
                            const lap = lapRecords[idx];
                            return (
                                <div
                                    key={idx}
                                    className={`relative rounded-2xl px-4 py-3 transition-all duration-300 ${isCurrent
                                        ? 'bg-white/8 border border-blue-500/30 shadow-[0_0_25px_rgba(59,130,246,0.08)]'
                                        : isDone
                                            ? 'opacity-50'
                                            : 'opacity-15'
                                        }`}
                                >
                                    {/* Line number */}
                                    <span className={`absolute left-1 top-1/2 -translate-y-1/2 text-[9px] font-black w-4 text-center tabular-nums ${isCurrent ? 'text-blue-400' : 'text-gray-600'}`}>
                                        {currentPageStart + idx + 1}
                                    </span>

                                    {/* Text */}
                                    <p
                                        className="pl-5 leading-relaxed select-none"
                                        style={{
                                            fontSize: config.fontSize,
                                            color: isCurrent ? '#ffffff' : isDone ? '#9ca3af' : '#4b5563',
                                            fontFamily: 'Georgia, serif',
                                        }}
                                    >
                                        {line}
                                    </p>

                                    {/* Eye-tracking highlight on current line */}
                                    {isCurrent && (
                                        <div
                                            className="absolute inset-y-0 left-0 rounded-2xl pointer-events-none"
                                            style={{
                                                background: `linear-gradient(90deg, transparent ${Math.max(0, highlightX * 100 - 18)}%, rgba(59,130,246,0.18) ${highlightX * 100 - 8}%, rgba(99,102,241,0.22) ${highlightX * 100}%, transparent ${highlightX * 100 + 5}%)`,
                                                transition: 'background 0.05s linear',
                                            }}
                                        />
                                    )}

                                    {/* Lap timing badge if done */}
                                    {isDone && lap && (
                                        <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black tabular-nums px-1.5 py-0.5 rounded-full ${lap.diff <= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                            {lap.diff <= 0 ? '✓' : '+'}{Math.abs(Math.round(lap.diff / 100) / 10)}s
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom bar */}
                    <div className="shrink-0 px-6 py-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-black text-gray-500 tabular-nums">
                            Linha <span className="text-white">{currentLineIdx + 1}</span>/{sessionLines.length} · Lap: <span className={`${lapTimer <= 3 ? 'text-red-400' : 'text-blue-400'}`}>{lapTimer}s</span>
                        </span>
                        <div className="flex gap-2">
                            <button onClick={togglePause} className={`px-4 py-2 rounded-xl font-black text-xs uppercase transition-all flex items-center gap-1.5 ${isPlaying ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
                                {isPlaying ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Continuar</>}
                            </button>
                            <button onClick={() => { clearAllTimers(); setIsPlaying(false); setPhase('recall'); }} className="px-4 py-2 rounded-xl font-black text-xs uppercase bg-white/5 text-gray-400 hover:bg-white/10 transition-all flex items-center gap-1.5">
                                <Square size={12} /> Encerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PHASE: RECALL ── */}
            {phase === 'recall' && !memoryScore && (
                <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-6 p-8">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                        <Brain size={28} className="text-purple-400" strokeWidth={1.5} />
                    </div>
                    <div className="text-center max-w-sm">
                        <h2 className="text-xl font-black text-white uppercase tracking-widest">Recall</h2>
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                            Você leu <strong className="text-white">{lapRecords.length}</strong> linhas. Agora diga em voz alta tudo que lembrar do que leu. Quando terminar, clique em <em>Analisar</em>.
                        </p>
                    </div>

                    {/* Transcript box */}
                    <div className="w-full max-w-md">
                        <div className="relative bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px]">
                            {recallTranscript ? (
                                <p className="text-gray-200 text-sm leading-relaxed">{recallTranscript}</p>
                            ) : (
                                <p className="text-gray-600 text-sm italic">{isRecording ? 'Ouvindo...' : 'Pressione Microfone para começar a falar'}</p>
                            )}
                            {isRecording && (
                                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            )}
                        </div>
                        {/* Manual input fallback */}
                        <textarea
                            className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl p-3 text-gray-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                            placeholder="Ou escreva aqui o que lembrou..."
                            rows={3}
                            value={recallTranscript}
                            onChange={e => setRecallTranscript(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={isRecording ? stopRecall : startRecall}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${isRecording ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-white/10 hover:bg-white/20 text-gray-300'}`}>
                            {isRecording ? <><MicOff size={16} /> Parar</> : <><Mic size={16} /> Microfone</>}
                        </button>
                        <button
                            onClick={analyzeRecall}
                            disabled={isAnalyzing || !recallTranscript.trim()}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-sm uppercase tracking-widest bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 transition-all disabled:opacity-40 disabled:pointer-events-none">
                            {isAnalyzing ? (
                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analisando...</>
                            ) : (
                                <><Brain size={16} /> Analisar</>
                            )}
                        </button>
                    </div>

                    {/* Lap summary */}
                    {lapRecords.length > 0 && (
                        <div className="w-full max-w-md">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Lap Times</p>
                            <div className="grid grid-cols-4 gap-1">
                                {lapRecords.map((lap, i) => (
                                    <div key={i} className={`rounded-xl p-2 text-center border relative overflow-hidden transition-all ${lap.diff <= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                                        <p className="text-[8px] opacity-60 uppercase mb-0.5">Line {i + 1}</p>
                                        <p className="text-sm font-black tabular-nums">{(lap.actualMs / 1000).toFixed(1)}s</p>
                                        <div className={`text-[8px] font-bold mt-0.5 ${lap.diff > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                                            {lap.diff > 0 ? `+${(lap.diff / 1000).toFixed(1)}s atraso` : `${(lap.diff / 1000).toFixed(1)}s early`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── PHASE: RESULT ── */}
            {memoryScore !== null && aiResult && (
                <div className="flex-1 overflow-y-auto flex flex-col items-center gap-6 p-8">
                    {/* Score Ring */}
                    <div className="relative w-28 h-28 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                            <circle
                                cx="50" cy="50" r="42" fill="none"
                                stroke={memoryScore >= 70 ? '#10b981' : memoryScore >= 40 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="10"
                                strokeDasharray={`${(memoryScore / 100) * 263.9} 263.9`}
                                strokeLinecap="round"
                                style={{ transition: 'stroke-dasharray 1s ease' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className={`text-3xl font-black tabular-nums ${memoryScore >= 70 ? 'text-emerald-400' : memoryScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {memoryScore}%
                            </p>
                            <p className="text-[9px] text-gray-500 font-black uppercase">Memória</p>
                        </div>
                    </div>

                    {/* Message */}
                    {aiResult.message && (
                        <p className="text-center text-gray-300 text-sm max-w-sm leading-relaxed italic">"{aiResult.message}"</p>
                    )}

                    {/* Remembered */}
                    {aiResult.remembered?.length > 0 && (
                        <div className="w-full max-w-md">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Check size={11} /> Você lembrou ({aiResult.remembered.length})
                            </p>
                            <div className="space-y-1">
                                {aiResult.remembered.map((item: string, i: number) => (
                                    <div key={i} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 text-sm text-emerald-300">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Forgot */}
                    {aiResult.forgot?.length > 0 && (
                        <div className="w-full max-w-md">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <AlertCircle size={11} /> Você esqueceu ({aiResult.forgot.length})
                            </p>
                            <div className="space-y-1">
                                {aiResult.forgot.map((item: string, i: number) => (
                                    <div key={i} className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-sm text-red-300">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 justify-center">
                        <button onClick={() => { setMemoryScore(null); setAiAnalysis(''); setPhase('recall'); }}
                            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-2">
                            <RotateCcw size={14} /> Tentar recall de novo
                        </button>
                        <button onClick={continueReading}
                            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
                            <ChevronRight size={14} /> Continuar leitura
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Config Card Helper ───────────────────────────────────────────────────────
interface ConfigCardProps {
    label: string;
    sub?: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    onChange: (v: number) => void;
}
const ConfigCard: React.FC<ConfigCardProps> = ({ label, sub, value, min, max, step = 1, suffix = '', onChange }) => (
    <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
        <div>
            <p className="text-sm font-black text-white">{label}</p>
            {sub && <p className="text-[10px] text-gray-500">{sub}</p>}
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => onChange(Math.max(min, value - step))} className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black transition-all">−</button>
            <span className="w-14 text-center font-black text-white tabular-nums text-sm">{value}{suffix}</span>
            <button onClick={() => onChange(Math.min(max, value + step))} className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black transition-all">+</button>
        </div>
    </div>
);

export default PdfReadingMode;
