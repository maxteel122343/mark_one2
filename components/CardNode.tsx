
import React, { useState, useRef, useEffect } from 'react';
import { CardData, Attachment, CardVisualSettings, CardBehaviorSettings, CardShape, CardColor, PomodoroConfig, PomodoroLap, CardPaneElement, CompletionRecord } from '../types';
import PizzaTimer from './PizzaTimer';
import { MoreHorizontal, Image as ImageIcon, Trash2, CheckCircle, Wand2, Info, X, Clock, Calendar, Check, Mic, Paperclip, Music, Tag, Link, ArrowRight, Ban, Play, PauseCircle, Hourglass, Coffee, Layers, Activity, Settings, Hexagon, Circle, Square, Diamond, Palette, ImageOff, CornerDownRight, StickyNote, ChevronDown, ChevronRight, PlusCircle, Target, Maximize2, Edit3, Search, Timer, StopCircle, RotateCcw, List, Monitor, Presentation, Salad, ListVideo, Clapperboard, Waves, Share2, Heart, ChevronLeft, FileText, Camera, Video, MapPin, Upload, Plus, Zap, ChevronUp, Pin, AlertCircle, ChevronDown as ChevronDownIcon, ClipboardCheck } from 'lucide-react';
import CardSettingsPopover from './CardSettingsPopover';
import { generateCardImage, breakDownTask, analyzePomodoroLap } from '../services/geminiService';

interface CardNodeProps {
    card: CardData;
    visualSettings?: CardVisualSettings;
    behaviorSettings?: CardBehaviorSettings;
    isSelected: boolean;
    isActiveTask: boolean;
    isNextTask: boolean;
    onUpdate: (id: string, updates: Partial<CardData>) => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
    onStartDrag: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
    onConnectStart: (id: string, e: React.MouseEvent) => void;
    onConnectEnd: (id: string) => void;
    onBreakdown: (id: string, steps: any[]) => void;
    onSnooze?: (id: string, metadata?: { startedAt?: number, endedAt?: number, idleDuration?: number }) => void;
    onSkip?: (id: string, metadata?: { startedAt?: number, endedAt?: number, idleDuration?: number }) => void;
    onCompleteTask: (id: string, metadata?: { startedAt?: number, endedAt?: number, idleDuration?: number }) => void;
    onIncompleteTask?: (id: string, metadata?: { startedAt?: number, endedAt?: number, idleDuration?: number }) => void;
    onMicroTaskComplete?: (id: string) => void;
    onAutoDuration?: (id: string) => void;
    onTimerClick?: (id: string) => void;
    connectionCount?: number;
    onAddSubCard: (parentId: string) => void;
    onResizeStart?: (e: React.MouseEvent, cardId: string, handle: string) => void;
    attachedNotes?: CardData[];
    childrenCount?: number;
    onAddNoteToCard?: (parentId: string) => void;
    onCenterView?: (id: string, zoom?: number) => void;
    onSchedule?: (cardId: string) => void;
    onPostponeAi?: (cardId: string) => void;
    onShare?: (cardId: string) => void;
    onLike?: (cardId: string) => void;
    isDragging?: boolean;
    isMobile?: boolean;
}

