import React, { useState, useEffect, useRef } from 'react';
import { X, Cloud, Send, Globe, User, Sparkles, MessageSquare, Plus, Download, ChevronRight, History } from 'lucide-react';
import { DreamCard, UserAiProfile } from '../types';

interface DreamModalProps {
    isOpen: boolean;
    onClose: () => void;
    userProfile: UserAiProfile;
    onUpdateProfile: (updates: Partial<UserAiProfile>) => void;
    onShareDream: (dream: DreamCard) => void;
    sharedDreams: DreamCard[];
    onInteractWithDream: (dream: DreamCard) => void;
}

const DreamModal: React.FC<DreamModalProps> = ({
    isOpen,
    onClose,
    userProfile,
    onUpdateProfile,
    onShareDream,
    sharedDreams,
    onInteractWithDream
}) => {
    const [step, setStep] = useState<'create' | 'network'>('create');
    const [isSharing, setIsSharing] = useState(false);
    const [dreamForm, setDreamForm] = useState({
        dreamDescription: '',
        challengesOvercome: '',
        conquests: '',
        remainingSteps: '',
        difficulties: '',
        motivation: ''
    });

    if (!isOpen) return null;

    const handleShare = () => {
        setIsSharing(true);
        // Simulation of "sending to global network" animation
        setTimeout(() => {
            const newDream: DreamCard = {
                id: Math.random().toString(36).substr(2, 9),
                userId: 'user-1', // In a real app, this would be the actual user ID
                userName: 'Você',
                userProfession: userProfile.profession || 'Explorador',
                ...dreamForm,
                timestamp: Date.now()
            };
            onShareDream(newDream);
            setIsSharing(false);
            setStep('network');
        }, 2500);
    };

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-4xl h-full md:h-auto bg-[#0f1115] border border-white/10 rounded-none md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full md:max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Cloud className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Centro de Sonhos & Objetivos</h2>
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase italic">Conectando visões ao redor do mundo</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setStep('create')}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${step === 'create' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Meu Sonho
                        </button>
                        <button
                            onClick={() => setStep('network')}
                            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all ${step === 'network' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                        >
                            Rede Global
                        </button>
                        <div className="w-[1px] h-6 bg-white/10 mx-2" />
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
                    {isSharing && (
                        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-blue-600/30 border-t-blue-500 animate-spin" />
                                <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" size={32} />
                                {/* Particles/Beams simulation */}
                                <div className="absolute -top-20 left-1/2 w-1 h-20 bg-gradient-to-t from-blue-500 to-transparent animate-bounce delay-75" />
                                <div className="absolute -bottom-20 left-1/2 w-1 h-20 bg-gradient-to-b from-blue-500 to-transparent animate-bounce delay-150" />
                            </div>
                            <h3 className="mt-8 text-lg font-black text-white uppercase tracking-widest animate-pulse">Enviando para a Rede Mundial...</h3>
                            <p className="text-xs text-gray-400 mt-2 italic font-mono">Simulando conexão com clusters globais de computação...</p>
                        </div>
                    )}

                    {step === 'create' ? (
                        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block italic">Sua Profissão / Atuação</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: YouTuber, Programador, Atleta..."
                                        value={userProfile.profession || ''}
                                        onChange={(e) => onUpdateProfile({ profession: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-blue-500/50 outline-none transition"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-2 block italic">Qual o seu maior sonho hoje?</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Descreva seu sonho com detalhes..."
                                        value={dreamForm.dreamDescription}
                                        onChange={(e) => setDreamForm({ ...dreamForm, dreamDescription: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-purple-500/50 outline-none transition resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-2 block italic">Desafios que já venceu</label>
                                    <textarea
                                        rows={2}
                                        placeholder="O que você já superou?"
                                        value={dreamForm.challengesOvercome}
                                        onChange={(e) => setDreamForm({ ...dreamForm, challengesOvercome: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-green-500/50 outline-none transition resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-2 block italic">Suas conquistas até aqui</label>
                                    <textarea
                                        rows={2}
                                        placeholder="O que você já alcançou?"
                                        value={dreamForm.conquests}
                                        onChange={(e) => setDreamForm({ ...dreamForm, conquests: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-yellow-500/50 outline-none transition resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2 block italic">Dificuldades atuais</label>
                                    <textarea
                                        rows={2}
                                        placeholder="O que te trava hoje?"
                                        value={dreamForm.difficulties}
                                        onChange={(e) => setDreamForm({ ...dreamForm, difficulties: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-red-500/50 outline-none transition resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 block italic">Sua motivação</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Por que você quer isso?"
                                        value={dreamForm.motivation}
                                        onChange={(e) => setDreamForm({ ...dreamForm, motivation: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-blue-400/50 outline-none transition resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleShare}
                                disabled={!dreamForm.dreamDescription || !userProfile.profession}
                                className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 group"
                            >
                                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                Compartilhar na Rede Mundial
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                                    <Sparkles size={14} className="text-yellow-400" />
                                    Recomendados para sua profissão ({userProfile.profession || 'Explorador'})
                                </h3>
                                <button className="text-[10px] font-bold text-gray-500 hover:text-white transition uppercase">Ver Todos</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {sharedDreams.length === 0 ? (
                                    <div className="col-span-2 h-40 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-gray-500 italic">
                                        <p className="text-xs uppercase tracking-tighter">Nenhum sonho recomendado no momento.</p>
                                    </div>
                                ) : (
                                    sharedDreams.slice(0, 4).map(dream => (
                                        <div
                                            key={dream.id}
                                            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-blue-500/30 transition-all group cursor-pointer flex flex-col h-full"
                                            onClick={() => onInteractWithDream(dream)}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-dark-800 border border-white/10 flex items-center justify-center overflow-hidden">
                                                        <User size={14} className="text-blue-500" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-white leading-none uppercase">{dream.userName}</span>
                                                        <span className="text-[8px] text-blue-400 font-bold uppercase">{dream.userProfession}</span>
                                                    </div>
                                                </div>
                                                <div className="px-2 py-0.5 bg-blue-500/10 rounded-full">
                                                    <span className="text-[8px] text-blue-400 font-black uppercase tracking-tighter">Match Profissional</span>
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-300 font-medium mb-4 line-clamp-3">
                                                {dream.dreamDescription}
                                            </p>

                                            <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <MessageSquare size={12} className="text-gray-500" />
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Ajudar via IA</span>
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white scale-0 group-hover:scale-100 transition-all shadow-lg shadow-blue-900/50">
                                                    <ChevronRight size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="pt-8">
                                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-dark-900 border border-white/10 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Sparkles size={120} />
                                    </div>
                                    <div className="relative z-10 max-w-lg">
                                        <h4 className="text-lg font-black text-white uppercase tracking-tighter mb-2 italic">Por que contribuir?</h4>
                                        <p className="text-xs text-gray-300 leading-relaxed mb-4">
                                            Como um profissional de <span className="text-blue-400 font-black">{userProfile.profession}</span>, você tem o conhecimento prático necessário para transformar sonhos em processos reais. Ao interagir, a IA aprenderá com suas respostas para criar roteiros detalhados para outros sonhadores.
                                        </p>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">IA Learn Session</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Process Mapping</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DreamModal;
