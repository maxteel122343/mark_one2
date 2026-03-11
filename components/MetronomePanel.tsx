import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { X, Play, Square, Music2, ChevronUp, ChevronDown, Settings, Wifi, Bell } from 'lucide-react';

// ─────────────────────────────────────────────
// Subdivisions
// ─────────────────────────────────────────────
const SUBDIVISIONS = [
    { label: '1',    value: 1,        display: '♩',   desc: 'Semínima (1/1)' },
    { label: '1/2',  value: 0.5,      display: '♪',   desc: 'Colcheia (1/2)' },
    { label: '1/4',  value: 0.25,     display: '♬',   desc: 'Semicolcheia (1/4)' },
    { label: '1/8',  value: 0.125,    display: '♫',   desc: 'Fusa (1/8)' },
    { label: '1/16', value: 0.0625,   display: '𝅘𝅥𝅰',  desc: 'Semifusa (1/16)' },
];

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface MetronomeHandle {
    triggerForCard: () => void;
    isCardTriggerEnabled: () => boolean;
}

interface MetronomeProps {
    isVisible: boolean;
    onClose: () => void;
}

// ─────────────────────────────────────────────
// Audio helpers
// ─────────────────────────────────────────────
type SoundType = 'tik' | 'tak' | 'tummm';

