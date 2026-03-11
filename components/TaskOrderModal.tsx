import React, { useState, useEffect, useCallback } from 'react';
import { X, ListOrdered, GripVertical, CheckCircle2, Clock, Play, Calendar, Trophy, Sparkles, Wand2, Square, ChevronUp, ChevronDown, Tag, Eye, Trash2, Check } from 'lucide-react';
import { CardData } from '../types';

interface TaskOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    cards: CardData[];
    events: any[];
    isRoutineActive: boolean;
    onReorder: (newOrder: CardData[]) => void;
    onStart: (orderedList: CardData[]) => void;
    onStop: () => void;
    onLocate?: (cardId: string) => void;
    onSaveEvent?: (event: { id: string, title: string, cardIds: string[] }) => void;
    onDeleteEvent?: (id: string) => void;
}

const TaskOrderModal: React.FC<TaskOrderModalProps> = ({
    isOpen,
    onClose,
    cards = [],
    events = [],
    isRoutineActive,
    onReorder,
    onStart,
    onStop,
    onLocate,
    onSaveEvent,
    onDeleteEvent
}) => {
    const [localTasks, setLocalTasks] = useState<CardData[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<'tasks' | 'events'>('tasks');
    const [eventSubTab, setEventSubTab] = useState<'list' | 'create'>('list');

    // Create Event Form State
    const [newEventTitle, setNewEventTitle] = useState('');
    const [selectedEventCardIds, setSelectedEventCardIds] = useState<string[]>([]);
    const [searchInEvent, setSearchInEvent] = useState('');
    const [selectedEventsToRun, setSelectedEventsToRun] = useState<string[]>([]);

    // Initialize local state from cards
    useEffect(() => {
        if (isOpen) {
            // Collect all unique tags
            const tags = Array.from(new Set(cards.flatMap(c => c.tags || []))).sort();
            setAvailableTags(tags);

            // Filter cards: include tasks and notes (clean cards)
            let filtered = cards.filter(c => c.type === 'task' || c.type === 'note' || !c.type);

            // Filter by selected tags if any
            if (selectedFilterTags.length > 0) {
                filtered = filtered.filter(c =>
                    c.tags && c.tags.some(t => selectedFilterTags.includes(t))
                );
            }

            // Sort: Pending at top, Completed at bottom
            const sorted = [...filtered].sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return 1;
                if (a.status !== 'completed' && b.status === 'completed') return -1;
                return 0;
            });
            setLocalTasks(sorted);
            setSelectedIndex(0);
        }
    }, [isOpen, cards, selectedFilterTags]);

    const toggleTag = (tag: string) => {
        setSelectedFilterTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const toggleAllTags = () => {
        if (selectedFilterTags.length === availableTags.length) {
            setSelectedFilterTags([]);
        } else {
            setSelectedFilterTags([...availableTags]);
        }
    };

    const moveTask = (index: number, direction: 'up' | 'down') => {
        const newTasks = [...localTasks];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newTasks.length) return;

        [newTasks[index], newTasks[newIndex]] = [newTasks[newIndex], newTasks[index]];
        setLocalTasks(newTasks);
        setSelectedIndex(newIndex);
        onReorder(newTasks);
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < localTasks.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (localTasks[selectedIndex]) {
                // Se o usuário apertar Enter, iniciamos o fluxo a partir desse card
                const reordered = [
                    localTasks[selectedIndex],
                    ...localTasks.filter((_, i) => i !== selectedIndex)
                ];
                onStart(reordered);
            }
        }
    }, [isOpen, localTasks, selectedIndex, onStart]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!isOpen) return null;

    const pendingCount = localTasks.filter(t => t.status !== 'completed').length;
    const completedCount = localTasks.filter(t => t.status === 'completed').length;

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative bg-white/95 backdrop-blur-2xl border border-white/60 w-full max-w-3xl h-full md:max-h-[85vh] rounded-none md:rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in scale-95 opacity-0 duration-500 cubic-bezier(0.19, 1, 0.22, 1) [animation-fill-mode:forwards] animate-reveal">

                {/* Header Section */}
                <div className="px-6 md:px-12 py-6 md:py-10 border-b border-gray-100 flex justify-between items-center relative overflow-hidden bg-white/50">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                    <div className="relative flex items-center gap-4 md:gap-6">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-2xl md:rounded-[28px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 rotate-6 shrink-0">
                            <ListOrdered size={24} md:size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-4xl font-black text-gray-900 tracking-tighter leading-none">Task Order</h2>
                            <p className="text-[9px] md:text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2 ml-1 flex items-center gap-2">
                                <Sparkles size={10} className="text-blue-500" /> Fluxo Prioritário
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative">
                        <div className="hidden md:flex flex-col items-end mr-4">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Controles</span>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-white border border-gray-100 rounded text-[9px] text-gray-400 font-black">↑↓ NAVEGAR</span>
                                <span className="px-2 py-0.5 bg-blue-600 border border-blue-500 rounded text-[9px] text-white font-black shadow-lg shadow-blue-500/20">ENTER INICIAR</span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:scale-110 active:scale-95 transition-all border border-gray-100"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex border-b border-gray-100 bg-white">
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'tasks' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Tarefas ({localTasks.length})
                        {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 animate-in slide-in-from-bottom-1" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`flex-1 py-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'events' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Eventos ({events.length})
                        {activeTab === 'events' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 animate-in slide-in-from-bottom-1" />}
                    </button>
                </div>

                {/* Stats Bar (Only for Tasks) */}
                {activeTab === 'tasks' && (
                    <div className="bg-gray-50/50 px-6 md:px-12 py-4 md:py-6 border-b border-gray-100 flex items-center gap-6 md:gap-10">
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-600 shrink-0">
                                <Clock size={16} />
                            </div>
                            <div>
                                <div className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Pendentes</div>
                                <div className="text-sm md:text-lg font-black text-gray-900">{pendingCount}</div>
                            </div>
                        </div>
                        <div className="w-px h-6 md:h-8 bg-gray-200" />
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-emerald-500 shrink-0">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <div className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">Concluídos</div>
                                <div className="text-sm md:text-lg font-black text-gray-900">{completedCount}</div>
                            </div>
                        </div>

                        {isRoutineActive && (
                            <button
                                onClick={onStop}
                                className="ml-auto hidden md:flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all shadow-sm shadow-rose-500/5 group"
                            >
                                <Square size={12} fill="currentColor" className="group-hover:scale-110 transition-transform" /> Parar Rotina
                            </button>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'tasks' ? (
                        <div className="md:px-8 md:py-10 p-4 space-y-2">
                            {/* Tag Filter */}
                            {availableTags.length > 0 && (
                                <div className="mb-6 flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
                                    <div className="flex items-center gap-2 shrink-0 pr-4 border-r border-gray-100">
                                        <Tag size={12} className="text-gray-400" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtros</span>
                                    </div>
                                    <button
                                        onClick={toggleAllTags}
                                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${selectedFilterTags.length === availableTags.length ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    >
                                        {selectedFilterTags.length === availableTags.length ? 'Limpar Filtros' : 'Selecionar Todos'}
                                    </button>
                                    {availableTags.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm ${selectedFilterTags.includes(tag) ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-gray-50 text-gray-400 border border-transparent hover:border-gray-200'}`}
                                        >
                                            #{tag}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {localTasks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
                                    <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6 border border-gray-100 shadow-inner">
                                        <Calendar size={36} />
                                    </div>
                                    <p className="text-lg font-black text-gray-500">Nenhuma tarefa no horizonte</p>
                                </div>
                            ) : (
                                localTasks.map((task, index) => (
                                    <div
                                        key={task.id}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        onClick={() => {
                                            setSelectedIndex(index);
                                            const reordered = [
                                                localTasks[index],
                                                ...localTasks.filter((_, i) => i !== index)
                                            ];
                                            onStart(reordered);
                                        }}
                                        className={`group flex items-center gap-6 p-5 rounded-[32px] border transition-all duration-300 cursor-pointer relative ${selectedIndex === index ? 'border-blue-500 ring-4 ring-blue-500/10 bg-blue-50/10' : 'border-gray-50 bg-white hover:bg-gray-50'} ${task.status === 'completed' ? 'opacity-60 grayscale-[0.5]' : ''}`}
                                    >
                                        <div className="flex items-center gap-4 border-r border-gray-100 pr-5 shrink-0">
                                            <div className="flex flex-col items-center gap-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveTask(index, 'up'); }}
                                                    disabled={index === 0}
                                                    className={`p-1 rounded-lg hover:bg-blue-100 transition-all ${index === 0 ? 'opacity-0' : 'text-gray-300 hover:text-blue-600'}`}
                                                >
                                                    <ChevronUp size={14} />
                                                </button>
                                                <span className={`text-[12px] font-black font-mono transition-colors ${selectedIndex === index ? 'text-blue-600' : 'text-gray-300'}`}>{(index + 1).toString().padStart(2, '0')}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveTask(index, 'down'); }}
                                                    disabled={index === localTasks.length - 1}
                                                    className={`p-1 rounded-lg hover:bg-blue-100 transition-all ${index === localTasks.length - 1 ? 'opacity-0' : 'text-gray-300 hover:text-blue-600'}`}
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>
                                            <GripVertical size={16} className={`transition-colors ${selectedIndex === index ? 'text-blue-500' : 'text-gray-100 group-hover:text-gray-300'}`} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className={`font-black transition-all text-sm truncate ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900 group-hover:text-blue-600'}`}>
                                                {task.title || 'Tarefa sem título'}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1.5 font-bold">
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: task.color === 'red' ? '#ef4444' : task.color === 'yellow' ? '#facc15' : task.color === 'purple' ? '#a855f7' : task.color === 'blue' ? '#3b82f6' : '#22c55e' }} />
                                                    {Math.round(task.timerTotal / 60)} min
                                                </div>
                                                {task.status === 'completed' ? (
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                                                        <CheckCircle2 size={10} /> Finalizado
                                                    </div>
                                                ) : selectedIndex === index && (
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-blue-500 uppercase tracking-widest animate-pulse">
                                                        <Sparkles size={10} /> Clique ou Enter para Iniciar
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            {task.status !== 'completed' && (
                                                <div className={`w-14 h-14 rounded-[22px] flex items-center justify-center transition-all ${selectedIndex === index ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 -translate-x-1' : 'bg-gray-50 text-gray-200 group-hover:bg-blue-50 group-hover:text-blue-300'}`}>
                                                    <Play size={20} fill={selectedIndex === index ? "white" : "none"} />
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onLocate?.(task.id);
                                                }}
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                                                title="Localizar no Canvas"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {/* Event Sub-tabs */}
                            <div className="flex px-8 pt-6 gap-6 border-b border-gray-50">
                                <button
                                    onClick={() => setEventSubTab('list')}
                                    className={`pb-4 text-[10px] font-black uppercase tracking-widest relative transition-all ${eventSubTab === 'list' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Listar Eventos
                                    {eventSubTab === 'list' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                                </button>
                                <button
                                    onClick={() => setEventSubTab('create')}
                                    className={`pb-4 text-[10px] font-black uppercase tracking-widest relative transition-all ${eventSubTab === 'create' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    Criar Evento
                                    {eventSubTab === 'create' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {eventSubTab === 'create' ? (
                                    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Evento</label>
                                            <input
                                                type="text"
                                                placeholder="Ex: Fazer Compras, Viajar, Trabalho..."
                                                value={newEventTitle}
                                                onChange={(e) => setNewEventTitle(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selecionar Cards ({selectedEventCardIds.length})</label>
                                                <div className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">
                                                    {cards.length} cards disponíveis
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                    <Sparkles size={14} />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Filtrar cards..."
                                                    value={searchInEvent}
                                                    onChange={(e) => setSearchInEvent(e.target.value)}
                                                    className="w-full bg-gray-50/50 border border-gray-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold focus:outline-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {cards
                                                    .filter(c => !searchInEvent || c.title.toLowerCase().includes(searchInEvent.toLowerCase()))
                                                    .map(task => (
                                                        <button
                                                            key={task.id}
                                                            onClick={() => {
                                                                setSelectedEventCardIds(prev =>
                                                                    prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                                                                );
                                                            }}
                                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedEventCardIds.includes(task.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-50 hover:border-gray-200'}`}
                                                        >
                                                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedEventCardIds.includes(task.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-100'}`}>
                                                                {selectedEventCardIds.includes(task.id) && <Check size={12} />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-black text-gray-900 truncate">{task.title || 'Sem título'}</div>
                                                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{task.type || 'task'}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                if (!newEventTitle.trim() || selectedEventCardIds.length === 0) return;
                                                onSaveEvent?.({
                                                    id: crypto.randomUUID(),
                                                    title: newEventTitle,
                                                    cardIds: selectedEventCardIds
                                                });
                                                setNewEventTitle('');
                                                setSelectedEventCardIds([]);
                                                setEventSubTab('list');
                                            }}
                                            disabled={!newEventTitle.trim() || selectedEventCardIds.length === 0}
                                            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-98 disabled:opacity-50 disabled:grayscale transition-all"
                                        >
                                            Salvar Evento
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {selectedEventsToRun.length > 0 ? `${selectedEventsToRun.length} eventos selecionados` : 'Selecione eventos para rodar'}
                                            </div>
                                            {selectedEventsToRun.length > 0 && (
                                                <button
                                                    onClick={() => {
                                                        const selected = events.filter(e => selectedEventsToRun.includes(e.id));
                                                        const allCardIds = Array.from(new Set(selected.flatMap(e => e.cardIds)));
                                                        const eventCards = cards.filter(c => allCardIds.includes(c.id));
                                                        if (eventCards.length > 0) onStart(eventCards);
                                                    }}
                                                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                                >
                                                    <Play size={10} fill="white" /> Rodar Selecionados
                                                </button>
                                            )}
                                        </div>

                                        {events.length === 0 ? (
                                            <div className="py-20 flex flex-col items-center justify-center text-gray-300">
                                                <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6 border border-gray-100">
                                                    <Wand2 size={36} />
                                                </div>
                                                <p className="text-lg font-black text-gray-500">Nenhum evento criado</p>
                                                <button onClick={() => setEventSubTab('create')} className="mt-4 text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:underline">Criar meu primeiro evento</button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {events.map((event: any) => (
                                                    <div
                                                        key={event.id}
                                                        onClick={() => {
                                                            setSelectedEventsToRun(prev =>
                                                                prev.includes(event.id) ? prev.filter(id => id !== event.id) : [...prev, event.id]
                                                            );
                                                        }}
                                                        className={`bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer ${selectedEventsToRun.includes(event.id) ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-100'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-start gap-3">
                                                                <div className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedEventsToRun.includes(event.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-gray-50 border-gray-100'}`}>
                                                                    {selectedEventsToRun.includes(event.id) && <Check size={12} />}
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-lg font-black text-gray-900 leading-tight">{event.title}</h4>
                                                                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full">
                                                                        {event.cardIds.length} tarefas
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onDeleteEvent?.(event.id); }}
                                                                className="text-gray-300 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>

                                                        <div className="mt-6 flex gap-3">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const eventCards = cards.filter(c => event.cardIds.includes(c.id));
                                                                    if (eventCards.length > 0) onStart(eventCards);
                                                                }}
                                                                className="flex-1 bg-white border border-gray-100 text-gray-900 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
                                                            >
                                                                <Play size={12} fill="currentColor" /> Rodar Apenas
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls (Tasks Only) */}
                {activeTab === 'tasks' && (
                    <div className="p-6 md:p-10 bg-white border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 px-6 md:px-12">
                        <div className="flex items-center gap-3 text-xs md:text-sm font-bold text-gray-400">
                            <Trophy size={18} className="text-amber-500" />
                            <span className="text-gray-900">{completedCount} finalizados</span> hoje
                        </div>
                        <div className="flex w-full md:w-auto gap-3 md:gap-4">
                            <button
                                onClick={() => onStart(localTasks)}
                                className="flex-1 md:flex-none bg-blue-600 text-white px-6 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Play size={16} md:size={18} fill="white" /> Iniciar Sequência
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 md:flex-none bg-gray-900 text-white px-6 md:px-10 py-4 md:py-5 rounded-2xl md:rounded-[24px] font-black text-xs md:text-sm uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Controls (Events List Only) */}
                {activeTab === 'events' && (
                    <div className="p-6 md:p-10 bg-white border-t border-gray-100 flex justify-end items-center gap-4 px-6 md:px-12">
                        <button
                            onClick={onClose}
                            className="bg-gray-900 text-white px-10 py-4 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes reveal {
                    from { transform: scale(0.9) translateY(20px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
                .animate-reveal {
                    animation: reveal 0.6s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default TaskOrderModal;