// ====================================================
// CardCalendar Component â€” Inline Agenda for CardNode
// ====================================================
interface CardCalendarProps {
    events: Record<string, string[]>; // { "YYYY-MM-DD": ["07:00: ReuniÃ£o", ...] }
    onEventsChange: (events: Record<string, string[]>) => void;
    isEditing: boolean;
    cardColor: string;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00 â†’ 23:00

const fmtDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const CardCalendar: React.FC<CardCalendarProps> = ({ events, onEventsChange, isEditing, cardColor }) => {
    const [viewDate, setViewDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [editingSlot, setEditingSlot] = useState<string | null>(null);
    const [draftText, setDraftText] = useState('');

    const accentColor: Record<string, string> = {
        red: '#ef4444', yellow: '#eab308', purple: '#a855f7',
        blue: '#3b82f6', green: '#22c55e', gray: '#6b7280', white: '#ffffff'
    };
    const accent = accentColor[cardColor] || '#6b7280';

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = fmtDateKey(new Date());

    const prevMonth = (e: React.MouseEvent) => { e.stopPropagation(); setViewDate(new Date(year, month - 1, 1)); setSelectedDate(null); };
    const nextMonth = (e: React.MouseEvent) => { e.stopPropagation(); setViewDate(new Date(year, month + 1, 1)); setSelectedDate(null); };
    const prevYear = (e: React.MouseEvent) => { e.stopPropagation(); setViewDate(new Date(year - 1, month, 1)); setSelectedDate(null); };
    const nextYear = (e: React.MouseEvent) => { e.stopPropagation(); setViewDate(new Date(year + 1, month, 1)); setSelectedDate(null); };

    const monthNames = ['Janeiro', 'Fevereiro', 'MarÃ§o', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    const commitSlot = (slotKey: string) => {
        if (!selectedDate) return;
        const existing = events[selectedDate] || [];
        const filtered = existing.filter(ev => !ev.startsWith(slotKey + ':'));
        const newList = draftText.trim() ? [...filtered, `${slotKey}: ${draftText.trim()}`] : filtered;
        const newEvents = { ...events };
        if (newList.length === 0) { delete newEvents[selectedDate]; } else { newEvents[selectedDate] = newList; }
        onEventsChange(newEvents);
        setEditingSlot(null);
        setDraftText('');
    };

    const getSlotText = (hour: number): string => {
        if (!selectedDate) return '';
        const slotKey = `${String(hour).padStart(2, '0')}:00`;
        const entry = (events[selectedDate] || []).find(ev => ev.startsWith(slotKey + ':'));
        return entry ? entry.slice(slotKey.length + 2) : '';
    };

    const hasEvents = (dayKey: string) => !!(events[dayKey] && events[dayKey].length > 0);

    const formatDayFull = (key: string) => {
        const [y, m, d] = key.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div
            className="w-full flex flex-col rounded-2xl overflow-hidden border border-gray-100 mb-4 animate-in fade-in duration-500 shadow-sm"
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', minHeight: 280 }}
            onClick={e => e.stopPropagation()}
        >
            {!selectedDate ? (
                <div className="flex flex-col p-2 select-none">
                    <div className="flex items-center justify-between mb-2 px-2 py-1">
                        <button onClick={prevYear} className="text-gray-300 hover:text-gray-900 text-[10px] px-2 py-1 rounded-lg transition-all">Â«</button>
                        <button onClick={prevMonth} className="text-gray-400 hover:text-gray-900 p-1 rounded-lg transition-all"><ChevronLeft size={16} /></button>
                        <span className="text-gray-900 font-black text-xs tracking-tighter uppercase">{monthNames[month]} {year}</span>
                        <button onClick={nextMonth} className="text-gray-400 hover:text-gray-900 p-1 rounded-lg transition-all"><ChevronRight size={16} /></button>
                        <button onClick={nextYear} className="text-gray-300 hover:text-gray-900 text-[10px] px-2 py-1 rounded-lg transition-all">Â»</button>
                    </div>
                    <div className="grid grid-cols-7 mb-1">
                        {dayLabels.map((d, i) => (
                            <div key={i} className="text-center text-[9px] text-gray-500 font-bold py-0.5">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                        {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const isToday = dayKey === todayKey;
                            const hasDot = hasEvents(dayKey);
                            return (
                                <button key={day} onClick={(e) => { e.stopPropagation(); setSelectedDate(dayKey); }}
                                    className="relative flex flex-col items-center justify-center h-8 rounded-xl transition-all duration-200 hover:bg-gray-50 group/day"
                                    style={{ background: isToday ? accent : undefined }}
                                >
                                    <span className="text-[11px] font-black" style={{ color: isToday ? '#fff' : '#4b5563' }}>{day}</span>
                                    {hasDot && <span className="absolute bottom-1 w-1 h-1 rounded-full shadow-sm" style={{ background: isToday ? '#fff' : accent }} />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col" style={{ maxHeight: 340, overflowY: 'auto' }}>
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 sticky top-0 z-10 border-b border-gray-100" style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(8px)' }}>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedDate(null); setEditingSlot(null); }}
                            className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                            <ChevronLeft size={14} /> Voltar
                        </button>
                        <div className="flex flex-col items-center">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
                                {formatDayFull(selectedDate).split(',')[0].toUpperCase()}
                            </span>
                            <span className="text-gray-900 font-black text-sm tracking-tight">{parseInt(selectedDate.split('-')[2])} {monthNames[parseInt(selectedDate.split('-')[1]) - 1]}</span>
                        </div>
                        <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                            {(events[selectedDate]?.length || 0)}
                        </div>
                    </div>
                    <div className="flex flex-col divide-y divide-white/5 px-1 pb-2">
                        {HOURS.map(hour => {
                            const slotKey = `${String(hour).padStart(2, '0')}:00`;
                            const isNowHour = selectedDate === todayKey && new Date().getHours() === hour;
                            const slotText = getSlotText(hour);
                            const isThisEditing = editingSlot === slotKey;
                            const displayHour = hour > 12 ? hour - 12 : hour;
                            const ampm = hour >= 12 ? 'PM' : 'AM';
                            return (
                                <div key={slotKey}
                                    className="relative flex items-start gap-4 py-2 px-3 group/slot hover:bg-gray-50 transition-all cursor-text rounded-xl mx-1"
                                    style={isNowHour ? { backgroundColor: `${accent}08`, borderLeft: `3px solid ${accent}` } : {}}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (editingSlot && editingSlot !== slotKey) commitSlot(editingSlot);
                                        setEditingSlot(slotKey);
                                        setDraftText(slotText);
                                    }}
                                >
                                    <span className="text-[10px] shrink-0 font-black w-12 text-right pt-0.5 tracking-tighter"
                                        style={{ color: isNowHour ? accent : '#9ca3af' }}>
                                        {displayHour} {ampm}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        {isThisEditing ? (
                                            <input autoFocus value={draftText}
                                                onChange={e => setDraftText(e.target.value)}
                                                onBlur={() => commitSlot(slotKey)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') { e.preventDefault(); commitSlot(slotKey); }
                                                    if (e.key === 'Escape') { setEditingSlot(null); setDraftText(''); }
                                                    e.stopPropagation();
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                className="w-full bg-transparent text-gray-900 text-xs font-bold focus:outline-none placeholder-gray-300 border-b border-gray-100 pb-1"
                                                placeholder="Nova tarefa..."
                                                style={{ fontSize: 11 }}
                                            />
                                        ) : slotText ? (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-block w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ background: accent }} />
                                                <span className="text-gray-700 text-xs font-bold truncate" style={{ fontSize: 11 }}>{slotText}</span>
                                            </div>
                                        ) : (
                                            <div className="h-[1px] bg-gray-100 mt-2 group-hover/slot:bg-blue-100 transition-colors rounded-full" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const CardNode: React.FC<CardNodeProps> = React.memo(({
    card,
    visualSettings,
    behaviorSettings,
    isSelected,
    isActiveTask,
    isNextTask,
    onUpdate,
    onDelete,
    onSelect,
    onStartDrag,
    onConnectStart,
    onConnectEnd,
    onBreakdown,
    onSnooze,
    onSkip,
    onCompleteTask,
    onIncompleteTask,
    onMicroTaskComplete,
    onAutoDuration,
    onTimerClick,
    connectionCount = 0,
    onAddSubCard,
    onResizeStart,
    attachedNotes = [],
    childrenCount = 0,
    onAddNoteToCard,
    onCenterView,
    onSchedule,
    onPostponeAi,
    onShare,
    onLike,
    isDragging = false,
    isMobile = false,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const [isBreakingDown, setIsBreakingDown] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [tempTag, setTempTag] = useState('');
    const [justDetectedNumber, setJustDetectedNumber] = useState<number | null>(null);
    const [lastInteraction, setLastInteraction] = useState(Date.now());
    const [isSlideActive, setIsSlideActive] = useState(false);
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [showSlideSettings, setShowSlideSettings] = useState(false);
    const [showCompletionHistory, setShowCompletionHistory] = useState(false);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);


    // Timing Phases: 'idle' | 'pre-active' (Warmup) | 'active' (Working) | 'paused' | 'post-active' (Cooldown) | 'finished'
    const [phase, setPhase] = useState<'idle' | 'pre-active' | 'active' | 'paused' | 'post-active' | 'finished'>('idle');
    const [subTimer, setSubTimer] = useState(0); // Used for pre-time and post-time countdowns
    const [pausesTaken, setPausesTaken] = useState(0);

    // Overtime Tracking (Negative Time)
    const [overtimeStart, setOvertimeStart] = useState<number | null>(null);
    const [waitingForClickPhase, setWaitingForClickPhase] = useState<string | null>(null); // 'timer-start', 'interval-start', 'interval-end', 'task-end', 'post-start', 'post-end'
    const [showCardSettings, setShowCardSettings] = useState(false);
    const [showToolbarColor, setShowToolbarColor] = useState(false);
    const [showToolbarTag, setShowToolbarTag] = useState(false);
    const [showExternalTitle, setShowExternalTitle] = useState(false);
    const [hideTitleBg, setHideTitleBg] = useState(false);
    const [showNoteSettings, setShowNoteSettings] = useState(false);
    const [hideBackground, setHideBackground] = useState(false);
    const [tagsPosition, setTagsPosition] = useState<'top' | 'bottom' | 'side'>('top');
    const [showNotes, setShowNotes] = useState(false);
    // --- Chrono/Timer state for note cards ---
    const [chronoMode, setChronoMode] = useState(true);
    const [chronoRunning, setChronoRunning] = useState(false);
    const [chronoCurrent, setChronoCurrent] = useState(0);
    const [chronoTarget, setChronoTarget] = useState(0);
    const [chronoDirection, setChronoDirection] = useState<'up' | 'down'>('down');
    const [chronoFinished, setChronoFinished] = useState(false);
    const [chronoVisualMode, setChronoVisualMode] = useState<'numeric' | 'pizza' | 'bar'>('numeric');
    const [chronoUnit, setChronoUnit] = useState<'seconds' | 'minutes' | 'hours'>('minutes');
    const [chronoIsTimeLapse, setChronoIsTimeLapse] = useState(false);
    const [chronoDefaultValue, setChronoDefaultValue] = useState(5); // in units
    const [chronoDefaultDirection, setChronoDefaultDirection] = useState<'up' | 'down'>('down');
    const chronoRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Corner display & edit-duration tracking
    const [showCornerChrono, setShowCornerChrono] = useState(true);
    const [showEditChrono, setShowEditChrono] = useState(true);
    const [editChronoCurrent, setEditChronoCurrent] = useState(0);
    const [showLapsModal, setShowLapsModal] = useState(false);
    const editChronoRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [showPanePicker, setShowPanePicker] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const renderExpandableDescription = (desc: string, baseFontSize: number, colorClass: string = "text-gray-400", onTextClick?: (e: React.MouseEvent) => void) => {
        const textToParse = desc || "";
        const lines = textToParse.split('\n');
        const blocks: { type: 'text' | 'toggle', header?: string, content: string[], id: string, rawLines: string[] }[] = [];
        let currentToggle: any = null;

        lines.forEach((line, idx) => {
            if (line.trimStart().startsWith('>')) {
                // A '>' line always creates a new toggle block
                currentToggle = {
                    type: 'toggle',
                    header: line.trimStart().substring(1).trim(),
                    content: [],
                    id: `toggle-${idx}`,
                    rawLines: [line]
                };
                blocks.push(currentToggle);
            } else if (currentToggle && (line.startsWith('  ') || line.startsWith('\t'))) {
                // Indented lines after a toggle = toggle body
                currentToggle.content.push(line.replace(/^  /, '').replace(/^\t/, ''));
                currentToggle.rawLines.push(line);
            } else {
                // Non-indented, non-'>' line → always a new text block (resets toggle context)
                currentToggle = null;
                const lastBlock = blocks[blocks.length - 1];
                if (lastBlock && lastBlock.type === 'text') {
                    lastBlock.content.push(line);
                    lastBlock.rawLines.push(line);
                } else {
                    blocks.push({ type: 'text', content: [line], id: `text-${idx}`, rawLines: [line] });
                }
            }
        });

        // Helper to update a specific block and sync back to parent
        const updateBlock = (blockIdx: number, newRawLines: string[]) => {
            const updatedBlocks = [...blocks];
            updatedBlocks[blockIdx].rawLines = newRawLines;
            const newDesc = updatedBlocks.map(b => b.rawLines.join('\n')).join('\n');
            onUpdate(card.id, { description: newDesc });
        };

        // Auto-resize for textareas
        const adjustHeight = (el: HTMLTextAreaElement) => {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        };

        return (
            <div className={`${colorClass} space-y-1.5`} style={{ fontSize: `${baseFontSize}px` }}>
                {blocks.map((block, bIdx) => {
                    const isCollapsed = collapsedSections[block.id];
                    
                    if (isEditing) {
                        if (block.type === 'toggle') {
                            return (
                                <div key={block.id} className="flex flex-col group/toggle-edit">
                                    <div className="flex items-start gap-1.5 py-0.5">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCollapsedSections(prev => ({ ...prev, [block.id]: !prev[block.id] }));
                                            }}
                                            className="mt-1 p-0.5 hover:bg-black/5 rounded text-gray-400 hover:text-blue-500 transition-colors shrink-0"
                                        >
                                            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                        </button>
                                        <textarea
                                            className="bg-transparent flex-1 resize-none focus:outline-none font-bold text-gray-700 p-0 m-0 border-none overflow-hidden"
                                            rows={1}
                                            value={block.rawLines[0]}
                                            onInput={(e) => adjustHeight(e.currentTarget)}
                                            onChange={(e) => {
                                                const newLines = [...block.rawLines];
                                                newLines[0] = e.target.value;
                                                updateBlock(bIdx, newLines);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            placeholder="> Título..."
                                            style={{ height: 'auto' }}
                                            ref={(el) => el && adjustHeight(el)}
                                        />
                                    </div>
                                    {/* Body: expanded = textarea; collapsed = click-to-expand hint */}
                                    {isCollapsed ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setCollapsedSections(prev => ({ ...prev, [block.id]: false }));
                                            }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            className="ml-5 border-l-2 border-gray-100 pl-3 py-1.5 text-left w-full text-gray-300 text-xs italic hover:text-gray-400 hover:border-blue-200 transition-colors cursor-text"
                                        >
                                            Expandir para editar...
                                        </button>
                                    ) : (
                                        <textarea
                                            className="ml-5 border-l-2 border-blue-200 pl-3 py-2 bg-transparent resize-none focus:outline-none w-full text-gray-600 font-medium overflow-hidden cursor-text"
                                            value={block.content.join('\n')}
                                            onInput={(e) => adjustHeight(e.currentTarget)}
                                            onChange={(e) => {
                                                // Prefix each body line with 2 spaces so the parser keeps it inside the toggle
                                                const bodyLines = e.target.value.split('\n').map(l => '  ' + l);
                                                const newLines = [block.rawLines[0], ...bodyLines];
                                                updateBlock(bIdx, newLines);
                                            }}
                                            onClick={(e) => { e.stopPropagation(); (e.target as HTMLTextAreaElement).focus(); }}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            placeholder="Conteúdo expandido..."
                                            style={{ height: 'auto', minHeight: '36px' }}
                                            ref={(el) => el && adjustHeight(el)}
                                        />
                                    )}
                                </div>
                            );
                        } else {
                            return (
                                <textarea
                                    key={block.id}
                                    className="bg-transparent resize-none focus:outline-none w-full text-gray-600 font-medium p-0 m-0 border-none overflow-hidden leading-relaxed"
                                    value={block.rawLines.join('\n')}
                                    onInput={(e) => adjustHeight(e.currentTarget)}
                                    onChange={(e) => {
                                        updateBlock(bIdx, e.target.value.split('\n'));
                                    }}
                                    onClick={(e) => { e.stopPropagation(); (e.target as HTMLTextAreaElement).focus(); }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    placeholder="Digite algo... use > para criar um toggle"
                                    style={{ height: 'auto' }}
                                    ref={(el) => el && adjustHeight(el)}
                                />
                            );
                        }
                    }

                    // View Mode Rendering (Original)
                    return block.type === 'toggle' ? (
                        <div key={block.id} className="flex flex-col">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCollapsedSections(prev => ({ ...prev, [block.id]: !prev[block.id] }));
                                }}
                                className="flex items-center gap-1.5 font-bold hover:text-blue-500 transition-colors text-left py-1 hover:bg-black/5 rounded-lg -ml-1 px-1"
                                style={{ fontSize: `${baseFontSize * 0.9}px` }}
                            >
                                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                <span>&gt; {block.header}</span>
                            </button>
                            {!isCollapsed && (
                                <div 
                                    className="ml-4 border-l-2 border-current/10 pl-3 py-1 my-1 whitespace-pre-wrap leading-relaxed opacity-90 font-medium cursor-text"
                                    onClick={(e) => { onTextClick ? onTextClick(e) : undefined; }}
                                    onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                                >
                                    {block.content.join('\n').trim() || <span className="opacity-40 italic text-xs">Conteúdo expandido...</span>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div 
                            key={block.id} 
                            className="whitespace-pre-wrap overflow-hidden leading-relaxed font-medium cursor-text"
                            onClick={(e) => { onTextClick ? onTextClick(e) : undefined; }}
                            onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        >
                            {block.content.join('\n').trim()}
                        </div>
                    );
                })}
            </div>
        );
    };

    const [pendingMediaType, setPendingMediaType] = useState<CardPaneElement['type'] | null>(null);

    // Max Panes Limit
    const MAX_PANES = 4;
    const cardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const titleRef = useRef<HTMLInputElement>(null);

    // --- Pomodoro State ---
    const [showPomodoroConfig, setShowPomodoroConfig] = useState(false);
    const [showPomodoroList, setShowPomodoroList] = useState(false);
    const [pomodoroActive, setPomodoroActive] = useState(false); // session running
    const [pomodoroTimer, setPomodoroTimer] = useState(0); // current elapsed seconds in session
    const [captureCountdown, setCaptureCountdown] = useState<number | null>(null); // countdown for capture window
    const [pomodoroLapIndex, setPomodoroLapIndex] = useState(1);
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
    const pomodoroRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const captureCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pomodoroMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const pomodoroAudioChunksRef = useRef<Blob[]>([]);
    const pomodoroCameraRef = useRef<HTMLVideoElement | null>(null);
    const pomodoroStreamRef = useRef<MediaStream | null>(null);
    const [resizingElement, setResizingElement] = useState<{ id: string, startX: number, startY: number, startWidth: number, startHeight: number } | null>(null);

    // Effect for handling element resizing
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingElement) return;

            const deltaX = e.clientX - resizingElement.startX;
            const deltaY = e.clientY - resizingElement.startY;

            const newWidth = Math.max(100, resizingElement.startWidth + deltaX);
            const newHeight = Math.max(80, resizingElement.startHeight + deltaY);

            const activePaneIndex = card.activePaneIndex || 0;
            const panes = [...(card.panes || [])];
            const activePane = panes[activePaneIndex];
            if (activePane && activePane.elements) {
                const updatedElements = activePane.elements.map(el =>
                    el.id === resizingElement.id ? { ...el, width: newWidth, height: newHeight } : el
                );
                panes[activePaneIndex] = { ...activePane, elements: updatedElements };
                onUpdate(card.id, { panes });
            }
        };

        const handleMouseUp = () => {
            setResizingElement(null);
        };

        if (resizingElement) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingElement, card.panes, card.activePaneIndex, onUpdate, card.id]);

    const DEFAULT_POMODORO: PomodoroConfig = {
        timerSeconds: 25 * 60,
        direction: 'down',
        lapTimeEnabled: true,
        captureEnabled: true,
        captureWindowSeconds: 30,
        aiEnabled: false,
    };
    const pomConfig: PomodoroConfig = card.pomodoroConfig ?? DEFAULT_POMODORO;

    const handleResizeStart = (e: React.MouseEvent, handle: string) => {
        if (onResizeStart) {
            e.stopPropagation();
            onResizeStart(e, card.id, handle);
        }
    };

    const handleElementResizeStart = (e: React.MouseEvent, elementId: string, initialWidth: number, initialHeight: number) => {
        e.stopPropagation();
        e.preventDefault();
        setResizingElement({
            id: elementId,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: initialWidth,
            startHeight: initialHeight
        });
    };

    // --- Chrono: parse description when chronoMode changes or text changes ---
    useEffect(() => {
        const raw = card.description.trim();
        const match = raw.match(/^(\d+)(\*)?$/);

        if (!match) {
            if (chronoRef.current) clearInterval(chronoRef.current);
            setChronoRunning(false);

            // If no match but we want a default value when chronoMode is ON
            if (chronoMode) {
                let defSecs = chronoDefaultValue;
                if (chronoUnit === 'minutes') defSecs *= 60;
                else if (chronoUnit === 'hours') defSecs *= 3600;

                setChronoTarget(defSecs);
                setChronoDirection(chronoDefaultDirection);
                setChronoCurrent(chronoDefaultDirection === 'up' ? 0 : defSecs);
            } else {
                setChronoCurrent(0);
                setChronoTarget(0);
            }

            setChronoFinished(false);
            setChronoIsTimeLapse(false);
            return;
        }

        const digits = match[1];
        const isTimeLapse = !!match[2];
        const hasLeadingZero = digits.length > 1 && digits[0] === '0';
        let value = parseInt(digits, 10);

        // Apply Units
        if (chronoUnit === 'minutes') value *= 60;
        else if (chronoUnit === 'hours') value *= 3600;

        if (hasLeadingZero) {
            // Count-up: 0 â†’ value
            setChronoDirection('up');
            setChronoTarget(value);
            setChronoCurrent(0);
        } else {
            // Countdown: value â†’ 0
            setChronoDirection('down');
            setChronoTarget(value);
            setChronoCurrent(value);
        }

        setChronoIsTimeLapse(isTimeLapse);
        setChronoRunning(false);
        setChronoFinished(false);
        if (chronoRef.current) clearInterval(chronoRef.current);
    }, [chronoMode, card.description, chronoUnit]);

    // --- Slide/Wallpaper Logic ---
    useEffect(() => {
        if (!card.slideSettings?.isEnabled) {
            setIsSlideActive(false);
            return;
        }

        const checkIdle = setInterval(() => {
            const now = Date.now();
            const idleTime = (now - lastInteraction) / 1000;
            if (idleTime >= (card.slideSettings?.idleTimeout || 30)) {
                setIsSlideActive(true);
            } else {
                setIsSlideActive(false);
            }
        }, 1000);

        return () => clearInterval(checkIdle);
    }, [lastInteraction, card.slideSettings]);

    useEffect(() => {
        if (!isSlideActive) return;

        const filteredAttachments = card.attachments.filter(att => {
            if (!card.slideSettings?.mediaType || card.slideSettings.mediaType === 'all') return true;
            return att.type === card.slideSettings.mediaType;
        });

        if (filteredAttachments.length === 0) {
            setIsSlideActive(false);
            return;
        }

        const slideInterval = setInterval(() => {
            setCurrentSlideIndex(prev => (prev + 1) % filteredAttachments.length);
        }, (card.slideSettings?.interval || 5) * 1000);

        return () => clearInterval(slideInterval);
    }, [isSlideActive, card.attachments, card.slideSettings]);

    const resetIdle = () => {
        setLastInteraction(Date.now());
        if (card.lastInteractionTimestamp) {
            onUpdate(card.id, { lastInteractionTimestamp: Date.now() });
        }
    };

    useEffect(() => {
        if (isActiveTask && chronoMode && chronoTarget > 0 && !chronoRunning && !chronoFinished && !isPaused) {
            setChronoRunning(true);
            if (!sessionStartTime) setSessionStartTime(Date.now());
        }
    }, [isActiveTask, chronoMode, chronoTarget, chronoRunning, chronoFinished, isPaused, sessionStartTime]);


    useEffect(() => {
        if (!chronoRunning) {
            if (chronoRef.current) clearInterval(chronoRef.current);
            return;
        }
        chronoRef.current = setInterval(() => {
            if (isPaused) return; // Paused â€” do not tick
            setChronoCurrent(prev => {
                if (chronoDirection === 'up') {
                    if (prev >= chronoTarget) {
                        clearInterval(chronoRef.current!);
                        setChronoRunning(false);
                        setChronoFinished(true);
                        return prev;
                    }
                    return prev + 1;
                } else {
                    if (prev <= 0) {
                        clearInterval(chronoRef.current!);
                        setChronoRunning(false);
                        setChronoFinished(true);

                        // Passar para o próximo card se o tempo acabar no Modo Focus
                        if (isActiveTask && chronoDirection === 'down') {
                            finishTask(true);
                        } else {
                            // Auto-record failure if time runs out on countdown normally
                            onUpdate(card.id, { failureCount: (card.failureCount || 0) + 1 });
                        }
                        return 0;
                    }
                    return prev - 1;
                }
            });
        }, 1000);
        return () => { if (chronoRef.current) clearInterval(chronoRef.current); };
    }, [chronoRunning, chronoDirection, chronoTarget, isPaused]);

    // --- Schedule Failure Tracking ---
    useEffect(() => {
        if (!card.scheduledStart || card.status === 'completed' || card.scheduleFailureHandled) return;

        const checkSchedule = setInterval(() => {
            const now = Date.now();
            const start = new Date(card.scheduledStart!).getTime();

            // If it's more than 1 minute past the start time and not started/completed as 'active'
            // For notes, we just look at the schedule vs now.
            if (now > start + 60000) {
                onUpdate(card.id, {
                    failureCount: (card.failureCount || 0) + 1,
                    scheduleFailureHandled: true
                });
                clearInterval(checkSchedule);
            }
        }, 30000); // Check every 30s

        return () => clearInterval(checkSchedule);
    }, [card.scheduledStart, card.status, card.scheduleFailureHandled, card.failureCount]);

    const handleChronoReset = () => {
        if (chronoRef.current) clearInterval(chronoRef.current);
        setChronoRunning(false);
        setChronoFinished(false);
        setChronoCurrent(chronoDirection === 'up' ? 0 : chronoTarget);
        setEditChronoCurrent(0);
    };

    const formatIdleTime = (timestamp: number) => {
        const diff = Math.floor((Date.now() - timestamp) / 1000);
        if (diff < 0) return '0s';

        const days = Math.floor(diff / (24 * 3600));
        const hours = Math.floor((diff % (24 * 3600)) / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;

        let res = '';
        if (days > 0) res += `${days}d `;
        if (hours > 0 || days > 0) res += `${hours}h `;
        if (mins > 0 || hours > 0 || days > 0) res += `${mins}m `;
        res += `${secs}s`;
        return res;
    };

    const [idleString, setIdleString] = useState('');
    useEffect(() => {
        const interval = setInterval(() => {
            if (card.lastInteractionTimestamp) {
                setIdleString(formatIdleTime(card.lastInteractionTimestamp));
            } else {
                setIdleString('0s');
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [card.lastInteractionTimestamp]);

    const updateInteraction = () => {
        onUpdate(card.id, { lastInteractionTimestamp: Date.now() });
    };

    const handleManualComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateInteraction();

        // Calculate duration for performance recording
        let duration = 0;
        if (chronoMode) {
            duration = chronoDirection === 'up' ? chronoCurrent : (chronoTarget - chronoCurrent);
        } else {
            duration = card.timerTotal - card.timerRemaining;
        }

        const updates: Partial<CardData> = {
            completionCount: (card.completionCount || 0) + 1,
            lastCompleted: Date.now(),
            lastDuration: duration
        };

        if (!card.bestDuration || duration < card.bestDuration) {
            updates.bestDuration = duration;
        }

        onUpdate(card.id, updates);
    };

    const handleManualFailure = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateInteraction();
        const idleSeconds = Math.floor((Date.now() - lastInteraction) / 1000);
        const metadata = { startedAt: sessionStartTime || undefined, endedAt: Date.now(), idleDuration: idleSeconds };
        if (onSkip) {
            onSkip(card.id, metadata);
        } else {
            onUpdate(card.id, {
                failureCount: (card.failureCount || 0) + 1
            });
        }
    };

    const formatChronoTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const handleVoiceNote = (e: React.MouseEvent, targetId: string = card.id, currentDescription: string = card.description) => {
        e.stopPropagation();
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Seu navegador nÃ£o suporta reconhecimento de voz.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            const currentDesc = currentDescription || '';
            const newDesc = currentDesc ? `${currentDesc}\n\nNota: ${transcript}` : transcript;
            onUpdate(targetId, { description: newDesc });
        };

        recognition.start();
    };

    // =============================================
    // === POMODORO ENGINE =========================
    // =============================================

    const stopPomodoroSession = () => {
        if (pomodoroRef.current) clearInterval(pomodoroRef.current);
        if (captureCountdownRef.current) clearInterval(captureCountdownRef.current);
        if (pomodoroMediaRecorderRef.current && pomodoroMediaRecorderRef.current.state !== 'inactive') {
            pomodoroMediaRecorderRef.current.stop();
        }
        if (pomodoroStreamRef.current) {
            pomodoroStreamRef.current.getTracks().forEach(t => t.stop());
            pomodoroStreamRef.current = null;
        }
        setPomodoroActive(false);
        setPomodoroTimer(0);
        setCaptureCountdown(null);
        setPomodoroLapIndex(1);
    };

    const takeCameraSnapshot = (): Promise<string | null> => {
        return new Promise(resolve => {
            try {
                const video = pomodoroCameraRef.current;
                if (!video || video.readyState < 2) { resolve(null); return; }
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 320;
                canvas.height = video.videoHeight || 240;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }
                ctx.drawImage(video, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            } catch { resolve(null); }
        });
    };

    const startPomodoroCapture = async (lapIdx: number, lapDuration: number) => {
        if (!pomConfig.captureEnabled) return;
        const windowSecs = pomConfig.captureWindowSeconds;

        // Start countdown display
        setCaptureCountdown(windowSecs);
        const countdownInterval = setInterval(() => {
            setCaptureCountdown(prev => {
                if (prev === null || prev <= 1) { clearInterval(countdownInterval); return null; }
                return prev - 1;
            });
        }, 1000);
        captureCountdownRef.current = countdownInterval;

        // Request camera + mic access
        let stream: MediaStream | null = null;
        let audioUrl: string | undefined;
        let imageUrl: string | undefined;
        let transcription: string | undefined;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
            pomodoroStreamRef.current = stream;

            // Attach video stream to hidden element for snapshot
            if (!pomodoroCameraRef.current) {
                const vid = document.createElement('video');
                vid.autoplay = true;
                vid.muted = true;
                vid.style.position = 'absolute';
                vid.style.opacity = '0';
                vid.style.pointerEvents = 'none';
                document.body.appendChild(vid);
                pomodoroCameraRef.current = vid;
            }
            pomodoroCameraRef.current.srcObject = stream;
            await pomodoroCameraRef.current.play().catch(() => { });

            // Speech recognition
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'pt-BR';
                recognition.continuous = true;
                recognition.interimResults = false;
                let texts: string[] = [];
                recognition.onresult = (evt: any) => {
                    for (let i = evt.resultIndex; i < evt.results.length; i++) {
                        if (evt.results[i].isFinal) texts.push(evt.results[i][0].transcript);
                    }
                };
                recognition.start();
                setTimeout(() => {
                    try { recognition.stop(); } catch { }
                    transcription = texts.join(' ') || undefined;
                }, windowSecs * 1000 - 500);
            }

            // Audio recording
            const audioStream = new MediaStream(stream.getAudioTracks());
            const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
            pomodoroAudioChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data.size > 0) pomodoroAudioChunksRef.current.push(e.data); };
            recorder.onstop = async () => {
                const blob = new Blob(pomodoroAudioChunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = async () => {
                    audioUrl = reader.result as string;
                    // Take snapshot after audio is done
                    imageUrl = (await takeCameraSnapshot()) ?? undefined;
                    // Clean up stream
                    stream?.getTracks().forEach(t => t.stop());
                    if (pomodoroCameraRef.current) {
                        pomodoroCameraRef.current.srcObject = null;
                    }

                    // Save lap
                    const newLap: PomodoroLap = {
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        duration: lapDuration,
                        audioUrl,
                        imageUrl,
                        transcription,
                        lapIndex: lapIdx,
                        isAnalyzing: pomConfig.aiEnabled,
                    };
                    const existingLaps = card.pomodoroLaps || [];

                    // Append transcription to card description
                    if (transcription) {
                        const current = card.description || '';
                        onUpdate(card.id, {
                            description: current ? `${current}\n\nðŸ… Lap ${lapIdx}: ${transcription}` : `ðŸ… Lap ${lapIdx}: ${transcription}`,
                        });
                    }

                    // Attach audio + image to card
                    const audioAttachment: Attachment = {
                        id: crypto.randomUUID(),
                        type: 'audio',
                        url: audioUrl,
                        timestamp: Date.now(),
                    };
                    const imageAttachment: Attachment | null = imageUrl ? {
                        id: crypto.randomUUID(),
                        type: 'image',
                        url: imageUrl,
                        timestamp: Date.now(),
                    } : null;

                    const updatedLaps = [...existingLaps, newLap];
                    onUpdate(card.id, {
                        pomodoroLaps: updatedLaps,
                        attachments: [
                            ...(card.attachments || []),
                            audioAttachment,
                            ...(imageAttachment ? [imageAttachment] : []),
                        ],
                    });

                    // AI Analysis (async â€” update lap in place after done)
                    if (pomConfig.aiEnabled) {
                        analyzePomodoroLap(imageUrl, transcription, lapDuration, lapIdx).then(aiResult => {
                            onUpdate(card.id, {
                                pomodoroLaps: [...(card.pomodoroLaps || [])].map(l =>
                                    l.id === newLap.id
                                        ? { ...l, aiTitle: aiResult.title, aiDescription: aiResult.description, aiRecommendedMinutes: aiResult.recommendedMinutes, aiReasoning: aiResult.reasoning, isAnalyzing: false }
                                        : l
                                )
                            });
                        });
                    }
                };
                reader.readAsDataURL(blob);
            };
            pomodoroMediaRecorderRef.current = recorder;
            recorder.start();
            setTimeout(() => {
                if (recorder.state !== 'inactive') recorder.stop();
            }, windowSecs * 1000);

        } catch (err) {
            console.warn('Pomodoro capture: no camera/mic access', err);
            // Fallback: still save a lap with no media
            setTimeout(() => {
                const newLap: PomodoroLap = {
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    duration: lapDuration,
                    lapIndex: lapIdx,
                    isAnalyzing: pomConfig.aiEnabled,
                };
                const updatedLaps = [...(card.pomodoroLaps || []), newLap];
                onUpdate(card.id, { pomodoroLaps: updatedLaps });

                if (pomConfig.aiEnabled) {
                    analyzePomodoroLap(undefined, undefined, lapDuration, lapIdx).then(aiResult => {
                        onUpdate(card.id, {
                            pomodoroLaps: [...(card.pomodoroLaps || [])].map(l =>
                                l.id === newLap.id
                                    ? { ...l, aiTitle: aiResult.title, aiDescription: aiResult.description, aiRecommendedMinutes: aiResult.recommendedMinutes, aiReasoning: aiResult.reasoning, isAnalyzing: false }
                                    : l
                            )
                        });
                    });
                }
            }, windowSecs * 1000);
        }
    };

    const stopPomodoroSessionWithFailure = () => {
        // Timer ran out without a user click = task NOT completed
        onUpdate(card.id, { failureCount: (card.failureCount || 0) + 1 });
        stopPomodoroSession();
    };

    const appendElementToActivePane = (type: CardPaneElement['type'], content: string, title?: string) => {
        const activePaneIndex = card.activePaneIndex || 0;
        const panes = card.panes || [];
        if (!panes[activePaneIndex]) return;

        const updatedPanes = [...panes];
        const activePane = updatedPanes[activePaneIndex];
        const newElement: CardPaneElement = {
            id: crypto.randomUUID(),
            type,
            content,
            timestamp: Date.now(),
            ...(type === 'note' ? { height: 120 } : {}) // Default height for note elements
        };

        updatedPanes[activePaneIndex] = {
            ...activePane,
            type: 'mixed',
            title: title || activePane.title,
            elements: [...(activePane.elements || []), newElement],
            timestamp: Date.now()
        };
        onUpdate(card.id, { panes: updatedPanes });
        setShowPanePicker(false);
    };

    const handlePaneFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        const isTextFile = pendingMediaType === 'text' || file.type === 'text/plain';

        reader.onloadend = () => {
            let type: CardPaneElement['type'] = (pendingMediaType as any) || 'image';
            if (!pendingMediaType) {
                if (file.type.startsWith('video/')) type = 'video';
                if (file.type.startsWith('audio/')) type = 'audio';
                if (file.type === 'application/pdf') type = 'pdf';
                if (file.type.includes('gif')) type = 'gif';
                if (file.type === 'text/plain') type = 'text';
            }

            appendElementToActivePane(type, reader.result as string, file.name);
            setPendingMediaType(null);
            if (e.target) e.target.value = ''; // Reset input
        };

        if (isTextFile) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition((pos) => {
            const locData = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            appendElementToActivePane('location', JSON.stringify(locData), 'LocalizaÃ§Ã£o');
        });
    };

    const handleCapture = async (captureType: string) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: captureType === 'photo' || captureType === 'video',
                audio: captureType === 'audio' || captureType === 'video'
            });

            if (captureType === 'photo') {
                const video = document.createElement('video');
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(video, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg');
                    appendElementToActivePane('image', dataUrl, 'Foto Capturada');
                    stream.getTracks().forEach(t => t.stop());
                };
            } else {
                const recorder = new MediaRecorder(stream);
                const chunks: Blob[] = [];
                recorder.ondataavailable = e => chunks.push(e.data);
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: captureType === 'video' ? 'video/webm' : 'audio/webm' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        appendElementToActivePane(captureType as any, reader.result as string, captureType === 'video' ? 'VÃ­deo Gravado' : 'Ãudio Gravado');
                    };
                    reader.readAsDataURL(blob);
                    stream.getTracks().forEach(t => t.stop());
                };
                recorder.start();

                const stopBtn = document.createElement('button');
                stopBtn.innerText = `Parar GravaÃ§Ã£o de ${captureType}`;
                stopBtn.style.position = 'fixed';
                stopBtn.style.top = '50%';
                stopBtn.style.left = '50%';
                stopBtn.style.transform = 'translate(-50%, -50%)';
                stopBtn.style.zIndex = '1000';
                stopBtn.style.padding = '20px';
                stopBtn.style.background = 'red';
                stopBtn.style.color = 'white';
                stopBtn.style.borderRadius = '10px';
                stopBtn.onclick = () => {
                    recorder.stop();
                    document.body.removeChild(stopBtn);
                };
                document.body.appendChild(stopBtn);
            }
        } catch (err) {
            console.error('Capture failed', err);
            alert('Acesso negado ou erro na mÃ­dia.');
        }
    };

    const moveElementVertical = (elementId: string, direction: 'up' | 'down') => {
        const activePaneIndex = card.activePaneIndex || 0;
        const panes = card.panes || [];
        const activePane = panes[activePaneIndex];
        if (!activePane || !activePane.elements) return;

        const elements = [...activePane.elements];
        const idx = elements.findIndex(el => el.id === elementId);
        if (idx === -1) return;

        const newIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= elements.length) return;

        [elements[idx], elements[newIdx]] = [elements[newIdx], elements[idx]];

        const updatedPanes = [...panes];
        updatedPanes[activePaneIndex] = { ...activePane, elements };
        onUpdate(card.id, { panes: updatedPanes });
    };

    const moveElementHorizontal = (elementId: string, direction: 'left' | 'right') => {
        const activePaneIndex = card.activePaneIndex || 0;
        const panes = [...(card.panes || [])];
        const activePane = panes[activePaneIndex];
        if (!activePane || !activePane.elements) return;

        let targetIndex = direction === 'left' ? activePaneIndex - 1 : activePaneIndex + 1;

        // Handle creation of new pane if moving right from the last one
        if (targetIndex >= panes.length && panes.length < MAX_PANES && direction === 'right') {
            panes.push({
                id: crypto.randomUUID(),
                type: 'empty',
                timestamp: Date.now()
            });
        }

        if (targetIndex < 0 || targetIndex >= panes.length) return;

        const elToMove = activePane.elements.find(el => el.id === elementId);
        if (!elToMove) return;

        // Remove from current
        panes[activePaneIndex] = {
            ...activePane,
            elements: activePane.elements.filter(el => el.id !== elementId)
        };
        // Add to target
        panes[targetIndex] = {
            ...panes[targetIndex],
            type: 'mixed',
            elements: [...(panes[targetIndex].elements || []), elToMove]
        };

        onUpdate(card.id, { panes, activePaneIndex: targetIndex }); // Jump to target pane to follow the item
    };

    const deleteElement = (elementId: string) => {
        const activePaneIndex = card.activePaneIndex || 0;
        const panes = [...(card.panes || [])];
        const activePane = panes[activePaneIndex];
        if (activePane && activePane.elements) {
            panes[activePaneIndex] = {
                ...activePane,
                elements: activePane.elements.filter(el => el.id !== elementId)
            };
            onUpdate(card.id, { panes });
        }
    };

    const pinElementToTop = (elementId: string) => {
        const activePaneIndex = card.activePaneIndex || 0;
        const panes = [...(card.panes || [])];
        const activePane = panes[activePaneIndex];
        if (activePane && activePane.elements) {
            const el = activePane.elements.find(e => e.id === elementId);
            if (!el) return;
            const others = activePane.elements.filter(e => e.id !== elementId);
            panes[activePaneIndex] = {
                ...activePane,
                elements: [el, ...others]
            };
            onUpdate(card.id, { panes });
        }
    };

    const updateElementContent = (elementId: string, newContent: string) => {
        const activePaneIndex = card.activePaneIndex || 0;
        const panes = [...(card.panes || [])];
        const activePane = panes[activePaneIndex];
        if (activePane && activePane.elements) {
            const updatedElements = activePane.elements.map(el =>
                el.id === elementId ? { ...el, content: newContent } : el
            );
            panes[activePaneIndex] = { ...activePane, elements: updatedElements };
            onUpdate(card.id, { panes });
        }
    };

    const handlePomodoroClick = (e: React.MouseEvent) => {
        // We still want to stop propagation so that handleManualClick doesn't trigger
        // if we are actually interacting with the Pomodoro logic.
        // But we MUST ensure the card is selected.
        e.stopPropagation();
        onSelect(card.id);

        if (!card.pomodoroEnabled) return;

        if (!pomodoroActive) {
            // First click: START session
            setPomodoroActive(true);
            setPomodoroTimer(0);
            setPomodoroLapIndex(1);

            // Main session ticker â€” auto-fail if time runs out
            pomodoroRef.current = setInterval(() => {
                setPomodoroTimer(prev => {
                    const next = prev + 1;
                    if (pomConfig.direction === 'down' && next >= pomConfig.timerSeconds) {
                        stopPomodoroSessionWithFailure();
                    }
                    return next;
                });
            }, 1000);

            // Trigger immediate capture window for first lap
            startPomodoroCapture(1, 0);
            return;
        }

        // Already active: CLICK = TASK COMPLETED for this lap
        if (pomConfig.lapTimeEnabled) {
            // In lap mode: complete current lap and advance to next
            const newIdx = pomodoroLapIndex + 1;
            setPomodoroLapIndex(newIdx);
            onUpdate(card.id, {
                completionCount: (card.completionCount || 0) + 1,
                lastCompleted: Date.now(),
            });
            startPomodoroCapture(newIdx, pomodoroTimer);
        } else {
            // Standard mode: click = session complete
            onUpdate(card.id, {
                completionCount: (card.completionCount || 0) + 1,
                lastCompleted: Date.now(),
                lastDuration: pomodoroTimer,
                ...(!card.bestDuration || pomodoroTimer < card.bestDuration ? { bestDuration: pomodoroTimer } : {}),
            });
            stopPomodoroSession();
        }
    };

    const formatPomodoroTimer = (secs: number) => {
        if (pomConfig.direction === 'down') {
            const remaining = Math.max(0, pomConfig.timerSeconds - secs);
            return formatChronoTime(remaining);
        }
        return formatChronoTime(secs);
    };

    const getPizzaGradient = () => {
        if (!chronoTarget) return '';

        const totalPercent = (chronoDirection === 'up'
            ? (chronoCurrent / chronoTarget)
            : ((chronoTarget - chronoCurrent) / chronoTarget)) * 100;

        if (card.lapTimeEnabled === false || !card.laps || card.laps.length === 0) {
            return `conic-gradient(from 0deg, #4ade8077 ${totalPercent}%, transparent 0%)`;
        }

        const lapColors = ['#eab30877', '#3b82f677', '#a855f777', '#ef444477', '#ec489977'];
        let stops = [];
        let currentAccumulated = 0;

        card.laps.forEach((lap, index) => {
            const lapPercent = (lap.duration / chronoTarget) * 100;
            const color = lapColors[index % lapColors.length];
            // Each lap gets a distinct slice color
            stops.push(`${color} ${currentAccumulated}% ${currentAccumulated + lapPercent}%`);
            currentAccumulated += lapPercent;
        });

        // The remaining progress is green
        if (currentAccumulated < totalPercent) {
            stops.push(`#4ade8077 ${currentAccumulated}% ${totalPercent}%`);
        }

        stops.push(`transparent ${totalPercent}%`);

        return `conic-gradient(from 0deg, ${stops.join(', ')})`;
    };

    // --- Auto-start chrono when user clicks outside the card (exits editing) ---
    useEffect(() => {
        if (isEditing) return;
        if (!chronoFinished && !chronoRunning && chronoTarget > 0) {
            setChronoRunning(true);
        }
    }, [isEditing]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Edit-duration chrono: red timer runs while editing, green pauses ---
    useEffect(() => {
        if (!chronoMode || !showEditChrono) {
            if (editChronoRef.current) clearInterval(editChronoRef.current);
            return;
        }
        if (isEditing) {
            // Pause the main (green) timer
            setChronoRunning(false);
            // Start the red edit timer (resumes from current value)
            if (editChronoRef.current) clearInterval(editChronoRef.current);
            editChronoRef.current = setInterval(() => {
                if (isPaused) return; // Paused â€” do not tick
                setEditChronoCurrent(prev => prev + 1);
            }, 1000);
        } else {
            // Stop red timer when editing ends (green auto-start handled by other effect)
            if (editChronoRef.current) clearInterval(editChronoRef.current);
        }
        return () => { if (editChronoRef.current) clearInterval(editChronoRef.current); };
    }, [isEditing, showEditChrono, chronoMode, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Auto-exit editing and close panels when clicking outside ---
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const isToolbarPanelOpen = showNoteSettings || showToolbarTag || showToolbarColor || showSlideSettings || showPomodoroConfig || showPomodoroList || isEditing;

            if (isToolbarPanelOpen && cardRef.current && !cardRef.current.contains(e.target as Node)) {
                setIsEditing(false);
                setShowNoteSettings(false);
                setShowToolbarTag(false);
                setShowToolbarColor(false);
                setShowSlideSettings(false);
                setShowPomodoroConfig(false);
                setShowPomodoroList(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditing, showNoteSettings, showToolbarTag, showToolbarColor, showSlideSettings, showPomodoroConfig, showPomodoroList]);

    // --- Shape Styles ---
    const getShapeStyles = () => {
        const shape = card.shape || 'rectangle';
        const baseStyles = "relative transition-all duration-300 group";

        switch (shape) {
            case 'circle':
                return `${baseStyles} rounded-full aspect-square flex flex-col justify-center items-center text-center p-6`;
            case 'hexagon':
                return `${baseStyles} clip-path-hexagon p-8 flex flex-col justify-center items-center text-center`;
            case 'diamond':
                return `${baseStyles} rotate-45 p-8 flex flex-col justify-center items-center text-center`;
            case 'rectangle':
            default:
                return `${baseStyles} rounded-2xl`;
        }
    };

    const getInnerContentStyles = () => {
        const shape = card.shape || 'rectangle';
        if (shape === 'diamond') return "rotate-[-45deg]"; // Counter-rotate content
        return "";
    };

    // --- Color Styles ---
    const getColorStyles = () => {
        const isCompleted = card.status === 'completed';
        const isSkipped = card.status === 'skipped';

        if (isCompleted) return 'bg-white/90 border-green-500/50 opacity-75 grayscale-[0.5] text-black shadow-lg';
        if (isSkipped) return 'bg-white/80 border-gray-400/50 opacity-50 text-black';

        // Match the user's image: White background, yellow border when selected/active
        const colors = {
            red: 'bg-white border-red-500 hover:border-red-600 text-gray-800 shadow-sm',
            yellow: 'bg-white border-yellow-500 hover:border-yellow-600 text-gray-800 shadow-sm',
            purple: 'bg-white border-purple-500 hover:border-purple-600 text-gray-800 shadow-sm',
            blue: 'bg-white border-blue-500 hover:border-blue-600 text-gray-800 shadow-sm',
            green: 'bg-white border-green-500 hover:border-green-600 text-gray-800 shadow-sm',
            gray: 'bg-white border-gray-300 hover:border-gray-400 text-gray-800 shadow-sm',
            white: 'bg-white border-gray-100 hover:border-gray-200 text-gray-800 shadow-sm shadow-black/5',
        };

        const activeClass = isActiveTask ? 'ring-2 ring-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)] z-20' : '';
        const nextClass = isNextTask ? 'border-dashed border-2' : '';
        const selectedClass = isSelected ? 'ring-2 ring-yellow-400 z-10' : '';

        return `${colors[card.color]} border shadow-sm ${activeClass} ${nextClass} ${selectedClass} transition-shadow`;
    };
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // --- Default Settings ---
    const settings = visualSettings || {
        showImage: true, showTitle: true, showDescription: true, showTimer: true, showCompleteBtn: true,
        showDeleteBtn: true, showSchedule: true, showIntervals: true, showTags: true, showLastCompleted: true,
        showCompletionCount: true, showAttachmentIndicator: true, showAttachmentActions: true,
        fontFamily: 'Inter, sans-serif',
        fontSize: 14
    };

    const behavior = behaviorSettings || {
        preTimeSeconds: 0, postTimeSeconds: 0, maxPauses: 3, pauseDuration: 5, pauseDurationMode: 'fixed',
        requireClickToStart: false, requireClickToFinish: false, autoFlowAfterPostTime: true,
        requireClickToStartTimer: false, requireClickToStartInterval: false, requireClickToEndInterval: false,
        requireClickToStartPostTime: false, requireClickToFinishPostTime: false
    };

    // --- Logic Handling ---

    const logMetric = (phaseName: any, expectedTime: number) => {
        const actualTime = Date.now();
        const delaySeconds = (actualTime - expectedTime) / 1000;
        const negativeTime = overtimeStart ? (actualTime - overtimeStart) / 1000 : 0;

        const newMetric = {
            phase: phaseName,
            expectedTime,
            actualTime,
            delaySeconds,
            negativeTime: negativeTime > 0 ? negativeTime : undefined
        };

        onUpdate(card.id, { metrics: [...(card.metrics || []), newMetric] });
        setOvertimeStart(null);
        setWaitingForClickPhase(null);
    };

    // Handle Parent State Changes (when App.tsx sets card.status)
    useEffect(() => {
        if (card.status === 'active' && phase === 'idle') {
            // App wants this card to be active. Check behavior rules.
            if (behavior.requireClickToStart) {
                // Wait for user click, technically we are active in global state but locally "ready"
                // Visuals will show a "Start" overlay
                setWaitingForClickPhase('pre-start');
            } else {
                startSequence();
            }
        } else if (card.status === 'pending' && phase !== 'idle') {
            // Reset if moved back to pending
            setPhase('idle');
            setSubTimer(0);
            setOvertimeStart(null);
            setWaitingForClickPhase(null);
        } else if (card.status === 'completed' && phase !== 'finished') {
            setPhase('finished');
        }
    }, [card.status, behavior.requireClickToStart]);

    const startSequence = () => {
        setSessionStartTime(Date.now());
        if (behavior.preTimeSeconds > 0) {
            setPhase('pre-active');
            setSubTimer(behavior.preTimeSeconds);
        } else {
            setPhase('active');
        }
    };

    const initiatePause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pausesTaken < behavior.maxPauses) {
            setPhase('paused');

            let duration = behavior.pauseDuration;
            if (behavior.pauseDurationMode === 'percent') {
                duration = Math.floor((behavior.pauseDuration / 100) * card.timerTotal);
            }
            setSubTimer(duration);
            setPausesTaken(p => p + 1);
        }
    };

    const cancelPause = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPhase('active');
        setSubTimer(0);
    };

    const checkIntervalCompletion = () => {
        // Check if this is a Batch Task (has intervals > 1)
        if (card.intervals && card.intervals.count > 1) {
            const current = card.currentInterval || 1;
            if (current < card.intervals.count) {
                // Proceed to next interval
                onUpdate(card.id, {
                    currentInterval: current + 1,
                    timerRemaining: card.intervals.duration // Reset Timer
                });
                playBeep(); // Audio feedback for "Next Round"
                return true; // Interval handled
            }
        }
        return false; // No more intervals, really finished
    };

    const finishTask = (auto: boolean = false) => {
        // Logic for interval cards (Batch Tasks)
        if (checkIntervalCompletion()) {
            return;
        }

        const proceedToPost = () => {
            if (behavior.postTimeSeconds > 0) {
                if (behavior.requireClickToStartPostTime) {
                    setWaitingForClickPhase('post-start');
                    setOvertimeStart(Date.now());
                } else {
                    setPhase('post-active');
                    setSubTimer(behavior.postTimeSeconds);
                }
            } else {
                triggerCompletion();
            }
        };

        if (auto) {
            // Timer ended naturally
            if (behavior.requireClickToFinish) {
                setWaitingForClickPhase('task-end');
                setOvertimeStart(Date.now());
                // Record failure if it hits overtime and user has to be prompted
                onUpdate(card.id, { failureCount: (card.failureCount || 0) + 1 });
            } else {
                proceedToPost();
            }
        } else {
            // Manual finish
            proceedToPost();
        }
    };

    const triggerCompletion = () => {
        // Calculate duration
        let duration = 0;
        if (chronoMode) {
            duration = chronoDirection === 'up' ? chronoCurrent : (chronoTarget - chronoCurrent);
        } else {
            duration = card.timerTotal - card.timerRemaining;
        }

        const updates: Partial<CardData> = {
            status: 'completed',
            timerRemaining: 0,
            completionCount: (card.completionCount || 0) + 1,
            lastCompleted: Date.now(),
            lastDuration: duration
        };

        if (!card.bestDuration || duration < card.bestDuration) {
            updates.bestDuration = duration;
        }

        const idleSeconds = Math.floor((Date.now() - lastInteraction) / 1000);
        const metadata = { startedAt: sessionStartTime || undefined, endedAt: Date.now(), idleDuration: idleSeconds };

        if (onCompleteTask) {
            onCompleteTask(card.id, metadata);
            // We still want to update the performance metrics even if onCompleteTask is provided
            onUpdate(card.id, { ...updates, ...metadata });
        } else {
            onUpdate(card.id, { ...updates, ...metadata });
        }
        setPhase('finished');
        setEditChronoCurrent(0);
    };

    // --- Timer Tick Effect ---
    useEffect(() => {
        let interval: any;

        if (waitingForClickPhase) {
            // In overtime/waiting mode, we just track time passing if needed, or do nothing
            // The UI should show the "Waiting" state
            return;
        }

        if (phase === 'pre-active') {
            interval = setInterval(() => {
                setSubTimer(prev => {
                    if (prev <= 1) {
                        if (behavior.requireClickToStartTimer) {
                            setWaitingForClickPhase('timer-start');
                            setOvertimeStart(Date.now());
                            return 0;
                        }
                        setPhase('active');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        else if (phase === 'active' && card.status === 'active') {
            interval = setInterval(() => {
                onUpdate(card.id, { timerRemaining: Math.max(0, card.timerRemaining - 1) });

                // 30 Seconds Warning
                if (card.timerRemaining === 31) { // 31 because state updates next tick
                    playBeep();
                }
                // Finished
                if (card.timerRemaining <= 0) {
                    // Check if interval logic handles it, otherwise stop and finish
                    // We call finishTask(true) which handles intervals internally
                    if (card.intervals && card.intervals.count > 1 && (card.currentInterval || 1) < card.intervals.count) {
                        // Auto-advance interval without stopping ticker effectively
                        if (behavior.requireClickToEndInterval) {
                            setWaitingForClickPhase('interval-end');
                            setOvertimeStart(Date.now());
                        } else {
                            checkIntervalCompletion();
                        }
                    } else {
                        clearInterval(interval);
                        playAlarm();
                        finishTask(true);
                    }
                }
            }, 1000);
        }
        else if (phase === 'paused') {
            interval = setInterval(() => {
                setSubTimer(prev => {
                    if (prev <= 1) {
                        setPhase('active'); // Auto resume after pause
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        else if (phase === 'post-active') {
            interval = setInterval(() => {
                setSubTimer(prev => {
                    if (prev <= 1) {
                        if (behavior.requireClickToFinishPostTime) {
                            setWaitingForClickPhase('post-end');
                            setOvertimeStart(Date.now());
                            return 0;
                        }

                        if (behavior.autoFlowAfterPostTime) {
                            triggerCompletion();
                        } else {
                            // Wait for user to click "Next"
                            clearInterval(interval);
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [phase, card.status, card.timerRemaining, behavior, card.id, card.intervals, card.currentInterval, waitingForClickPhase]);

    // --- Sound Helpers ---
    const playBeep = () => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    };

    const playAlarm = () => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 1);
    };


    // --- Event Handlers ---

    const handleBlur = (field: 'title' | 'description', value: string) => {
        const numMatch = value.match(/^(\d+)$/);
        if (numMatch) {
            const seconds = parseInt(numMatch[1]);
            const updates: Partial<CardData> = {
                timerTotal: seconds,
                timerRemaining: seconds,
            };

            if (field === 'title') {
                updates.title = `Limpar: ${card.description || 'Tarefa'}`;
            }

            onUpdate(card.id, updates);
            setEditChronoCurrent(0);

            // Auto start timer
            setTimeout(() => {
                onUpdate(card.id, { status: 'active' });
            }, 100);
        }
    };

    const handleManualClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        // If already selected, 2nd click = enter edit mode (single-click-to-edit UX)
        if (isSelected && !isEditing) {
            resetIdle();
            updateInteraction();
            setIsEditing(true);
            return;
        }

        onSelect(card.id);

        if (waitingForClickPhase) {
            if (waitingForClickPhase === 'pre-start') {
                startSequence();
            } else if (waitingForClickPhase === 'timer-start') {
                setPhase('active');
            } else if (waitingForClickPhase === 'task-end') {
                finishTask(false);
            } else if (waitingForClickPhase === 'post-start') {
                setPhase('post-active');
                setSubTimer(behavior.postTimeSeconds);
            } else if (waitingForClickPhase === 'post-end') {
                triggerCompletion();
            }
            setWaitingForClickPhase(null);
            return;
        }

        // LAP RECORDING
        if (chronoMode && chronoRunning && card.lapTimeEnabled !== false) {
            const lastLapTime = card.laps && card.laps.length > 0
                ? card.laps[card.laps.length - 1].time
                : (chronoDirection === 'up' ? 0 : chronoTarget);

            const duration = Math.abs(chronoCurrent - lastLapTime);

            const newLap = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                time: chronoCurrent,
                duration: duration
            };

            onUpdate(card.id, { laps: [...(card.laps || []), newLap] });
            return;
        }

        if (card.status === 'completed') {
            onUpdate(card.id, { status: 'pending' });
            setPhase('idle');
        }
    };

    const handleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (phase === 'post-active' && !behavior.autoFlowAfterPostTime) {
            triggerCompletion();
            return;
        }

        // Handle Interval Completion via button
        if (card.status === 'active' && checkIntervalCompletion()) {
            return;
        }

        if (card.status !== 'completed') {
            finishTask(false);
        } else {
            onUpdate(card.id, { status: 'pending' });
            setPhase('idle');
        }
    };

    const handleGenerateImage = async () => {
        setIsGeneratingImg(true);
        const imgData = await generateCardImage(card.title, card.description);
        if (imgData) {
            onUpdate(card.id, { imageUrl: imgData });
        }
        setIsGeneratingImg(false);
    };

    const handleBreakdown = async () => {
        setIsBreakingDown(true);
        const steps = await breakDownTask(card.title);
        if (steps.length > 0) {
            onBreakdown(card.id, steps);
        }
        setIsBreakingDown(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isCover: boolean = true) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (isCover) {
                    onUpdate(card.id, { imageUrl: reader.result as string });
                } else {
                    // Attachment
                    let type: 'image' | 'audio' | 'video' | 'gif' = 'image';
                    if (file.type.startsWith('image/')) {
                        type = file.type.includes('gif') ? 'gif' : 'image';
                    } else if (file.type.startsWith('video/')) {
                        type = 'video';
                    } else if (file.type.startsWith('audio/')) {
                        type = 'audio';
                    }

                    const newAttachment: Attachment = {
                        id: crypto.randomUUID(),
                        type: type,
                        url: reader.result as string,
                        timestamp: Date.now()
                    };
                    onUpdate(card.id, { attachments: [...(card.attachments || []), newAttachment] });
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // Audio Recording
    const toggleRecording = async () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64Audio = reader.result as string;
                        const newAttachment: Attachment = {
                            id: crypto.randomUUID(),
                            type: 'audio',
                            url: base64Audio,
                            timestamp: Date.now()
                        };
                        onUpdate(card.id, { attachments: [...(card.attachments || []), newAttachment] });
                    };
                    reader.readAsDataURL(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                console.error("Microphone access denied", err);
            }
        }
    };

    const formatTimeSince = (timestamp?: number) => {
        if (!timestamp) return 'Never';
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    };

    const formatScheduledTime = (iso?: string) => {
        if (!iso) return 'Not scheduled';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', weekday: 'short' });
    };

    // Color border classes
    const colorMap: Record<string, string> = {
        red: '#ef4444',
        yellow: '#eab308',
        purple: '#a855f7',
        blue: '#3b82f6',
        green: '#22c55e',
    };

    const borderColor = {
        red: 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]',
        yellow: 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]',
        purple: 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
        blue: 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
        green: 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]',
        gray: 'border-gray-400',
    }[card.color] || 'border-gray-400';

    const activeColorClass = {
        red: 'text-red-500',
        yellow: 'text-yellow-600',
        purple: 'text-purple-500',
        blue: 'text-blue-500',
        green: 'text-green-500',
        gray: 'text-gray-400',
    }[card.color] || 'text-gray-400';

    const activeBgClass = {
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
        purple: 'bg-purple-500',
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        gray: 'bg-gray-400',
    }[card.color] || 'bg-blue-500';

    const activeBgSoftClass = {
        red: 'bg-red-500/10',
        yellow: 'bg-yellow-500/10',
        purple: 'bg-purple-500/10',
        blue: 'bg-blue-500/10',
        green: 'bg-green-500/10',
        gray: 'bg-gray-400/10',
    }[card.color] || 'bg-gray-400/10';

    const activeHoverTextClass = {
        red: 'hover:text-red-600',
        yellow: 'hover:text-yellow-700',
        purple: 'hover:text-purple-600',
        blue: 'hover:text-blue-600',
        green: 'hover:text-green-600',
        gray: 'hover:text-gray-600',
    }[card.color] || 'hover:text-gray-600';

    // --- Note Rendering (Post-it Style) ---
    if (card.type === 'note') {
        const isPlainWhite = card.color === 'gray';
        const noteColorClass = isPlainWhite
            ? 'bg-white border-gray-300 text-gray-800'
            : (({
                red: 'bg-red-50 text-red-900 border-red-200',
                yellow: 'bg-yellow-50 text-yellow-900 border-yellow-200',
                purple: 'bg-purple-50 text-purple-900 border-purple-200',
                blue: 'bg-blue-50 text-blue-900 border-blue-200',
                green: 'bg-green-50 text-green-900 border-green-200',
            } as Record<string, string>)[card.color] || 'bg-white border-gray-300 text-gray-800');

        const rotation = isPlainWhite ? 0 : 1;

        return (
            <div
                ref={cardRef}
                className={`absolute flex flex-col shadow-lg border transition-all duration-200 group
                ${hideBackground ? 'bg-transparent border-transparent shadow-none' : noteColorClass}
                ${isPlainWhite && !hideBackground ? 'rounded-lg' : !hideBackground ? 'transform rotate-1' : ''}
                ${isSelected ? 'ring-2 ring-yellow-400 z-40 shadow-xl' : 'z-10 hover:z-30 h-auto'}
            `}
                style={{
                    transform: `translate(${card.x}px, ${card.y}px) rotate(${rotation}deg)`,
                    width: card.width || 260,
                    height: card.height || 260,
                    fontFamily: settings.fontFamily || 'Inter, sans-serif'
                }}
                onClick={(e) => {
                    if (card.pomodoroEnabled && !isEditing) {
                        handlePomodoroClick(e);
                    }
                    handleManualClick(e);
                }}
                onMouseDown={(e) => { resetIdle(); updateInteraction(); onStartDrag(e, card.id); }}
                onTouchStart={(e) => { resetIdle(); updateInteraction(); onStartDrag(e, card.id); }}
                onMouseUp={() => { resetIdle(); onConnectEnd(card.id); }}
                onTouchEnd={() => { resetIdle(); onConnectEnd(card.id); }}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const json = e.dataTransfer.getData('application/json');
                        if (json) {
                            const data = JSON.parse(json);
                            if (data.sourceCardId === card.id) return;

                            const panes = [...(card.panes || [])];
                            let activeIdx = card.activePaneIndex || 0;
                            if (!panes[activeIdx]) {
                                panes[activeIdx] = { id: crypto.randomUUID(), type: 'empty', timestamp: Date.now() };
                            }

                            const newElement: CardPaneElement = {
                                ...data.element,
                                id: crypto.randomUUID(),
                                timestamp: Date.now()
                            };

                            panes[activeIdx] = {
                                ...panes[activeIdx],
                                type: 'mixed',
                                elements: [...(panes[activeIdx].elements || []), newElement]
                            };
                            onUpdate(card.id, { panes, type: 'mixed' }); // Convert note to mixed if it receives media
                            e.dataTransfer.dropEffect = 'move';
                        }
                    } catch (err) {
                        console.error('Drop on note error', err);
                    }
                }}
                onMouseMove={resetIdle}
                onKeyDown={resetIdle}
                onDoubleClick={(e) => { e.stopPropagation(); resetIdle(); setIsEditing(!isEditing); }}
            >
                {/* --- SLIDE MODE OVERLAY --- */}
                {isSlideActive && card.slideSettings?.isEnabled && (
                    <SlideModeOverlay
                        attachments={card.attachments || []}
                        slideIndex={currentSlideIndex}
                        mediaType={card.slideSettings.mediaType}
                        effect={card.slideSettings.transitionEffect || 'fade'}
                        showIdleTime={!!card.slideSettings.showIdleTime}
                        card={card}
                    />
                )}

                {/* --- FULL CARD PIZZA OVERLAY --- */}
                {!isEditing && chronoMode && chronoVisualMode === 'pizza' && chronoTarget > 0 && !showCornerChrono && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ borderRadius: 'inherit' }}>
                        <div
                            className="absolute inset-0 transition-all duration-1000"
                            style={{
                                background: getPizzaGradient(),
                            }}
                        />
                    </div>
                )}

                {/* --- FULL CARD BAR OVERLAY --- */}
                {!isEditing && chronoMode && chronoVisualMode === 'bar' && chronoTarget > 0 && !showCornerChrono && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ borderRadius: 'inherit' }}>
                        <div
                            className={`absolute left-0 top-0 bottom-0 transition-all duration-1000`}
                            style={{
                                background: '#4ade8055',
                                width: `${chronoTarget > 0 ? (chronoDirection === 'up'
                                    ? (chronoCurrent / chronoTarget) * 100
                                    : ((chronoTarget - chronoCurrent) / chronoTarget) * 100) : 0}%`
                            }}
                        />
                    </div>
                )}

                {/* Obsidian Style Toolbar Above Note - Refined per request */}
                {isSelected && (
                    <div className={`absolute ${showExternalTitle ? (isMobile ? '-top-32' : '-top-28') : (isMobile ? '-top-16' : '-top-14')} left-1/2 -translate-x-1/2 flex flex-col items-center z-[100] animate-in slide-in-from-bottom-2 duration-200`}>
                        <div className={`flex items-center gap-0.5 bg-white p-1 rounded-lg shadow-xl border border-gray-200 ${isMobile ? 'max-w-[85vw] overflow-x-auto no-select' : ''} custom-scrollbar`}>
                            <div className="flex divide-x divide-gray-100 shrink-0">
                                {/* Settings icon â€” opens note settings panel */}
                                <button onClick={(e) => { e.stopPropagation(); setShowNoteSettings(!showNoteSettings); setShowToolbarTag(false); setShowToolbarColor(false); }} className={`px-3 py-1.5 hover:bg-gray-50 transition-colors ${showNoteSettings ? 'text-indigo-500' : 'text-gray-400'}`} title="Note Settings">
                                    <Settings size={18} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setShowToolbarTag(!showToolbarTag); setShowToolbarColor(false); setShowNoteSettings(false); }} className={`px-3 py-1.5 hover:bg-gray-50 transition-colors ${showToolbarTag ? 'text-blue-500' : 'text-gray-400'}`} title="Tags">
                                    <Tag size={18} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setShowToolbarColor(!showToolbarColor); setShowToolbarTag(false); setShowNoteSettings(false); }} className={`px-3 py-1.5 hover:bg-gray-50 transition-colors ${showToolbarColor ? 'text-yellow-600' : 'text-gray-400'}`} title="Color">
                                    <Palette size={18} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); setShowToolbarTag(false); setShowToolbarColor(false); setShowNoteSettings(false); }} className={`px-3 py-1.5 hover:bg-gray-50 transition-colors ${isEditing ? 'text-amber-500' : 'text-gray-400'}`} title="Description / Edit">
                                    <Edit3 size={18} strokeWidth={1.5} />
                                </button>
                                {card.lapTimeEnabled && (
                                    <button onClick={(e) => { e.stopPropagation(); setShowLapsModal(true); setShowToolbarTag(false); setShowToolbarColor(false); setShowNoteSettings(false); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-colors" title="Laps History">
                                        <List size={18} strokeWidth={1.5} />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddNoteToCard?.(card.id);
                                    }}
                                    className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-yellow-500 transition-colors"
                                    title="Adicionar Nota"
                                >
                                    <StickyNote size={18} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onSchedule?.(card.id); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-green-500 transition-colors" title="Schedule">
                                    <Calendar size={18} strokeWidth={1.5} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newState = !showSlideSettings;
                                        setShowSlideSettings(newState);
                                        if (newState) {
                                            setShowNoteSettings(false);
                                            setShowToolbarTag(false);
                                            setShowToolbarColor(false);
                                        }
                                    }}
                                    className={`px-3 py-1.5 hover:bg-gray-50 transition-colors ${showSlideSettings ? 'text-purple-600' : 'text-gray-400'}`}
                                    title="Slide Settings"
                                >
                                    <Monitor size={18} strokeWidth={1.5} />
                                </button>
                                <button
                                    onClick={(e) => handleVoiceNote(e)}
                                    className={`px-3 py-1.5 hover:bg-gray-50 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-red-500'}`}
                                    title="Nota de Voz"
                                >
                                    <Mic size={18} strokeWidth={1.5} />
                                </button>

                                {/* === POMODORO ICONS === */}
                                {/* 1. Tomato: Toggle Pomodoro Mode */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const enabling = !card.pomodoroEnabled;
                                        onUpdate(card.id, { pomodoroEnabled: enabling });
                                        if (!enabling) stopPomodoroSession();
                                    }}
                                    className={`px-3 py-1.5 hover:bg-gray-50 transition-colors relative ${card.pomodoroEnabled ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                                    title="Ativar Modo Pomodoro"
                                >
                                    {/* Tomato SVG icon */}
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={card.pomodoroEnabled ? 'text-red-500' : ''}>
                                        <path d="M12 2c.55 0 1 .45 1 1v1.07A8.001 8.001 0 0 1 20 12c0 4.42-3.58 8-8 8s-8-3.58-8-8a8.001 8.001 0 0 1 7-7.93V3c0-.55.45-1 1-1z" />
                                        <path d="M12 4c-.2 0-.3-.1-.2-.2C12.5 2.8 14 2 14 2s-1 1.5-1.5 2c-.1.1-.3.1-.5 0z" fill="green" />
                                    </svg>
                                    {pomodoroActive && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                    )}
                                </button>
                                {/* 2. Config icon */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowPomodoroConfig(p => !p); setShowPomodoroList(false); }}
                                    className={`px-3 py-1.5 hover:bg-gray-50 transition-colors ${showPomodoroConfig ? 'text-orange-500' : 'text-gray-400 hover:text-orange-400'}`}
                                    title="ConfiguraÃ§Ãµes do Pomodoro"
                                >
                                    <Clapperboard size={18} strokeWidth={1.5} />
                                </button>
                                {/* 3. Lap list icon */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowPomodoroList(p => !p); setShowPomodoroConfig(false); }}
                                    className={`px-3 py-1.5 hover:bg-gray-50 transition-colors ${showPomodoroList ? 'text-blue-500' : 'text-gray-400 hover:text-blue-400'}`}
                                    title="HistÃ³rico de Laps (Pomodoro)"
                                >
                                    <ListVideo size={18} strokeWidth={1.5} />
                                </button>

                                <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                                    <Trash2 size={20} strokeWidth={1.5} />
                                </button>
                            </div>
                        </div>

                        {/* === POMODORO CONFIG PANEL === */}
                        {showPomodoroConfig && (
                            <div className="mt-2 bg-white rounded-xl shadow-xl border border-orange-100 p-3 w-64 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                                <p className="text-[10px] font-semibold text-orange-500 uppercase tracking-widest flex items-center gap-1">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.55 0 1 .45 1 1v1.07A8.001 8.001 0 0 1 20 12c0 4.42-3.58 8-8 8s-8-3.58-8-8a8.001 8.001 0 0 1 7-7.93V3c0-.55.45-1 1-1z" /></svg>
                                    Config Pomodoro
                                </p>

                                {/* Timer duration */}
                                <label className="flex flex-col gap-1">
                                    <span className="text-[10px] text-gray-500">DuraÃ§Ã£o (minutos)</span>
                                    <input
                                        type="number" min={1} max={120}
                                        value={Math.round(pomConfig.timerSeconds / 60)}
                                        onChange={e => onUpdate(card.id, { pomodoroConfig: { ...pomConfig, timerSeconds: (parseInt(e.target.value) || 25) * 60 } })}
                                        className="border border-gray-200 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-orange-300"
                                    />
                                </label>

                                {/* Direction */}
                                <label className="flex flex-col gap-1">
                                    <span className="text-[10px] text-gray-500">Modo do cronÃ´metro</span>
                                    <div className="flex gap-1">
                                        {(['down', 'up'] as const).map(d => (
                                            <button key={d}
                                                onClick={() => onUpdate(card.id, { pomodoroConfig: { ...pomConfig, direction: d } })}
                                                className={`flex-1 px-2 py-1 rounded text-xs border transition-colors ${pomConfig.direction === d ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                                            >
                                                {d === 'down' ? 'â–¼ Regressivo' : 'â–² Progressivo'}
                                            </button>
                                        ))}
                                    </div>
                                </label>