function scheduleSoundFn(ctx: AudioContext, time: number, type: SoundType) {
    if (type === 'tik') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.45, time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        osc.start(time); osc.stop(time + 0.07);

    } else if (type === 'tak') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 1200;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.9, time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        osc.start(time); osc.stop(time + 0.11);

    } else if (type === 'tummm') {
        // Tibetan bowl: multiple harmonics, long resonance
        const freqs   = [110, 220, 330, 550, 660];
        const amps    = [0.5, 0.28, 0.15, 0.08, 0.05];
        const decays  = [2.2, 1.8, 1.4, 1.0, 0.8];

        freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.connect(gain);
            gain.connect(filter);
            filter.connect(ctx.destination);
            filter.type = 'lowpass';
            filter.frequency.value = 900;
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(amps[i], time + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, time + decays[i]);
            osc.start(time);
            osc.stop(time + decays[i] + 0.05);
        });
    }
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
const MetronomePanel = forwardRef<MetronomeHandle, MetronomeProps>(({ isVisible, onClose }, ref) => {
    const [bpm, setBpm] = useState(120);
    const [subdivisionIdx, setSubdivisionIdx] = useState(0);
    const [takEvery, setTakEvery] = useState(4);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(0);

    // Feature toggles
    const [backgroundMode, setBackgroundMode] = useState(false);
    const [cardTriggerEnabled, setCardTriggerEnabled] = useState(false);
    const [tummmEnabled, setTummmEnabled] = useState(false);

    // Refs for scheduler
    const audioCtxRef       = useRef<AudioContext | null>(null);
    const schedulerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nextBeatTimeRef   = useRef(0);
    const beatCountRef      = useRef(0);
    const isPlayingRef      = useRef(false);
    const bpmRef            = useRef(bpm);
    const subdivisionRef    = useRef(SUBDIVISIONS[subdivisionIdx]);
    const takEveryRef       = useRef(takEvery);
    const tummmEnabledRef   = useRef(tummmEnabled);
    const backgroundModeRef = useRef(backgroundMode);
    const cardTriggerRef    = useRef(cardTriggerEnabled);

    // Keep refs in sync
    useEffect(() => { bpmRef.current = bpm; }, [bpm]);
    useEffect(() => { subdivisionRef.current = SUBDIVISIONS[subdivisionIdx]; }, [subdivisionIdx]);
    useEffect(() => { takEveryRef.current = takEvery; }, [takEvery]);
    useEffect(() => { tummmEnabledRef.current = tummmEnabled; }, [tummmEnabled]);
    useEffect(() => { backgroundModeRef.current = backgroundMode; }, [backgroundMode]);
    useEffect(() => { cardTriggerRef.current = cardTriggerEnabled; }, [cardTriggerEnabled]);

    const getCtx = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioCtxRef.current;
    };

    const scheduler = useCallback(() => {
        if (!isPlayingRef.current) return;
        const ctx = getCtx();
        const lookAhead = 0.1;
        const scheduleMs = 50;

        while (nextBeatTimeRef.current < ctx.currentTime + lookAhead) {
            const beat = beatCountRef.current;
            const beatInCycle = beat % takEveryRef.current;
            const isTak   = beatInCycle === 0;
            const isTummm = tummmEnabledRef.current && beatInCycle === 1;
            const soundType: SoundType = isTak ? 'tak' : isTummm ? 'tummm' : 'tik';

            scheduleSoundFn(ctx, nextBeatTimeRef.current, soundType);

            // Visual indicator update
            const capturedBeat = beatInCycle;
            const capturedTime = nextBeatTimeRef.current;
            const delay = (capturedTime - ctx.currentTime) * 1000;
            setTimeout(() => {
                if (isPlayingRef.current) setCurrentBeat(capturedBeat);
            }, Math.max(0, delay));

            const secsPerBeat = (subdivisionRef.current.value * 60) / bpmRef.current;
            nextBeatTimeRef.current += secsPerBeat;
            beatCountRef.current = beat + 1;
        }
        schedulerRef.current = setTimeout(scheduler, scheduleMs);
    }, []);

    const start = useCallback(() => {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
        isPlayingRef.current = true;
        beatCountRef.current = 0;
        nextBeatTimeRef.current = ctx.currentTime + 0.05;
        setIsPlaying(true);
        setCurrentBeat(0);
        scheduler();
    }, [scheduler]);

    const stop = useCallback(() => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setCurrentBeat(0);
        if (schedulerRef.current) { clearTimeout(schedulerRef.current); schedulerRef.current = null; }
    }, []);

    // Restart when key settings change
    const restartIfPlaying = useCallback(() => {
        if (isPlayingRef.current) { stop(); setTimeout(() => start(), 50); }
    }, [stop, start]);

    useEffect(() => { restartIfPlaying(); }, [bpm, subdivisionIdx, takEvery, tummmEnabled]);

    // Cleanup — respect backgroundMode
    useEffect(() => {
        return () => {
            if (!backgroundModeRef.current) {
                stop();
                audioCtxRef.current?.close();
            }
        };
    }, []);

    // Expose imperative handle to App
    useImperativeHandle(ref, () => ({
        triggerForCard: () => {
            if (cardTriggerRef.current && !isPlayingRef.current) {
                start();
            }
        },
        isCardTriggerEnabled: () => cardTriggerRef.current,
    }), [start]);

    const clampBpm = (v: number) => Math.min(300, Math.max(20, v));

    // ── Toggle component ──────────────────────
    const Toggle = ({ label, sub, value, onChange, color = 'violet' }: {
        label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; color?: string;
    }) => {
        const colors: Record<string, string> = {
            violet: value ? 'bg-violet-500' : 'bg-gray-200',
            blue:   value ? 'bg-blue-500'   : 'bg-gray-200',
            amber:  value ? 'bg-amber-500'  : 'bg-gray-200',
        };
        return (
            <div className="flex items-center justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div>
                    <p className="text-xs font-black text-gray-700">{label}</p>
                    {sub && <p className="text-[9px] text-gray-400 leading-tight">{sub}</p>}
                </div>
                <button
                    onClick={() => onChange(!value)}
                    className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${colors[color] || colors.violet}`}
                >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${value ? 'left-5' : 'left-0.5'}`} />
                </button>
            </div>
        );
    };

    const beatDots = Array.from({ length: takEvery });

    if (!isVisible) return null;

    return (
        <div
            className="w-80 bg-white/98 backdrop-blur-2xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50 sticky top-0 bg-white/98 z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg transition-all ${isPlaying ? 'bg-violet-500 shadow-violet-500/30' : 'bg-gray-100'}`}>
                        <Music2 size={18} className={isPlaying ? 'text-white' : 'text-gray-500'} />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-0.5">Canvas</p>
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight">Metrônomo</p>
                    </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900">
                    <X size={16} />
                </button>
            </div>

            <div className="p-5 space-y-5">
                {/* Beat visualizer */}
                <div className="flex items-center justify-center gap-2 h-10">
                    {beatDots.map((_, i) => {
                        const isTak   = i === 0;
                        const isTummm = tummmEnabled && i === 1;
                        return (
                            <div
                                key={i}
                                className={`rounded-full transition-all duration-75 ${
                                    isTak
                                        ? currentBeat === i && isPlaying
                                            ? 'w-5 h-5 bg-violet-500 shadow-lg shadow-violet-500/50 scale-125'
                                            : 'w-4 h-4 bg-violet-200 border-2 border-violet-300'
                                        : isTummm
                                            ? currentBeat === i && isPlaying
                                                ? 'w-5 h-5 bg-amber-500 shadow-lg shadow-amber-500/50 scale-125'
                                                : 'w-4 h-4 bg-amber-200 border-2 border-amber-300'
                                            : currentBeat === i && isPlaying
                                                ? 'w-4 h-4 bg-blue-400 shadow-md shadow-blue-400/40 scale-110'
                                                : 'w-3 h-3 bg-gray-200'
                                }`}
                            />
                        );
                    })}
                </div>

                {/* BPM */}
                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Velocidade (BPM)</span>
                        <span className={`text-lg font-black tabular-nums ${isPlaying ? 'text-violet-600' : 'text-gray-800'}`}>{bpm}</span>
                    </div>
                    <input
                        type="range" min={20} max={300} step={1} value={bpm}
                        onChange={e => setBpm(Number(e.target.value))}
                        className="w-full h-1.5 appearance-none rounded-full cursor-pointer accent-violet-500"
                        style={{ background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((bpm - 20) / 280) * 100}%, #e5e7eb ${((bpm - 20) / 280) * 100}%, #e5e7eb 100%)` }}
                    />
                    <div className="flex justify-between mt-2">
                        {[40, 60, 80, 100, 120, 160, 200].map(v => (
                            <button key={v} onClick={() => setBpm(v)}
                                className={`text-[8px] font-black px-1.5 py-0.5 rounded-md transition-all ${bpm === v ? 'bg-violet-500 text-white' : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50'}`}>
                                {v}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-3">
                        <button onClick={() => setBpm(b => clampBpm(b - 5))} className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm active:scale-95">
                            <ChevronDown size={16} />
                        </button>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">±5</span>
                        <button onClick={() => setBpm(b => clampBpm(b + 5))} className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-violet-600 hover:border-violet-200 transition-all shadow-sm active:scale-95">
                            <ChevronUp size={16} />
                        </button>
                    </div>
                </div>

                {/* Subdivision */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Subdivisão (tempo)</p>
                    <div className="grid grid-cols-5 gap-1.5">
                        {SUBDIVISIONS.map((s, i) => (
                            <button key={s.label} onClick={() => setSubdivisionIdx(i)} title={s.desc}
                                className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-all text-center ${subdivisionIdx === i
                                    ? 'bg-violet-500 border-violet-400 text-white shadow-lg shadow-violet-500/20'
                                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-violet-200 hover:text-violet-600'
                                }`}>
                                <span className="text-base leading-none mb-0.5">{s.display}</span>
                                <span className="text-[8px] font-black uppercase">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* TAK every N */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Compasso — TAK a cada <span className="text-violet-600">{takEvery}</span> tempos
                    </p>
                    <div className="flex items-center gap-2">
                        <input type="range" min={2} max={16} step={1} value={takEvery}
                            onChange={e => setTakEvery(Number(e.target.value))}
                            className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer accent-violet-500"
                            style={{ background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((takEvery - 2) / 14) * 100}%, #e5e7eb ${((takEvery - 2) / 14) * 100}%, #e5e7eb 100%)` }}
                        />
                        <div className="flex gap-1">
                            {[2, 3, 4, 6, 8, 12].map(v => (
                                <button key={v} onClick={() => setTakEvery(v)}
                                    className={`text-[8px] font-black w-6 h-6 rounded-lg transition-all ${takEvery === v ? 'bg-violet-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-600'}`}>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Pattern preview */}
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                        {Array.from({ length: Math.min(takEvery * 2, 16) }).map((_, i) => {
                            const beatInCycle = i % takEvery;
                            const isTak   = beatInCycle === 0;
                            const isTummm = tummmEnabled && beatInCycle === 1;
                            return (
                                <span key={i} className={`text-[10px] font-black ${isTak ? 'text-violet-600' : isTummm ? 'text-amber-500' : 'text-gray-300'}`}>
                                    {isTak ? 'TAK' : isTummm ? 'TUM' : 'tik'}
                                </span>
                            );
                        })}
                    </div>
                </div>

                {/* Feature Toggles */}
                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-0">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Comportamento</p>
                    <Toggle
                        label="Som TUMMM (tigela tibetana)"
                        sub={`Após TAK: tik tik TAK TUMMM tik tik TAK…`}
                        value={tummmEnabled}
                        onChange={setTummmEnabled}
                        color="amber"
                    />
                    <Toggle
                        label="Modo background"
                        sub="Continua tocando quando o painel for fechado"
                        value={backgroundMode}
                        onChange={setBackgroundMode}
                        color="blue"
                    />
                    <Toggle
                        label="Ativa ao iniciar card"
                        sub="Metrônomo inicia automaticamente quando um card é ativado"
                        value={cardTriggerEnabled}
                        onChange={setCardTriggerEnabled}
                        color="violet"
                    />
                </div>

                {/* Play/Stop */}
                <button
                    onClick={isPlaying ? stop : start}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.98] ${isPlaying
                        ? 'bg-red-500 text-white shadow-red-500/25 hover:bg-red-600'
                        : 'bg-violet-500 text-white shadow-violet-500/25 hover:bg-violet-600'
                    }`}
                >
                    {isPlaying
                        ? <><Square size={16} strokeWidth={3} /><span>Parar</span></>
                        : <><Play size={16} strokeWidth={3} className="translate-x-0.5" /><span>Iniciar</span></>
                    }
                </button>

                {isPlaying && (
                    <p className="text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                        {bpm} BPM · {SUBDIVISIONS[subdivisionIdx].desc} · TAK/{takEvery}
                        {tummmEnabled && ' · 🔔 TUMMM'}
                        {backgroundMode && ' · 🔵 BG'}
                    </p>
                )}
            </div>
        </div>
    );
});

MetronomePanel.displayName = 'MetronomePanel';
export default MetronomePanel;
