import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Play, Square, Mic, MicOff, Settings, Check, ChevronRight,
    Eye, EyeOff, RotateCcw, AlertCircle, Trophy, ChevronDown, ChevronUp
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface PlateConfig {
    totalPlates: number;        // total unique plates in session
    showNewPlateSecs: number;   // seconds new plate is shown before recall
    vocalTimeSecs: number;      // seconds user has to vocalize each recall round
    repsPerPlate: number;       // times each plate must be spoken/typed per round
}

type Phase = 'config' | 'idle' | 'showing' | 'recall' | 'success' | 'fail' | 'complete';

// ─────────────────────────────────────────────
// Plate Generators
// ─────────────────────────────────────────────
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '0123456789';
const rL = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
const rD = () => DIGITS[Math.floor(Math.random() * DIGITS.length)];

const genOldPlate = () => `${rL()}${rL()}${rL()}-${rD()}${rD()}${rD()}${rD()}`;
const genMercosulPlate = () => `${rL()}${rL()}${rL()}${rD()}${rL()}${rD()}${rD()}`;

const generatePlates = (count: number): string[] =>
    Array.from({ length: count }, () =>
        Math.random() > 0.45 ? genMercosulPlate() : genOldPlate()
    );

// ─────────────────────────────────────────────
// Matching helpers
// ─────────────────────────────────────────────
const normPlate = (s: string) => s.replace(/[\s\-]/g, '').toUpperCase();
const plateMatch = (spoken: string, plate: string): boolean => {
    const s = normPlate(spoken);
    const p = normPlate(plate);
    return s.includes(p) || p.split('').every(c => s.includes(c));
};

// ─────────────────────────────────────────────
// Build recall queue: plates[0..level], each repeated reps times
// ─────────────────────────────────────────────
const buildQueue = (plates: string[], level: number, reps: number): string[] => {
    const result: string[] = [];
    for (let i = 0; i <= level; i++) {
        for (let r = 0; r < reps; r++) {
            result.push(plates[i]);
        }
    }
    return result;
};

// ─────────────────────────────────────────────
// Brazilian Plate Visual Component
// ─────────────────────────────────────────────
interface PlateProps {
    plate: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    hidden?: boolean;
    checked?: boolean;
    active?: boolean;
}