                                {/* Lap Time Toggle */}
                                <label className="flex items-center justify-between cursor-pointer gap-2">
                                    <span className="text-xs text-gray-600">Modo Lap Time</span>
                                    <button onClick={() => onUpdate(card.id, { pomodoroConfig: { ...pomConfig, lapTimeEnabled: !pomConfig.lapTimeEnabled } })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${pomConfig.lapTimeEnabled ? 'bg-orange-500' : 'bg-gray-200'}`}>
                                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${pomConfig.lapTimeEnabled ? 'left-4' : 'left-0.5'}`} />
                                    </button>
                                </label>

                                {/* Capture Toggle */}
                                <label className="flex items-center justify-between cursor-pointer gap-2">
                                    <span className="text-xs text-gray-600">CaptaÃ§Ã£o automÃ¡tica</span>
                                    <button onClick={() => onUpdate(card.id, { pomodoroConfig: { ...pomConfig, captureEnabled: !pomConfig.captureEnabled } })}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${pomConfig.captureEnabled ? 'bg-orange-500' : 'bg-gray-200'}`}>
                                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${pomConfig.captureEnabled ? 'left-4' : 'left-0.5'}`} />
                                    </button>
                                </label>

                                {/* Capture window */}
                                {pomConfig.captureEnabled && (
                                    <label className="flex flex-col gap-1 border-l-2 border-orange-100 pl-2">
                                        <span className="text-[10px] text-gray-500">Janela de captaÃ§Ã£o ({pomConfig.captureWindowSeconds}s)</span>
                                        <input
                                            type="range" min={10} max={60} step={5}
                                            value={pomConfig.captureWindowSeconds}
                                            onChange={e => onUpdate(card.id, { pomodoroConfig: { ...pomConfig, captureWindowSeconds: parseInt(e.target.value) } })}
                                            className="accent-orange-500 w-full"
                                        />
                                        <div className="flex justify-between text-[9px] text-gray-400">
                                            <span>10s</span><span>60s</span>
                                        </div>
                                    </label>
                                )}

                                {/* === AI TOGGLE === */}
                                <div className="border-t border-orange-50 pt-2 mt-1">
                                    <label className="flex items-center justify-between cursor-pointer gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <Wand2 size={12} className="text-purple-500" />
                                            <span className="text-xs text-gray-700 font-semibold">AnÃ¡lise por IA</span>
                                        </div>
                                        <button onClick={() => onUpdate(card.id, { pomodoroConfig: { ...pomConfig, aiEnabled: !pomConfig.aiEnabled } })}
                                            className={`w-8 h-4 rounded-full transition-colors relative ${pomConfig.aiEnabled ? 'bg-purple-500' : 'bg-gray-200'}`}>
                                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${pomConfig.aiEnabled ? 'left-4' : 'left-0.5'}`} />
                                        </button>
                                    </label>
                                    {pomConfig.aiEnabled && (
                                        <p className="text-[9px] text-purple-400 mt-1 pl-5 leading-relaxed">
                                            A IA analisa a foto e Ã¡udio de cada lap e gera tÃ­tulo, descriÃ§Ã£o e tempo ideal automaticamente.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* === POMODORO LAP LIST PANEL === */}
                        {showPomodoroList && (
                            <div className="mt-2 bg-white rounded-xl shadow-xl border border-blue-100 p-3 w-80 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-semibold text-blue-500 uppercase tracking-widest flex items-center gap-1">
                                        <ListVideo size={10} />
                                        HistÃ³rico Pomodoro
                                        {(card.pomodoroLaps?.length || 0) > 0 && (
                                            <span className="bg-blue-100 text-blue-600 rounded-full px-1.5 py-px text-[9px] ml-1">{card.pomodoroLaps!.length}</span>
                                        )}
                                    </p>
                                    {(card.pomodoroLaps?.length || 0) > 0 && (
                                        <button onClick={() => onUpdate(card.id, { pomodoroLaps: [] })} className="text-[9px] text-red-400 hover:text-red-600">Limpar</button>
                                    )}
                                </div>
                                {(!card.pomodoroLaps || card.pomodoroLaps.length === 0) ? (
                                    <p className="text-xs text-gray-400 text-center py-4">Nenhum lap registrado ainda.<br />Ative o ðŸ… e clique no card!</p>
                                ) : (
                                    [...(card.pomodoroLaps)].reverse().map((lap) => (
                                        <div key={lap.id} className="border border-gray-100 rounded-xl p-2.5 flex flex-col gap-2 bg-gray-50">
                                            {/* Lap header */}
                                            <div className="flex items-start justify-between gap-1">
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    {lap.isAnalyzing ? (
                                                        <div className="flex items-center gap-1.5 text-purple-500">
                                                            <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" /></svg>
                                                            <span className="text-[10px]">IA analisando...</span>
                                                        </div>
                                                    ) : lap.aiTitle ? (
                                                        <span className="text-[11px] font-bold text-gray-800 truncate">{lap.aiTitle}</span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-orange-600">ðŸ… Lap #{lap.lapIndex}</span>
                                                    )}
                                                    {lap.aiDescription && !lap.isAnalyzing && (
                                                        <p className="text-[9px] text-gray-500 leading-tight mt-0.5">{lap.aiDescription}</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-[9px] font-mono text-gray-400">{formatChronoTime(lap.duration)}</span>
                                                    {/* AI Recommended Time Badge */}
                                                    {lap.aiRecommendedMinutes && !lap.isAnalyzing && (
                                                        <div className="flex items-center gap-0.5 bg-purple-50 border border-purple-200 rounded-full px-1.5 py-px">
                                                            <Wand2 size={7} className="text-purple-500" />
                                                            <span className="text-[8px] font-bold text-purple-600">{lap.aiRecommendedMinutes}min</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* AI Reasoning */}
                                            {lap.aiReasoning && !lap.isAnalyzing && (
                                                <p className="text-[8px] text-purple-400 italic border-l-2 border-purple-100 pl-1.5">{lap.aiReasoning}</p>
                                            )}

                                            {/* Camera snapshot */}
                                            {lap.imageUrl && (
                                                <img src={lap.imageUrl} alt={`Lap ${lap.lapIndex}`} className="w-full rounded-lg object-cover max-h-28 border border-gray-100" />
                                            )}

                                            {/* Audio player */}
                                            {lap.audioUrl && (
                                                <audio controls src={lap.audioUrl} className="w-full h-7" />
                                            )}

                                            {/* Original transcription */}
                                            {lap.transcription && (
                                                <p className="text-[10px] text-gray-600 bg-white rounded px-2 py-1 border border-gray-100 italic">"{lap.transcription}"</p>
                                            )}

                                            <span className="text-[9px] text-gray-300">{new Date(lap.timestamp).toLocaleTimeString('pt-BR')}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* === Note Settings Panel === */}
                        {showNoteSettings && (
                            <div className="mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-56 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-2.5">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Note Options</p>

                                {/* Toggle: External Title */}
                                <label className="flex items-center justify-between cursor-pointer gap-2" onClick={e => e.stopPropagation()}>
                                    <span className="text-xs text-gray-600">TÃ­tulo externo</span>
                                    <button onClick={() => setShowExternalTitle(!showExternalTitle)}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${showExternalTitle ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${showExternalTitle ? 'left-4' : 'left-0.5'}`} />
                                    </button>
                                </label>

                                {/* Sub-toggle: Hide Title Background â€” only when external title is active */}
                                {showExternalTitle && (
                                    <label className="flex items-center justify-between cursor-pointer gap-2 pl-3 border-l-2 border-indigo-100" onClick={e => e.stopPropagation()}>
                                        <span className="text-xs text-gray-500">Ocultar fundo do tÃ­tulo</span>
                                        <button onClick={() => setHideTitleBg(!hideTitleBg)}
                                            className={`w-8 h-4 rounded-full transition-colors relative ${hideTitleBg ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${hideTitleBg ? 'left-4' : 'left-0.5'}`} />
                                        </button>
                                    </label>
                                )}

                                {/* Toggle: Hide Card Background */}
                                <label className="flex items-center justify-between cursor-pointer gap-2" onClick={e => e.stopPropagation()}>
                                    <span className="text-xs text-gray-600">Ocultar fundo do card</span>
                                    <button onClick={() => setHideBackground(!hideBackground)}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${hideBackground ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${hideBackground ? 'left-4' : 'left-0.5'}`} />
                                    </button>
                                </label>

                                {/* Tags Position: cima / baixo / lateral */}
                                <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                                    <span className="text-xs text-gray-600">PosiÃ§Ã£o das tags</span>
                                    <div className="flex gap-1">
                                        {(['top', 'bottom', 'side'] as const).map(pos => (
                                            <button key={pos} onClick={() => setTagsPosition(pos)}
                                                className={`flex-1 text-[10px] py-1 rounded-lg border transition-colors ${tagsPosition === pos
                                                    ? 'bg-indigo-500 text-white border-indigo-500'
                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                                    }`}>
                                                {pos === 'top' ? 'Cima' : pos === 'bottom' ? 'Baixo' : 'Lateral'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-gray-100" />

                                {/* Toggle: Chrono Mode */}
                                <label className="flex items-center justify-between cursor-pointer gap-2" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center gap-1.5">
                                        <Timer size={12} className="text-violet-500" />
                                        <span className="text-xs text-gray-600">Modo CronÃ´metro</span>
                                    </div>
                                    <button onClick={() => setChronoMode(!chronoMode)}
                                        className={`w-8 h-4 rounded-full transition-colors relative ${chronoMode ? 'bg-violet-500' : 'bg-gray-200'}`}>
                                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${chronoMode ? 'left-4' : 'left-0.5'}`} />
                                    </button>
                                </label>
                                {chronoMode && (
                                    <>
                                        <p className="text-[10px] text-gray-400 leading-relaxed pl-1">
                                            Digite sÃ³ um nÃºmero no card.<br />
                                            <span className="text-violet-500 font-medium">050</span> â†’ conta progressiva (0â†’50)<br />
                                            <span className="text-orange-400 font-medium">50</span> â†’ contagem regressiva (50â†’0)<br />
                                            <span className="text-blue-400 font-medium">50*</span> â†’ modo Time Lapse
                                        </p>

                                        {/* Unit Selector */}
                                        <div className="flex flex-col gap-1 pl-1" onClick={e => e.stopPropagation()}>
                                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Unidade do numeral</span>
                                            <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                                                {(['seconds', 'minutes', 'hours'] as const).map(unit => (
                                                    <button key={unit} onClick={() => setChronoUnit(unit)}
                                                        className={`flex-1 text-[9px] py-1 rounded transition-all font-medium ${chronoUnit === unit
                                                            ? 'bg-white text-violet-600 shadow-sm border border-violet-100'
                                                            : 'text-gray-400 hover:text-gray-600'
                                                            }`}>
                                                        {unit === 'seconds' ? 'Seg' : unit === 'minutes' ? 'Min' : 'Hora'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Default Value Settings */}
                                        <div className="flex flex-col gap-1.5 pl-1" onClick={e => e.stopPropagation()}>
                                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Valor PadrÃ£o</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={chronoDefaultValue}
                                                    onChange={e => setChronoDefaultValue(parseInt(e.target.value) || 0)}
                                                    className="w-16 border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-300"
                                                />
                                                <div className="flex flex-1 gap-1">
                                                    {(['down', 'up'] as const).map(d => (
                                                        <button key={d} onClick={() => setChronoDefaultDirection(d)}
                                                            className={`flex-1 text-[9px] py-1 rounded border transition-all ${chronoDefaultDirection === d
                                                                ? 'bg-violet-500 text-white border-violet-500'
                                                                : 'bg-white text-gray-400 border-gray-200'}`}>
                                                            {d === 'down' ? 'Regressivo' : 'Progressivo'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sub-toggle: Corner display */}
                                        <label className="flex items-center justify-between cursor-pointer gap-2 pl-3 border-l-2 border-violet-100" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px]">ðŸ“</span>
                                                <span className="text-xs text-gray-600">Exibir no canto superior</span>
                                            </div>
                                            <button onClick={() => setShowCornerChrono(!showCornerChrono)}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${showCornerChrono ? 'bg-violet-500' : 'bg-gray-200'}`}>
                                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${showCornerChrono ? 'left-4' : 'left-0.5'}`} />
                                            </button>
                                        </label>

                                        {/* Sub-toggle: Edit-duration red counter */}
                                        <label className="flex items-center justify-between cursor-pointer gap-2 pl-3 border-l-2 border-red-100" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px]">ðŸ”´</span>
                                                <span className="text-xs text-gray-600">Contagem de ediÃ§Ã£o</span>
                                            </div>
                                            <button onClick={() => setShowEditChrono(!showEditChrono)}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${showEditChrono ? 'bg-red-400' : 'bg-gray-200'}`}>
                                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${showEditChrono ? 'left-4' : 'left-0.5'}`} />
                                            </button>
                                        </label>

                                        <div className="flex flex-col gap-1.5 mt-1" onClick={e => e.stopPropagation()}>
                                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Estilo de ExibiÃ§Ã£o</span>
                                            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                                {(['numeric', 'pizza', 'bar'] as const).map(mode => (
                                                    <button key={mode} onClick={() => setChronoVisualMode(mode)}
                                                        className={`flex-1 text-[10px] py-1.5 rounded-lg transition-all font-medium ${chronoVisualMode === mode
                                                            ? 'bg-white text-violet-600 shadow-sm border border-violet-100'
                                                            : 'text-gray-400 hover:text-gray-600'
                                                            }`}>
                                                        {mode === 'numeric' ? 'NumÃ©rico' : mode === 'pizza' ? 'Pizza' : 'Barra'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Toggle: Lap Time */}
                                        <label className="flex items-center justify-between cursor-pointer gap-2 mt-2" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center gap-1.5">
                                                <Timer size={12} className="text-blue-500" />
                                                <span className="text-xs text-gray-600">Habilitar Voltas (Laps)</span>
                                            </div>
                                            <button onClick={() => onUpdate(card.id, { lapTimeEnabled: card.lapTimeEnabled === false ? true : false })}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${card.lapTimeEnabled !== false ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${card.lapTimeEnabled !== false ? 'left-4' : 'left-0.5'}`} />
                                            </button>
                                        </label>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Color picker panel */}
                        {showToolbarColor && (
                            <div className="mt-2 bg-white p-2 rounded-lg shadow-xl border border-gray-200 flex gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                                {(['red', 'yellow', 'purple', 'blue', 'green', 'gray'] as const).map(c => (
                                    <button
                                        key={c}
                                        onClick={(e) => { e.stopPropagation(); onUpdate(card.id, { color: c }); }}
                                        className={`w-5 h-5 rounded-full border border-black/10 transition-transform
                                            ${c === 'red' ? 'bg-red-400' : c === 'yellow' ? 'bg-yellow-400' : c === 'purple' ? 'bg-purple-400' : c === 'blue' ? 'bg-blue-400' : c === 'green' ? 'bg-green-400' : 'bg-white border-gray-300'}
                                            ${card.color === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                                        `}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Tag input panel */}
                        {showToolbarTag && (
                            <div className="mt-2 bg-white p-2 rounded-lg shadow-xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150 w-48">
                                <input
                                    autoFocus
                                    className="bg-transparent border-b border-gray-200 text-xs focus:outline-none w-full placeholder-gray-400 p-1"
                                    value={card.tags?.join(', ') || ''}
                                    onChange={(e) => onUpdate(card.id, { tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                                    placeholder="Enter tags..."
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>
                        )}

                        {/* External Title â€” shown between toolbar and card */}
                        {showExternalTitle && (
                            <div className="mt-2 mb-1 animate-in fade-in slide-in-from-top-1 duration-200 flex flex-col gap-1">
                                <input
                                    autoFocus={showExternalTitle && !showToolbarTag}
                                    className={`w-full text-center text-sm font-semibold text-gray-700 px-3 py-1.5 focus:outline-none placeholder-gray-300 transition-all
                                        ${hideTitleBg
                                            ? 'bg-transparent border-transparent shadow-none'
                                            : 'bg-white border border-gray-200 rounded-lg shadow focus:ring-2 focus:ring-indigo-300'
                                        }`}
                                    value={card.title}
                                    onChange={(e) => onUpdate(card.id, { title: e.target.value })}
                                    placeholder="Card title..."
                                    onClick={e => e.stopPropagation()}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Pin / Drag Handle (Sticky Notes only) */}
                {!isPlainWhite && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-500 shadow-sm border border-black/20 z-20" />}

                {/* === POMODORO IN-CARD STATUS WIDGET === */}
                {card.pomodoroEnabled && (
                    <div
                        className="absolute top-2 left-2 z-30 flex flex-col items-start gap-1 pointer-events-none"
                        style={{ pointerEvents: 'none' }}
                    >
                        {/* Tomato + Timer */}
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-sm border transition-all ${pomodoroActive ? 'bg-red-500 text-white border-red-400' : 'bg-white/80 text-gray-500 border-gray-200'}`}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2c.55 0 1 .45 1 1v1.07A8.001 8.001 0 0 1 20 12c0 4.42-3.58 8-8 8s-8-3.58-8-8a8.001 8.001 0 0 1 7-7.93V3c0-.55.45-1 1-1z" />
                            </svg>
                            {pomodoroActive ? formatPomodoroTimer(pomodoroTimer) : 'POMODORO'}
                            {pomodoroActive && pomConfig.lapTimeEnabled && (
                                <span className="ml-1 bg-white/30 px-1 rounded text-[8px]">Lap {pomodoroLapIndex}</span>
                            )}
                        </div>

                        {/* Capture Countdown Ring */}
                        {captureCountdown !== null && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-500 text-white rounded-full text-[9px] font-bold animate-pulse">
                                <svg width="10" height="10" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r="15" fill="none" stroke="white" strokeWidth="3" strokeOpacity="0.4" />
                                    <circle cx="18" cy="18" r="15" fill="none" stroke="white" strokeWidth="3"
                                        strokeDasharray={`${2 * Math.PI * 15}`}
                                        strokeDashoffset={`${2 * Math.PI * 15 * (captureCountdown / pomConfig.captureWindowSeconds)}`}
                                        strokeLinecap="round"
                                        transform="rotate(-90 18 18)"
                                    />
                                </svg>
                                ðŸŽ™ {captureCountdown}s
                            </div>
                        )}
                    </div>
                )}

                {/* === CORNER CHRONO DISPLAY === */}
                {(chronoMode ? showCornerChrono : chronoTarget > 0) && chronoTarget > 0 && (
                    <div className="absolute -top-8 left-0 z-30 flex items-center gap-1 pointer-events-none" onClick={e => e.stopPropagation()}>
                        {/* Grey main timer pill - Sophisticated Glassmorphism - 2x Smaller */}
                        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-black transition-all shadow-lg backdrop-blur-md border ${chronoFinished
                            ? 'bg-green-500/20 text-green-600 border-green-500/30'
                            : 'bg-white/70 text-gray-700 border-white/50'
                            }`}>
                            {chronoRunning && !chronoFinished && (
                                <span className="flex h-1.5 w-1.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                </span>
                            )}
                            {formatChronoTime(chronoCurrent)}
                        </div>

                        {/* Red edit timer pill - 2x Smaller */}
                        {showEditChrono && editChronoCurrent > 0 && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[9px] font-mono font-black bg-red-500/20 text-red-600 border border-red-500/30 backdrop-blur-md shadow-lg animate-in slide-in-from-left-2 transition-all">
                                <span className="flex h-1.5 w-1.5 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                </span>
                                +{formatChronoTime(editChronoCurrent)}
                            </div>
                        )}
                    </div>
                )}

                {/* Connection Handles (Hover only) */}
                {!isEditing && (
                    <>
                        <div className={`absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center ${activeBgClass} rounded-full cursor-crosshair z-50 opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-black/10`} onMouseDown={(e) => onConnectStart(card.id, e)}>
                            <PlusCircle size={14} className="text-white" />
                        </div>
                        <div className={`absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center ${activeBgClass} rounded-full cursor-crosshair z-50 opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-black/10`} onMouseDown={(e) => onConnectStart(card.id, e)}>
                            <PlusCircle size={14} className="text-white" />
                        </div>
                    </>
                )}


                {/* Content â€” editing always normal; chrono only in view mode */}
                <div className="p-4 flex-1 flex flex-col overflow-y-auto custom-scrollbar relative">
                    {/* Multi-Pane Navigation Arrows */}
                    {!isEditing && (
                        <>
                            {/* Left Arrow */}
                            {(card.activePaneIndex || 0) > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdate(card.id, { activePaneIndex: Math.max(0, (card.activePaneIndex || 0) - 1) });
                                    }}
                                    className={`absolute left-0.5 top-1/2 -translate-y-1/2 p-0.5 ${activeColorClass} opacity-40 group-hover/nav:opacity-100 transition-all z-40 group/nav`}
                                >
                                    <ChevronLeft size={24} strokeWidth={2.5} className="transition-transform" />
                                </button>
                            )}

                            {/* Right Arrow / Add Pane */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const panes = card.panes || [{ id: 'default', type: 'text', title: card.title, content: card.description, timestamp: Date.now() }];
                                    const currentIndex = card.activePaneIndex || 0;

                                    if (currentIndex < panes.length - 1) {
                                        onUpdate(card.id, { activePaneIndex: currentIndex + 1 });
                                    } else if (panes.length < MAX_PANES) {
                                        // Show Add Button or auto-create if clicked
                                        const newPane = { id: Math.random().toString(36).substr(2, 9), type: 'empty' as const, timestamp: Date.now() };
                                        onUpdate(card.id, {
                                            panes: [...panes, newPane],
                                            activePaneIndex: panes.length
                                        });
                                    }
                                }}
                                className={`absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 ${activeColorClass} opacity-40 group-hover/nav:opacity-100 transition-all z-40 group/nav`}
                            >
                                {(card.activePaneIndex || 0) < (card.panes?.length || 1) - 1 ? (
                                    <ChevronRight size={24} strokeWidth={2.5} className="transition-transform" />
                                ) : (
                                    <div className="relative flex flex-col items-center transition-transform">
                                        <ChevronRight size={24} strokeWidth={2.5} className="opacity-10 translate-x-1" />
                                        <Plus size={12} strokeWidth={3} className="absolute top-1.5 right-0 opacity-60" />
                                    </div>
                                )}
                            </button>

                            {/* Pagination Dots (Bottom) */}
                            {(card.panes?.length || 1) > 1 && (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-40">
                                    {(card.panes || [1]).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${(card.activePaneIndex || 0) === i
                                                ? `${activeBgClass} border border-white/20 shadow-sm`
                                                : 'bg-gray-300'
                                                }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdate(card.id, { activePaneIndex: i });
                                            }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Actions Top Right */}
                            <div className="absolute top-2 right-2 flex items-center gap-1 z-40">
                                <button
                                    className={`p-1 transition-colors ${showPanePicker ? activeColorClass : 'text-gray-400 group-hover:text-gray-600'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowPanePicker(!showPanePicker);
                                    }}
                                >
                                    <Upload size={14} className={showPanePicker ? 'animate-pulse' : ''} />
                                </button>
                                <button
                                    className="p-1 text-gray-400 hover:text-gray-600"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Implementation of expansion logic could be a modal or full-screen view
                                        console.log('Expand pane', card.activePaneIndex);
                                    }}
                                >
                                    <Maximize2 size={14} />
                                </button>
                            </div>
                        </>
                    )}

                    {/* Pane Content Rendering */}
                    {(card.panes && card.panes.length > 0) ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {isEditing && (card.activePaneIndex || 0) === 0 ? (
                                /* Support editing main note even in pane view if it's first pane */
                                <div className="p-1 flex flex-col bg-white animate-in fade-in duration-300">
                                    {renderExpandableDescription(card.description, (settings.fontSize || 14) * 1.1, "text-gray-400/80")}
                                    {/* Extra Divider for media below if any */}
                                    <div className="border-t border-gray-100 mt-4 mb-1" />
                                </div>
                            ) : null}
                            {(() => {
                                const activePane = card.panes[card.activePaneIndex || 0];

                                const renderElement = (type: string, content: string, title?: string, elementId?: string, width?: number, height?: number) => {
                                    let elementContent = null;
                                    const isNote = type === 'note';

                                    if (type === 'text' || type === 'note') {
                                        elementContent = (
                                            <div
                                                className={`flex flex-col w-full mb-4 animate-in fade-in slide-in-from-top-2 duration-500 overflow-hidden ${isNote ? 'bg-white p-2 rounded-xl border border-gray-100 shadow-sm' : ''}`}
                                                style={{ height: height ? `${height}px` : 'auto', width: width ? `${width}px` : '100%' }}
                                            >

                                                {editingNoteId === elementId ? (
                                                    <textarea
                                                        autoFocus
                                                        className="bg-transparent w-full focus:outline-none text-gray-400/80 leading-relaxed resize-none h-full"
                                                        value={content}
                                                        onChange={(e) => updateElementContent(elementId, e.target.value)}
                                                        onBlur={() => setEditingNoteId(null)}
                                                        style={{ fontSize: `${(settings.fontSize || 14) * 1.05}px` }}
                                                    />
                                                ) : (
                                                    renderExpandableDescription(
                                                        content || (isNote ? 'Clique para editar...' : ''),
                                                        (settings.fontSize || 14) * 1.05,
                                                        "text-gray-400/80",
                                                        (e) => { e.stopPropagation(); setEditingNoteId(elementId); }
                                                    )
                                                )}
                                            </div>
                                        );
                                    } else if (type === 'image' || type === 'gif') {
                                        elementContent = (
                                            <div
                                                className="w-full rounded-lg overflow-hidden mb-4 shadow-sm border border-black/5 bg-gray-50 flex items-center justify-center"
                                                style={{ height: height ? `${height}px` : 'auto', width: width ? `${width}px` : '100%' }}
                                            >
                                                <img src={content} className="w-full h-full object-contain" alt={title} />
                                            </div>
                                        );
                                    } else if (type === 'video') {
                                        elementContent = (
                                            <div
                                                className="w-full rounded-lg overflow-hidden mb-4 bg-black/5 shadow-sm border border-black/5"
                                                style={{ height: height ? `${height}px` : 'auto', width: width ? `${width}px` : '100%' }}
                                            >
                                                <video src={content} controls className="w-full h-full object-contain" />
                                            </div>
                                        );
                                    } else if (type === 'audio') {
                                        elementContent = (
                                            <div
                                                className="w-full p-4 bg-yellow-50 rounded-lg mb-4 flex flex-col items-center gap-2 border border-yellow-100"
                                                style={{ height: height ? `${height}px` : 'auto', width: width ? `${width}px` : '100%' }}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-600">
                                                    <Mic size={20} />
                                                </div>
                                                <audio src={content} controls className="w-full h-8" />
                                                <span className="text-[10px] font-bold text-yellow-700/50 uppercase tracking-widest">{title || 'Ãudio gravado'}</span>
                                            </div>
                                        );
                                    } else if (type === 'location') {
                                        const loc = content ? JSON.parse(content) : null;
                                        elementContent = (
                                            <div
                                                className="w-full p-4 bg-blue-50 rounded-lg mb-4 flex flex-col items-center gap-2 border border-blue-100 text-center"
                                                style={{ height: height ? `${height}px` : 'auto', width: width ? `${width}px` : '100%' }}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
                                                    <MapPin size={20} />
                                                </div>
                                                <span className="text-xs font-bold text-blue-700">LocalizaÃ§Ã£o Coletada</span>
                                                {loc && (
                                                    <p className="text-[10px] text-blue-400 font-mono">
                                                        lat: {loc.lat.toFixed(4)}, lng: {loc.lng.toFixed(4)}
                                                    </p>
                                                )}
                                                <a
                                                    href={`https://www.google.com/maps?q=${loc?.lat},${loc?.lng}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 text-[10px] text-blue-600 font-bold hover:underline"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    VER NO GOOGLE MAPS
                                                </a>
                                            </div>
                                        );
                                    } else if (type === 'calendar') {
                                        // Parse stored events: JSON { "YYYY-MM-DD": ["HH:00: Task text", ...] }
                                        let calEvents: Record<string, string[]> = {};
                                        try { calEvents = content ? JSON.parse(content) : {}; } catch { calEvents = {}; }

                                        const updateCalEvents = (newEvents: Record<string, string[]>) => {
                                            if (elementId) updateElementContent(elementId, JSON.stringify(newEvents));
                                        };

                                        elementContent = (
                                            <CardCalendar
                                                events={calEvents}
                                                onEventsChange={updateCalEvents}
                                                isEditing={isEditing}
                                                cardColor={card.color}
                                            />
                                        );
                                    }

                                    if (!elementId) return elementContent;

                                    return (
                                        <div
                                            className="relative group/element w-full cursor-grab active:cursor-grabbing"
                                            draggable
                                            onDragStart={(e) => {
                                                const data = {
                                                    sourceCardId: card.id,
                                                    sourcePaneIndex: card.activePaneIndex || 0,
                                                    element: { id: elementId, type, content, title, width, height }
                                                };
                                                // Primary data
                                                e.dataTransfer.setData('application/json', JSON.stringify(data));
                                                // Fallbacks for better drag preview and standard drop targets
                                                e.dataTransfer.setData('text/plain', title || (type === 'calendar' ? 'Agenda' : 'Elemento de Card'));

                                                e.dataTransfer.effectAllowed = 'move';
                                                e.currentTarget.classList.add('opacity-50');
                                            }}
                                            onDragEnd={(e) => {
                                                e.currentTarget.classList.remove('opacity-50');
                                                if (e.dataTransfer.dropEffect === 'move') {
                                                    const panes = [...(card.panes || [])];
                                                    const activeIdx = card.activePaneIndex || 0;
                                                    if (panes[activeIdx]?.elements) {
                                                        panes[activeIdx] = {
                                                            ...panes[activeIdx],
                                                            elements: panes[activeIdx].elements.filter(el => el.id !== elementId)
                                                        };
                                                        onUpdate(card.id, { panes });
                                                    }
                                                }
                                            }}
                                        >
                                            {elementContent}

                                            {/* Order & Management Controls Toolbar */}
                                            <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 transition-opacity z-50 ${isEditing ? 'opacity-100' : 'opacity-0 group-hover/element:opacity-100'
                                                }`} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); pinElementToTop(elementId); }}
                                                    className="p-1 hover:text-blue-400 text-white transition-all"
                                                    title="Fixar no Topo"
                                                >
                                                    <Pin size={12} strokeWidth={2.5} />
                                                </button>
                                                <div className="flex flex-col">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); moveElementVertical(elementId, 'up'); }}
                                                        className="p-0.5 hover:text-blue-400 text-white transition-colors"
                                                    >
                                                        <ChevronUp size={10} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); moveElementVertical(elementId, 'down'); }}
                                                        className="p-0.5 hover:text-blue-400 text-white transition-colors"
                                                    >
                                                        <ChevronDown size={10} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteElement(elementId); }}
                                                    className="p-1 hover:text-red-400 text-white transition-all"
                                                    title="Excluir MÃ­dia"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>

                                            {/* Resize Handle - Bottom Right */}
                                            <div
                                                className={`absolute bottom-4 right-0 w-6 h-6 cursor-nwse-resize transition-opacity flex items-center justify-center text-gray-300 hover:text-blue-500 z-50 ${isEditing ? 'opacity-100' : 'opacity-0 group-hover/element:opacity-100'
                                                    }`}
                                                onMouseDown={(e) => handleElementResizeStart(e, elementId, width || (e.currentTarget.parentElement?.clientWidth || 0), height || (e.currentTarget.parentElement?.clientHeight || 0))}
                                            >
                                                <Maximize2 size={14} className="rotate-90" />
                                            </div>
                                        </div>
                                    );
                                };

                                if (showPanePicker || activePane.type === 'empty') {
                                    const pickerItems = [
                                        { icon: ImageIcon, label: 'Imagem', type: 'image' },
                                        { icon: Zap, label: 'GIF', type: 'gif' },
                                        { icon: Video, label: 'VÃ­deo', type: 'video' },
                                        { icon: Music, label: 'Audio', type: 'audio' },
                                        { icon: FileText, label: 'PDF', type: 'pdf' },
                                        { icon: FileText, label: 'Texto Doc', type: 'text' },
                                        { icon: Edit3, label: 'Criar Nota', type: 'note' },
                                        { icon: Camera, label: 'Foto', type: 'capture-photo' },
                                        { icon: Video, label: 'Gravar', type: 'capture-video' },
                                        { icon: Mic, label: 'Voz', type: 'capture-audio' },
                                        { icon: MapPin, label: 'Local', type: 'location' },
                                        { icon: Calendar, label: 'Agenda', type: 'calendar' },
                                        { icon: Plus, label: 'Mais', type: 'empty' },
                                    ];

                                    return (
                                        <div className="flex-1 flex flex-col items-center py-6 px-2 min-h-[250px] animate-in fade-in transition-all relative overflow-y-auto custom-scrollbar">


                                            <div className="grid grid-cols-4 gap-y-6 gap-x-1 w-full max-w-[260px]">
                                                {pickerItems.map((opt, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={(e) => {
                                                            e.stopPropagation();

                                                            if (['image', 'gif', 'video', 'audio', 'pdf', 'text'].includes(opt.type)) {
                                                                setPendingMediaType(opt.type as CardPaneElement['type']);
                                                                fileInputRef.current?.click();
                                                                return;
                                                            }

                                                            if (opt.type.startsWith('capture-')) {
                                                                handleCapture(opt.type.replace('capture-', ''));
                                                                return;
                                                            }

                                                            if (opt.type === 'location') {
                                                                handleGetLocation();
                                                                return;
                                                            }

                                                            if (opt.type === 'note' || opt.type === 'calendar') {
                                                                appendElementToActivePane(opt.type, '', opt.label);
                                                                return;
                                                            }
                                                        }}
                                                        className="flex flex-col items-center gap-1.5 group transition-all"
                                                    >
                                                        <div className={`w-10 h-10 rounded-full ${activeBgSoftClass} flex items-center justify-center ${activeColorClass} group-hover:scale-110 transition-all duration-300 border border-white/20 shadow-sm`}>
                                                            <opt.icon size={18} strokeWidth={1.5} />
                                                        </div>
                                                        <span className={`text-[7.5px] font-semibold uppercase tracking-tight ${activeColorClass} opacity-60 group-hover:opacity-100 transition-all whitespace-nowrap overflow-hidden text-ellipsis w-full text-center`}>
                                                            {opt.label}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>


                                        </div>
                                    );
                                }

                                return (
                                    <div className="flex-1 flex flex-col p-2" onMouseMove={resetIdle} onClick={resetIdle}>
                                        {/* Fixed Main Note on Pane 0 */}
                                        {!isEditing && (card.activePaneIndex || 0) === 0 && (
                                            <div className="flex flex-col mb-4">
                                                {!showExternalTitle && (card.title || isEditing) ? (
                                                    <h3 className="text-base font-black uppercase tracking-widest text-gray-300/60 leading-tight">
                                                        {card.title || 'Note'}
                                                    </h3>
                                                ) : <div className="flex-1" />}

                                                {/* Divider Line Removed for Minimalist Aesthetic */}

                                                {card.description ? (
                                                    renderExpandableDescription(card.description, (settings.fontSize || 14) * 1.1, "text-gray-400/80")
                                                ) : (
                                                    <p className="text-gray-300/70 text-sm italic select-none">
                                                        Clique para editar...
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Legacy Content (only for secondary panes) */}
                                        {activePane.content && activePane.type !== 'empty' && activePane.type !== 'mixed' && (card.activePaneIndex || 0) > 0 && (
                                            renderElement(activePane.type as any, activePane.content, activePane.title)
                                        )}

                                        {/* Dynamic elements (Scrollable items) */}
                                        {activePane.elements?.map(el => (
                                            <div key={el.id}>
                                                {renderElement(el.type, el.content, undefined, el.id, el.width, el.height)}
                                            </div>
                                        ))}

                                        {/* Empty state logic */}
                                        {(!card.description || (card.activePaneIndex || 0) > 0) && (!activePane.content || (card.activePaneIndex || 0) === 0) && (!activePane.elements || activePane.elements.length === 0) && (
                                            <div className="flex-1 flex items-center justify-center text-gray-300 italic text-xs py-12">
                                                Nenhum item adicional
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        /* Legacy/Default View */
                        <>
                            {isEditing ? (
                                /* === EDITING MODE === */
                                <>
                                    {!showExternalTitle && (
                                        <input
                                            className="bg-transparent border-b border-black/10 text-base font-semibold focus:outline-none w-full mb-2 placeholder-gray-300 text-gray-700"
                                            value={card.title}
                                            onChange={(e) => onUpdate(card.id, { title: e.target.value })}
                                            placeholder="Title"
                                        />
                                    )}
                                    {renderExpandableDescription(card.description, (settings.fontSize || 14) * 0.9, "text-gray-600")}
                                </>
                            ) : chronoMode && chronoTarget > 0 && !showCornerChrono ? (
                                /* === VIEW MODE + CHRONO === */
                                <div className="flex-1 flex flex-col items-center justify-center gap-6 select-none w-full animate-in fade-in zoom-in-95">
                                    {chronoVisualMode === 'numeric' ? (
                                        <>
                                            <div className={`text-[12px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-sm border transition-all ${chronoDirection === 'up' ? 'bg-violet-50 text-violet-600 border-violet-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                {chronoDirection === 'up' ? 'â–² Progressivo' : 'â–¼ Regressivo'}
                                            </div>
                                            <div className={`text-6xl font-mono font-black tracking-tighter transition-all duration-300 drop-shadow-sm ${chronoFinished ? 'text-green-500 scale-110' : chronoDirection === 'up' ? 'text-violet-600' : 'text-orange-500'}`}>
                                                {formatChronoTime(chronoCurrent)}
                                            </div>
                                            <div className="w-full max-w-[200px] h-2 rounded-full bg-gray-100/50 border border-gray-100 overflow-hidden shadow-inner">
                                                <div className={`h-full rounded-full transition-all duration-1000 ${chronoDirection === 'up' ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'}`} style={{ width: `${chronoTarget > 0 ? (chronoDirection === 'up' ? (chronoCurrent / chronoTarget) * 100 : ((chronoTarget - chronoCurrent) / chronoTarget) * 100) : 0}%` }} />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 flex flex-col h-full relative z-10 w-full items-center justify-center">
                                            <div className={`font-mono font-black text-6xl tracking-tighter drop-shadow-sm transition-all duration-300 ${chronoFinished ? 'text-green-500 scale-110' : 'text-gray-400'}`}>
                                                {formatChronoTime(chronoCurrent)}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setChronoRunning(!chronoRunning); }} className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${chronoRunning ? 'bg-gray-100 text-gray-600' : 'bg-orange-500 text-white'}`}>
                                            {chronoRunning ? <PauseCircle size={13} /> : <Play size={13} />}
                                            {chronoRunning ? 'Pausar' : 'Iniciar'}
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleChronoReset(); }} className="p-1.5 rounded-lg bg-gray-100 text-gray-500"><RotateCcw size={13} /></button>
                                    </div>
                                </div>
                            ) : (
                                /* === VIEW MODE NORMAL === */
                                <>
                                    {!card.title && !card.description && (
                                        <div className="h-full flex items-start">
                                            <span className="w-0.5 h-6 bg-blue-500 animate-pulse" />
                                        </div>
                                    )}
                                    {!showExternalTitle && card.title && <h3 className="text-base font-semibold mb-1 leading-tight text-gray-700">{card.title}</h3>}
                                    {card.description && renderExpandableDescription(card.description, (settings.fontSize || 14) * 0.9, "text-gray-500")}
                                </>
                            )}
                        </>
                    )}

                    {/* Internal Notes Rendering */}
                    {attachedNotes.filter(n => n.isInternal).length > 0 && (
                        <div className="mt-12 space-y-2 pb-10">
                            {attachedNotes.filter(n => n.isInternal).map(note => (
                                <div
                                    key={note.id}
                                    className={`p-3 bg-yellow-100/80 border border-yellow-200 rounded-lg shadow-sm text-xs text-yellow-900 group/note relative transition-all ${editingNoteId === note.id ? 'ring-2 ring-yellow-400' : ''}`}
                                    style={{
                                        width: note.width || '100%',
                                        height: note.height || 'auto',
                                        minHeight: '60px'
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onStartDrag(e, note.id);
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setEditingNoteId(note.id);
                                    }}
                                >
                                    {editingNoteId === note.id ? (
                                        <textarea
                                            autoFocus
                                            className="w-full h-full bg-transparent resize-none border-none outline-none text-[10px] min-h-[40px]"
                                            value={note.description}
                                            onChange={(e) => onUpdate(note.id, { description: e.target.value })}
                                            onBlur={() => setEditingNoteId(null)}
                                        />
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold flex items-center gap-1"><StickyNote size={10} /> {note.title || 'Note'}</span>
                                                <button
                                                    onClick={(e) => handleVoiceNote(e, note.id, note.description)}
                                                    className={`p-1 rounded-md transition-all ${isRecording ? 'text-red-500 animate-pulse bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-gray-50'}`}
                                                    title="Adicionar Nota de Voz"
                                                >
                                                    <Mic size={12} strokeWidth={2} />
                                                </button>
                                            </div>
                                            <p className="line-clamp-3 text-[10px] opacity-70 italic">{note.description}</p>

                                            {/* Resize Handles for Internal Note */}
                                            <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize opacity-0 group-hover/note:opacity-100 bg-yellow-400/30 rounded-br-lg"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    onResizeStart?.(e, note.id, 'bottom-right');
                                                }}
                                            />
                                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize opacity-0 group-hover/note:opacity-100 bg-yellow-400/20"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    onResizeStart?.(e, note.id, 'right');
                                                }}
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover/note:opacity-100 bg-yellow-400/20"
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    onResizeStart?.(e, note.id, 'bottom');
                                                }}
                                            />

                                            <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover/note:opacity-100 flex items-center justify-center transition-opacity rounded-lg pointer-events-none">
                                                <span className="text-[8px] font-bold uppercase tracking-widest text-yellow-700">Arraste para fora ou 2x click para editar</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* TAGS TOP: shown above the card (outside, just below the toolbar) */}
                {
                    tagsPosition === 'top' && card.tags?.length > 0 && (
                        <div className="absolute -top-7 left-0 right-0 flex flex-wrap gap-1 justify-center animate-in fade-in duration-200">
                            {card.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-gray-100 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shadow-sm">{tag}</span>
                            ))}
                        </div>
                    )
                }

                {/* TAGS BELOW: shown outside the card at the bottom */}
                {
                    tagsPosition === 'bottom' && card.tags?.length > 0 && (
                        <div className="absolute -bottom-7 left-0 right-0 flex flex-wrap gap-1 justify-center animate-in fade-in duration-200">
                            {card.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-gray-100 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shadow-sm">{tag}</span>
                            ))}
                        </div>
                    )
                }

                {/* TAGS SIDE: shown outside the card on the right */}
                {
                    tagsPosition === 'side' && card.tags?.length > 0 && (
                        <div className="absolute -right-2 top-0 translate-x-full flex flex-col gap-1 pl-2 animate-in fade-in duration-200">
                            {card.tags.map((tag, i) => (
                                <span key={i} className="text-[10px] bg-gray-100 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">{tag}</span>
                            ))}
                        </div>
                    )
                }

                <SlideSettingsPopover
                    isOpen={showSlideSettings}
                    onClose={() => setShowSlideSettings(false)}
                    card={card}
                    onUpdate={onUpdate}
                    position="bottom"
                />


                {/* Hidden File Input for Panes */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handlePaneFileUpload}
                    accept={
                        pendingMediaType === 'image' ? 'image/*' :
                            pendingMediaType === 'video' ? 'video/*' :
                                pendingMediaType === 'audio' ? 'audio/*' :
                                    pendingMediaType === 'pdf' ? 'application/pdf' :
                                        pendingMediaType === 'text' ? '.txt,.doc,.docx' :
                                            '*/*'
                    }
                />

                {/* Resize Handles */}
                {
                    isSelected && !isEditing && (
                        <>
                            <div className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'top')} />
                            <div className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
                            <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'left')} />
                            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'right')} />
                            <div className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-[60] hover:bg-blue-500" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
                            <div className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-[60] hover:bg-blue-500" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
                            <div className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-[60] hover:bg-blue-500" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
                            <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-[60] hover:bg-blue-500" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
                        </>
                    )
                }

                {/* --- TASK STATUS BAR (BELOW CARD) --- */}
                {
                    !isEditing && (
                        <div className="absolute -bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-[60] animate-in slide-in-from-top-2 duration-300">
                            {/* Main Interaction Row */}
                            <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-gray-100 px-4 py-2 rounded-full shadow-2xl shadow-black/10 transition-shadow hover:shadow-black/20">

                                {/* Teal: Micro-task Button (Does NOT stop timer) */}
                                <div className="flex items-center gap-1.5 group/btn">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMicroTaskComplete?.(card.id);
                                            // Se o usuário clicou (seja azul esverdeado...) passa para o próximo se estiver em foco
                                            if (isActiveTask) {
                                                // Pequeno delay para processar a contagem antes de avançar
                                                setTimeout(() => onCompleteTask?.(card.id), 200);
                                            }
                                        }}
                                        className="w-7 h-7 rounded-full bg-teal-50 text-teal-500 flex items-center justify-center hover:bg-teal-500 hover:text-white transition-all transform active:scale-90"
                                        title="Micro-conclusão"
                                    >
                                        <Check size={16} strokeWidth={3} />
                                    </button>
                                    <span className="text-[10px] font-bold text-teal-600 bg-teal-500/5 px-2 py-0.5 rounded-md border border-teal-500/10 min-w-[1.2rem] text-center" title="Progresso de Micro-tarefas">
                                        {card.microTaskCount || 0}{card.targetMicroTasks ? `/${card.targetMicroTasks}` : ''}
                                    </span>
                                </div>

                                <div className="w-[1px] h-3 bg-gray-100 mx-0.5" />

                                {/* Complete Button (Positive Outcome) */}
                                <div className="flex items-center gap-1.5 group/btn">
                                    <button
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            const idleSeconds = Math.floor((Date.now() - lastInteraction) / 1000);
                                            onCompleteTask?.(card.id, { startedAt: sessionStartTime || undefined, endedAt: Date.now(), idleDuration: idleSeconds }); 
                                        }}
                                        className="w-7 h-7 rounded-full bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-all transform active:scale-90"
                                        title="Concluir Total (Para Cronômetro)"
                                    >
                                        <Check size={16} strokeWidth={3} />
                                    </button>
                                    <span className="text-[10px] font-bold text-green-600 bg-green-500/5 px-2 py-0.5 rounded-md border border-green-500/10 min-w-[1.2rem] text-center" title="Conclusões Totais (Meta Atingida)">
                                        {card.completionCount || 0}
                                    </span>
                                </div>

                                {/* Brown: Incomplete Count (Meta Não Atingida) */}
                                <div className="flex items-center gap-1.5 group/btn">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const idleSeconds = Math.floor((Date.now() - lastInteraction) / 1000);
                                            const metadata = { startedAt: sessionStartTime || undefined, endedAt: Date.now(), idleDuration: idleSeconds };
                                            onIncompleteTask?.(card.id, metadata);
                                        }}
                                        className="w-7 h-7 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center border border-amber-200 hover:bg-amber-800 hover:text-white transition-all transform active:scale-90"
                                        title="Concluir como Incompleto (Meta Parcial)"
                                    >
                                        <AlertCircle size={14} strokeWidth={2.5} />
                                    </button>
                                    <span className="text-[10px] font-bold text-amber-900 bg-amber-800/10 px-2 py-0.5 rounded-md border border-amber-800/20 min-w-[1.2rem] text-center" title="Encerramentos Incompletos">
                                        {card.incompleteCount || 0}
                                    </span>
                                </div>

                                <div className="w-[1px] h-3 bg-gray-100 mx-0.5" />

                                {/* Play / Pause Button */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsPaused(p => !p); }}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-sm ${isPaused
                                        ? 'bg-blue-100 text-blue-500 hover:bg-blue-500 hover:text-white ring-2 ring-blue-200'
                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-200 hover:text-gray-700'
                                        }`}
                                    title={isPaused ? 'Retomar (Play)' : 'Pausar'}
                                >
                                    {isPaused
                                        ? <Play size={14} strokeWidth={2.5} className="translate-x-[1px]" />
                                        : <PauseCircle size={15} strokeWidth={2} />}
                                </button>

                                {/* Failure Button (Negative Outcome) */}
                                <div className="flex items-center gap-1.5 group/btn">
                                    <button
                                        onClick={handleManualFailure}
                                        className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all transform active:scale-90"
                                        title="Não Cumprido (Falha/Pular)"
                                    >
                                        <X size={16} strokeWidth={3} />
                                    </button>
                                    <span className="text-[10px] font-bold text-red-600 bg-red-500/5 px-2 py-0.5 rounded-md border border-red-500/10 min-w-[1.2rem] text-center" title="Falhas/Puladas">
                                        {card.failureCount || 0}
                                    </span>
                                </div>

                                <div className="w-[1px] h-3 bg-gray-100 mx-1" />

                                {/* Sub-card Button (Foot) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAddSubCard(card.id); }}
                                    className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all transform active:scale-95 shadow-sm"
                                    title="Criar Card Filho (Extrair)"
                                >
                                    <CornerDownRight size={14} strokeWidth={2.5} />
                                </button>

                                {/* Scheduling Group (Postponements) */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSchedule?.(card.id); }}
                                        className="w-7 h-7 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center hover:bg-yellow-500 hover:text-white transition-all transform active:scale-95 shadow-sm"
                                        title="Adiar Manualmente"
                                    >
                                        <Clock size={14} strokeWidth={2.5} />
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); onPostponeAi?.(card.id); }}
                                        className="w-7 h-7 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all transform active:scale-95 shadow-sm"
                                        title="Adiar via IA"
                                    >
                                        <Wand2 size={14} strokeWidth={2.5} />
                                    </button>
                                </div>

                                <div className="w-[1px] h-3 bg-gray-100 mx-1" />

                                {/* Performance Records */}
                                {(card.lastDuration !== undefined || card.bestDuration !== undefined) && (
                                    <>
                                        <div className="w-[1px] h-3 bg-gray-200" />
                                        <div className="flex flex-col text-[8px] leading-tight text-gray-400">
                                            {card.lastDuration !== undefined && (
                                                <div className="flex justify-between gap-2">
                                                    <span>Ãšltimo:</span>
                                                    <span className="font-mono text-gray-600">{formatChronoTime(card.lastDuration)}</span>
                                                </div>
                                            )}
                                            {card.bestDuration !== undefined && (
                                                <div className="flex justify-between gap-2">
                                                    <span>Record:</span>
                                                    <span className="font-mono text-blue-600 font-bold">{formatChronoTime(card.bestDuration)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Secondary Social Row: Share and Like */}
                            <div className="flex items-center gap-3 bg-white/95 backdrop-blur-md border border-gray-100 px-4 py-1.5 rounded-full shadow-xl shadow-black/5">
                                {/* Share Button (Blue) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onShare?.(card.id); }}
                                    className="w-6 h-6 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                                    title="Compartilhar"
                                >
                                    <Share2 size={12} strokeWidth={2.5} />
                                </button>

                                <div className="w-[1.5px] h-2 bg-gray-100" />

                                {/* Like Button (Inner Heart) */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); onLike?.(card.id); }}
                                    className="w-6 h-6 rounded-full bg-pink-50 text-pink-400 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-all active:scale-95"
                                    title="Curtir"
                                >
                                    <Heart size={12} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    )
                }
            </div >
        );
    }

    // --- Media Card Rendering ---
    if (card.type === 'media' && card.attachments?.[0]) {
        const media = card.attachments[0];
        return (
            <div
                ref={cardRef}
                className={`absolute group cursor-pointer ${isDragging ? '' : 'transition-all duration-200'} ${isSelected ? 'ring-4 ring-blue-500 z-40' : 'z-10 hover:z-30 hover:ring-2 hover:ring-blue-300'}`}
                onMouseDown={(e) => onStartDrag(e, card.id)}
                onTouchStart={(e) => onStartDrag(e, card.id)}
                onMouseUp={() => onConnectEnd(card.id)}
                onTouchEnd={() => onConnectEnd(card.id)}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const json = e.dataTransfer.getData('application/json');
                        if (json) {
                            const data = JSON.parse(json);
                            if (data.sourceCardId === card.id) return;

                            const panes = [...(card.panes || [])];
                            let activeIdx = card.activePaneIndex || 0;
                            if (!panes[activeIdx]) {
                                panes[activeIdx] = { id: crypto.randomUUID(), type: 'empty', timestamp: Date.now() };
                            }

                            const newElement: CardPaneElement = {
                                ...data.element,
                                id: crypto.randomUUID(),
                                timestamp: Date.now()
                            };

                            panes[activeIdx] = {
                                ...panes[activeIdx],
                                type: 'mixed',
                                elements: [...(panes[activeIdx].elements || []), newElement]
                            };
                            onUpdate(card.id, { panes }); // Convert media to mixed implicitly via panes
                            e.dataTransfer.dropEffect = 'move';
                        }
                    } catch (err) {
                        console.error('Drop on media error', err);
                    }
                }}
                onClick={handleManualClick}
                style={{
                    transform: `translate(${card.x}px, ${card.y}px)`,
                    width: card.width || 200,
                    height: card.height || 200,
                    transition: isDragging ? 'none' : 'all 0.2s ease'
                }}
            >
                <div className="w-full h-full overflow-hidden rounded-xl border-2 border-white/50 bg-black/5 shadow-2xl relative">
                    {media.type === 'video' ? (
                        <video src={media.url} className="w-full h-full object-cover" />
                    ) : media.type === 'audio' ? (
                        <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500">
                            <Music size={48} />
                        </div>
                    ) : (
                        <img src={media.url} className="w-full h-full object-cover" alt="" />
                    )}

                    {/* Toolbar overlay on hover/select */}
                    {(isSelected || isActiveTask) && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}>
                            <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="p-1 hover:text-red-400 text-white transition-colors">
                                <Trash2 size={12} />
                            </button>
                            <button
                                className="p-1 hover:text-blue-400 text-white cursor-crosshair"
                                onMouseDown={(e) => { e.stopPropagation(); onConnectStart(card.id, e); }}
                            >
                                <PlusCircle size={12} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Resize Handles */}
                {isSelected && (
                    <>
                        <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-[60] flex items-center justify-center" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}>
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'right')} />
                        <div className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
                    </>
                )}
            </div>
        );
    }

    // --- Standard Card Rendering ---
    return (
        <div
            ref={cardRef}
            className={`absolute flex flex-col bg-dark-800/90 backdrop-blur-md border-2 overflow-visible group
        ${card.shape === 'circle' ? 'rounded-full' : 'rounded-xl'}
        ${isSelected ? 'ring-2 ring-white z-40' : 'z-10 hover:z-30'}
        ${card.status === 'active' ? 'ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : ''}
        ${isNextTask ? 'animate-pulse ring-2 ring-yellow-400' : ''}
        ${card.status === 'completed' ? 'opacity-60 grayscale' : ''}
        ${card.status === 'skipped' ? 'opacity-50 border-dashed' : ''}
        ${borderColor}
        ${isDragging ? '' : 'transition-all duration-200'}
      `}
            onMouseDown={(e) => { resetIdle(); updateInteraction(); onStartDrag(e, card.id); }}
            onTouchStart={(e) => { resetIdle(); updateInteraction(); onStartDrag(e, card.id); }}
            onMouseUp={() => { resetIdle(); updateInteraction(); onConnectEnd(card.id); }}
            onTouchEnd={() => { resetIdle(); updateInteraction(); onConnectEnd(card.id); }}
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    const json = e.dataTransfer.getData('application/json');
                    if (json) {
                        const data = JSON.parse(json);
                        if (data.sourceCardId === card.id) return;

                        const panes = [...(card.panes || [])];
                        let activeIdx = card.activePaneIndex || 0;
                        if (!panes[activeIdx]) {
                            panes[activeIdx] = { id: crypto.randomUUID(), type: 'empty', timestamp: Date.now() };
                        }

                        const newElement: CardPaneElement = {
                            ...data.element,
                            id: crypto.randomUUID(),
                            timestamp: Date.now()
                        };

                        panes[activeIdx] = {
                            ...panes[activeIdx],
                            type: 'mixed',
                            elements: [...(panes[activeIdx].elements || []), newElement]
                        };
                        onUpdate(card.id, { panes });
                        e.dataTransfer.dropEffect = 'move';
                    }
                } catch (err) {
                    console.error('Drop on standard card error', err);
                }
            }}
            onMouseMove={() => { resetIdle(); /* Avoid hammering DB on move, but can track if needed */ }}
            onKeyDown={() => { resetIdle(); updateInteraction(); }}
            onClick={handleManualClick}
            onDoubleClick={() => { resetIdle(); updateInteraction(); setIsEditing(true); }}
            style={{
                transform: `translate(${card.x}px, ${card.y}px)`,
                width: card.width || (card.shape === 'circle' ? 256 : 256), // Default width
                height: card.height || (card.shape === 'circle' ? 256 : 'auto'), // Default height
                aspectRatio: card.shape === 'circle' && card.aspectRatio !== undefined ? card.aspectRatio : undefined,
                fontFamily: settings.fontFamily || 'Inter, sans-serif',
                fontSize: `${settings.fontSize || 14} px`,
                background: card.timerFillMode === 'radial-card-fill' && card.timerTotal > 0
                    ? `radial - gradient(circle at center, ${colorMap[card.color]} ${100 - (card.timerRemaining / card.timerTotal) * 100} %, transparent ${100 - (card.timerRemaining / card.timerTotal) * 100 + 0.1} %)`
                    : undefined,
                transition: isDragging ? 'none' : 'all 0.2s ease',
                willChange: 'transform'
            }}
        >
            {/* --- BACKGROUND MODE (Behind everything) --- */}
            {card.backgroundMode && card.attachments?.[0] && (
                <div className="absolute inset-0 z-0 pointer-events-none opacity-40 overflow-hidden" style={{ borderRadius: 'inherit' }}>
                    {card.attachments[0].type === 'video' ? (
                        <video src={card.attachments[0].url} autoPlay muted loop className="w-full h-full object-cover" />
                    ) : (
                        <img src={card.attachments[0].url} className="w-full h-full object-cover" alt="Background" />
                    )}
                </div>
            )}

            {/* --- WALLPAPER MODE (Above content, below UI) --- */}
            {card.wallpaperMode && card.attachments?.[0] && (
                <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden" style={{ borderRadius: 'inherit' }}>
                    {card.attachments[0].type === 'video' ? (
                        <video src={card.attachments[0].url} autoPlay muted loop className="w-full h-full object-cover shadow-inner" />
                    ) : (
                        <img src={card.attachments[0].url} className="w-full h-full object-cover shadow-inner" alt="Wallpaper" />
                    )}
                </div>
            )}

            {/* --- SLIDE MODE OVERLAY --- */}
            {isSlideActive && card.slideSettings?.isEnabled && (
                <SlideModeOverlay
                    attachments={card.attachments || []}
                    slideIndex={currentSlideIndex}
                    mediaType={card.slideSettings.mediaType}
                    effect={card.slideSettings.transitionEffect || 'fade'}
                    showIdleTime={!!card.slideSettings.showIdleTime}
                    card={card}
                />
            )}

            {/* Floating Toolbar Above Selected Card - Matching Image */}
            {(isSelected || isActiveTask) && !isEditing && (
                <div className={`absolute ${isMobile ? '-top-24' : '-top-20'} left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-2xl p-1.5 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 z-[100] animate-in slide-in-from-bottom-4 duration-500 ease-out ${isMobile ? 'max-w-[90vw] overflow-x-auto custom-scrollbar no-select' : ''}`}>
                    <div className={`flex items-center gap-1 ${isMobile ? 'shrink-0' : ''}`}>
                        {card.status === 'active' || card.status === 'pending' ? (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMicroTaskComplete?.(card.id); }}
                                    className="p-2.5 bg-emerald-50 hover:bg-emerald-100 rounded-2xl text-emerald-600 transition-all active:scale-90 shadow-sm border border-emerald-100/50"
                                    title="Micro-conclusão (Não para cronômetro)"
                                >
                                    <Check size={24} strokeWidth={3} />
                                </button>
                                <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); triggerCompletion(); }}
                                    className="p-2.5 bg-blue-500 hover:bg-blue-600 rounded-2xl text-white transition-all active:scale-90 shadow-lg shadow-blue-500/30"
                                    title="Concluir Tarefa (Para Cronômetro)"
                                >
                                    <Check size={24} strokeWidth={3} />
                                </button>
                                <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); onUpdate(card.id, { status: 'skipped' }); setPhase('idle'); }}
                                    className="p-2.5 bg-rose-50 hover:bg-rose-100 rounded-2xl text-rose-600 transition-all active:scale-90 border border-rose-100/50"
                                    title="NÃ£o Completou (X)"
                                >
                                    <X size={24} strokeWidth={3} />
                                </button>
                                <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSlideSettings(!showSlideSettings);
                                    }}
                                    className={`p-2.5 rounded-2xl transition-all active:scale-90 ${showSlideSettings ? 'bg-indigo-100 text-indigo-600 border border-indigo-200' : 'bg-gray-50 text-gray-400 hover:text-indigo-500 border border-gray-100'} `}
                                    title="Slide Settings"
                                >
                                    <Monitor size={24} strokeWidth={2} />
                                </button>
                                <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                                <button
                                    onClick={handleVoiceNote}
                                    className={`p-2.5 rounded-2xl transition-all active:scale-90 ${isRecording ? 'bg-rose-100 text-rose-600 animate-pulse border border-rose-200' : 'bg-gray-50 text-gray-400 hover:text-rose-500 border border-gray-100'} `}
                                    title="Nota de Voz"
                                >
                                    <Mic size={24} strokeWidth={2} />
                                </button>
                                <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowCardSettings(true); }}
                                    className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-400 hover:text-gray-900 transition-all active:scale-90 border border-gray-100"
                                    title="Configurações do Card"
                                >
                                    <Settings size={24} strokeWidth={2} />
                                </button>
                                <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowCardSettings(true); }}
                                    className="p-2.5 bg-amber-50 hover:bg-amber-100 rounded-2xl text-amber-600 transition-all active:scale-90 border border-amber-100/50 shadow-sm"
                                    title="Estilo (Palette)"
                                >
                                    <Palette size={24} strokeWidth={2} />
                                </button>

                                {/* Minimize/Expand Children Button */}
                                {childrenCount > 0 && (
                                    <>
                                        <div className="w-[1px] h-6 bg-gray-200 mx-1" />
                                        <div className="flex items-center gap-1.5 px-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUpdate(card.id, { isExpanded: !card.isExpanded });
                                                }}
                                                className={`p-2 rounded-lg transition-all active:scale-95 flex items-center gap-2 ${!(card.isExpanded ?? true)
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                    }`}
                                                title={!(card.isExpanded ?? true) ? "Expandir Filhos" : "Minimizar Filhos"}
                                            >
                                                {!(card.isExpanded ?? true) ? <ChevronRight size={20} strokeWidth={2.5} /> : <ChevronDown size={20} strokeWidth={2.5} />}
                                                <span className="text-xs font-black min-w-[1rem] text-center">
                                                    {childrenCount}
                                                </span>
                                            </button>
                                        </div>
                                    </>
                                )}
                                <div className="w-[1px] h-8 bg-gray-100 mx-1" />
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                                    className="p-2.5 bg-gray-50 hover:bg-rose-50 rounded-2xl text-gray-300 hover:text-rose-500 transition-all active:scale-90 border border-gray-100"
                                    title="Excluir Card"
                                >
                                    <Trash2 size={24} strokeWidth={2} />
                                </button>
                            </>
                        ) : (
                            <div className="flex divide-x divide-gray-100">
                                <button onClick={(e) => { e.stopPropagation(); onDelete(card.id); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                                    <Trash2 size={20} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setShowCardSettings(true); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-yellow-600 transition-colors" title="Style">
                                    <Palette size={20} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onCenterView?.(card.id, 1.2); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-blue-500 transition-colors" title="Focus">
                                    <Search size={20} strokeWidth={1.5} />
                                </button>
                                {childrenCount > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdate(card.id, { isExpanded: !card.isExpanded });
                                        }}
                                        className={`px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-1.5 ${!(card.isExpanded ?? true) ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-500'}`}
                                        title={!(card.isExpanded ?? true) ? "Expandir Filhos" : "Minimizar Filhos"}
                                    >
                                        {!(card.isExpanded ?? true) ? <ChevronRight size={20} strokeWidth={1.5} /> : <ChevronDown size={20} strokeWidth={1.5} />}
                                        <span className="text-xs font-bold">{childrenCount}</span>
                                    </button>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddNoteToCard?.(card.id);
                                    }}
                                    className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-yellow-500 transition-colors"
                                    title="Add Note to Card"
                                >
                                    <StickyNote size={20} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onSchedule?.(card.id); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-green-500 transition-colors" title="Schedule">
                                    <Calendar size={20} strokeWidth={1.5} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const newState = !showSlideSettings;
                                        setShowSlideSettings(newState);
                                        if (newState) setShowCardSettings(false);
                                    }}
                                    className={`px - 3 py - 1.5 hover: bg - gray - 50 transition - colors ${showSlideSettings ? 'text-purple-600' : 'text-gray-400'} `}
                                    title="Slide Mode Settings"
                                >
                                    <Monitor size={20} strokeWidth={1.5} />
                                </button>
                                <button
                                    onClick={handleVoiceNote}
                                    className={`px - 3 py - 1.5 hover: bg - gray - 50 transition - colors ${isRecording ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-red-500'} `}
                                    title="Nota de Voz"
                                >
                                    <Mic size={20} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-amber-500 transition-colors" title="Edit">
                                    <Edit3 size={20} strokeWidth={1.5} />
                                </button>
                                {card.lapTimeEnabled && (
                                    <button onClick={(e) => { e.stopPropagation(); setShowLapsModal(true); }} className="px-3 py-1.5 hover:bg-gray-50 text-gray-400 hover:text-blue-600 transition-colors" title="Laps History">
                                        <List size={20} strokeWidth={1.5} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <CardSettingsPopover
                isOpen={showCardSettings}
                onClose={() => setShowCardSettings(false)}
                card={card}
                onUpdate={onUpdate}
            />
            {/* Connection Handles (Nodes) - Obsidian Style */}
            {!isEditing && (
                <>
                    {/* Left Hande */}
                    <div
                        className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-white border-2 border-blue-500 rounded-full cursor-crosshair z-50 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-[0_5px_15px_rgba(59,130,246,0.3)]"
                        onMouseDown={(e) => onConnectStart(card.id, e)}
                    >
                        <PlusCircle size={16} className="text-blue-500" />
                    </div>
                    {/* Right Handle */}
                    <div
                        className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-white border-2 border-blue-500 rounded-full cursor-crosshair z-50 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-[0_5px_15px_rgba(59,130,246,0.3)]"
                        onMouseDown={(e) => onConnectStart(card.id, e)}
                    >
                        <PlusCircle size={16} className="text-blue-500" />
                    </div>
                    {/* Top Handle */}
                    <div
                        className="absolute left-1/2 -top-3.5 -translate-x-1/2 w-7 h-7 flex items-center justify-center bg-white border-2 border-blue-500 rounded-full cursor-crosshair z-50 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-[0_5px_15px_rgba(59,130,246,0.3)]"
                        onMouseDown={(e) => onConnectStart(card.id, e)}
                    >
                        <PlusCircle size={16} className="text-blue-500" />
                    </div>
                    {/* Bottom Handle */}
                    <div
                        className="absolute left-1/2 -bottom-3.5 -translate-x-1/2 w-7 h-7 flex items-center justify-center bg-white border-2 border-blue-500 rounded-full cursor-crosshair z-50 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-[0_5px_15px_rgba(59,130,246,0.3)]"
                        onMouseDown={(e) => onConnectStart(card.id, e)}
                    >
                        <PlusCircle size={16} className="text-blue-500" />
                    </div>
                </>
            )}

            {/* --- INTERACTION OVERLAYS --- */}

            {/* Click To Start Overlay */}
            {card.status === 'active' && (phase === 'idle' || waitingForClickPhase === 'pre-start') && behavior.requireClickToStart && (
                <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in" onClick={handleManualClick}>
                    <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/40 animate-pulse">
                        <Play size={32} className="text-white ml-1" />
                    </div>
                    <span className="text-[10px] font-black mt-4 text-blue-600 uppercase tracking-widest">Clique para Iniciar</span>
                </div>
            )}

            {/* Waiting For Timer Start Overlay */}
            {waitingForClickPhase === 'timer-start' && (
                <div className="absolute inset-0 z-50 bg-amber-50/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in" onClick={handleManualClick}>
                    <Play size={32} className="text-amber-500" />
                    <span className="text-[10px] font-black mt-2 text-amber-600 uppercase tracking-widest">Aquecimento concluído!</span>
                    <span className="text-xs font-black text-gray-900 mt-1 uppercase">Iniciar Timer?</span>
                    {overtimeStart && <span className="text-[9px] text-amber-600 mt-2 font-black">ATRASO: {Math.floor((Date.now() - overtimeStart) / 1000)}s</span>}
                </div>
            )}

            {/* Waiting For Task End Overlay */}
            {waitingForClickPhase === 'task-end' && (
                <div className="absolute inset-0 z-50 bg-rose-50/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in" onClick={handleManualClick}>
                    <CheckCircle size={32} className="text-rose-500 animate-pulse" />
                    <span className="text-[10px] font-black mt-2 text-rose-600 uppercase tracking-widest">Tempo esgotado!</span>
                    <span className="text-xs font-black text-gray-900 mt-1 uppercase">Concluir tarefa?</span>
                    {overtimeStart && <span className="text-[9px] text-rose-600 mt-2 font-black">EXTRA: {Math.floor((Date.now() - overtimeStart) / 1000)}s</span>}
                </div>
            )}

            {/* Waiting For Post-Start Overlay */}
            {waitingForClickPhase === 'post-start' && (
                <div className="absolute inset-0 z-50 bg-indigo-50/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in" onClick={handleManualClick}>
                    <Clock size={32} className="text-indigo-500" />
                    <span className="text-[10px] font-black mt-2 text-indigo-600 uppercase tracking-widest">Iniciar Pausa?</span>
                    {overtimeStart && <span className="text-[9px] text-indigo-600 mt-2 font-black">ATRASO: {Math.floor((Date.now() - overtimeStart) / 1000)}s</span>}
                </div>
            )}

            {/* Waiting For Post-End Overlay */}
            {waitingForClickPhase === 'post-end' && (
                <div className="absolute inset-0 z-50 bg-emerald-50/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in" onClick={handleManualClick}>
                    <CheckCircle size={32} className="text-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black mt-2 text-emerald-600 uppercase tracking-widest">Pausa concluída!</span>
                    {overtimeStart && <span className="text-[9px] text-emerald-600 mt-2 font-black">EXTRA: {Math.floor((Date.now() - overtimeStart) / 1000)}s</span>}
                </div>
            )}

            {/* Pre-Time Overlay */}
            {phase === 'pre-active' && !waitingForClickPhase && (
                <div className="absolute inset-0 z-50 bg-amber-50/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in">
                    <Hourglass size={32} className="text-amber-500 animate-spin" />
                    <span className="text-lg font-black text-gray-900 mt-2 tabular-nums">{subTimer}s</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Aquecendo</span>
                </div>
            )}

            {/* Pause Overlay */}
            {phase === 'paused' && (
                <div className="absolute inset-0 z-50 bg-sky-50/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in">
                    <Coffee size={32} className="text-sky-500" />
                    <span className="text-lg font-black text-gray-900 mt-2 tabular-nums">{subTimer}s</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Em Pausa</span>
                    <button onClick={(e) => cancelPause(e)} className="mt-4 text-[10px] font-black uppercase tracking-widest bg-white border border-gray-100 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all shadow-sm">Retomar</button>
                </div>
            )}

            {/* Post-Time Overlay */}
            {phase === 'post-active' && (
                <div className="absolute inset-0 z-50 bg-indigo-50/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center animate-in fade-in">
                    <Clock size={32} className="text-indigo-500" />
                    <span className="text-lg font-black text-gray-900 mt-2 tabular-nums">{subTimer}s</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Descompressão</span>
                    {!behavior.autoFlowAfterPostTime && subTimer === 0 && (
                        <button onClick={handleComplete} className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] tracking-widest uppercase py-2.5 px-6 rounded-xl animate-pulse shadow-lg shadow-indigo-500/30">
                            PRÓXIMO &rarr;
                        </button>
                    )}
                </div>
            )}

            {/* --- INFO OVERLAY --- */}
            {showInfo && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                    {/* Info Header */}
                    <div className="h-14 border-b border-gray-50 flex items-center justify-between px-5 bg-gray-50/30">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={16} className="text-blue-500" /> Detalhes do Foco
                        </span>
                        <button onClick={() => setShowInfo(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100/50 text-gray-400 hover:text-gray-900 transition-all"><X size={18} /></button>
                    </div>

                    {/* Info Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                        {/* Basic Stats Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm">
                                <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest block mb-1">Status</span>
                                <span className={`text - xs font - black uppercase tracking - tight ${card.status === 'completed' ? 'text-emerald-500' : card.status === 'skipped' ? 'text-rose-500' : 'text-gray-900'} `}>{card.status}</span>
                            </div>
                            {settings.showSchedule && (
                                <div className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm">
                                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest block mb-1">Agendado</span>
                                    <span className="text-xs text-gray-900 font-bold truncate">{formatScheduledTime(card.scheduledStart)}</span>
                                </div>
                            )}
                            {settings.showCompletionCount && (
                                <div className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm">
                                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest block mb-1">Concluído</span>
                                    <span className="text-xs font-black text-emerald-600">{card.completionCount || 0}x</span>
                                </div>
                            )}
                            <div className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm">
                                <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest block mb-1">Falhas</span>
                                <span className="text-xs font-black text-rose-600">{card.failureCount || 0}x</span>
                            </div>
                            {settings.showLastCompleted && (
                                <div className="bg-white p-3 rounded-2xl border border-gray-50 shadow-sm col-span-2">
                                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest block mb-1">Última Conclusão</span>
                                    <span className="text-xs text-gray-600 font-bold">{formatTimeSince(card.lastCompleted)}</span>
                                </div>
                            )}
                        </div>

                        {/* Intervals Detail */}
                        {card.intervals && card.intervals.count > 1 && (
                            <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100">
                                <span className="text-[8px] text-emerald-600 block mb-3 font-black uppercase tracking-widest">Progresso do Lote</span>
                                <div className="flex items-center justify-between text-[10px] font-black text-gray-900 mb-2 uppercase">
                                    <span>Rodada {card.currentInterval || 1} de {card.intervals.count}</span>
                                    <span className="tabular-nums">{Math.round(((card.currentInterval || 1) / card.intervals.count) * 100)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white rounded-full overflow-hidden shadow-inner">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                        style={{ width: `${((card.currentInterval || 1) / card.intervals.count) * 100}% ` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tags - Removed redundant display from flip side if we have it on main face */}

                        {/* Attachments & Notes */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Anexos ({card.attachments?.length || 0})</span>
                                {settings.showAttachmentActions && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => attachmentInputRef.current?.click()}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-all border border-gray-100 shadow-sm"
                                            title="Anexar Arquivo"
                                        >
                                            <Paperclip size={14} />
                                        </button>
                                        <button
                                            onClick={toggleRecording}
                                            className={`w - 8 h - 8 flex items - center justify - center rounded - xl transition - all border shadow - sm ${isRecording ? 'bg-rose-500 text-white border-rose-400 animate-pulse' : 'bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-500 border-gray-100'} `}
                                            title="Gravar Áudio"
                                        >
                                            <Mic size={14} />
                                        </button>
                                        <input type="file" ref={attachmentInputRef} className="hidden" onChange={(e) => handleFileUpload(e, false)} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                {card.attachments?.map(att => (
                                    <div key={att.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-4 group/att hover:border-blue-200 transition-all shadow-sm">
                                        {att.type === 'image' ? (
                                            <img src={att.url} alt="attachment" className="w-12 h-12 rounded-xl object-cover border border-gray-50 flex-shrink-0" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-50 flex-shrink-0">
                                                <Music size={20} className="text-gray-300" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            {att.type === 'audio' && (
                                                <div className="mt-1">
                                                    <audio src={att.url} controls className="h-6 w-full opacity-60 hover:opacity-100 transition-opacity" />
                                                </div>
                                            )}
                                            {att.type === 'image' && <div className="text-[10px] font-bold text-gray-700 mt-0.5 truncate uppercase">Imagem Anexada</div>}
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUpdate(card.id, { attachments: card.attachments?.filter(a => a.id !== att.id) });
                                            }}
                                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 group-hover/att:bg-rose-50 text-gray-200 group-hover/att:text-rose-500 transition-all opacity-0 group-hover/att:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Metrics Download */}
                        {card.metrics && card.metrics.length > 0 && (
                            <div className="pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => {
                                        const blob = new Blob([JSON.stringify(card.metrics, null, 2)], { type: 'application/json' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `metrics - ${card.title.replace(/\s+/g, '-')}.json`;
                                        a.click();
                                    }}
                                    className="w-full py-3 bg-gray-50 hover:bg-blue-50 text-[10px] font-black text-gray-400 hover:text-blue-600 rounded-2xl flex items-center justify-center gap-3 transition-all border border-gray-100 uppercase tracking-widest shadow-sm"
                                >
                                    <Activity size={16} /> Baixar Métricas de Performance
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}


            {/* Attached Notes Section */}
            {showNotes && attachedNotes.length > 0 && (
                <div className="absolute inset-0 z-50 bg-dark-900 rounded-xl flex flex-col overflow-hidden animate-in fade-in duration-200">
                    <div className="h-12 border-b border-white/10 flex items-center justify-between px-3 bg-dark-800">
                        <span className="text-xs font-bold text-gray-300 uppercase flex items-center gap-1">
                            <StickyNote size={14} className="text-yellow-400" /> Attached Notes
                        </span>
                        <button onClick={() => setShowNotes(false)} className="hover:bg-white/10 p-1 rounded"><X size={16} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {attachedNotes.map(note => (
                            <div key={note.id} className="bg-dark-800 p-2 rounded border border-white/5">
                                <h4 className="text-sm font-bold text-yellow-300">{note.title}</h4>
                                <p className="text-xs text-gray-300 mt-1">{note.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- MAIN CARD FACE --- */}

            {/* Header/Drag Handle */}
            <div
                className={`h-9 bg-white cursor-grab active:cursor-grabbing w-full flex items-center justify-between px-3 rounded-t-2xl border-b border-gray-50 relative ${card.wallpaperMode ? 'bg-transparent border-transparent' : ''}`}
                onMouseDown={(e) => onStartDrag(e, card.id)} // Only drag from header
                onClick={(e) => { e.stopPropagation(); onSelect(card.id); }}
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
            >
                <div className={`w - 2 h - 2 rounded - full bg - ${card.color} -500`} />

                {/* Idle Timer Icon Menu Item */}
                <div className="flex items-center gap-2 px-2.5 py-1 bg-gray-50/50 rounded-full border border-gray-100 hover:bg-gray-100/50 transition-all cursor-help group/idle" title="Tempo sem interação">
                    <Clock size={12} className="text-gray-400 group-hover/idle:text-blue-500 transition-colors" />
                    <span className="text-[10px] font-black font-mono text-gray-400 group-hover/idle:text-gray-900 whitespace-nowrap tracking-tight tabular-nums">
                        {idleString}
                    </span>
                </div>

                {/* Pause Button (Visible only when working) */}
                {card.status === 'active' && phase === 'active' && (
                    <div className="absolute left-1/2 -translate-x-1/2">
                        <button
                            onClick={initiatePause}
                            className="bg-sky-50 text-sky-500 hover:bg-sky-100 p-1.5 rounded-xl transition-all shadow-sm border border-sky-100"
                            title={`${behavior.maxPauses - pausesTaken} pauses left`}
                        >
                            <PauseCircle size={16} />
                        </button>
                    </div>
                )}

                {/* Action Icons */}
                <div className="flex items-center gap-1.5 z-20">
                    {settings.showAttachmentActions && (
                        <button onClick={() => attachmentInputRef.current?.click()} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-300 transition-all" title="Quick Attach">
                            <Paperclip size={14} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowCompletionHistory(true); }}
                        className="p-1.5 hover:bg-emerald-50 rounded-xl text-gray-300 hover:text-emerald-500 transition-all"
                        title="Histórico de Finalização"
                    >
                        <ClipboardCheck size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}

                        className="p-1.5 hover:bg-blue-50 rounded-xl text-gray-300 hover:text-blue-500 transition-all"
                        title="Info & Stats"
                    >
                        <Info size={16} />
                    </button>
                    {/* Minimize/Expand Children Button */}
                    {childrenCount > 0 && (
                        <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-xl border border-gray-100 shadow-sm ml-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUpdate(card.id, { isExpanded: !card.isExpanded });
                                }}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${!(card.isExpanded ?? true)
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-white text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                                    }`}
                                title={!(card.isExpanded ?? true) ? "Expandir Filhos" : "Minimizar Filhos"}
                            >
                                {!(card.isExpanded ?? true) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <span className="text-[10px] font-black text-gray-900 pr-1.5 tabular-nums">
                                {childrenCount}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onSchedule?.(card.id); }}
                        className={`p - 1.5 hover: bg - emerald - 50 rounded - xl transition - all ${card.scheduledStart ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'} `}
                        title={card.scheduledStart ? `Scheduled: ${new Date(card.scheduledStart).toLocaleString()} ` : "Schedule Card"}
                    >
                        <Calendar size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPostponeAi?.(card.id); }}
                        className="p-1.5 hover:bg-amber-50 rounded-xl text-gray-300 hover:text-amber-500 transition-all"
                        title="AI Smart Snooze"
                    >
                        <Wand2 size={16} />
                    </button>
                    <button
                        onClick={handleVoiceNote}
                        className={`p - 1.5 hover: bg - rose - 50 rounded - xl transition - all ${isRecording ? 'text-rose-500 animate-pulse' : 'text-gray-300 hover:text-rose-400'} `}
                        title="Voice Note"
                    >
                        <Mic size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowCardSettings(!showCardSettings); }}
                        className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-300 hover:text-gray-900 transition-all"
                        title="Card Settings"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* Image Area */}
            {settings.showImage && (
                <div className="h-32 w-full bg-dark-900 relative overflow-hidden group/img">
                    {card.imageUrl ? (
                        <img src={card.imageUrl} alt={card.title} className={`w - full h - full object - cover ${card.imageShape === 'circle' ? 'rounded-full' : ''} `} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <ImageIcon size={32} />
                        </div>
                    )}

                    {/* Image Overlay Controls */}
                    {isEditing && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity z-10">
                            <button onClick={handleGenerateImage} className="p-2 bg-purple-600 rounded-full hover:bg-purple-500" disabled={isGeneratingImg}>
                                <Wand2 size={16} className={isGeneratingImg ? "animate-spin" : ""} />
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-blue-600 rounded-full hover:bg-blue-500">
                                <ImageIcon size={16} />
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, true)} />
                        </div>
                    )}
                </div>
            )}

            {/* Resize Handles */}
            {isSelected && (
                <>
                    {/* Corner Handles */}
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nesw-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
                    <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-50" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />

                    {/* Edge Handles */}
                    <div className="absolute left-0 right-0 -top-2 h-4 cursor-ns-resize z-40" onMouseDown={(e) => handleResizeStart(e, 'top')} />
                    <div className="absolute left-0 right-0 -bottom-2 h-4 cursor-ns-resize z-40" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
                    <div className="absolute top-0 bottom-0 -left-2 w-4 cursor-ew-resize z-40" onMouseDown={(e) => handleResizeStart(e, 'left')} />
                    <div className="absolute top-0 bottom-0 -right-2 w-4 cursor-ew-resize z-40" onMouseDown={(e) => handleResizeStart(e, 'right')} />
                </>
            )}

            {/* Content */}
            <div className={`p-3 flex-1 flex flex-col gap-2 relative overflow-y-auto custom-scrollbar transition-opacity duration-500 ${card.wallpaperMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                {/* Timer Overlay */}
                {settings.showTimer && card.timerFillMode !== 'radial-card-fill' && (
                    <div className={`absolute ${settings.showImage ? '-top-10' : '-top-2'} right - 2 z - 10 flex flex - col items - end gap - 1`}>
                        <div
                            className="cursor-pointer transition-transform active:scale-95 relative group/timer"
                            onClick={(e) => {
                                if (isEditing && onTimerClick) {
                                    e.stopPropagation();
                                    onTimerClick(card.id);
                                } else {
                                    handleManualClick(e);
                                }
                            }}
                        >
                            {card.timerFillMode === 'pizza-slice' && (
                                <PizzaTimer
                                    total={card.timerTotal}
                                    remaining={card.timerRemaining}
                                    color={card.color}
                                    size={50}
                                />
                            )}

                            {/* Magic Duration Button */}
                            {isEditing && onAutoDuration && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAutoDuration(card.id); }}
                                    className="absolute -left-6 top-1/2 -translate-y-1/2 bg-purple-600 text-white p-1 rounded-full shadow-lg hover:bg-purple-500"
                                    title="Auto-Estimate Duration (AI)"
                                >
                                    <Wand2 size={12} />
                                </button>
                            )}
                        </div>

                        {/* Activity Icons below clock */}
                        {!isEditing && (
                            <div className="flex gap-2.5 items-center bg-white/50 backdrop-blur-md px-3 py-1 rounded-2xl border border-gray-100 shadow-sm">
                                {/* Teal: Micro-tasks progress */}
                                <div className="flex items-center gap-1" title="Micro-tarefas Realizadas">
                                    <Check size={12} className="text-emerald-500" />
                                    <span className="text-[10px] font-black text-emerald-600 tabular-nums">
                                        {card.microTaskCount || 0}{card.targetMicroTasks ? `/${card.targetMicroTasks}` : ''}
                                    </span>
                                </div>
                                <div className="w-[1px] h-3 bg-gray-100" />
                                {/* Green: Full completions */}
                                <div className="flex items-center gap-1" title="Tarefas Concluídas (Meta Atingida)">
                                    <Check size={12} className="text-blue-500" />
                                    <span className="text-[10px] font-black text-blue-600 tabular-nums">{card.completionCount || 0}</span>
                                </div>
                                <div className="w-[1px] h-3 bg-gray-100" />
                                {/* Brown: Incomplete */}
                                <div className="flex items-center gap-1" title="Tarefas Incompletas (Meta Não Atingida)">
                                    <AlertCircle size={12} className="text-amber-500" />
                                    <span className="text-[10px] font-black text-amber-600 tabular-nums">{card.incompleteCount || 0}</span>
                                </div>
                                <div className="w-[1px] h-3 bg-gray-100" />
                                {/* Red: Failures/Skipped */}
                                <div className="flex items-center gap-1" title="Falhas / Puladas">
                                    <X size={12} className="text-rose-500" />
                                    <span className="text-[10px] font-black text-rose-600 tabular-nums">{card.failureCount || 0}</span>
                                </div>
                            </div>
                        )}

                        {/* Manual Duration Input */}
                        {isEditing && (
                            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md px-2.5 py-1 rounded-xl border border-gray-100 shadow-sm">
                                <Clock size={12} className="text-gray-400" />
                                <input
                                    type="number"
                                    className="w-10 bg-transparent text-gray-900 text-[10px] font-black focus:outline-none text-center tabular-nums"
                                    value={Math.round(card.timerTotal / 60)}
                                    onChange={(e) => {
                                        const mins = parseInt(e.target.value) || 0;
                                        onUpdate(card.id, { timerTotal: mins * 60, timerRemaining: mins * 60 });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="min"
                                />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">min</span>
                            </div>
                        )}
                    </div>
                )}

                {isEditing ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center gap-3">
                            {childrenCount > 0 && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onUpdate(card.id, { isExpanded: !card.isExpanded });
                                    }}
                                    className="p-1 px-2.5 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100 flex items-center gap-1.5"
                                >
                                    <span className="text-[10px] font-black">{childrenCount}</span>
                                    {card.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            )}
                            <input
                                ref={titleRef}
                                className="bg-transparent border-b-2 border-gray-50 font-black focus:outline-none w-full pb-1 focus:border-blue-500 transition-all placeholder-gray-200 text-gray-900"
                                style={{
                                    fontFamily: settings.fontFamily || 'inherit',
                                    fontSize: `${(settings.fontSize || 14) * 1.3} px`,
                                    letterSpacing: '-0.02em'
                                }}
                                value={card.title}
                                onChange={(e) => onUpdate(card.id, { title: e.target.value })}
                                onBlur={(e) => handleBlur('title', e.target.value)}
                                placeholder="Título da tarefa..."
                                autoFocus
                            />
                        </div>
                        <textarea
                            className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 text-gray-600 focus:outline-none w-full h-24 resize-none min-h-[100px] focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all placeholder-gray-300 font-medium leading-relaxed"
                            style={{
                                fontFamily: settings.fontFamily || 'inherit',
                                fontSize: `${settings.fontSize || 14} px`
                            }}
                            value={card.description}
                            onChange={(e) => onUpdate(card.id, { description: e.target.value })}
                            onBlur={(e) => handleBlur('description', e.target.value)}
                            placeholder="Adicione detalhes ou notas aqui..."
                        />

                        {/* Tag Editor */}
                        <div className="mt-4 p-4 bg-gray-50/30 rounded-2xl border border-gray-50/50 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag size={12} className="text-gray-400" />
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Tags do Card</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(card.tags || []).map(tag => (
                                    <span key={tag} className="bg-white text-blue-600 text-[10px] font-black px-3 py-1 rounded-xl flex items-center gap-2 shadow-sm border border-blue-50 shadow-blue-500/5 group">
                                        #{tag.toUpperCase()}
                                        <button
                                            onClick={() => onUpdate(card.id, { tags: card.tags.filter(t => t !== tag) })}
                                            className="text-gray-300 hover:text-rose-500 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                <div className="relative">
                                    <input
                                        type="text"
                                        className="bg-white border border-gray-100 rounded-xl px-3 py-1 text-[10px] font-black text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 w-32 placeholder-gray-300 shadow-sm transition-all"
                                        placeholder="ADICIONAR..."
                                        value={tempTag}
                                        onChange={(e) => setTempTag(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && tempTag.trim()) {
                                                const newTag = tempTag.trim().toLowerCase();
                                                if (!card.tags.includes(newTag)) {
                                                    onUpdate(card.id, { tags: [...(card.tags || []), newTag] });
                                                }
                                                setTempTag('');
                                            }
                                        }}
                                    />
                                    <Plus size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {!card.title && !card.description && !isEditing && (
                            <div className="h-14 flex items-center gap-3">
                                <div className="w-1 h-8 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/20" />
                                <span className="text-gray-300 font-medium italic text-sm">Descreva sua próxima vitória...</span>
                            </div>
                        )}
                        {settings.showTitle && card.title && (
                            <div className="flex items-start gap-2 -ml-1 group/title">
                                {childrenCount > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUpdate(card.id, { isExpanded: !card.isExpanded });
                                        }}
                                        className="p-1 px-2.5 hover:bg-gray-100/50 rounded-xl transition-all text-gray-400 hover:text-gray-900 flex items-center gap-1.5 mt-0.5"
                                        title={card.isExpanded ? "Collapse" : "Expand"}
                                    >
                                        <span className="text-[10px] font-black">{childrenCount}</span>
                                        {card.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                )}
                                <h3
                                    className={`font - black tracking - tight pr - 14 leading - tight ${card.wallpaperMode ? 'text-white' : 'text-gray-900'} `}
                                    style={{
                                        fontFamily: settings.fontFamily || 'inherit',
                                        fontSize: `${(settings.fontSize || 14) * 1.25}px`,
                                        textShadow: card.wallpaperMode ? '0 2px 4px rgba(0,0,0,0.4)' : 'none'
                                    }}
                                >
                                    {card.title}
                                    {card.attachments && card.attachments.length > 0 && (
                                        <span className="ml-2 inline-flex items-center justify-center w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" title="Mídia Anexada" />
                                    )}
                                </h3>
                            </div>
                        )}
                        {settings.showDescription && card.description && (
                            renderExpandableDescription(card.description, (settings.fontSize || 14) * 0.9, "text-gray-400")
                        )}

                        {/* Tag Display on Face - Fixed to show last 3 + Pen for adding */}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50 px-1 pb-1">
                            <div className="flex flex-wrap gap-1.5">
                                {(card.tags || []).slice(-3).map((tag, i) => (
                                    <span key={i} className="text-[9px] font-black bg-gray-50 text-gray-400 px-2 py-0.5 rounded-lg border border-gray-100 uppercase tracking-tighter shadow-sm hover:text-blue-500 hover:border-blue-100 transition-all cursor-default">
                                        #{tag}
                                    </span>
                                ))}
                                {(card.tags || []).length > 3 && (
                                    <span className="text-[9px] font-black text-gray-300 self-center">+{card.tags.length - 3}</span>
                                )}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowToolbarTag(!showToolbarTag); }}
                                className={`p - 1.5 rounded - xl transition - all ${showToolbarTag ? 'text-blue-600 bg-blue-50 border border-blue-100' : 'text-gray-300 hover:text-gray-900 border border-transparent hover:border-gray-50'} shadow-sm`}
                                title="Gerenciar Tags"
                            >
                                <Edit3 size={12} />
                            </button>
                        </div>
                    </>
                )}

                {/* Internal Notes Rendering (Standard Cards) */}
                {attachedNotes.filter(n => n.isInternal).length > 0 && (
                    <div className="mt-8 space-y-3">
                        {attachedNotes.filter(n => n.isInternal).map(note => (
                            <div
                                key={note.id}
                                className={`p-4 bg-amber-50/60 backdrop-blur-md border border-amber-100/50 rounded-2xl shadow-sm text-xs text-amber-900 group/note relative transition-all ${editingNoteId === note.id ? 'ring-4 ring-amber-500/10 border-amber-200 bg-white' : ''} `}
                                style={{
                                    width: note.width || '100%',
                                    height: note.height || 'auto',
                                    minHeight: '80px'
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    onStartDrag(e, note.id);
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setEditingNoteId(note.id);
                                }}
                            >
                                {editingNoteId === note.id ? (
                                    <textarea
                                        autoFocus
                                        className="w-full h-full bg-transparent resize-none border-none outline-none text-[11px] font-medium leading-relaxed placeholder-amber-200"
                                        value={note.description}
                                        onChange={(e) => onUpdate(note.id, { description: e.target.value })}
                                        onBlur={() => setEditingNoteId(null)}
                                        placeholder="Nota adesiva..."
                                    />
                                ) : (
                                    <>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-black text-[9px] uppercase tracking-widest flex items-center gap-2 text-amber-600/60">
                                                <StickyNote size={12} /> {note.title || 'NOTA INTERNA'}
                                            </span>
                                        </div>
                                        <p className="line-clamp-4 text-[11px] font-medium leading-relaxed opacity-80">{note.description}</p>

                                        {/* Resize Handles for Internal Note (Standard) */}
                                        <div className="absolute bottom-2 right-2 w-4 h-4 cursor-nwse-resize opacity-0 group-hover/note:opacity-100 bg-amber-500/20 rounded-lg flex items-center justify-center transition-all"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                onResizeStart?.(e, note.id, 'bottom-right');
                                            }}
                                        >
                                            <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-amber-600/30" />
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                {(settings.showCompleteBtn || settings.showDeleteBtn || settings.showAttachmentActions) && (
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50/80">
                        {settings.showCompleteBtn && (
                            <button
                                onClick={handleComplete}
                                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-sm ${card.status === 'completed'
                                    ? 'text-emerald-600 bg-emerald-50 border border-emerald-100'
                                    : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100'
                                    }`}
                            >
                                <CheckCircle size={16} /> {card.status === 'completed' ? 'CONCLUÍDO' : 'CONCLUIR'}
                            </button>
                        )}

                        <div className="flex gap-1.5 ml-auto">
                            <button onClick={() => onAddSubCard(card.id)} className="w-8 h-8 flex items-center justify-center hover:bg-emerald-50 rounded-xl text-gray-300 hover:text-emerald-500 transition-all border border-transparent hover:border-emerald-50" title="Adicionar Sub-card">
                                <CornerDownRight size={14} />
                            </button>
                            {onAddNoteToCard && (
                                <button onClick={() => onAddNoteToCard(card.id)} className="w-8 h-8 flex items-center justify-center hover:bg-amber-50 rounded-xl text-gray-300 hover:text-amber-500 transition-all border border-transparent hover:border-amber-50" title="Adicionar Nota">
                                    <StickyNote size={14} />
                                </button>
                            )}
                            <button onClick={handleBreakdown} className="w-8 h-8 flex items-center justify-center hover:bg-indigo-50 rounded-xl text-gray-300 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-50" title="AI Breakdown">
                                <Wand2 size={14} className={isBreakingDown ? 'animate-pulse text-indigo-500' : ''} />
                            </button>
                            {settings.showDeleteBtn && (
                                <button onClick={() => onDelete(card.id)} className="w-8 h-8 flex items-center justify-center hover:bg-rose-50 rounded-xl text-gray-300 hover:text-rose-500 transition-all border border-transparent hover:border-rose-50">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Stats Badge Row (Formerly Here) */}
            </div>
            {card.progress !== undefined && card.progress > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50 rounded-b-2xl overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        style={{ width: `${card.progress}% ` }}
                    />
                </div>
            )}

            <LapsModal
                isOpen={showLapsModal}
                onClose={() => setShowLapsModal(false)}
                laps={card.laps || []}
                formatTime={formatChronoTime}
            />
            <CompletionHistoryModal
                isOpen={showCompletionHistory}
                onClose={() => setShowCompletionHistory(false)}
                history={card.completionHistory || []}
                formatTime={formatChronoTime}
            />
            <SlideSettingsPopover
                isOpen={showSlideSettings}
                onClose={() => setShowSlideSettings(false)}
                card={card}
                onUpdate={onUpdate}
                position="top"
            />


            {/* Main Card Resize Handles */}
            {isSelected && !isEditing && (
                <>
                    <div className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'top')} />
                    <div className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'bottom')} />
                    <div className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'left')} />
                    <div className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize z-50 hover:bg-blue-500/30" onMouseDown={(e) => handleResizeStart(e, 'right')} />
                    <div className="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-[60] hover:bg-blue-500" onMouseDown={(e) => handleResizeStart(e, 'top-left')} />
                    <div className="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize z-[60] hover:bg-blue-500" onMouseDown={(e) => handleResizeStart(e, 'top-right')} />
                    <div className="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize z-[60] hover:bg-blue-500" onMouseDown={(e) => handleResizeStart(e, 'bottom-left')} />
                    <div className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize z-[60] hover:bg-blue-500" onMouseDown={(e) => handleResizeStart(e, 'bottom-right')} />
                </>
            )}
        </div>
    );
});

const LapsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    laps: any[];
    formatTime: (s: number) => string;
}> = ({ isOpen, onClose, laps, formatTime }) => {
    if (!isOpen) return null;

    return (
        <div
            className="absolute inset-0 z-[110] bg-white/95 backdrop-blur-2xl rounded-[inherit] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300"
            onClick={e => e.stopPropagation()}
        >
            {/* Header Moderno */}
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Timer size={18} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">
                            Performance
                        </span>
                        <span className="text-sm font-black text-gray-900 uppercase">
                            Histórico de Voltas
                        </span>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-50"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Lista com Scroll */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white/30 space-y-3">
                {laps.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-300">
                        <Activity size={48} strokeWidth={1} className="opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Nenhum dado capturado</span>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {laps.slice().reverse().map((lap, idx) => (
                            <div
                                key={lap.id}
                                className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 transition-all group shadow-sm"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[11px] font-black text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all">
                                        {(laps.length - idx).toString().padStart(2, '0')}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black text-gray-300 uppercase leading-none mb-1.5 tracking-widest">DURAÇÃO</span>
                                        <span className="text-lg font-black text-gray-800 leading-none tabular-nums">
                                            {formatTime(lap.duration)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[8px] font-black text-gray-300 uppercase leading-none mb-1.5 tracking-widest text-right">ACUMULADO</span>
                                    <span className="text-xs font-black text-gray-400 leading-none tabular-nums">
                                        {formatTime(lap.time)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rodapé Minimalista */}
            <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    TOTAL DE CICLOS
                </span>
                <div className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-blue-500/20">
                    {laps.length}
                </div>
            </div>
        </div>
    );
};
const SlideSettingsPopover: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    card: CardData;
    onUpdate: (id: string, updates: Partial<CardData>) => void;
    position?: 'top' | 'bottom';
}> = ({ isOpen, onClose, card, onUpdate, position = 'top' }) => {
    if (!isOpen) return null;

    const settings = card.slideSettings || {
        isEnabled: false,
        idleTimeout: 30,
        interval: 5,
        mediaType: 'all',
        transitionEffect: 'fade'
    };

    const update = (newSet: Partial<typeof settings>) => {
        onUpdate(card.id, { slideSettings: { ...settings, ...newSet } });
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localUploadType, setLocalUploadType] = useState<'image' | 'video' | 'audio' | 'gif'>('image');

    const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                let type: 'image' | 'audio' | 'video' | 'gif' = 'image';
                if (file.type.startsWith('image/')) {
                    type = file.type.includes('gif') ? 'gif' : 'image';
                } else if (file.type.startsWith('video/')) {
                    type = 'video';
                } else if (file.type.startsWith('audio/')) {
                    type = 'audio';
                }

                const newAttachment: Attachment = {
                    id: crypto.randomUUID(),
                    type: type,
                    url: reader.result as string,
                    timestamp: Date.now()
                };
                onUpdate(card.id, { attachments: [...(card.attachments || []), newAttachment] });
            };
            reader.readAsDataURL(file);
        }
    };

    const posClass = position === 'top' ? '-top-20' : '-bottom-4 transform translate-y-full';

    return (
        <div className={`absolute ${posClass} left-1/2 -translate-x-1/2 w-72 bg-white/95 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 z-[200] p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300 overflow-hidden`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Monitor size={18} className="text-white" />
                    </div>
                    <span className="text-sm font-black text-gray-900 uppercase tracking-tight">Wallpaper Slide</span>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900"><X size={18} /></button>
            </div>

            <div className="flex items-center justify-between bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Ativar Slide</span>
                <button
                    onClick={() => update({ isEnabled: !settings.isEnabled })}
                    className={`w-11 h-6 rounded-full transition-all relative shadow-inner ${settings.isEnabled ? 'bg-emerald-500' : 'bg-gray-200'} `}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.isEnabled ? 'left-6' : 'left-1'} `} />
                </button>
            </div>

            <div className="flex items-center justify-between bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50">
                <div className="flex flex-col">
                    <span className="text-[11px] font-black text-indigo-700 uppercase tracking-tight">Mostrar Tempo Inativo</span>
                    <span className="text-[8px] text-indigo-400 italic">Tempo sem finalizar o card</span>
                </div>
                <button
                    onClick={() => update({ showIdleTime: !settings.showIdleTime })}
                    className={`w-11 h-6 rounded-full transition-all relative shadow-inner ${settings.showIdleTime ? 'bg-indigo-500' : 'bg-gray-200'} `}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all ${settings.showIdleTime ? 'left-6' : 'left-1'} `} />
                </button>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Ativar após inatividade</span>
                    <span className="text-indigo-600 tabular-nums">{settings.idleTimeout}s</span>
                </div>
                <input
                    type="range" min="5" max="300" step="5"
                    value={settings.idleTimeout}
                    onChange={e => update({ idleTimeout: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600 transition-all"
                />
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Tempo de exibição</span>
                    <span className="text-indigo-600 tabular-nums">{settings.interval}s</span>
                </div>
                <input
                    type="range" min="1" max="60" step="1"
                    value={settings.interval}
                    onChange={e => update({ interval: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-600 transition-all"
                />
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Mídia</label>
                <div className="grid grid-cols-3 gap-2">
                    {['all', 'image', 'gif', 'video', 'audio'].map(type => (
                        <button
                            key={type}
                            onClick={() => update({ mediaType: type as any })}
                            className={`text-[9px] font-black py-2 rounded-xl border transition-all ${settings.mediaType === type ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200 hover:text-indigo-600'} uppercase`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-50">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upload Direto</label>
                <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="h-12 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-white hover:border-blue-200 rounded-xl text-gray-400 hover:text-blue-500 transition-all border border-transparent shadow-sm" title="Upload Imagem">
                        <ImageIcon size={18} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="h-12 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-white hover:border-purple-200 rounded-xl text-gray-400 hover:text-purple-500 transition-all border border-transparent shadow-sm" title="Upload GIF">
                        <Presentation size={18} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="h-12 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-white hover:border-rose-200 rounded-xl text-gray-400 hover:text-rose-500 transition-all border border-transparent shadow-sm" title="Upload Vídeo">
                        <Play size={18} />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="h-12 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-white hover:border-emerald-200 rounded-xl text-gray-400 hover:text-emerald-500 transition-all border border-transparent shadow-sm" title="Upload Áudio">
                        <Music size={18} />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleLocalUpload} accept="image/*,video/*,audio/*" />
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-2xl transition-all">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight">Papel de Parede (Fundo)</span>
                        <span className="text-[8px] text-gray-400 italic">Visível atrás dos textos</span>
                    </div>
                    <button
                        onClick={() => onUpdate(card.id, { backgroundMode: !card.backgroundMode })}
                        className={`w-10 h-5 rounded-full transition-all relative ${card.backgroundMode ? 'bg-cyan-500 shadow-lg shadow-cyan-500/20' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${card.backgroundMode ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-2xl transition-all">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-black text-gray-800 uppercase tracking-tight">Papel de Parede (Frente)</span>
                        <span className="text-[9px] text-gray-400 italic">Cobre elementos, foco total</span>
                    </div>
                    <button
                        onClick={() => onUpdate(card.id, { wallpaperMode: !card.wallpaperMode })}
                        className={`w-10 h-5 rounded-full transition-all relative ${card.wallpaperMode ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${card.wallpaperMode ? 'left-6' : 'left-1'}`} />
                    </button>
                </div>
            </div>

            <p className="text-[9px] text-gray-400 leading-tight italic pt-1 text-center">
                * Anexe mídias para alimentar este card. Ao parar de interagir, o modo slide (Wallpaper) pode ser ativado automaticamente.
            </p>
        </div>
    );
};

const SlideModeOverlay: React.FC<{
    attachments: Attachment[],
    slideIndex: number,
    mediaType: string,
    effect: string,
    showIdleTime: boolean,
    card: CardData
}> = ({ attachments, slideIndex, mediaType, effect, showIdleTime, card }) => {
    const filtered = attachments.filter(att => mediaType === 'all' || att.type === mediaType);
    if (filtered.length === 0) return null;
    const current = filtered[slideIndex % filtered.length];

    if (!current) return null;

    return (
        <div className="absolute inset-0 z-0 pointer-events-none animate-in fade-in duration-1000 overflow-hidden" style={{ borderRadius: 'inherit' }}>
            {current.type === 'video' ? (
                <video
                    src={current.url}
                    autoPlay
                    muted
                    loop
                    className="w-full h-full object-cover opacity-30"
                />
            ) : current.type === 'audio' ? (
                <div className="w-full h-full flex items-center justify-center bg-black/20">
                    <Music size={48} className="text-white/20 animate-pulse" />
                    <audio src={current.url} autoPlay loop muted />
                </div>
            ) : (
                <img
                    src={current.url}
                    key={current.id}
                    className="w-full h-full object-cover opacity-30 animate-in zoom-in-110 duration-[5000ms]"
                    alt="slide"
                />
            )}

            {showIdleTime && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] z-10 transition-all duration-1000">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-4 drop-shadow-lg">Tempo sem finalizar</span>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-baseline gap-2">
                                {(() => {
                                    const diff = Date.now() - (card.lastCompleted || card.createdAt || Date.now());
                                    const days = Math.floor(diff / (24 * 3600 * 1000));
                                    const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
                                    const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
                                    const secs = Math.floor((diff % (60 * 1000)) / 1000);

                                    return (
                                        <>
                                            {days > 0 && <span className="flex items-baseline gap-1">{days}<span className="text-sm opacity-50 font-medium">dias</span></span>}
                                            {hours > 0 && <span className="flex items-baseline gap-1">{hours}<span className="text-sm opacity-50 font-medium">horas</span></span>}
                                            <span className="text-indigo-400">:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
                                        </>
                                    );
                                })()}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CompletionHistoryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    history: CompletionRecord[];
    formatTime: (s: number) => string;
}> = ({ isOpen, onClose, history, formatTime }) => {
    if (!isOpen) return null;

    const formatIdleTimeLocal = (diff: number) => {
        if (diff < 0) return '0s';
        const days = Math.floor(diff / (24 * 3600));
        const hours = Math.floor((diff % (24 * 3600)) / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        let res = '';
        if (days > 0) res += `${days}d `;
        if (hours > 0 || days > 0) res += `${hours}h `;
        if (mins > 0 || hours > 0 || days > 0) res += `${mins}m `;
        res += `${secs}s`;
        return res;
    };

    return (
        <div
            className="absolute inset-0 z-[120] bg-white/95 backdrop-blur-2xl rounded-[inherit] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <ClipboardCheck size={18} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] leading-none mb-1">Status de Conclusão</span>
                        <span className="text-sm font-black text-gray-900 uppercase">Histórico de Finalização</span>
                    </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-50"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white/30 space-y-3">
                {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-300">
                        <CheckCircle size={48} strokeWidth={1} className="opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Nenhuma finalização registrada</span>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {history.slice().reverse().map((rec, idx) => (
                            <div key={rec.id} className="flex flex-col p-4 rounded-2xl border border-gray-100 bg-white hover:border-emerald-200 transition-all group shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-all">#{(history.length - idx).toString().padStart(2, '0')}</div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-900 uppercase tracking-tight">{new Date(rec.completedAt).toLocaleString()}</span>
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Data de Clique</span>
                                        </div>
                                    </div>
                                    <div className={`p-1.5 rounded-lg border transition-all ${
                                        rec.type === 'completed' || rec.type === 'green' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                        rec.type === 'deferred' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                        rec.type === 'skipped' || rec.type === 'not_finished' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                        'bg-gray-50 text-gray-400 border-gray-100'
                                    }`}>
                                        {rec.type === 'completed' || rec.type === 'green' ? <Check size={14} strokeWidth={3} /> :
                                         rec.type === 'skipped' ? <X size={14} strokeWidth={3} /> :
                                         <AlertCircle size={14} strokeWidth={3} />}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-3">
                                    <div className="flex flex-col"><span className="text-[8px] font-black text-gray-300 uppercase leading-none mb-1 tracking-widest">Início Cronômetro</span><span className="text-[10px] font-black text-gray-600">{rec.startedAt ? new Date(rec.startedAt).toLocaleTimeString() : '--:--'}</span></div>
                                    <div className="flex flex-col items-end"><span className="text-[8px] font-black text-gray-300 uppercase leading-none mb-1 tracking-widest">Fim Cronômetro</span><span className="text-[10px] font-black text-gray-600">{rec.endedAt ? new Date(rec.endedAt).toLocaleTimeString() : '--:--'}</span></div>
                                    <div className="flex flex-col"><span className="text-[8px] font-black text-gray-300 uppercase leading-none mb-1 tracking-widest">Duração</span><span className="text-[10px] font-black text-blue-500 tabular-nums">{formatTime(rec.duration)}</span></div>
                                    <div className="flex flex-col items-end"><span className="text-[8px] font-black text-gray-300 uppercase leading-none mb-1 tracking-widest text-right">Tempo sem clicar</span><span className="text-[10px] font-black text-amber-500 tabular-nums text-right">{formatIdleTimeLocal(rec.idleDuration)}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Finalizados</span>
                <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-emerald-500/20">{history.length}</div>
            </div>
        </div>
    );
};

export default CardNode;


const colorMap: Record<string, string> = {
    red: '#ef4444',
    yellow: '#eab308',
    purple: '#a855f7',
    blue: '#3b82f6',
    green: '#22c55e',
};
