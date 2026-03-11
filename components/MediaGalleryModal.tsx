
import React, { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, Play, Music, Trash2, Filter, Target, Layers, Tag as TagIcon, Check, Copy } from 'lucide-react';
import { CardData, GalleryItem, Attachment, EventGroup } from '../types';

interface MediaGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    galleryItems: GalleryItem[];
    setGalleryItems: React.Dispatch<React.SetStateAction<GalleryItem[]>>;
    cards: CardData[];
    events: EventGroup[];
    onUpdateCard: (id: string, updates: Partial<CardData>) => void;
}

const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
    isOpen,
    onClose,
    galleryItems,
    setGalleryItems,
    cards,
    events,
    onUpdateCard
}) => {
    const [activeTab, setActiveTab] = useState<'gallery' | 'apply'>('gallery');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [applyTarget, setApplyTarget] = useState<'all' | 'tag' | 'specific' | 'group'>('all');
    const [targetTag, setTargetTag] = useState('');
    const [targetCardId, setTargetCardId] = useState('');
    const [targetGroupId, setTargetGroupId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []) as File[];
        files.forEach((file: File) => {
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

                const newItem: GalleryItem = {
                    id: crypto.randomUUID(),
                    type: type,
                    url: reader.result as string,
                    name: file.name,
                    timestamp: Date.now()
                };
                setGalleryItems(prev => [newItem, ...prev]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleDelete = (id: string) => {
        setGalleryItems(prev => prev.filter(item => item.id !== id));
        setSelectedItems(prev => prev.filter(item => item !== id));
    };

    const toggleSelect = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleApplyBackground = () => {
        if (selectedItems.length === 0) return;

        const itemsToApply = galleryItems.filter(item => selectedItems.includes(item.id));
        const newAttachments: Attachment[] = itemsToApply.map(item => ({
            id: crypto.randomUUID(),
            type: item.type,
            url: item.url,
            timestamp: Date.now()
        }));

        let targets: CardData[] = [];
        if (applyTarget === 'all') {
            targets = cards;
        } else if (applyTarget === 'tag') {
            targets = cards.filter(c => c.tags?.includes(targetTag));
        } else if (applyTarget === 'specific') {
            const target = cards.find(c => c.id === targetCardId);
            if (target) targets = [target];
        } else if (applyTarget === 'group') {
            const group = events.find(e => e.id === targetGroupId);
            if (group) {
                targets = cards.filter(c => group.cardIds.includes(c.id));
            }
        }

        targets.forEach(card => {
            onUpdateCard(card.id, {
                attachments: [...(card.attachments || []), ...newAttachments],
                slideSettings: {
                    ...(card.slideSettings || {
                        isEnabled: true,
                        idleTimeout: 30,
                        interval: 5,
                        mediaType: 'all',
                        transitionEffect: 'fade'
                    }),
                    isEnabled: true // Auto-enable when applying from gallery
                }
            });
        });

        alert(`Aplicado a ${targets.length} cards!`);
        onClose();
    };

    const allTags = Array.from(new Set(cards.flatMap(c => c.tags || []))).sort();

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-4xl h-full md:max-h-[80vh] flex flex-col overflow-hidden border border-gray-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <ImageIcon size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Galeria de Mídias</h2>
                            <p className="text-xs text-gray-500 font-medium">Gerencie mídias globais e aplique em cards</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button
                        onClick={() => setActiveTab('gallery')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'gallery' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        MINHA GALERIA
                    </button>
                    <button
                        onClick={() => setActiveTab('apply')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === 'apply' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        APLICAR EM MASSA
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'gallery' ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-400 hover:text-purple-500 transition-all flex flex-col items-center justify-center gap-2"
                                >
                                    <Upload size={32} />
                                    <span className="text-xs font-bold uppercase">Upload</span>
                                </button>
                                {galleryItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleSelect(item.id)}
                                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selectedItems.includes(item.id) ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-100 hover:border-gray-300'}`}
                                    >
                                        {item.type === 'image' || item.type === 'gif' ? (
                                            <img src={item.url} className="w-full h-full object-cover" alt={item.name} />
                                        ) : item.type === 'video' ? (
                                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                                <Play size={24} className="text-white opacity-50" />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <Music size={24} className="text-gray-400" />
                                            </div>
                                        )}

                                        {/* Selection Badge */}
                                        {selectedItems.includes(item.id) && (
                                            <div className="absolute top-2 right-2 bg-purple-500 text-white p-1 rounded-full shadow-lg">
                                                <Check size={12} strokeWidth={3} />
                                            </div>
                                        )}

                                        {/* Overlay Controls */}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {galleryItems.length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>Sua galeria está vazia. Comece fazendo upload!</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="max-w-md mx-auto space-y-8 py-4">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">1. Selecionar Destino</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setApplyTarget('all')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${applyTarget === 'all' ? 'bg-purple-50 border-purple-200 text-purple-600 font-bold ring-2 ring-purple-100' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                    >
                                        <Layers size={21} />
                                        <span className="text-[10px]">Todos</span>
                                    </button>
                                    <button
                                        onClick={() => setApplyTarget('tag')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${applyTarget === 'tag' ? 'bg-purple-50 border-purple-200 text-purple-600 font-bold ring-2 ring-purple-100' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                    >
                                        <TagIcon size={21} />
                                        <span className="text-[10px]">Por Tag</span>
                                    </button>
                                    <button
                                        onClick={() => setApplyTarget('specific')}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${applyTarget === 'specific' ? 'bg-purple-50 border-purple-200 text-purple-600 font-bold ring-2 ring-purple-100' : 'bg-gray-50 border-gray-100 text-gray-500'}`}
                                    >
                                        <Target size={21} />
                                        <span className="text-[10px]">Card Específico</span>
                                    </button>
                                </div>
                            </div>

                            {applyTarget === 'tag' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">2. Escolher a Tag</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {allTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => setTargetTag(tag)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${targetTag === tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                            >
                                                #{tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {applyTarget === 'specific' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">2. Escolher o Card</h3>
                                    <select
                                        value={targetCardId}
                                        onChange={(e) => setTargetCardId(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                                    >
                                        <option value="">Selecione um card...</option>
                                        {cards.map(c => (
                                            <option key={c.id} value={c.id}>{c.title || `Sem título (${c.id.slice(0, 4)})`}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {applyTarget === 'group' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">2. Escolher o Grupo</h3>
                                    <select
                                        value={targetGroupId}
                                        onChange={(e) => setTargetGroupId(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                                    >
                                        <option value="">Selecione um grupo...</option>
                                        {events.map(ev => (
                                            <option key={ev.id} value={ev.id}>{ev.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">3. Mídias Selecionadas</h3>
                                <div className="p-4 bg-gray-50 rounded-xl flex items-center justify-between">
                                    <span className="text-sm text-gray-600 font-medium">{selectedItems.length} mídias selecionadas na galeria</span>
                                    <button onClick={() => setActiveTab('gallery')} className="text-xs text-purple-600 font-bold hover:underline">Alterar seleção</button>
                                </div>
                            </div>

                            <button
                                onClick={handleApplyBackground}
                                disabled={selectedItems.length === 0 || (applyTarget === 'tag' && !targetTag) || (applyTarget === 'specific' && !targetCardId) || (applyTarget === 'group' && !targetGroupId)}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-200 text-white font-bold rounded-xl shadow-xl shadow-purple-200 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Target size={20} /> APLICAR BACKGROUND SLIDE
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Selection Banner */}
                {selectedItems.length > 0 && activeTab === 'gallery' && (
                    <div className="p-4 bg-purple-600 text-white flex justify-between items-center animate-in slide-in-from-bottom-full transition-all">
                        <span className="font-bold text-sm">{selectedItems.length} itens selecionados</span>
                        <div className="flex gap-2">
                            <button onClick={() => setSelectedItems([])} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors">LIMPAR</button>
                            <button onClick={() => setActiveTab('apply')} className="px-4 py-2 bg-white text-purple-600 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-lg">CONTINUAR</button>
                        </div>
                    </div>
                )}

                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleUpload}
                    accept="image/*,video/*,audio/*"
                />
            </div>
        </div>
    );
};

export default MediaGalleryModal;
