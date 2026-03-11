import React, { useState } from 'react';
import { X, Key, Check, AlertCircle, Loader2 } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentKey: string;
    onSave: (key: string) => Promise<boolean>;
    diagnostics?: {
        sources: Array<{ label: string; status: 'idle' | 'working' | 'failed' }>;
        activeLabel: string | null;
    };
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, currentKey, onSave, diagnostics }) => {
    const [key, setKey] = useState(currentKey);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsLoading(true);
        setStatus('idle');
        const success = await onSave(key);
        setIsLoading(false);
        if (success) {
            setStatus('success');
            // Don't close immediately if we want to show the results
            // setTimeout(onClose, 1500); 
        } else {
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[4000] flex items-center justify-center md:p-4 p-0" onClick={onClose}>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-none md:rounded-2xl w-full max-w-md h-full md:h-auto flex flex-col shadow-2xl overflow-hidden animate-in md:zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Key className="text-purple-500" size={20} /> Status da API Gemini
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Status das Chaves (Fallback Info) */}
                    {diagnostics && (
                        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Cadeia de Redundância (Fallback)</label>
                            <div className="space-y-2">
                                {diagnostics.sources.map((src, i) => (
                                    <div key={i} className={`flex items-center justify-between p-2 rounded-lg border ${diagnostics.activeLabel === src.label ? 'bg-purple-500/10 border-purple-500/20' : 'bg-white/5 border-transparent'}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${src.status === 'working' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                    src.status === 'failed' ? 'bg-red-500' : 'bg-gray-600'
                                                }`} />
                                            <span className={`text-xs font-bold ${diagnostics.activeLabel === src.label ? 'text-purple-400' : 'text-gray-400'}`}>
                                                {src.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {src.status === 'working' && <span className="text-[9px] font-black text-green-500 uppercase px-1.5 py-0.5 bg-green-500/10 rounded">Ativa</span>}
                                            {src.status === 'failed' && <span className="text-[9px] font-black text-red-500 uppercase px-1.5 py-0.5 bg-red-500/10 rounded">Indisponível</span>}
                                            {src.status === 'idle' && <span className="text-[9px] font-black text-gray-600 uppercase">Aguardando</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Atualizar API Key Personalizada</label>
                        <div className="relative">
                            <input
                                type="password"
                                className={`w-full bg-white/5 border ${status === 'error' ? 'border-red-500' : 'border-white/10'} rounded-xl p-4 text-white focus:outline-none focus:border-purple-500 transition`}
                                placeholder="AIzaSy..."
                                value={key}
                                onChange={e => setKey(e.target.value)}
                            />
                            {status === 'success' && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500 animate-in fade-in zoom-in">
                                    <Check size={20} />
                                </div>
                            )}
                        </div>
                    </div>

                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-500 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <AlertCircle size={14} />
                            <span>Erro ao validar chave. O sistema tentará os fallbacks automáticos.</span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition"
                        >
                            Fechar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex-[2] bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition active:scale-95"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Testar e Salvar</>}
                        </button>
                    </div>

                    <p className="text-[10px] text-center text-gray-600">
                        Sua chave é salva localmente. Fallbacks são chaves de redundância do sistema. <br />
                        <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline font-bold">Gerar nova chave no AI Studio</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyModal;
