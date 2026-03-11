import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, Mic, X, Bot, Activity, Heart, Sparkles, MessageSquare } from 'lucide-react';
import { AiCallState } from '../types';

interface AiCallOverlayProps {
    callState: AiCallState;
    onAccept: () => void;
    onDecline: () => void;
    onEnd: () => void;
    userAvatar: string;
}

const AiCallOverlay: React.FC<AiCallOverlayProps> = ({
    callState,
    onAccept,
    onDecline,
    onEnd,
    userAvatar
}) => {
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        let interval: any;
        if (callState.isActive) {
            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [callState.isActive]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!callState.incoming && !callState.isActive) return null;

    // --- Reason Mapping ---
    const reasonConfig = {
        motivation: {
            icon: <Heart className="text-rose-500" size={16} />,
            label: 'Cuidado & Motivação',
            color: 'bg-rose-50 text-rose-600 border-rose-100'
        },
        praise: {
            icon: <Sparkles className="text-amber-500" size={16} />,
            label: 'Reconhecimento',
            color: 'bg-amber-50 text-amber-600 border-amber-100'
        },
        followup: {
            icon: <MessageSquare className="text-blue-500" size={16} />,
            label: 'Acompanhamento de Tarefa',
            color: 'bg-blue-50 text-blue-600 border-blue-100'
        }
    };

    const currentReason = callState.reason ? reasonConfig[callState.reason] : reasonConfig.followup;

    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center transition-all duration-700 ${callState.incoming ? 'bg-black/60 backdrop-blur-md' : 'pointer-events-none'}`}>

            {/* --- Incoming Call View --- */}
            {callState.incoming && (
                <div className="bg-white/90 backdrop-blur-2xl border border-white/40 p-10 rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.3)] w-full max-w-md flex flex-col items-center animate-in zoom-in-95 duration-500">

                    {/* Pulsing Avatar Section */}
                    <div className="relative mb-8">
                        {/* Outer Pulse Rings */}
                        <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" style={{ animationDuration: '3s' }} />
                        <div className="absolute inset-0 animate-ping rounded-full bg-blue-500 opacity-10" style={{ animationDuration: '2s' }} />

                        <div className="relative w-32 h-32 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <img
                                src={callState.callerAvatar}
                                alt="Caller"
                                className="w-full h-full object-cover scale-110"
                            />
                        </div>

                        <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white rounded-2xl shadow-lg flex items-center justify-center border-2 border-gray-50">
                            <Bot className="text-blue-600" size={24} />
                        </div>
                    </div>

                    <div className="text-center space-y-2 mb-10">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest mb-2 ${currentReason.color}`}>
                            {currentReason.icon}
                            {currentReason.label}
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{callState.callerName}</h2>
                        <p className="text-gray-500 font-medium">Ligação via Chronos Logic</p>
                    </div>

                    <div className="flex gap-6 w-full">
                        <button
                            onClick={onDecline}
                            className="flex-1 group flex flex-col items-center gap-3"
                        >
                            <div className="w-16 h-16 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40 group-hover:scale-110 transition-transform group-active:scale-95 duration-300">
                                <PhoneOff size={28} />
                            </div>
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Recusar</span>
                        </button>

                        <button
                            onClick={onAccept}
                            className="flex-1 group flex flex-col items-center gap-3"
                        >
                            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 group-hover:scale-110 transition-transform group-active:scale-95 duration-300">
                                <Phone size={28} className="animate-bounce" style={{ animationDuration: '2s' }} />
                            </div>
                            <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Atender</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- Active Call View (Mini) --- */}
            {callState.isActive && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-dark-900/95 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-[32px] shadow-2xl flex items-center gap-6 min-w-[320px]">
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-white/20">
                            <img src={callState.callerAvatar} alt="AI" className="w-full h-full object-cover" />
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-white text-sm font-black">Em chamada com {callState.callerName}</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4].map(i => (
                                        <div
                                            key={i}
                                            className="w-0.5 h-3 bg-blue-500 rounded-full animate-pulse"
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-blue-400 text-[10px] font-bold font-mono uppercase tracking-widest">{formatTime(duration)}</span>
                                <div className="h-1 w-24 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 w-full animate-waveform origin-left" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onEnd}
                            className="w-12 h-12 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center active:scale-95"
                        >
                            <PhoneOff size={20} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes waveform {
                    0% { transform: scaleX(0.2); opacity: 0.5; }
                    50% { transform: scaleX(0.8); opacity: 1; }
                    100% { transform: scaleX(0.2); opacity: 0.5; }
                }
                .animate-waveform {
                    animation: waveform 0.8s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default AiCallOverlay;
