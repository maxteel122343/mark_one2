import React, { useState, useEffect, useRef } from 'react';
import { X, Timer, Zap, Send, Trophy, CheckCircle2, ListTodo, Archive, ArrowRight, Star, Play } from 'lucide-react';
import { DreamRequest, CardData } from '../types';

interface DreamSprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: DreamRequest | null;
    onFinishSprint: (cards: Partial<CardData>[]) => void;
}

const DreamSprintModal: React.FC<DreamSprintModalProps> = ({
    isOpen,
    onClose,
    request,
    onFinishSprint
}) => {
    const [step, setStep] = useState<'intro' | 'sprint' | 'summary'>('intro');
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [input, setInput] = useState('');
    const [createdCards, setCreatedCards] = useState<Partial<CardData>[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (step === 'sprint' && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setStep('summary');
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step, timeLeft]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [createdCards]);

    if (!isOpen || !request) return null;

    const startSprint = () => {
        setStep('sprint');
        setTimeLeft(300);
        setCreatedCards([]);
    };

    const handleAddCard = () => {
        if (!input.trim()) return;
        const newCard: Partial<CardData> = {
            title: input.trim(),
            description: `Passo definido por especialista para: ${request.dreamDescription}`,
            color: 'blue',
            shape: 'rectangle',
            timerTotal: 1800 // 30 min default
        };
        setCreatedCards(prev => [...prev, newCard]);
        setInput('');
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleComplete = () => {
        onFinishSprint(createdCards);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-4xl h-full md:h-[80vh] bg-[#080a0f] border border-white/10 rounded-none md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col">

                {/* Timer Bar (Only in Sprint) */}
                {step === 'sprint' && (
                    <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 transition-all duration-1000" style={{ width: `${(timeLeft / 300) * 100}%` }} />
                )}

                {/* Header */}
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-br from-yellow-900/10 via-transparent to-orange-900/10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-yellow-400 to-orange-600 p-[1px] shadow-xl shadow-orange-950/20">
                            <div className="w-full h-full rounded-2xl bg-dark-950 flex items-center justify-center">
                                <Zap className="text-white animate-pulse" size={28} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Sprint de Processos</h2>
                                {step === 'sprint' && (
                                    <div className="px-3 py-1 bg-red-500/20 text-red-400 text-[10px] font-black rounded-full uppercase border border-red-500/20 animate-pulse">
                                        LIVE: {formatTime(timeLeft)}
                                    </div>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase italic">
                                Ajude <span className="text-yellow-500">{request.dreamerName}</span> a conquistar seu sonho
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 transition">
                        <X size={28} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {step === 'intro' ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8 animate-in zoom-in-95 duration-500">
                            <div className="max-w-md space-y-4">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-yellow-500/20">
                                    <Star size={12} fill="currentColor" />
                                    Solicitação de Especialista
                                </div>
                                <h3 className="text-3xl font-black text-white leading-tight">Você foi convocado para o sonho:</h3>
                                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl italic text-gray-300 text-lg leading-relaxed shadow-inner">
                                    "{request.dreamDescription}"
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Como <span className="text-white font-bold">{request.professionRequired}</span>, seu conhecimento é vital. Você terá 5 minutos para escrever o máximo de passos (cards) que conseguir para tornar esse sonho real.
                                </p>
                            </div>

                            <button
                                onClick={startSprint}
                                className="h-16 px-12 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                            >
                                <Play size={20} className="fill-current" />
                                Iniciar Sprint (5:00)
                            </button>
                        </div>
                    ) : step === 'sprint' ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Cards Display */}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 flex flex-wrap content-start gap-4 custom-scrollbar">
                                {createdCards.length === 0 ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 grayscale">
                                        <ListTodo size={48} className="mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest">Comece a digitar os passos...</p>
                                    </div>
                                ) : (
                                    createdCards.map((card, idx) => (
                                        <div key={idx} className="bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/30 rounded-2xl p-4 min-w-[200px] animate-in slide-in-from-bottom-2 duration-300">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-5 h-5 flex items-center justify-center bg-blue-500 text-white rounded-md text-[10px] font-black">
                                                    {idx + 1}
                                                </span>
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Processo</span>
                                            </div>
                                            <p className="text-xs font-bold text-white leading-tight">{card.title}</p>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Rapid Input Area */}
                            <div className="p-10 bg-black/40 border-t border-white/5">
                                <div className="max-w-3xl mx-auto relative">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Digite um passo e aperte ENTER..."
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
                                        className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-lg font-medium focus:border-yellow-500/50 outline-none transition-all placeholder:text-gray-700 shadow-2xl"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                                        <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest hidden md:block">Pressione [Enter]</div>
                                        <button
                                            onClick={handleAddCard}
                                            className="w-10 h-10 bg-white/10 hover:bg-yellow-500 text-white hover:text-black rounded-xl transition-all flex items-center justify-center"
                                        >
                                            <ArrowRight size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-10 animate-in zoom-in-95 duration-500">
                            <div className="relative">
                                <div className="w-40 h-40 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/20">
                                    <Trophy size={64} className="text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-14 h-14 bg-white rounded-full flex items-center justify-center border-4 border-[#080a0f] text-black font-black text-xl">
                                    {createdCards.length}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-4xl font-black text-white uppercase tracking-tighter">Pack Construído!</h3>
                                <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                                    Em incríveis 5 minutos, você criou <span className="text-white font-bold">{createdCards.length} processos especialistas</span>. Este pack será compartilhado com a rede global de {request.professionRequired}s.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handleComplete}
                                    className="h-16 px-12 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                                >
                                    <Archive size={18} />
                                    Publicar Pack de Cards
                                </button>
                                <button
                                    onClick={onClose}
                                    className="h-16 px-10 bg-white/5 border border-white/10 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-4 bg-white/5 border-t border-white/5 flex justify-center items-center gap-6">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Colaboração Chronos Real-Time</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DreamSprintModal;
