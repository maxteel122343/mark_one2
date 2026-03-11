import React, { useState, useEffect } from 'react';
import { X, Wand2, Play, Share2, Download, CheckCircle2, RefreshCw, Layers, Film, Image as ImageIcon, Sparkles } from 'lucide-react';
import { GalleryItem } from '../types';

interface GifConverterModalProps {
    isOpen: boolean;
    onClose: () => void;
    gallery: GalleryItem[];
    onShareGif: (gifUrl: string) => void;
    onSaveToGallery: (gifUrl: string) => void;
}

const GifConverterModal: React.FC<GifConverterModalProps> = ({
    isOpen,
    onClose,
    gallery,
    onShareGif,
    onSaveToGallery
}) => {
    const [selectedMedia, setSelectedMedia] = useState<GalleryItem | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [convertedGifUrl, setConvertedGifUrl] = useState<string | null>(null);
    const [settings, setSettings] = useState({
        fps: 15,
        resolution: 'medium',
        loop: true,
        optimize: true
    });

    const handleConvert = () => {
        if (!selectedMedia) return;
        setIsConverting(true);
        setProgress(0);

        let currentProgress = 0;
        const interval = setInterval(() => {
            currentProgress += Math.random() * 15;
            if (currentProgress >= 100) {
                currentProgress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    // In a real app, this is where the conversion logic would happen
                    // We simulate by using the source URL or a mocked GIF proxy
                    setConvertedGifUrl(selectedMedia.url);
                    setIsConverting(false);
                }, 800);
            }
            setProgress(currentProgress);
        }, 300);
    };

    const handleReset = () => {
        setConvertedGifUrl(null);
        setSelectedMedia(null);
        setProgress(0);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
            <div className="relative w-full max-w-5xl h-full md:h-[80vh] bg-[#0c0e12] border border-white/10 rounded-none md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-900/10 via-transparent to-pink-900/10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px] shadow-xl">
                            <div className="w-full h-full rounded-2xl bg-dark-950 flex items-center justify-center">
                                <Film className="text-white animate-pulse" size={24} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Chronos GIF Studio</h2>
                                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-black rounded-full uppercase border border-cyan-500/20">Alpha V.1</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Converta mídias da sua galeria em animações leves</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Media Selector or Result */}
                    <div className="flex-1 p-8 bg-black/20 flex flex-col items-center justify-center relative">
                        {!selectedMedia ? (
                            <div className="text-center space-y-6">
                                <div className="w-32 h-32 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center mx-auto text-gray-600">
                                    <ImageIcon size={48} />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Selecione uma Mídia</h3>
                                    <p className="text-xs text-gray-500 font-medium">Escolha um item da sua galeria pessoal à direita</p>
                                </div>
                            </div>
                        ) : convertedGifUrl ? (
                            <div className="w-full h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in-95 duration-500">
                                <div className="relative group max-w-md w-full aspect-square rounded-3xl overflow-hidden border-4 border-cyan-500/30 shadow-2xl shadow-cyan-500/10">
                                    <img src={convertedGifUrl} alt="Converted" className="w-full h-full object-cover" />
                                    <div className="absolute top-4 left-4 px-3 py-1 bg-cyan-600/90 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <CheckCircle2 size={12} />
                                        GIF Pronto
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => onShareGif(convertedGifUrl)}
                                        className="h-14 px-8 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-cyan-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                                    >
                                        <Share2 size={18} />
                                        Compartilhar na Galeria
                                    </button>
                                    <button
                                        onClick={handleReset}
                                        className="h-14 px-8 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3"
                                    >
                                        <RefreshCw size={18} />
                                        Novo
                                    </button>
                                </div>
                            </div>
                        ) : isConverting ? (
                            <div className="w-full max-w-md space-y-8 text-center">
                                <div className="relative w-40 h-40 mx-auto">
                                    <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                                    <svg className="w-full h-full -rotate-90">
                                        <circle
                                            cx="80"
                                            cy="80"
                                            r="76"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            strokeDasharray={477}
                                            strokeDashoffset={477 - (477 * progress) / 100}
                                            className="text-cyan-500 transition-all duration-300"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white">{Math.round(progress)}%</span>
                                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Renderizando</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-sm font-medium text-gray-400 animate-pulse italic">
                                        {progress < 30 ? "Extraindo frames..." :
                                            progress < 70 ? "Comprimindo paleta de cores..." :
                                                "Finalizando loop Chronos..."}
                                    </p>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-300"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-8 space-y-8">
                                <div className="relative w-full max-w-md aspect-video rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl group">
                                    <img src={selectedMedia.url} alt="To convert" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={48} className="text-white fill-white" />
                                    </div>
                                    <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black text-white uppercase tracking-widest">
                                        {selectedMedia.type.toUpperCase()}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Quadros (FPS)</label>
                                        <div className="flex gap-2">
                                            {[10, 15, 24].map(fps => (
                                                <button
                                                    key={fps}
                                                    onClick={() => setSettings({ ...settings, fps })}
                                                    className={`flex-1 h-8 rounded-lg text-[10px] font-black ${settings.fps === fps ? 'bg-cyan-600 text-white' : 'bg-white/5 text-gray-500'}`}
                                                >
                                                    {fps}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                                        <label className="text-[10px] font-black text-gray-500 uppercase mb-2 block tracking-widest">Resolução</label>
                                        <div className="flex gap-2">
                                            {['Low', 'Med', 'High'].map(res => (
                                                <button
                                                    key={res}
                                                    onClick={() => setSettings({ ...settings, resolution: res.toLowerCase() })}
                                                    className={`flex-1 h-8 rounded-lg text-[10px] font-black ${settings.resolution === res.toLowerCase() ? 'bg-cyan-600 text-white' : 'bg-white/5 text-gray-500'}`}
                                                >
                                                    {res}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleConvert}
                                    className="h-16 px-12 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                                >
                                    <Wand2 size={20} />
                                    Renderizar GIF
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Sidebar Gallery Selector */}
                    <div className="w-80 border-l border-white/5 flex flex-col">
                        <div className="p-6 border-b border-white/5">
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Layers size={14} className="text-cyan-400" />
                                Sua Galeria Mídia
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-3">
                                {gallery.length === 0 ? (
                                    <div className="col-span-2 py-10 text-center opacity-20">
                                        <ImageIcon size={32} className="mx-auto mb-2" />
                                        <span className="text-[9px] font-black uppercase">Galeria vazia</span>
                                    </div>
                                ) : (
                                    gallery.map((item, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setSelectedMedia(item);
                                                setConvertedGifUrl(null);
                                            }}
                                            className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedMedia?.url === item.url ? 'border-cyan-500 scale-95 shadow-lg shadow-cyan-900/40' : 'border-transparent hover:border-white/20'}`}
                                        >
                                            <img src={item.url} alt="Gallery item" className="w-full h-full object-cover" />
                                            {item.type === 'video' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <Play size={12} className="text-white fill-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="p-6 bg-cyan-900/5 border-t border-white/5 space-y-4">
                            <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-yellow-500 shrink-0" />
                                <p className="text-[9px] text-gray-500 font-medium leading-tight">
                                    Os GIFs convertidos são otimizados para tempo de carregamento rápido e loops infinitos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GifConverterModal;
