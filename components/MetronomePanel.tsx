import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Square, Music2, ChevronUp, ChevronDown } from 'lucide-react';

// Subdivisions: label + beats-per-second multiplier relative to base tempo
const SUBDIVISIONS = [
    { label: '1', value: 1,     display: '♩',   desc: 'Semínima (1/1)' },
    { label: '1/2', value: 0.5, display: '♪',   desc: 'Colcheia (1/2)' },
    { label: '1/4', value: 0.25, display: '♬',  desc: 'Semicolcheia (1/4)' },
    { label: '1/8', value: 0.125, display: '𝅘𝅥𝅯', desc: 'Fusa (1/8)' },
    { label: '1/16', value: 0.0625, display: '𝅘𝅥𝅰', desc: 'Semifusa (1/16)' },
];

interface MetronomePanelProps {
    onClose: () => void;
}

const MetronomePanel: React.FC<MetronomePanelProps> = ({ onClose }) => {
    const [bpm, setBpm] = useState(120);
    const [subdivisionIdx, setSubdivisionIdx] = useState(0); // default = 1 (whole beat)
    const [takEvery, setTakEvery] = useState(4);   // accent on every N-th beat
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(0); // visual beat indicator

    const audioCtxRef = useRef<AudioContext | null>(null);
    const schedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const nextBeatTimeRef = useRef<number>(0);
    const beatCountRef = useRef<number>(0);
    const bpmRef = useRef(bpm);
    const subdivisionRef = useRef(SUBDIVISIONS[subdivisionIdx]);
    const takEveryRef = useRef(takEvery);
    const isPlayingRef = useRef(false);
    const currentBeatRef = useRef(0);

    // Keep refs in sync
    useEffect(() => { bpmRef.current = bpm; }, [bpm]);
    useEffect(() => { subdivisionRef.current = SUBDIVISIONS[subdivisionIdx]; }, [subdivisionIdx]);
    useEffect(() => { takEveryRef.current = takEvery; }, [takEvery]);

    const getCtx = () => {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioCtxRef.current;
    };

    const scheduleClick = useCallback((time: number, isTak: boolean) => {
        const ctx = getCtx();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // TAK: higher pitch, louder. TIK: softer, lower
        oscillator.frequency.value = isTak ? 1200 : 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(isTak ? 0.9 : 0.5, time + 0.002);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + (isTak ? 0.08 : 0.05));

        oscillator.start(time);
        oscillator.stop(time + (isTak ? 0.1 : 0.07));
    }, []);

    const scheduler = useCallback(() => {
        if (!isPlayingRef.current) return;

        const ctx = getCtx();
        const lookAhead = 0.1; // seconds to schedule ahead
        const scheduleInterval = 50; // ms between scheduler calls

        while (nextBeatTimeRef.current < ctx.currentTime + lookAhead) {
            const beat = beatCountRef.current;
            const isTak = beat % takEveryRef.current === 0;

            scheduleClick(nextBeatTimeRef.current, isTak);

            // Visual indicator
            const capturedBeat = beat % takEveryRef.current;
            const capturedTime = nextBeatTimeRef.current;
            const delay = (capturedTime - ctx.currentTime) * 1000;
            setTimeout(() => {
                if (isPlayingRef.current) {
                    currentBeatRef.current = capturedBeat;
                    setCurrentBeat(capturedBeat);
                }
            }, Math.max(0, delay));

            // Advance time: interval = (subdivision value * 60) / bpm
            const secondsPerBeat = (subdivisionRef.current.value * 60) / bpmRef.current;
            nextBeatTimeRef.current += secondsPerBeat;
            beatCountRef.current = (beat + 1) % takEveryRef.current;
        }

        schedulerRef.current = setTimeout(scheduler, scheduleInterval);
    }, [scheduleClick]);

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
        if (schedulerRef.current) {
            clearTimeout(schedulerRef.current);
            schedulerRef.current = null;
        }
    }, []);

    // Restart when settings change while playing
    const restartIfPlaying = useCallback(() => {
        if (isPlayingRef.current) {
            stop();
            setTimeout(() => start(), 50);
        }
    }, [stop, start]);

    useEffect(() => { restartIfPlaying(); }, [bpm, subdivisionIdx, takEvery]);

    useEffect(() => {
        return () => {
            stop();
            audioCtxRef.current?.close();
        };
    }, []);

    const clampBpm = (val: number) => Math.min(300, Math.max(20, val));

    const beatDots = Array.from({ length: takEvery });

    return (
        <div
            className="w-80 bg-white/98 backdrop-blur-2xl rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-50">
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

                {/* Beat Visualizer */}
                <div className="flex items-center justify-center gap-2 h-10">
                    {beatDots.map((_, i) => (
                        <div
                            key={i}
                            className={`rounded-full transition-all duration-75 ${i === 0
                                ? `${currentBeat === i && isPlaying ? 'w-5 h-5 bg-violet-500 shadow-lg shadow-violet-500/50 scale-125' : 'w-4 h-4 bg-violet-200 border-2 border-violet-300'}`
                                : `${currentBeat === i && isPlaying ? 'w-4 h-4 bg-blue-400 shadow-md shadow-blue-400/40 scale-110' : 'w-3 h-3 bg-gray-200'}`
                            }`}
                        />
                    ))}
                </div>

                {/* BPM Control */}
                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Velocidade (BPM)</span>
                        <span className={`text-lg font-black tabular-nums ${isPlaying ? 'text-violet-600' : 'text-gray-800'}`}>{bpm}</span>
                    </div>
                    <input
                        type="range"
                        min={20} max={300} step={1}
                        value={bpm}
                        onChange={e => setBpm(Number(e.target.value))}
                        className="w-full h-1.5 appearance-none rounded-full cursor-pointer accent-violet-500"
                        style={{ background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((bpm - 20) / 280) * 100}%, #e5e7eb ${((bpm - 20) / 280) * 100}%, #e5e7eb 100%)` }}
                    />
                    <div className="flex justify-between mt-2">
                        {[40, 60, 80, 100, 120, 160, 200].map(v => (
                            <button key={v}
                                onClick={() => setBpm(v)}
                                className={`text-[8px] font-black px-1.5 py-0.5 rounded-md transition-all ${bpm === v ? 'bg-violet-500 text-white' : 'text-gray-400 hover:text-violet-600 hover:bg-violet-50'}`}
                            >{v}</button>
                        ))}
                    </div>

                    {/* Fine +/- controls */}
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
                            <button
                                key={s.label}
                                onClick={() => setSubdivisionIdx(i)}
                                title={s.desc}
                                className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-all text-center ${subdivisionIdx === i
                                    ? 'bg-violet-500 border-violet-400 text-white shadow-lg shadow-violet-500/20'
                                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-violet-200 hover:text-violet-600'
                                }`}
                            >
                                <span className="text-base leading-none mb-0.5">{s.display}</span>
                                <span className="text-[8px] font-black uppercase">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* TAK every N beats */}
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                        Compasso — TAK a cada <span className="text-violet-600">{takEvery}</span> tempos
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="range"
                            min={2} max={16} step={1}
                            value={takEvery}
                            onChange={e => setTakEvery(Number(e.target.value))}
                            className="flex-1 h-1.5 appearance-none rounded-full cursor-pointer accent-violet-500"
                            style={{ background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((takEvery - 2) / 14) * 100}%, #e5e7eb ${((takEvery - 2) / 14) * 100}%, #e5e7eb 100%)` }}
                        />
                        <div className="flex gap-1">
                            {[2, 3, 4, 6, 8, 12].map(v => (
                                <button key={v}
                                    onClick={() => setTakEvery(v)}
                                    className={`text-[8px] font-black w-6 h-6 rounded-lg transition-all ${takEvery === v ? 'bg-violet-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-600'}`}
                                >{v}</button>
                            ))}
                        </div>
                    </div>
                    {/* Pattern preview */}
                    <div className="mt-2 flex items-center gap-1 flex-wrap">
                        {Array.from({ length: Math.min(takEvery * 2, 16) }).map((_, i) => {
                            const isTak = i % takEvery === 0;
                            return (
                                <span key={i} className={`text-[10px] font-black ${isTak ? 'text-violet-600' : 'text-gray-300'}`}>
                                    {isTak ? 'TAK' : 'tik'}
                                </span>
                            );
                        })}
                        {takEvery * 2 > 16 && <span className="text-[9px] text-gray-300">…</span>}
                    </div>
                </div>

                {/* Play/Stop Button */}
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
                        {bpm} BPM · {SUBDIVISIONS[subdivisionIdx].desc} · TAK a cada {takEvery} tempos
                    </p>
                )}
            </div>
        </div>
    );
};

export default MetronomePanel;
