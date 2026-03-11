import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Play, Square, Settings, Check, Trophy, RotateCcw,
    AlertCircle, Zap, Clock, Target, Image as ImageIcon, ChevronLeft
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type DotShape = 'circle' | 'square' | 'char' | 'image';

interface DotConfig {
    totalLines: number;         // number of lines
    dotsPerLine: number;        // dots per line
    clicksPerDot: number;       // clicks needed to erase one dot
    totalTimeSecs: number;      // global countdown
    dotShape: DotShape;
    dotChar: string;            // character if shape === 'char'
    dotImageUrl: string;        // image URL if shape === 'image'
    dotColor: string;           // main color
    dotSize: number;            // px
}

interface DotState {
    clicks: number;             // clicks received so far
}

interface LineStats {
    lineIndex: number;
    durationMs: number;
    totalClicks: number;
    avgClickMs: number;         // average ms between clicks
}

type Phase = 'config' | 'playing' | 'fail' | 'complete';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const buildLines = (totalLines: number, dotsPerLine: number): DotState[][] =>
    Array.from({ length: totalLines }, () =>
        Array.from({ length: dotsPerLine }, () => ({ clicks: 0 }))
    );

// ─────────────────────────────────────────────
// Single Dot
// ─────────────────────────────────────────────
interface DotProps {
    state: DotState;
    config: DotConfig;
    isActive: boolean;
    onClick: () => void;
    justClicked: boolean;
}

