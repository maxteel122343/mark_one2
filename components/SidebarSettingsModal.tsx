import React from 'react';
import { SidebarSettings } from '../types';
import {
    X, Eye, EyeOff, Layout, TrendingUp,
    CalendarCheck2, List, BarChart3, Settings, User, CloudUpload,
    Cloud, Zap, Film, Bell, Package, Keyboard, ScrollText, Maximize2,
    MessageSquare, Image as ImageIcon, Calendar, CalendarDays, CalendarRange,
    Layers, StickyNote, Square, Plus, Mic, Headphones, AudioLines, Folder,
    ListOrdered
} from 'lucide-react';

interface SidebarSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: SidebarSettings;
    onUpdate: (updates: Partial<SidebarSettings>) => void;
}

const SidebarSettingsModal: React.FC<SidebarSettingsModalProps> = ({ isOpen, onClose, settings, onUpdate }) => {
    if (!isOpen) return null;

    const toggle = (key: keyof SidebarSettings) => {
        onUpdate({ [key]: !settings[key] });
    };

    const ConfigItem = ({
        icon: Icon,
        label,
        desc,
        settingKey,
        colorClass,
        bgClass
    }: {
        icon: any;
        label: string;
        desc?: string;
        settingKey: keyof SidebarSettings;
        colorClass: string;
        bgClass: string;
    }) => (
        <div className={`flex items-center justify-between p-3 border rounded-xl transition-all ${settings[settingKey]
            ? 'bg-white/5 border-white/10'
            : 'bg-black/20 border-white/5 opacity-50'
            }`}>
            <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${bgClass}`}>
                    <Icon size={15} className={colorClass} />
                </div>
                <div className="min-w-0">
                    <span className="text-sm font-semibold text-gray-200 block truncate">{label}</span>
                    {desc && <span className="text-[10px] text-gray-500 truncate block">{desc}</span>}
                </div>
            </div>
            <button
                onClick={() => toggle(settingKey)}
                className={`p-1.5 rounded-lg ml-2 shrink-0 transition-all ${settings[settingKey]
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                    : 'bg-white/5 text-gray-600 border border-white/10 hover:text-gray-400'
                    }`}
                title={settings[settingKey] ? 'Ocultar' : 'Mostrar'}
            >
                {settings[settingKey] ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
        </div>
    );

    const SectionHeader = ({ label, emoji }: { label: string; emoji: string }) => (
        <div className="col-span-2 pt-3 first:pt-0 pb-1 border-b border-white/5 mb-1">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <span>{emoji}</span> {label}
            </h3>
        </div>
    );

    const visibleCount = Object.entries(settings).filter(([k, v]) => k !== 'autoShareIncomplete' && v === true).length;
    const totalCount = Object.keys(settings).length - 1;

    return (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center md:p-4 p-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-[#1a1c23] border border-white/10 rounded-none md:rounded-3xl w-full max-w-2xl h-full md:h-auto shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-full md:max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-lg font-black text-white flex items-center gap-2">
                            <Layout className="text-blue-400" size={22} />
                            VISIBILIDADE DA SIDEBAR
                        </h2>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">
                            {visibleCount} de {totalCount} ícones visíveis
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">

                        {/* --- Criação de Cards --- */}
                        <SectionHeader label="Criação de Cards" emoji="🃏" />

                        <ConfigItem icon={Plus} label="Card Clássico" desc="Adicionar card padrão" settingKey="showAddCard" colorClass="text-blue-400" bgClass="bg-blue-500/10" />
                        <ConfigItem icon={StickyNote} label="Nota (Post-it)" desc="Card tipo nota amarela" settingKey="showAddNote" colorClass="text-yellow-400" bgClass="bg-yellow-500/10" />
                        <ConfigItem icon={Layers} label="Batch / GreenCard" desc="Tarefa em lote (verde)" settingKey="showBatchCard" colorClass="text-emerald-400" bgClass="bg-emerald-500/10" />
                        <ConfigItem icon={Zap} label="Quick Card" desc="Card rápido (faster)" settingKey="showQuickCard" colorClass="text-orange-400" bgClass="bg-orange-500/10" />
                        <ConfigItem icon={Square} label="Quadrado Branco" desc="Nota simples vazia" settingKey="showWhiteSquare" colorClass="text-gray-300" bgClass="bg-gray-500/10" />

                        {/* --- Ferramentas --- */}
                        <SectionHeader label="Ferramentas" emoji="🛠️" />

                        <ConfigItem icon={MessageSquare} label="Chat IA" desc="Painel de chat" settingKey="showChat" colorClass="text-purple-400" bgClass="bg-purple-500/10" />
                        <ConfigItem icon={ListOrdered} label="Ordem de Tarefas" desc="Lista priorizada" settingKey="showTaskOrder" colorClass="text-gray-300" bgClass="bg-gray-500/10" />
                        <ConfigItem icon={Folder} label="Gestor de Eventos" desc="Quadro de eventos" settingKey="showEventManager" colorClass="text-indigo-400" bgClass="bg-indigo-500/10" />
                        <ConfigItem icon={ImageIcon} label="Galeria de Mídia" desc="Galeria global de imagens" settingKey="showMediaGallery" colorClass="text-purple-400" bgClass="bg-purple-500/10" />

                        {/* --- Agendamento --- */}
                        <SectionHeader label="Agendamento & Calendário" emoji="📅" />

                        <ConfigItem icon={CalendarCheck2} label="Agenda Ativa" desc="Items agendados ativos" settingKey="showScheduleCheck" colorClass="text-blue-400" bgClass="bg-blue-500/10" />
                        <ConfigItem icon={Calendar} label="Calendário IA" desc="Modal principal do calendário" settingKey="showCalendarMain" colorClass="text-green-400" bgClass="bg-green-500/10" />
                        <ConfigItem icon={CalendarDays} label="Calendário Extra" desc="Mensal + semanal (2 ícones)" settingKey="showExtraCalendars" colorClass="text-sky-400" bgClass="bg-sky-500/10" />

                        {/* --- IA & Voz --- */}
                        <SectionHeader label="IA & Voz" emoji="🎙️" />

                        <ConfigItem icon={Mic} label="Modo Voz" desc="Microfone Ativo" settingKey="showVoiceMode" colorClass="text-red-400" bgClass="bg-red-500/10" />
                        <ConfigItem icon={Headphones} label="Live Áudio IA" desc="Conversa ao vivo (áudio)" settingKey="showLiveAudio" colorClass="text-orange-400" bgClass="bg-orange-500/10" />
                        <ConfigItem icon={AudioLines} label="Voice Chat" desc="Chat de voz + texto" settingKey="showVoiceChat" colorClass="text-purple-400" bgClass="bg-purple-500/10" />
                        <ConfigItem icon={Eye} label="Modo Visão" desc="Câmera + IA" settingKey="showVisionMode" colorClass="text-blue-400" bgClass="bg-blue-500/10" />
                        <ConfigItem icon={Zap} label="Chave API Gemini" desc="Status da IA / API Key" settingKey="showApiKey" colorClass="text-violet-400" bgClass="bg-violet-500/10" />

                        {/* --- Recursos --- */}
                        <SectionHeader label="Recursos & Funcionalidades" emoji="✨" />

                        <ConfigItem icon={List} label="Gestor de Cards" desc="Listar e filtrar cards" settingKey="showCardManager" colorClass="text-emerald-400" bgClass="bg-emerald-500/10" />
                        <ConfigItem icon={BarChart3} label="Controles Canvas" desc="Performance e filtros visuais" settingKey="showCanvasControls" colorClass="text-indigo-400" bgClass="bg-indigo-500/10" />
                        <ConfigItem icon={Settings} label="Configurações" desc="Visual e comportamento" settingKey="showSettings" colorClass="text-gray-400" bgClass="bg-gray-500/10" />
                        <ConfigItem icon={User} label="Perfil IA" desc="Configurações comportamentais" settingKey="showProfile" colorClass="text-purple-400" bgClass="bg-purple-500/10" />
                        <ConfigItem icon={CloudUpload} label="Backup Nuvem" desc="Backup instantâneo" settingKey="showBackup" colorClass="text-blue-400" bgClass="bg-blue-500/10" />
                        <ConfigItem icon={TrendingUp} label="Feed & Conquistas" desc="Posts e atividade" settingKey="showFeed" colorClass="text-blue-400" bgClass="bg-blue-500/10" />
                        <ConfigItem icon={Cloud} label="Centro de Sonhos" desc="Objetivos e sprints" settingKey="showDreamCenter" colorClass="text-sky-300" bgClass="bg-sky-500/10" />
                        <ConfigItem icon={Bell} label="Notificações" desc="Solicitações de especialistas" settingKey="showNotifications" colorClass="text-yellow-400" bgClass="bg-yellow-500/10" />
                        <ConfigItem icon={Package} label="Marketplace" desc="Packs de processos" settingKey="showMarketplace" colorClass="text-indigo-400" bgClass="bg-indigo-500/10" />
                        <ConfigItem icon={Zap} label="Galeria GIFs" desc="GIFs globais compartilhados" settingKey="showGifGallery" colorClass="text-pink-400" bgClass="bg-pink-500/10" />
                        <ConfigItem icon={Film} label="Conversor GIF" desc="Converter mídia para GIF" settingKey="showGifConverter" colorClass="text-cyan-400" bgClass="bg-cyan-500/10" />
                        <ConfigItem icon={Maximize2} label="Modo Foco" desc="Rotinas e pomodoro" settingKey="showFocusMode" colorClass="text-teal-400" bgClass="bg-teal-500/10" />
                        <ConfigItem icon={Keyboard} label="Atalhos" desc="Atalhos do teclado" settingKey="showShortcuts" colorClass="text-gray-300" bgClass="bg-gray-500/10" />
                        <ConfigItem icon={ScrollText} label="Histórico" desc="Ações e insights" settingKey="showHistory" colorClass="text-gray-400" bgClass="bg-gray-500/10" />

                    </div>
                </div>

                {/* Automação footer */}
                <div className="px-5 py-4 bg-white/5 border-t border-white/10">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">⚡ Automação & IA</h3>
                    <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <TrendingUp size={15} className="text-blue-400" />
                            </div>
                            <div>
                                <span className="text-sm font-bold text-white block">Auto-Compartilhar Cards</span>
                                <span className="text-[10px] text-gray-400">Compartilha cards não concluídos/adiados automaticamente</span>
                            </div>
                        </div>
                        <button
                            onClick={() => toggle('autoShareIncomplete')}
                            className={`w-12 h-6 rounded-full relative transition-all flex-shrink-0 ml-3 ${settings.autoShareIncomplete ? 'bg-blue-600' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${settings.autoShareIncomplete ? 'translate-x-6' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Footer buttons */}
                <div className="p-5 border-t border-white/10 flex items-center justify-between">
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const allOn = Object.fromEntries(
                                    Object.keys(settings).filter(k => k !== 'autoShareIncomplete').map(k => [k, true])
                                ) as Partial<SidebarSettings>;
                                onUpdate(allOn);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition"
                        >
                            Mostrar todos
                        </button>
                        <button
                            onClick={() => {
                                const allOff = Object.fromEntries(
                                    Object.keys(settings).filter(k => k !== 'autoShareIncomplete').map(k => [k, false])
                                ) as Partial<SidebarSettings>;
                                onUpdate(allOff);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-white/10 rounded-lg transition"
                        >
                            Ocultar todos
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95 text-sm"
                    >
                        CONCLUÍDO
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SidebarSettingsModal;