const PlateDisplay: React.FC<PlateProps> = ({ plate, size = 'lg', hidden = false, checked = false, active = false }) => {
    const isMercosul = !/^\w{3}-\d{4}$/.test(plate);

    const sizes = {
        sm:  { box: 'w-24 h-14', font: 'text-xs', top: 'text-[6px]', bot: 'text-[5px]' },
        md:  { box: 'w-36 h-20', font: 'text-base', top: 'text-[7px]', bot: 'text-[6px]' },
        lg:  { box: 'w-64 h-32', font: 'text-3xl', top: 'text-[9px]', bot: 'text-[8px]' },
        xl:  { box: 'w-80 h-40', font: 'text-5xl', top: 'text-xs', bot: 'text-[9px]' },
    };
    const s = sizes[size];

    return (
        <div className={`relative ${s.box} rounded-xl overflow-hidden border-4 ${active ? 'border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.5)]' : 'border-white/80'} transition-all duration-300 select-none`}
            style={{ background: 'linear-gradient(135deg, #fff 0%, #f0f0e8 100%)' }}>
            {/* Top bar - green (Mercosul) or blue (old) */}
            <div className={`absolute top-0 left-0 right-0 h-[22%] flex items-center justify-center gap-1 ${isMercosul ? 'bg-green-600' : 'bg-blue-700'}`}>
                <span className={`${s.top} font-black text-white tracking-[0.25em] uppercase`}>
                    {isMercosul ? '🇧🇷 BRASIL' : '🇧🇷 BRASIL'}
                </span>
            </div>
            {/* Bottom bar */}
            <div className={`absolute bottom-0 left-0 right-0 h-[18%] flex items-center justify-center ${isMercosul ? 'bg-green-600' : 'bg-blue-700'}`}>
                <span className={`${s.bot} font-black text-white tracking-widest`}>
                    {isMercosul ? 'MERCOSUL' : 'BRASIL'}
                </span>
            </div>
            {/* Plate content */}
            <div className="absolute inset-0 flex items-center justify-center mt-2">
                {hidden ? (
                    <span className={`${s.font} font-black text-gray-300 tracking-widest`}>???</span>
                ) : (
                    <span className={`${s.font} font-black text-gray-900 tracking-[0.15em]`}>{plate}</span>
                )}
            </div>
            {/* Check overlay */}
            {checked && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-end pr-2 pb-2">
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// Config Panel
// ─────────────────────────────────────────────
interface ConfigPanelProps {
    config: PlateConfig;
    onChange: (c: PlateConfig) => void;
    onStart: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, onStart }) => {
    const set = (key: keyof PlateConfig, val: number) =>
        onChange({ ...config, [key]: val });

    const Row = ({ label, sub, k, min, max, step = 1, suffix = '' }: {
        label: string; sub?: string; k: keyof PlateConfig; min: number; max: number; step?: number; suffix?: string;
    }) => (
        <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
            <div className="flex flex-col">
                <span className="text-sm font-black text-gray-800">{label}</span>
                {sub && <span className="text-[10px] text-gray-400 font-medium">{sub}</span>}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => set(k, Math.max(min, config[k] - step))} className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-black transition-all active:scale-90">−</button>
                <span className="text-base font-black text-gray-900 w-10 text-center tabular-nums">{config[k]}{suffix}</span>
                <button onClick={() => set(k, Math.min(max, config[k] + step))} className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-black transition-all active:scale-90">+</button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6 p-6 max-w-md w-full">
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Configurar</p>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Memória de Placas</h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Treine sua memória visual com placas de veículos. A cada nível você precisa lembrar de todas as placas anteriores.
                </p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-2">
                <Row label="Total de placas" sub="Quantas placas únicas no treino" k="totalPlates" min={2} max={20} />
                <Row label="Tempo de exibição" sub="Segundos para ver a nova placa" k="showNewPlateSecs" min={2} max={30} suffix="s" />
                <Row label="Tempo de vocalização" sub="Segundos para falar todas as placas" k="vocalTimeSecs" min={10} max={120} step={5} suffix="s" />
                <Row label="Repetições por placa" sub="Vezes que deve falar cada placa" k="repsPerPlate" min={1} max={5} />
            </div>

            {/* Summary */}
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Resumo do Desafio</p>
                <div className="space-y-1">
                    {[1, 2, 3].map(level => {
                        const total = level * config.repsPerPlate;
                        return (
                            <div key={level} className="flex justify-between items-center">
                                <span className="text-xs text-indigo-700 font-bold">Placa {level}</span>
                                <span className="text-xs text-indigo-500 font-black">{total} vocalizações · {config.vocalTimeSecs}s</span>
                            </div>
                        );
                    })}
                    <div className="text-[9px] text-indigo-400 italic mt-1">… e assim por diante até {config.totalPlates} placas</div>
                </div>
            </div>

            <button
                onClick={onStart}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                <Play size={18} strokeWidth={3} />
                Iniciar Treino
            </button>
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
interface LicensePlateModeProps {
    onClose: () => void;
}

const LicensePlateMode: React.FC<LicensePlateModeProps> = ({ onClose }) => {
    const [config, setConfig] = useState<PlateConfig>({
        totalPlates: 6,
        showNewPlateSecs: 5,
        vocalTimeSecs: 30,
        repsPerPlate: 3,
    });

    const [phase, setPhase] = useState<Phase>('config');
    const [plates, setPlates] = useState<string[]>([]);
    const [level, setLevel] = useState(0);            // current plate index (0-based)
    const [queue, setQueue] = useState<string[]>([]);  // recall sequence
    const [qIdx, setQIdx] = useState(0);               // position in queue
    const [timer, setTimer] = useState(0);
    const [micActive, setMicActive] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [paused, setPaused] = useState(false);
    const [score, setScore] = useState({ correct: 0, wrong: 0 });

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recognitionRef = useRef<any>(null);
    const textInputRef = useRef<HTMLInputElement>(null);

    // ── Timer management ──────────────────────
    const clearTimerInterval = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const startCountdown = useCallback((seconds: number, onEnd: () => void) => {
        clearTimerInterval();
        setTimer(seconds);
        let current = seconds;
        timerRef.current = setInterval(() => {
            current -= 1;
            setTimer(current);
            if (current <= 0) {
                clearTimerInterval();
                onEnd();
            }
        }, 1000);
    }, []);

    // ── Voice Recognition ─────────────────────
    const startMic = useCallback(() => {
        const SpeechRecognitionApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionApi) return;

        const rec = new SpeechRecognitionApi();
        rec.lang = 'pt-BR';
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (e: any) => {
            const last = e.results[e.results.length - 1];
            const text = last[0].transcript;
            setTranscript(text);
            if (last.isFinal) {
                setTranscript('');
            }
        };

        rec.start();
        recognitionRef.current = rec;
        setMicActive(true);
    }, []);

    const stopMic = useCallback(() => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setMicActive(false);
        setTranscript('');
    }, []);

    // Listen for voice match during recall
    useEffect(() => {
        if (phase !== 'recall' || !micActive || paused) return;

        const rec = recognitionRef.current;
        if (!rec) return;

        rec.onresult = (e: any) => {
            const last = e.results[e.results.length - 1];
            const text = last[0].transcript;
            setTranscript(text);

            if (last.isFinal && queue[qIdx]) {
                handleSpokenInput(text);
            }
        };
    }, [phase, micActive, qIdx, queue, paused]);

    // ── Game Flow ─────────────────────────────
    const handleStart = () => {
        const gen = generatePlates(config.totalPlates);
        setPlates(gen);
        setLevel(0);
        setScore({ correct: 0, wrong: 0 });
        beginLevel(gen, 0);
    };

    const beginLevel = (plts: string[], lvl: number) => {
        setPhase('showing');
        setPaused(false);
        setQIdx(0);
        startCountdown(config.showNewPlateSecs, () => beginRecall(plts, lvl));
    };

    const beginRecall = useCallback((plts: string[], lvl: number) => {
        const q = buildQueue(plts, lvl, config.repsPerPlate);
        setQueue(q);
        setQIdx(0);
        setPhase('recall');
        startCountdown(config.vocalTimeSecs, () => handleTimeFail());

        // Auto-start mic
        setTimeout(() => startMic(), 200);
    }, [config, startCountdown, startMic]);

    const handleTimeFail = () => {
        stopMic();
        setPhase('fail');
        setScore(s => ({ ...s, wrong: s.wrong + 1 }));

        setTimeout(() => {
            // Retry same level
            if (plates.length > 0) beginLevel(plates, level);
        }, 2500);
    };

    const flashFeedback = (type: 'correct' | 'wrong') => {
        setFeedback(type);
        setTimeout(() => setFeedback(null), 400);
    };

    const advanceQueue = (currentQ: string[], nextIdx: number, lvl: number, plts: string[]) => {
        if (nextIdx >= currentQ.length) {
            // Level complete!
            clearTimerInterval();
            stopMic();
            setScore(s => ({ ...s, correct: s.correct + 1 }));
            setPhase('success');

            setTimeout(() => {
                const nextLvl = lvl + 1;
                if (nextLvl >= plts.length) {
                    setPhase('complete');
                } else {
                    setLevel(nextLvl);
                    beginLevel(plts, nextLvl);
                }
            }, 1500);
        } else {
            setQIdx(nextIdx);
        }
    };

    const handleSpokenInput = (text: string) => {
        if (!queue[qIdx]) return;
        if (plateMatch(text, queue[qIdx])) {
            flashFeedback('correct');
            advanceQueue(queue, qIdx + 1, level, plates);
        } else {
            flashFeedback('wrong');
        }
    };

    const handleTextSubmit = () => {
        if (!textInput.trim() || phase !== 'recall') return;
        const val = textInput.trim();
        setTextInput('');
        handleSpokenInput(val);
    };

    const handlePauseToggle = () => {
        if (paused) {
            setPaused(false);
            startMic();
        } else {
            setPaused(true);
            stopMic();
            clearTimerInterval();
        }
    };

    const handleRestart = () => {
        clearTimerInterval();
        stopMic();
        setPhase('config');
        setPlates([]);
        setLevel(0);
        setQueue([]);
        setQIdx(0);
    };

    // Cleanup
    useEffect(() => {
        return () => {
            clearTimerInterval();
            stopMic();
        };
    }, []);

    // ── Derived values ────────────────────────
    const progressPct = queue.length > 0 ? (qIdx / queue.length) * 100 : 0;
    const currentTarget = queue[qIdx] || '';
    const timerPct = phase === 'showing'
        ? (timer / config.showNewPlateSecs) * 100
        : (timer / config.vocalTimeSecs) * 100;

    // Compute which rep of which plate we're on
    const currentPlateInQueue = queue[qIdx];
    const currentPlateOccurrences = queue.slice(0, qIdx + 1).filter(p => p === currentPlateInQueue).length;

    // ── Render ────────────────────────────────
    return (
        <div className="fixed inset-0 z-[300] bg-gray-950 flex overflow-hidden">

            {/* ── LEFT SIDEBAR: Plate timeline ── */}
            <div className="w-40 bg-gray-900/80 border-r border-white/5 flex flex-col py-6 px-3 overflow-y-auto custom-scrollbar shrink-0">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">Placas</p>

                {phase === 'config' || plates.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-gray-600 text-xs text-center">
                        Configure e inicie
                    </div>
                ) : (
                    <div className="space-y-3">
                        {plates.map((plate, i) => {
                            const isPast = i < level;
                            const isCurrent = i === level;
                            const isFuture = i > level;
                            return (
                                <div key={i} className={`flex flex-col items-center gap-1 transition-all duration-300 ${isFuture ? 'opacity-30' : ''}`}>
                                    <div className={`text-[8px] font-black uppercase tracking-widest ${isPast ? 'text-emerald-400' : isCurrent ? 'text-yellow-400' : 'text-gray-600'}`}>
                                        #{i + 1}
                                    </div>
                                    <PlateDisplay
                                        plate={plate}
                                        size="sm"
                                        hidden={isFuture}
                                        checked={isPast}
                                        active={isCurrent}
                                    />
                                    {isCurrent && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {Array.from({ length: config.repsPerPlate }).map((_, ri) => {
                                                const spoken = Math.min(qIdx - level * config.repsPerPlate, config.repsPerPlate);
                                                return (
                                                    <div key={ri} className={`w-1.5 h-1.5 rounded-full ${ri < spoken ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── CENTER: Main content ── */}
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
                >
                    <X size={18} />
                </button>

                {/* Config toggle */}
                {phase !== 'config' && (
                    <button
                        onClick={() => setShowConfig(v => !v)}
                        className="absolute top-4 right-16 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all z-10"
                    >
                        <Settings size={16} />
                    </button>
                )}

                {/* ── CONFIG SCREEN ── */}
                {phase === 'config' && (
                    <div className="max-h-screen overflow-y-auto w-full flex justify-center">
                        <ConfigPanel
                            config={config}
                            onChange={setConfig}
                            onStart={handleStart}
                        />
                    </div>
                )}

                {/* ── QUICK CONFIG OVERLAY ── */}
                {showConfig && phase !== 'config' && (
                    <div className="absolute inset-0 bg-gray-950/95 backdrop-blur z-20 flex items-center justify-center">
                        <div className="relative">
                            <button onClick={() => setShowConfig(false)} className="absolute -top-3 -right-3 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10">
                                <X size={14} />
                            </button>
                            <ConfigPanel config={config} onChange={setConfig} onStart={() => { setShowConfig(false); handleRestart(); setTimeout(handleStart, 100); }} />
                        </div>
                    </div>
                )}

                {/* ── SHOWING PHASE ── */}
                {phase === 'showing' && (
                    <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
                        <div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] text-center mb-2">Nova Placa — #{level + 1}</p>
                            <p className="text-gray-400 text-sm text-center">Memorize! Você terá {config.vocalTimeSecs}s para vocalizar</p>
                        </div>

                        <div className="animate-pulse-slow">
                            <PlateDisplay plate={plates[level]} size="xl" active />
                        </div>

                        {/* Countdown */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-400 rounded-full transition-all duration-1000"
                                    style={{ width: `${timerPct}%` }}
                                />
                            </div>
                            <p className="text-yellow-400 font-black text-2xl tabular-nums">{timer}s</p>
                            <p className="text-gray-500 text-xs">antes de começar a vocalização</p>
                        </div>
                    </div>
                )}

                {/* ── RECALL PHASE ── */}
                {phase === 'recall' && (
                    <div className="flex flex-col items-center gap-6 w-full max-w-xl px-6 animate-in fade-in duration-300">

                        {/* Progress bar */}
                        <div className="w-full space-y-1">
                            <div className="flex justify-between text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                <span>{qIdx}/{queue.length} vocalizações</span>
                                <span className={`tabular-nums ${timer <= 10 ? 'text-red-400 animate-pulse' : 'text-indigo-400'}`}>{timer}s</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                            </div>
                            {/* Timer bar */}
                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ${timer <= 10 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${timerPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Current target instruction */}
                        <div className="text-center space-y-1">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.25em]">
                                Repita em voz alta — {currentPlateOccurrences}/{config.repsPerPlate}
                            </p>
                            <p className="text-gray-300 text-sm">
                                Fale a placa: <span className="text-yellow-300 font-black">#{queue.indexOf(currentTarget) === -1 ? '?' : plates.indexOf(currentTarget) + 1}</span>
                            </p>
                        </div>

                        {/* Current target plate */}
                        <div className={`transition-all duration-150 ${feedback === 'correct' ? 'scale-105' : feedback === 'wrong' ? 'scale-95 opacity-50' : ''}`}>
                            <PlateDisplay plate={currentTarget} size="xl" active={!paused} />
                        </div>

                        {/* Feedback flash */}
                        {feedback && (
                            <div className={`text-sm font-black uppercase tracking-widest animate-in fade-in duration-100 ${feedback === 'correct' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {feedback === 'correct' ? '✓ Correto!' : '✗ Tente novamente'}
                            </div>
                        )}

                        {/* Queue mini preview */}
                        <div className="flex gap-2 items-center">
                            {queue.slice(qIdx, qIdx + 5).map((p, i) => (
                                <div key={i} className={`transition-all ${i === 0 ? 'scale-100' : 'scale-75 opacity-40'}`}>
                                    <PlateDisplay plate={p} size="sm" active={i === 0} />
                                </div>
                            ))}
                            {queue.length - qIdx > 5 && (
                                <span className="text-gray-600 font-black text-sm">+{queue.length - qIdx - 5}</span>
                            )}
                        </div>

                        {/* Transcript live */}
                        {transcript && (
                            <div className="bg-white/5 rounded-2xl px-4 py-2 border border-white/10">
                                <p className="text-gray-300 text-sm italic">"{transcript}"</p>
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center gap-3 w-full">
                            {/* Text input */}
                            <div className="flex-1 flex gap-2">
                                <input
                                    ref={textInputRef}
                                    value={textInput}
                                    onChange={e => setTextInput(e.target.value.toUpperCase())}
                                    onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                                    placeholder={currentTarget || 'Digite a placa...'}
                                    className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm font-black tracking-widest placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase"
                                    disabled={paused}
                                />
                                <button
                                    onClick={handleTextSubmit}
                                    disabled={!textInput.trim() || paused}
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-2xl font-black text-sm transition-all active:scale-95"
                                >
                                    OK
                                </button>
                            </div>

                            {/* Mic button */}
                            <button
                                onClick={() => micActive ? stopMic() : startMic()}
                                disabled={paused}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${micActive
                                    ? 'bg-red-500 shadow-red-500/30 animate-pulse'
                                    : 'bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white'
                                }`}
                            >
                                {micActive ? <Mic size={20} className="text-white" /> : <MicOff size={20} />}
                            </button>

                            {/* Pause */}
                            <button
                                onClick={handlePauseToggle}
                                className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-90"
                            >
                                {paused ? <Play size={20} /> : <Square size={20} />}
                            </button>
                        </div>

                        {paused && (
                            <p className="text-yellow-400 font-black text-sm uppercase tracking-widest animate-pulse">⏸ Pausado</p>
                        )}
                    </div>
                )}

                {/* ── SUCCESS PHASE ── */}
                {phase === 'success' && (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in-90 fade-in duration-300">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                            <Check size={40} className="text-emerald-400" strokeWidth={3} />
                        </div>
                        <div className="text-center">
                            <p className="text-emerald-400 font-black text-2xl uppercase tracking-tight">Nível {level + 1} Completo!</p>
                            <p className="text-gray-500 text-sm mt-1">Próxima placa em instantes…</p>
                        </div>
                    </div>
                )}

                {/* ── FAIL PHASE ── */}
                {phase === 'fail' && (
                    <div className="flex flex-col items-center gap-6 animate-in zoom-in-90 fade-in duration-300">
                        <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                            <AlertCircle size={40} className="text-red-400" strokeWidth={2} />
                        </div>
                        <div className="text-center">
                            <p className="text-red-400 font-black text-2xl uppercase tracking-tight">Tempo Esgotado!</p>
                            <p className="text-gray-500 text-sm mt-1">Repetindo nível {level + 1}…</p>
                        </div>
                        <PlateDisplay plate={plates[level] || ''} size="lg" />
                    </div>
                )}

                {/* ── COMPLETE PHASE ── */}
                {phase === 'complete' && (
                    <div className="flex flex-col items-center gap-8 animate-in zoom-in-90 fade-in duration-500">
                        <div className="w-24 h-24 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center">
                            <Trophy size={48} className="text-yellow-400" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                            <p className="text-yellow-400 font-black text-3xl uppercase tracking-tight">Treino Concluído!</p>
                            <p className="text-gray-400 text-sm mt-2">Você memorizou {plates.length} placas com sucesso.</p>
                        </div>

                        <div className="flex gap-4 flex-wrap justify-center">
                            {plates.map((p, i) => (
                                <PlateDisplay key={i} plate={p} size="sm" checked />
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleRestart}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-xl shadow-indigo-500/30"
                            >
                                <RotateCcw size={16} />
                                Novo Treino
                            </button>
                            <button
                                onClick={onClose}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
                            >
                                Sair
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LicensePlateMode;
