import React, { useState } from 'react';
import { X, Heart, Download, Share2, Search, Zap, Trash2, ExternalLink } from 'lucide-react';
import { SharedGif, Attachment } from '../types';

interface GifGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    sharedGifs: SharedGif[];
    onSaveToGallery: (gifUrl: string) => void;
    onLikeGif: (gifId: string) => void;
}

const GifGalleryModal: React.FC<GifGalleryModalProps> = ({
    isOpen,
    onClose,
    sharedGifs,
    onSaveToGallery,
    onLikeGif
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    const filteredGifs = sharedGifs.filter(gif =>
        gif.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
            <div className="relative w-full max-w-6xl h-full md:h-[85vh] bg-[#0a0c10] border border-white/10 rounded-none md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-r from-pink-900/10 via-transparent to-purple-900/10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 p-[1px] shadow-xl">
                            <div className="w-full h-full rounded-2xl bg-dark-950 flex items-center justify-center">
                                <Zap className="text-white animate-pulse" size={24} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Galeria Global de GIFs</h2>
                                <span className="px-2 py-0.5 bg-pink-500/10 text-pink-400 text-[10px] font-black rounded-full uppercase border border-pink-500/20">Comunidade</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Explore e salve as melhores animações da rede Chronos</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar usuários..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 bg-white/5 border border-white/10 rounded-full pl-11 pr-4 text-sm text-white focus:border-pink-500/50 outline-none transition"
                            />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {filteredGifs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale py-20">
                            <Zap size={64} className="mb-4 text-gray-500" />
                            <p className="text-sm font-black uppercase tracking-widest">Nenhum GIF compartilhado ainda</p>
                            <p className="text-xs mt-2 italic">Seja o primeiro a converter uma mídia!</p>
                        </div>
                    ) : (
                        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                            {filteredGifs.map((gif) => (
                                <div
                                    key={gif.id}
                                    className="relative group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all duration-500 break-inside-avoid shadow-2xl"
                                    onMouseEnter={() => setHoveredId(gif.id)}
                                    onMouseLeave={() => setHoveredId(null)}
                                >
                                    <img
                                        src={gif.url}
                                        alt={`GIF by ${gif.userName}`}
                                        className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                                    />

                                    {/* Overlay */}
                                    <div className={`absolute inset-0 bg-black/60 flex flex-col justify-between p-4 transition-opacity duration-300 ${hoveredId === gif.id ? 'opacity-100' : 'opacity-0'}`}>
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => onLikeGif(gif.id)}
                                                className="p-2 bg-white/10 hover:bg-pink-500 text-white rounded-full transition-colors backdrop-blur-md"
                                            >
                                                <Heart size={18} fill={gif.likes > 0 ? "currentColor" : "none"} />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center text-[10px] font-black text-white">
                                                    {gif.userName[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-white">{gif.userName}</span>
                                                    <span className="text-[10px] text-gray-400">Há {Math.floor((Date.now() - gif.timestamp) / 60000)}m</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => onSaveToGallery(gif.url)}
                                                    className="flex items-center justify-center gap-2 h-10 bg-white text-black hover:bg-pink-50 rounded-xl text-[10px] font-black uppercase transition-transform active:scale-95"
                                                >
                                                    <Download size={14} />
                                                    Salvar
                                                </button>
                                                <button
                                                    className="flex items-center justify-center gap-2 h-10 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase backdrop-blur-md transition-transform active:scale-95"
                                                >
                                                    <Share2 size={14} />
                                                    Link
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Stats Overlay (when not hovered) */}
                                    <div className={`absolute bottom-3 left-3 flex items-center gap-3 transition-opacity duration-300 ${hoveredId === gif.id ? 'opacity-0' : 'opacity-100'}`}>
                                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/5">
                                            <Heart size={10} className="text-pink-500" />
                                            <span className="text-[9px] font-bold text-white">{gif.likes}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-1 border border-white/5">
                                            <Download size={10} className="text-blue-500" />
                                            <span className="text-[9px] font-bold text-white">{gif.downloadCount}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-white/5 border-t border-white/5 flex justify-center items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Zap size={14} className="text-yellow-500" />
                        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">GIFs compartilhados via Chronos Converter</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GifGalleryModal;
