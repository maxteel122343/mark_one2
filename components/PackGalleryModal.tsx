import React, { useState } from 'react';
import { X, Search, Package, Download, User, Calendar, ExternalLink, Filter, Star, CheckCircle } from 'lucide-react';
import { ProcessPack } from '../types';

interface PackGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    packs: ProcessPack[];
    onLoadPack: (pack: ProcessPack) => void;
}

const PackGalleryModal: React.FC<PackGalleryModalProps> = ({
    isOpen,
    onClose,
    packs,
    onLoadPack
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const categories = ['all', ...Array.from(new Set(packs.map(p => p.profession ? p.profession.toLowerCase() : 'outros')))];

    const filteredPacks = packs.filter(pack => {
        const profession = pack.profession || 'Outros';
        const description = pack.dreamDescription || '';
        const matchesSearch = profession.toLowerCase().includes(searchQuery.toLowerCase()) ||
            description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || profession.toLowerCase() === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
            <div className="relative w-full max-w-6xl h-full md:h-[85vh] bg-[#090b0f] border border-white/10 rounded-none md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-r from-purple-950/20 via-transparent to-blue-950/20">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 p-[1px] shadow-xl">
                            <div className="w-full h-full rounded-2xl bg-dark-950 flex items-center justify-center">
                                <Package className="text-white animate-pulse" size={24} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Marketplace de Processos</h2>
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-full uppercase border border-indigo-500/20">Packs de Especialistas</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Importe fluxos completos de trabalho para o seu canvas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar sonar e profissão..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-white/5 border border-white/10 rounded-full pl-11 pr-4 text-sm text-white focus:border-indigo-500/50 outline-none transition"
                            />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Categories */}
                <div className="px-8 py-4 border-b border-white/5 flex gap-3 overflow-x-auto no-scrollbar bg-black/20">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white border-transparent' : 'bg-white/5 text-gray-500 border border-white/10 hover:border-white/20'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {filteredPacks.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale py-20">
                            <Package size={64} className="mb-4 text-gray-600" />
                            <p className="text-sm font-black uppercase tracking-widest">Nenhum pack encontrado</p>
                            <p className="text-xs mt-2 italic">Novos packs são criados por especialistas em Sprints de 5 minutos</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredPacks.map((pack) => (
                                <div
                                    key={pack.id}
                                    className="relative group rounded-3xl p-6 bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 hover:border-indigo-500/50 transition-all duration-500 flex flex-col shadow-2xl"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[9px] font-black rounded-full uppercase border border-indigo-500/20">
                                            {pack.profession}
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-500">
                                            <Star size={12} className="text-yellow-500" fill="currentColor" />
                                            <span className="text-[10px] font-bold">4.9</span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-black text-white leading-tight mb-2 group-hover:text-indigo-400 transition-colors uppercase tracking-tighter">
                                        {pack.dreamDescription.length > 60 ? pack.dreamDescription.substring(0, 60) + '...' : pack.dreamDescription}
                                    </h3>

                                    <div className="flex-1 space-y-3 mb-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-black text-white">
                                                <User size={12} />
                                            </div>
                                            <span className="text-[10px] font-medium text-gray-400">{pack.creatorName}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-black text-white">
                                                <Package size={12} />
                                            </div>
                                            <span className="text-[10px] font-medium text-gray-400">{pack.cards.length} Cards de Processo</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => onLoadPack(pack)}
                                            className="h-11 bg-white text-black hover:bg-indigo-50 rounded-xl text-[10px] font-black uppercase transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                                        >
                                            <Download size={14} />
                                            Carregar Pack
                                        </button>
                                        <button
                                            className="h-11 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2"
                                        >
                                            <ExternalLink size={14} />
                                            Detalhes
                                        </button>
                                    </div>

                                    {/* Visual accent */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-[40px] rounded-full group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-5 bg-white/5 border-t border-white/5 flex justify-between items-center px-8">
                    <div className="flex items-center gap-2 text-gray-500">
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Packs validados pela comunidade especialista</span>
                    </div>
                    <div className="text-[10px] font-bold text-gray-600 italic">
                        "Conhecimento distribuído é o combustível de sonhos."
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackGalleryModal;
