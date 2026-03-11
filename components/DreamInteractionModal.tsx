import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, Bot, User, Download, CheckCircle2, BotIcon, FileText, ChevronDown, Wand2, Info, Plus } from 'lucide-react';
import { DreamCard, DreamInteractionSession, CardData } from '../types';

interface DreamInteractionModalProps {
    isOpen: boolean;
    onClose: () => void;
    dream: DreamCard | null;
    session: DreamInteractionSession | null;
    onSendMessage: (text: string) => void;
    isAiProcessing: boolean;
    onActionComplete: (cards: Partial<CardData>[]) => void;
}

const DreamInteractionModal: React.FC<DreamInteractionModalProps> = ({
    isOpen,
    onClose,
    dream,
    session,
    onSendMessage,
    isAiProcessing,
    onActionComplete
}) => {
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [session?.messages]);

    if (!isOpen || !dream || !session) return null;

    const handleSend = () => {
        if (!inputText.trim() || isAiProcessing) return;
        onSendMessage(inputText);
        setInputText('');
    };

    const downloadHistory = () => {
        const historyText = session.messages.map(m =>
            `${m.role === 'ai' ? 'CHRONOS IA' : 'PRO'}: ${m.text}\n${m.reasoning ? `[Raciocínio: ${m.reasoning}]\n` : ''}`
        ).join('\n---\n');

        const blob = new Blob([`HISTÓRICO DE MENTORIA - SONHO: ${dream.dreamDescription}\n\n${historyText}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mentoria-sonho-${dream.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-5xl h-full md:h-[85vh] bg-[#0c0e12] border border-white/10 rounded-none md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-blue-900/10 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 p-[1px] shadow-xl">
                            <div className="w-full h-full rounded-2xl bg-dark-950 flex items-center justify-center">
                                <Sparkles className="text-white animate-pulse" size={24} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Mentoria de Processos</h2>
                                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-full uppercase border border-blue-500/20">Modo Profissional</span>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                                Você está auxiliando: <span className="text-blue-500">{dream.userName}</span> no objetivo de <span className="text-purple-500 italic">"{dream.dreamDescription.substring(0, 40)}..."</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={downloadHistory}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-all text-[10px] font-black uppercase tracking-widest border border-white/5"
                        >
                            <Download size={14} />
                            Baixar Histórico
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 transition">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col border-r border-white/5 relative">
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                            {/* Intro Bubble */}
                            <div className="flex gap-4 max-w-2xl">
                                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30 shrink-0">
                                    <Bot size={20} className="text-blue-400" />
                                </div>
                                <div className="space-y-2">
                                    <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl rounded-tl-none text-sm text-gray-200 leading-relaxed shadow-lg">
                                        Olá! Como profissional experiente, sua missão é detalhar os passos técnicos e práticos para este sonho. Vou te fazer perguntas pontuais e registrar tudo como processos. Pronto?
                                    </div>
                                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest ml-1">Sistema Chronos Iniciado</span>
                                </div>
                            </div>

                            {session.messages.map((m, idx) => (
                                <div key={idx} className={`flex gap-4 ${m.role === 'pro' ? 'flex-row-reverse text-right ml-auto' : ''} max-w-2xl`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${m.role === 'pro' ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-blue-600/20 border border-blue-500/30'}`}>
                                        {m.role === 'pro' ? <User size={20} className="text-purple-400" /> : <Bot size={20} className="text-blue-400" />}
                                    </div>
                                    <div className="space-y-2">
                                        <div className={`p-4 rounded-2xl shadow-xl border text-sm leading-relaxed ${m.role === 'pro' ? 'bg-purple-900/10 border-purple-500/20 text-purple-100 rounded-tr-none' : 'bg-dark-800/50 border-white/5 text-gray-200 rounded-tl-none'}`}>
                                            {m.text}
                                            {m.reasoning && (
                                                <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                                                    <Info size={14} className="text-blue-500 shrink-0" />
                                                    <p className="text-[10px] text-gray-500 italic font-mono">{m.reasoning}</p>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest px-1">
                                            {m.role === 'pro' ? 'Você' : 'Chronos IA'} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {isAiProcessing && (
                                <div className="flex gap-4 max-w-xl animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-500/10 shrink-0">
                                        <Bot size={20} className="text-blue-600" />
                                    </div>
                                    <div className="bg-white/5 h-12 w-48 rounded-2xl rounded-tl-none border border-white/5 flex items-center px-4 gap-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75" />
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-8 bg-black/20 border-t border-white/5">
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="Responda para a IA detalhar os processos..."
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                    className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl pl-6 pr-24 text-white text-sm focus:border-blue-500/50 outline-none transition shadow-2xl"
                                />
                                <button
                                    onClick={handleSend}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2"
                                >
                                    Responder
                                    <Send size={14} />
                                </button>
                            </div>
                            <p className="mt-3 text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] text-center italic">A IA converterá suas respostas em cards acionáveis de objetivo</p>
                        </div>
                    </div>

                    {/* Sidebar: Collected Intel */}
                    <div className="w-80 bg-black/40 flex flex-col">
                        <div className="p-6 border-b border-white/5 bg-gradient-to-br from-purple-900/20 to-transparent">
                            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
                                <BotIcon size={16} className="text-purple-400" />
                                Intel Coletada
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-gray-500 uppercase font-black tracking-tighter">Perguntas Feitas</span>
                                    <span className="text-white font-mono">{session.messages.filter(m => m.role === 'ai').length}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-gray-500 uppercase font-black tracking-tighter">Cards Potenciais</span>
                                    <span className="text-blue-400 font-mono">~{Math.min(5, Math.ceil(session.messages.length / 2))}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mb-2">Processos Identificados</h4>

                            {session.generatedCards && session.generatedCards.length > 0 ? (
                                session.generatedCards.map((card, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 animate-in zoom-in-95 duration-300">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="p-1 bg-green-500/10 rounded">
                                                <Wand2 size={10} className="text-green-400" />
                                            </div>
                                            <span className="text-[10px] font-black text-white uppercase tracking-tight">{card.title}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 leading-tight italic">
                                            {card.description}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 opacity-20 text-center grayscale">
                                    <FileText size={40} className="mb-2" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Aguardando mapeamento...</span>
                                </div>
                            )}
                        </div>

                        {session.status === 'completed' && (
                            <div className="p-6 bg-blue-600/10 border-t border-blue-500/20">
                                <button
                                    onClick={() => onActionComplete(session.generatedCards || [])}
                                    className="w-full h-12 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    Gerar Cards no Canvas
                                    <Plus size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DreamInteractionModal;
