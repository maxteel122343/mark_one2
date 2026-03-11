import React, { useState } from 'react';
import { CardData } from '../types';
import { X, Search, Filter, List, Clock, CheckCircle2, Circle, ChevronRight, LayoutGrid, LayoutList } from 'lucide-react';

interface CardListSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    cards: CardData[];
    onSelectCard: (id: string) => void;
}

const CardListSidebar: React.FC<CardListSidebarProps> = ({
    isOpen,
    onClose,
    cards,
    onSelectCard
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

    const filteredCards = cards.filter(card => {
        const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || card.status === filter;
        return matchesSearch && matchesFilter;
    });

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[3999] animate-in fade-in duration-300" onClick={onClose} />

            <div className="fixed inset-y-0 right-0 w-full md:w-[400px] z-[4000] bg-white/90 backdrop-blur-2xl border-l border-gray-100 shadow-[-20px_0_60px_rgba(0,0,0,0.05)] flex flex-col animate-in slide-in-from-right duration-500 ease-out" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-8 border-b border-gray-50">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                <List className="text-blue-500" size={24} />
                                Gestor de Cards
                            </h2>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Total de {cards.length} itens ativos</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-100 shadow-sm"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search & Actions */}
                    <div className="space-y-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Pesquisar nos cards..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-50 border border-transparent focus:border-blue-500/30 focus:bg-white rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-800 transition-all outline-none shadow-inner"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                {[
                                    { id: 'all', label: 'Todos' },
                                    { id: 'pending', label: 'Pendentes' },
                                    { id: 'completed', label: 'Concluídos' }
                                ].map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setFilter(btn.id as any)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === btn.id ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-500 shadow-sm border border-gray-100' : 'text-gray-400'}`}
                                >
                                    <LayoutList size={16} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-500 shadow-sm border border-gray-100' : 'text-gray-400'}`}
                                >
                                    <LayoutGrid size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto md:p-6 p-4 custom-scrollbar">
                    {filteredCards.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-60">
                            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4 border border-gray-100">
                                <Search size={32} />
                            </div>
                            <p className="text-sm font-bold text-gray-500">Nenhum card encontrado</p>
                            <p className="text-xs mt-1">Tente ajustar sua busca ou filtros</p>
                        </div>
                    ) : (
                        <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-3'}>
                            {filteredCards.map(card => (
                                <button
                                    key={card.id}
                                    onClick={() => onSelectCard(card.id)}
                                    className={`group text-left border transition-all duration-300 ${viewMode === 'grid' ? 'flex flex-col p-4 rounded-3xl' : 'flex items-center p-3 rounded-2xl'} 
                                    bg-white hover:border-blue-500/30 hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:bg-white/50 border-gray-50 shadow-sm`}
                                >
                                    {viewMode === 'list' && (
                                        <div
                                            className="w-1.5 h-10 rounded-full mr-4 shrink-0 transition-all group-hover:scale-y-110"
                                            style={{ backgroundColor: card.color === 'red' ? '#ef4444' : card.color === 'yellow' ? '#eab308' : card.color === 'purple' ? '#a855f7' : card.color === 'blue' ? '#3b82f6' : card.color === 'green' ? '#22c55e' : '#9ca3af' }}
                                        />
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <h3 className="font-bold text-gray-900 truncate text-sm">{card.title || 'Sem título'}</h3>
                                            {card.status === 'completed' ? (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            ) : (
                                                <Circle size={14} className="text-gray-200" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate font-medium">{card.description || 'Nenhum detalhe adicional.'}</p>

                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-300">
                                                <Clock size={10} />
                                                {Math.floor(card.timerTotal / 60)}m
                                            </div>
                                            {card.tags && card.tags.length > 0 && (
                                                <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                                    #{card.tags[0]}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight size={16} className="text-gray-200 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all ml-2 shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Information */}
                <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-blue-500">
                            <CheckCircle2 size={18} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Concluídos</div>
                            <div className="text-lg font-black text-gray-900 leading-tight">
                                {cards.filter(c => c.status === 'completed').length} <span className="text-sm font-medium text-gray-400">/ {cards.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-10 w-px bg-gray-200 mx-4" />

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-rose-500">
                            <Clock size={18} />
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Pendentes</div>
                            <div className="text-lg font-black text-gray-900 leading-tight">
                                {cards.filter(c => c.status !== 'completed').length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CardListSidebar;
