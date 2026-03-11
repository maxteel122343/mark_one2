import React from 'react';
import { X, Eye, EyeOff, Trash2, Zap, BarChart3, Filter, CheckCircle2, Clock, Image as ImageIcon, StickyNote, Activity } from 'lucide-react';
import { CanvasFilters, CanvasStats } from '../types';

interface CanvasControlModalProps {
    isOpen: boolean;
    onClose: () => void;
    filters: CanvasFilters;
    onUpdateFilters: (filters: CanvasFilters) => void;
    stats: CanvasStats;
    onClearCanvas: () => void;
    availableTags: string[];
    availableGroups: string[];
    onExpandAll?: () => void;
    onResetFilters?: () => void;
}

const CanvasControlModal: React.FC<CanvasControlModalProps> = ({
    isOpen,
    onClose,
    filters,
    onUpdateFilters,
    stats,
    onClearCanvas,
    availableTags,
    availableGroups,
    onExpandAll,
    onResetFilters
}) => {
    if (!isOpen) return null;

    const toggleFilter = (key: keyof CanvasFilters) => {
        onUpdateFilters({ ...filters, [key]: !filters[key] });
    };

    const toggleTag = (tag: string) => {
        const newTags = filters.selectedTags.includes(tag)
            ? filters.selectedTags.filter(t => t !== tag)
            : [...filters.selectedTags, tag];
        onUpdateFilters({ ...filters, selectedTags: newTags });
    };

    const toggleGroup = (group: string) => {
        const newGroups = filters.selectedGroups.includes(group)
            ? filters.selectedGroups.filter(g => g !== group)
            : [...filters.selectedGroups, group];
        onUpdateFilters({ ...filters, selectedGroups: newGroups });
    };

    const getLoadColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'high': return 'text-orange-400';
            case 'critical': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[4000] flex items-center justify-center md:p-4 p-0" onClick={onClose}>
            <div className="bg-[#0f1115] border border-white/10 rounded-none md:rounded-2xl w-full max-w-md h-full md:h-auto shadow-2xl animate-in fade-in md:zoom-in-95 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-indigo-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center border border-blue-500/30">
                            <Activity className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">Gestão do Canvas</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Performance & Visibilidade</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Performance Monitor */}
                    <section className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2">
                                <BarChart3 size={14} /> Monitor de Sistema
                            </h3>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border border-current ${getLoadColor(stats.loadLevel)} bg-black/50`}>
                                LOAD: {stats.loadLevel.toUpperCase()}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                                <div className="text-xl font-black text-white">{stats.cardCount}</div>
                                <div className="text-[9px] text-gray-500 uppercase font-bold">Cards Totais</div>
                            </div>
                            <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                                <div className={`text-xl font-black ${stats.interactionSpeedMs < 16 ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {stats.interactionSpeedMs}ms
                                </div>
                                <div className="text-[9px] text-gray-500 uppercase font-bold">Latência UI</div>
                            </div>
                        </div>

                        <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
                            <span className="flex items-center gap-1"><ImageIcon size={10} /> {stats.mediaCount} Midias</span>
                            <span className="flex items-center gap-1"><StickyNote size={10} /> {stats.noteCount} Notas</span>
                            <span className="flex items-center gap-1"><Filter size={10} /> {stats.connectionCount} Conexões</span>
                        </div>
                    </section>

                    {/* Visibility Filters */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Filtros de Visibilidade</h3>

                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'hideAll', label: 'Ocultar Tudo', icon: EyeOff },
                                { id: 'showPending', label: 'Pendentes', icon: Clock },
                                { id: 'showCompleted', label: 'Concluídos', icon: CheckCircle2 },
                                { id: 'showMedia', label: 'Mídias', icon: ImageIcon },
                                { id: 'showNotes', label: 'Notas', icon: StickyNote },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => toggleFilter(opt.id as any)}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-xs font-bold ${filters[opt.id as keyof CanvasFilters] ? 'bg-blue-600/10 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-500'}`}
                                >
                                    <opt.icon size={14} /> {opt.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Tags Filter */}
                    {availableTags.length > 0 && (
                        <section className="space-y-3">
                            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Filtrar por Tags</h3>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${filters.selectedTags.includes(tag) ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-gray-500'}`}
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Quick Visibility Actions */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest">Ações de Revelação</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={onExpandAll}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-[10px] font-black uppercase text-white shadow-lg"
                            >
                                <Zap size={14} className="text-yellow-400" /> Expandir Tudo
                            </button>
                            <button
                                onClick={onResetFilters}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-[10px] font-black uppercase text-white shadow-lg"
                            >
                                <Eye size={14} className="text-green-400" /> Mostrar Tudo
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-500 italic text-center">Use estas ações se houver cards listados no Task Order que não estão visíveis aqui.</p>
                    </section>

                    {/* Actions */}
                    <section className="pt-4 border-t border-white/10">
                        <button
                            onClick={() => {
                                if (window.confirm('TEM CERTEZA? Isso excluirá TODOS os cards do canvas permanentemente.')) {
                                    onClearCanvas();
                                    onClose();
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 p-4 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/20 rounded-2xl transition-all font-black text-sm uppercase tracking-tighter"
                        >
                            <Trash2 size={18} /> Limpar Canvas Inteiro
                        </button>
                    </section>
                </div>

                <div className="p-4 bg-black/40 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-white text-black font-black rounded-xl text-sm transition-transform active:scale-95"
                    >
                        FECHAR
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CanvasControlModal;
