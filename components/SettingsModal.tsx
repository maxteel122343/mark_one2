import React from 'react';
import { X, Layout, Monitor, Bell, Palette, MousePointer2, Settings2, Sparkles, Sliders, Smartphone, Lock, ShieldCheck, Zap } from 'lucide-react';
import { CardVisualSettings, CardBehaviorSettings } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    visualSettings: CardVisualSettings;
    onUpdateVisual: (settings: Partial<CardVisualSettings>) => void;
    behaviorSettings: CardBehaviorSettings;
    onUpdateBehavior: (settings: Partial<CardBehaviorSettings>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    visualSettings,
    onUpdateVisual,
    behaviorSettings,
    onUpdateBehavior
}) => {
    if (!isOpen) return null;

    const navItems = [
        { id: 'visual', label: 'Visual', icon: <Palette size={18} /> },
        { id: 'behavior', label: 'Comportamento', icon: <Sliders size={18} /> },
        { id: 'system', label: 'Geral', icon: <Monitor size={18} /> },
        { id: 'security', label: 'Segurança', icon: <Lock size={18} /> }
    ];

    const [activeTab, setActiveTab] = React.useState('visual');

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />

            {/* Modal Content */}
            <div className="relative bg-white/95 backdrop-blur-2xl border border-white/60 w-full max-w-4xl h-full md:max-h-[85vh] rounded-none md:rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 cubic-bezier(0.19, 1, 0.22, 1)">

                {/* Header */}
                <div className="px-6 md:px-12 py-6 md:py-10 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <div className="flex items-center gap-3 md:gap-5">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-2xl md:rounded-[28px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 rotate-6 shrink-0">
                            <Settings2 size={24} md:size={32} />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-4xl font-black text-gray-900 tracking-tighter leading-none uppercase">Settings</h2>
                            <p className="text-[9px] md:text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2 ml-1 flex items-center gap-2">
                                <Sparkles size={10} className="text-blue-500" /> Advanced Center
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:scale-110 active:scale-95 transition-all border border-gray-100"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Nav */}
                    <div className="w-14 md:w-64 border-r border-gray-100 p-1.5 md:p-8 space-y-2 bg-gray-50/30 flex flex-col shrink-0">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center justify-center md:justify-start gap-3 px-2 md:px-5 py-4 rounded-xl md:rounded-2xl transition-all duration-300 font-bold text-sm ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'}`}
                                title={item.label}
                            >
                                {item.icon}
                                <span className="hidden md:block">{item.label}</span>
                            </button>
                        ))}

                        <div className="mt-auto pt-8 border-t border-gray-100 px-1">
                            <div className="flex items-center justify-center md:justify-start gap-3 text-[9px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 md:p-4 p-2 rounded-xl md:rounded-2xl border border-gray-100">
                                <Smartphone size={16} />
                                <span className="hidden md:block">Device: Master</span>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 md:p-12 p-4 overflow-y-auto custom-scrollbar">
                        {activeTab === 'visual' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <section className="space-y-6">
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3 mb-8">
                                        <Layout size={20} className="text-blue-500" /> Visual do Card
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            { key: 'showTitle', label: 'Mostrar Título', desc: 'Sempre exibir o título do card' },
                                            { key: 'showDescription', label: 'Mostrar Detalhes', desc: 'Resumo da tarefa visível' },
                                            { key: 'showTimer', label: 'Monitor de Tempo', desc: 'Relógio e progresso visual' },
                                            { key: 'showTags', label: 'Exibir #Tags', desc: 'Categorias coloridas no card' },
                                            { key: 'showAttachmentIndicator', label: 'Indicador de Anexos', desc: 'Mostra ícones de mídia' },
                                            { key: 'showCompletionCount', label: 'Contador de Vitórias', desc: 'Vezes concluído com sucesso' }
                                        ].map((toggle) => (
                                            <button
                                                key={toggle.key}
                                                onClick={() => onUpdateVisual({ [toggle.key]: !(visualSettings as any)[toggle.key] })}
                                                className={`p-6 rounded-[32px] border text-left transition-all group ${(visualSettings as any)[toggle.key] ? 'border-blue-500/30 bg-blue-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                            >
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-gray-900 text-sm">{toggle.label}</span>
                                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${(visualSettings as any)[toggle.key] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all ${(visualSettings as any)[toggle.key] ? 'translate-x-4' : ''}`} />
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{toggle.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'behavior' && (
                            <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                <section className="space-y-6">
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3 mb-8">
                                        <Zap size={20} className="text-amber-500" /> Fluxo & Interação
                                    </h3>

                                    <div className="space-y-4">
                                        {[
                                            { key: 'requireClickToStart', label: 'Confirmação para Iniciar', desc: 'Aguarda seu clique para começar o timer após o período de foco.' },
                                            { key: 'requireClickToFinish', label: 'Confirmação para Concluir', desc: 'Exige confirmação manual mesmo após o tempo esgotar.' },
                                            { key: 'autoFlowAfterPostTime', label: 'Fluxo Automático (Pós-Tarefa)', desc: 'Pula para a próxima tarefa assim que o cooldown terminar.' }
                                        ].map((toggle) => (
                                            <button
                                                key={toggle.key}
                                                onClick={() => onUpdateBehavior({ [toggle.key]: !(behaviorSettings as any)[toggle.key] })}
                                                className={`w-full p-6 rounded-[32px] border text-left transition-all ${(behaviorSettings as any)[toggle.key] ? 'border-amber-500/30 bg-amber-50/10' : 'border-gray-100 bg-white'}`}
                                            >
                                                <div className="flex items-center justify-between gap-6">
                                                    <div className="flex-1">
                                                        <span className="font-bold text-gray-900 text-sm block mb-1">{toggle.label}</span>
                                                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{toggle.desc}</p>
                                                    </div>
                                                    <div className={`w-12 h-7 rounded-full relative transition-colors shrink-0 ${(behaviorSettings as any)[toggle.key] ? 'bg-amber-500' : 'bg-gray-200'}`}>
                                                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-all ${(behaviorSettings as any)[toggle.key] ? 'translate-x-5' : ''}`} />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'system' && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-in fade-in duration-700">
                                <div className="w-24 h-24 bg-gray-50 rounded-[40px] flex items-center justify-center text-gray-300 mb-8 border border-gray-100 shadow-inner">
                                    <Monitor size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Otimização de Sistema</h3>
                                <p className="text-sm text-gray-400 mt-2 max-w-xs font-medium">As configurações de hardware e performance global estão sendo migradas para o <span className="text-blue-500 font-bold">Canvas Manager</span>.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 md:p-10 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center px-6 md:px-12">
                    <div className="hidden md:flex items-center gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <ShieldCheck size={16} className="text-emerald-500" /> All data is encrypted locally
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full md:w-auto bg-dark-900 text-white px-10 py-5 rounded-2xl md:rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Salvar Configurações
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