const Dot: React.FC<DotProps> = ({ state, config, isActive, onClick, justClicked }) => {
    const progress = state.clicks / config.clicksPerDot;
    const erased = progress >= 1;
    const opacity = erased ? 0 : 1 - progress * 0.6;
    const scale = erased ? 0 : 1 - progress * 0.3;

    const sizeStyle: React.CSSProperties = {
        width: config.dotSize,
        height: config.dotSize,
        opacity: erased ? 0 : opacity,
        transform: `scale(${justClicked ? scale * 1.2 : scale})`,
        transition: 'all 0.12s ease',
        pointerEvents: (erased || !isActive) ? 'none' : 'auto',
        cursor: isActive && !erased ? 'pointer' : 'default',
        flexShrink: 0,
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!erased && isActive) onClick();
    };

    if (config.dotShape === 'image' && config.dotImageUrl) {
        return (
            <div style={sizeStyle} onClick={handleClick} className="relative select-none">
                <img
                    src={config.dotImageUrl}
                    alt="dot"
                    className="w-full h-full object-contain"
                    draggable={false}
                />
                {/* Click progress ring */}
                {state.clicks > 0 && !erased && (
                    <div
                        className="absolute inset-0 rounded-full border-2 border-yellow-400"
                        style={{ opacity: state.clicks / config.clicksPerDot }}
                    />
                )}
            </div>
        );
    }

    if (config.dotShape === 'char') {
        return (
            <div
                style={{ ...sizeStyle, fontSize: config.dotSize * 0.8, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', userSelect: 'none' }}
                onClick={handleClick}
                className={`font-black transition-all ${justClicked ? 'animate-ping-once' : ''}`}
            >
                <span style={{ color: config.dotColor, filter: `brightness(${1 + progress * 0.5})` }}>
                    {config.dotChar}
                </span>
            </div>
        );
    }

    // circle / square
    const radius = config.dotShape === 'circle' ? '50%' : config.dotShape === 'square' ? '4px' : '50%';
    return (
        <div
            style={{
                ...sizeStyle,
                backgroundColor: config.dotColor,
                borderRadius: radius,
                boxShadow: isActive && !erased ? `0 0 ${8 + (1 - progress) * 12}px ${config.dotColor}88` : 'none',
                filter: `brightness(${0.7 + (1 - progress) * 0.6})`,
            }}
            onClick={handleClick}
            className="select-none"
        />
    );
};

// ─────────────────────────────────────────────
// Config Panel
// ─────────────────────────────────────────────
interface ConfigPanelProps {
    config: DotConfig;
    onChange: (c: DotConfig) => void;
    onStart: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange, onStart }) => {
    const set = <K extends keyof DotConfig>(k: K, v: DotConfig[K]) => onChange({ ...config, [k]: v });

    const NumRow = ({ label, sub, k, min, max, step = 1, suffix = '' }: {
        label: string; sub?: string; k: keyof DotConfig; min: number; max: number; step?: number; suffix?: string;
    }) => (
        <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div>
                <p className="text-sm font-black text-gray-800">{label}</p>
                {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => set(k as any, Math.max(min, (config[k] as number) - step))}
                    className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 font-black text-gray-700 transition-all">−</button>
                <span className="w-12 text-center font-black text-gray-900 tabular-nums text-sm">{config[k] as number}{suffix}</span>
                <button onClick={() => set(k as any, Math.min(max, (config[k] as number) + step))}
                    className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 font-black text-gray-700 transition-all">+</button>
            </div>
        </div>
    );

    const totalDots = config.totalLines * config.dotsPerLine;
    const totalClicks = totalDots * config.clicksPerDot;

    return (
        <div className="max-w-md w-full mx-auto overflow-y-auto max-h-screen p-6 space-y-5">
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Novo Treino</p>
                <h2 className="text-2xl font-black text-gray-900 uppercase">Foco de Pontos</h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                    Treine coordenação motora, foco visual e atenção central eliminando pontos com cliques precisos.
                </p>
            </div>

            {/* Numbers */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-5 py-2">
                <NumRow label="Linhas" sub="Número de linhas de pontos" k="totalLines" min={1} max={50} />
                <NumRow label="Pontos por linha" sub="Pontos em cada linha" k="dotsPerLine" min={1} max={20} />
                <NumRow label="Cliques por ponto" sub="Cliques para apagar 1 ponto" k="clicksPerDot" min={1} max={10} />
                <NumRow label="Tempo total" sub="Cronômetro regressivo geral" k="totalTimeSecs" min={15} max={600} step={15} suffix="s" />
                <NumRow label="Tamanho do ponto" sub="Pixels" k="dotSize" min={16} max={80} step={4} suffix="px" />
            </div>

            {/* Dot visual */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aparência do Ponto</p>

                <div className="grid grid-cols-4 gap-2">
                    {(['circle', 'square', 'char', 'image'] as DotShape[]).map(shape => (
                        <button
                            key={shape}
                            onClick={() => set('dotShape', shape)}
                            className={`py-2 px-1 rounded-2xl border text-xs font-black uppercase transition-all ${config.dotShape === shape
                                ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                                : 'border-gray-100 text-gray-500 hover:border-indigo-200 hover:text-indigo-600'
                            }`}
                        >
                            {shape === 'circle' ? '⬤' : shape === 'square' ? '■' : shape === 'char' ? 'Char' : '🖼'}
                        </button>
                    ))}
                </div>

                {/* Color */}
                <div className="flex items-center gap-3">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Cor</label>
                    <div className="flex gap-2 flex-wrap">
                        {['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ffffff'].map(c => (
                            <button
                                key={c}
                                onClick={() => set('dotColor', c)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${config.dotColor === c ? 'border-gray-800 scale-125' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                        <input
                            type="color"
                            value={config.dotColor}
                            onChange={e => set('dotColor', e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                            title="Cor personalizada"
                        />
                    </div>
                </div>

                {/* Character input */}
                {config.dotShape === 'char' && (
                    <div className="flex items-center gap-3">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Caractere</label>
                        <div className="flex gap-1 flex-wrap">
                            {['★', '✦', '●', '♦', '▲', '♠', '♥', '✿', '⊕', '🎯'].map(c => (
                                <button key={c} onClick={() => set('dotChar', c)}
                                    className={`w-8 h-8 rounded-xl text-base transition-all ${config.dotChar === c ? 'bg-indigo-100 ring-2 ring-indigo-400' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            maxLength={2}
                            value={config.dotChar}
                            onChange={e => set('dotChar', e.target.value)}
                            className="w-10 h-8 text-center border border-gray-200 rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>
                )}

                {/* Image URL */}
                {config.dotShape === 'image' && (
                    <div>
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">URL da Imagem</label>
                        <input
                            type="url"
                            placeholder="https://..."
                            value={config.dotImageUrl}
                            onChange={e => set('dotImageUrl', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        {config.dotImageUrl && (
                            <img src={config.dotImageUrl} alt="" className="w-12 h-12 object-contain mt-2 rounded-xl border border-gray-100" />
                        )}
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 text-sm">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Resumo</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white rounded-xl p-2 border border-indigo-100">
                        <p className="text-lg font-black text-indigo-700">{totalDots}</p>
                        <p className="text-[9px] text-indigo-400 font-bold uppercase">Pontos</p>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-indigo-100">
                        <p className="text-lg font-black text-indigo-700">{totalClicks}</p>
                        <p className="text-[9px] text-indigo-400 font-bold uppercase">Cliques</p>
                    </div>
                    <div className="bg-white rounded-xl p-2 border border-indigo-100">
                        <p className="text-lg font-black text-indigo-700">{config.totalTimeSecs}s</p>
                        <p className="text-[9px] text-indigo-400 font-bold uppercase">Tempo</p>
                    </div>
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
interface DotFocusModeProps {
    onClose: () => void;
}

const DotFocusMode: React.FC<DotFocusModeProps> = ({ onClose }) => {
    const [config, setConfig] = useState<DotConfig>({
        totalLines: 10,
        dotsPerLine: 5,
        clicksPerDot: 3,
        totalTimeSecs: 120,
        dotShape: 'circle',
        dotChar: '★',
        dotImageUrl: '',
        dotColor: '#6366f1',
        dotSize: 40,
    });

    const [phase, setPhase] = useState<Phase>('config');
    const [lines, setLines] = useState<DotState[][]>([]);
    const [currentLine, setCurrentLine] = useState(0);
    const [timer, setTimer] = useState(0);
    const [justClickedDot, setJustClickedDot] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);

    // Stats
    const [lineStats, setLineStats] = useState<LineStats[]>([]);
    const [lineStartTime, setLineStartTime] = useState(0);
    const [clickTimestamps, setClickTimestamps] = useState<number[]>([]);
    const [globalStartTime, setGlobalStartTime] = useState(0);
    const [totalClicks, setTotalClicks] = useState(0);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPlayingRef = useRef(false);

    // ── Timer ─────────────────────────────────
    const clearTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
    };

    const startTimer = (secs: number) => {
        clearTimer();
        setTimer(secs);
        isPlayingRef.current = true;
        timerRef.current = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearTimer();
                    if (isPlayingRef.current) {
                        isPlayingRef.current = false;
                        setPhase('fail');
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    useEffect(() => () => clearTimer(), []);

    // ── Start ─────────────────────────────────
    const handleStart = () => {
        const newLines = buildLines(config.totalLines, config.dotsPerLine);
        setLines(newLines);
        setCurrentLine(0);
        setLineStats([]);
        setClickTimestamps([]);
        setTotalClicks(0);
        const now = Date.now();
        setGlobalStartTime(now);
        setLineStartTime(now);
        setPhase('playing');
        startTimer(config.totalTimeSecs);
    };

    // ── Click handler ─────────────────────────
    const handleDotClick = useCallback((lineIdx: number, dotIdx: number) => {
        if (phase !== 'playing' || lineIdx !== currentLine) return;

        const now = Date.now();
        const dotKey = `${lineIdx}-${dotIdx}`;
        setJustClickedDot(dotKey);
        setTimeout(() => setJustClickedDot(null), 120);

        setClickTimestamps(prev => [...prev, now]);
        setTotalClicks(c => c + 1);

        setLines(prev => {
            const next = prev.map(line => line.map(d => ({ ...d })));
            const dot = next[lineIdx][dotIdx];
            dot.clicks = Math.min(dot.clicks + 1, config.clicksPerDot);
            return next;
        });
    }, [phase, currentLine, config.clicksPerDot]);

    // ── Check if line is complete ─────────────
    useEffect(() => {
        if (phase !== 'playing' || lines.length === 0) return;

        const line = lines[currentLine];
        if (!line) return;

        const allErased = line.every(d => d.clicks >= config.clicksPerDot);
        if (!allErased) return;

        // Line complete!
        const now = Date.now();
        const duration = now - lineStartTime;
        const lineClicks = line.length * config.clicksPerDot;
        const avgClick = clickTimestamps.length > 1
            ? (clickTimestamps[clickTimestamps.length - 1] - clickTimestamps[0]) / (clickTimestamps.length - 1)
            : duration / lineClicks;

        const stat: LineStats = {
            lineIndex: currentLine,
            durationMs: duration,
            totalClicks: lineClicks,
            avgClickMs: avgClick,
        };

        setLineStats(prev => [...prev, stat]);
        setClickTimestamps([]);
        setLineStartTime(now);

        const nextLine = currentLine + 1;
        if (nextLine >= config.totalLines) {
            clearTimer();
            isPlayingRef.current = false;
            setPhase('complete');
        } else {
            setCurrentLine(nextLine);
        }
    }, [lines]);

    // ── Derived ───────────────────────────────
    const completedLines = lineStats.length;
    const progressPct = config.totalLines > 0 ? (completedLines / config.totalLines) * 100 : 0;
    const timerPct = (timer / config.totalTimeSecs) * 100;
    const avgClickMs = lineStats.length > 0
        ? lineStats.reduce((s, l) => s + l.avgClickMs, 0) / lineStats.length
        : null;
    const totalElapsed = phase === 'complete' ? Date.now() - globalStartTime : null;

    // ── Render ────────────────────────────────
    return (
        <div className="fixed inset-0 z-[300] bg-gray-950 overflow-hidden flex flex-col">
            {/* ── Top Bar ── */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X size={16} />
                    </button>
                    {phase === 'playing' && (
                        <div className="flex items-center gap-3">
                            <Target size={14} className="text-indigo-400" />
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                Linha <span className="text-white">{currentLine + 1}</span>/{config.totalLines}
                            </span>
                        </div>
                    )}
                </div>

                {phase === 'playing' && (
                    <div className="flex items-center gap-4">
                        {/* Timer */}
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border ${timer <= 15 ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : 'bg-white/5 border-white/10 text-white'}`}>
                            <Clock size={14} />
                            <span className="font-black text-base tabular-nums">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</span>
                        </div>
                        {/* Avg speed */}
                        {avgClickMs !== null && (
                            <div className="flex items-center gap-1 text-xs font-black text-gray-500">
                                <Zap size={12} className="text-yellow-400" />
                                <span className="text-yellow-400">{Math.round(avgClickMs)}ms</span>
                                <span className="text-gray-600">avg/click</span>
                            </div>
                        )}
                        <button onClick={() => setShowConfig(v => !v)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all">
                            <Settings size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Timer progress bar ── */}
            {phase === 'playing' && (
                <div className="w-full h-1 bg-white/5 shrink-0">
                    <div
                        className={`h-full transition-all duration-1000 ${timer <= 15 ? 'bg-red-500' : timer <= 30 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                        style={{ width: `${timerPct}%` }}
                    />
                </div>
            )}

            {/* ── Line progress bar ── */}
            {phase === 'playing' && (
                <div className="w-full h-0.5 bg-white/5 shrink-0">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
                </div>
            )}

            {/* ── Main Content ── */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">

                {/* CONFIG */}
                {(phase === 'config' || showConfig) && (
                    <div className={`${showConfig ? 'absolute inset-0 bg-gray-950/95 backdrop-blur z-20 overflow-y-auto' : ''}`}>
                        {showConfig && (
                            <button onClick={() => setShowConfig(false)} className="absolute top-4 left-4 z-30 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <div className="min-h-full flex items-start justify-center py-4">
                            <ConfigPanel
                                config={config}
                                onChange={setConfig}
                                onStart={() => { setShowConfig(false); handleStart(); }}
                            />
                        </div>
                    </div>
                )}

                {/* PLAYING */}
                {phase === 'playing' && !showConfig && (
                    <div className="p-4 sm:p-8 space-y-3 max-w-3xl mx-auto">
                        {lines.map((line, lineIdx) => {
                            const isActive = lineIdx === currentLine;
                            const isDone = lineIdx < currentLine;
                            const isFuture = lineIdx > currentLine;
                            const stat = lineStats[lineIdx];

                            return (
                                <div
                                    key={lineIdx}
                                    className={`flex items-center gap-3 rounded-2xl transition-all duration-300 px-4 py-3 ${isActive
                                        ? 'bg-white/5 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.1)]'
                                        : isDone
                                            ? 'bg-white/[0.02] border border-white/5 opacity-60'
                                            : 'opacity-20'
                                    }`}
                                >
                                    {/* Line number */}
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${isActive ? 'bg-indigo-500 text-white' : isDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-600'}`}>
                                        {isDone ? <Check size={12} strokeWidth={3} /> : lineIdx + 1}
                                    </div>

                                    {/* Dots */}
                                    <div className="flex gap-3 items-center flex-wrap flex-1">
                                        {line.map((dot, dotIdx) => (
                                            <div key={dotIdx} className="relative">
                                                <Dot
                                                    state={dot}
                                                    config={config}
                                                    isActive={isActive}
                                                    onClick={() => handleDotClick(lineIdx, dotIdx)}
                                                    justClicked={justClickedDot === `${lineIdx}-${dotIdx}`}
                                                />
                                                {/* Click progress pips */}
                                                {isActive && dot.clicks > 0 && dot.clicks < config.clicksPerDot && (
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                        {Array.from({ length: config.clicksPerDot }).map((_, ci) => (
                                                            <div key={ci} className={`w-1 h-1 rounded-full ${ci < dot.clicks ? 'bg-indigo-400' : 'bg-white/10'}`} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Line stats if done */}
                                    {isDone && stat && (
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] font-black text-emerald-400 tabular-nums">{(stat.durationMs / 1000).toFixed(1)}s</p>
                                            <p className="text-[8px] text-gray-600 tabular-nums">{Math.round(stat.avgClickMs)}ms/click</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* FAIL */}
                {phase === 'fail' && (
                    <div className="h-full flex flex-col items-center justify-center gap-8 p-8 animate-in fade-in zoom-in-90 duration-400">
                        <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                            <AlertCircle size={48} className="text-red-400" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                            <p className="text-red-400 font-black text-3xl uppercase">Tempo Esgotado!</p>
                            <p className="text-gray-500 mt-2">Você completou {completedLines} de {config.totalLines} linhas</p>
                        </div>
                        {/* Partial stats */}
                        {lineStats.length > 0 && <StatsPanel lineStats={lineStats} totalMs={config.totalTimeSecs * 1000} totalClicks={totalClicks} />}
                        <div className="flex gap-3">
                            <button onClick={handleStart} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/25 active:scale-95 transition-all">
                                <RotateCcw size={16} /> Tentar Novamente
                            </button>
                            <button onClick={() => setPhase('config')} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all">
                                Configurar
                            </button>
                        </div>
                    </div>
                )}

                {/* COMPLETE */}
                {phase === 'complete' && (
                    <div className="h-full flex flex-col items-center justify-center gap-8 p-8 animate-in fade-in zoom-in-90 duration-500">
                        <div className="w-24 h-24 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center">
                            <Trophy size={48} className="text-yellow-400" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                            <p className="text-yellow-400 font-black text-3xl uppercase">Treino Concluído!</p>
                            <p className="text-gray-400 mt-2">
                                {config.totalLines} linhas · {config.totalLines * config.dotsPerLine} pontos · {totalClicks} cliques
                            </p>
                            {totalElapsed && (
                                <p className="text-gray-500 text-sm mt-1">Tempo total: {(totalElapsed / 1000).toFixed(1)}s</p>
                            )}
                        </div>
                        <StatsPanel lineStats={lineStats} totalMs={totalElapsed || 0} totalClicks={totalClicks} />
                        <div className="flex gap-3">
                            <button onClick={handleStart} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-500/25 active:scale-95 transition-all">
                                <RotateCcw size={16} /> Novo Treino
                            </button>
                            <button onClick={onClose} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-gray-300 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all">
                                Sair
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────
// Stats Panel
// ─────────────────────────────────────────────
interface StatsPanelProps {
    lineStats: LineStats[];
    totalMs: number;
    totalClicks: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ lineStats, totalMs, totalClicks }) => {
    if (lineStats.length === 0) return null;

    const avgLineMs = lineStats.reduce((s, l) => s + l.durationMs, 0) / lineStats.length;
    const bestLine = lineStats.reduce((a, b) => a.durationMs < b.durationMs ? a : b);
    const avgClickSpeedMs = lineStats.reduce((s, l) => s + l.avgClickMs, 0) / lineStats.length;

    return (
        <div className="w-full max-w-md grid grid-cols-2 gap-3">
            {[
                { label: 'Tempo Médio/Linha', value: `${(avgLineMs / 1000).toFixed(2)}s`, icon: <Clock size={14} className="text-indigo-400" /> },
                { label: 'Velocidade Média', value: `${Math.round(avgClickSpeedMs)}ms`, sub: 'por clique', icon: <Zap size={14} className="text-yellow-400" /> },
                { label: 'Melhor Linha', value: `#${bestLine.lineIndex + 1} · ${(bestLine.durationMs / 1000).toFixed(2)}s`, icon: <Trophy size={14} className="text-emerald-400" /> },
                { label: 'Total de Cliques', value: totalClicks.toString(), icon: <Target size={14} className="text-rose-400" /> },
            ].map(({ label, value, sub, icon }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-start gap-2">
                    <div className="mt-0.5">{icon}</div>
                    <div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">{label}</p>
                        <p className="text-sm font-black text-white tabular-nums">{value}</p>
                        {sub && <p className="text-[9px] text-gray-600">{sub}</p>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default DotFocusMode;
