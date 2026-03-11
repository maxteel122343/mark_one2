import React, { useState } from 'react';
import { X, User, Zap, Moon, Sun, Coffee, Home, Move, Monitor, BookOpen, CreditCard, ChevronRight, Check, Cloud } from 'lucide-react';
import { UserAiProfile } from '../types';

interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserAiProfile;
    onUpdate: (profile: UserAiProfile) => void;
    onRestoreBackup: (backup: any) => void;
    onBackupNow: () => void;
}

const tabs = [
    { id: 'scheduling', label: 'Agendamento', icon: Sun, color: 'blue' },
    { id: 'lifestyle', label: 'Sono & Energia', icon: Moon, color: 'purple' },
    { id: 'activity', label: 'Atividades', icon: Move, color: 'green' },
    { id: 'sync', label: 'Sincronização', icon: Cloud, color: 'orange' },
] as const;

type TabId = typeof tabs[number]['id'];

const colorMap: Record<string, { active: string; ring: string; text: string; label: string }> = {
    blue: { active: 'bg-blue-600 text-white shadow-md shadow-blue-200', ring: 'ring-blue-300/60 border-blue-400', text: 'text-blue-600', label: 'text-blue-500' },
    purple: { active: 'bg-purple-600 text-white shadow-md shadow-purple-200', ring: 'ring-purple-300/60 border-purple-400', text: 'text-purple-600', label: 'text-purple-500' },
    green: { active: 'bg-green-600 text-white shadow-md shadow-green-200', ring: 'ring-green-300/60 border-green-400', text: 'text-green-600', label: 'text-green-500' },
    orange: { active: 'bg-orange-500 text-white shadow-md shadow-orange-200', ring: 'ring-orange-300/60 border-orange-400', text: 'text-orange-600', label: 'text-orange-500' },
};

const UserProfileModal: React.FC<UserProfileModalProps> = ({
    isOpen,
    onClose,
    profile,
    onUpdate,
    onRestoreBackup,
    onBackupNow
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('scheduling');

    if (!isOpen) return null;

    const currentTab = tabs.find(t => t.id === activeTab)!;
    const c = colorMap[currentTab.color];

    const daysOfWeek = [
        { id: 'monday', label: 'Seg' },
        { id: 'tuesday', label: 'Ter' },
        { id: 'wednesday', label: 'Qua' },
        { id: 'thursday', label: 'Qui' },
        { id: 'friday', label: 'Sex' },
        { id: 'saturday', label: 'Sáb' },
        { id: 'sunday', label: 'Dom' },
    ];

    const toggleDay = (dayId: string, field: 'physicalActivityDays' | 'spendingTendencyDays') => {
        const currentDays = profile[field];
        onUpdate({
            ...profile,
            [field]: currentDays.includes(dayId)
                ? currentDays.filter(d => d !== dayId)
                : [...currentDays, dayId]
        });
    };

    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-3 ${c.label}`}>{children}</h3>
    );

    const OptionCard = ({
        isSelected,
        onClick,
        children,
    }: { isSelected: boolean; onClick: () => void; children: React.ReactNode }) => (
        <button
            onClick={onClick}
            className={`w-full text-left p-3.5 rounded-xl border transition-all ${isSelected
                ? `bg-white border-current ring-2 ${c.ring} ${c.text}`
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-white'
                }`}
        >
            {children}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-md z-[4000] flex items-center justify-center p-0 md:p-4">
            <div className="bg-white/95 backdrop-blur-2xl border border-gray-100 rounded-none md:rounded-[40px] w-full max-w-2xl h-full md:h-[82vh] flex flex-col shadow-[0_40px_100px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-300 overflow-hidden">

                {/* Header */}
                <div className="p-4 md:p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-white border border-gray-100 rounded-xl md:rounded-[24px] flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                            <Zap className="text-blue-500" size={24} fill="#3b82f6" fillOpacity={0.15} />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-2xl font-black text-gray-900 tracking-tighter">PERFIL</h2>
                            <p className="text-[8px] md:text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">IA Chronos Sync</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all border border-gray-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar nav */}
                    <div className="w-14 md:w-56 bg-gray-50/50 border-r border-gray-50 p-2 md:p-4 flex flex-col gap-2 shrink-0">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            const colorClass = colorMap[tab.color];
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center justify-center md:justify-start gap-3 px-2 md:px-4 py-4 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${active
                                        ? `bg-white ${colorClass.text} border-gray-100 border shadow-sm`
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                                        }`}
                                    title={tab.label}
                                >
                                    <Icon size={18} />
                                    <span className="hidden md:block">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar md:p-8 p-4 space-y-10">

                        {/* SCHEDULING */}
                        {activeTab === 'scheduling' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <section>
                                    <SectionLabel>Preferência de Adiamento</SectionLabel>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {[
                                            { id: 'morning', label: 'Manhã', desc: '06h – 12h' },
                                            { id: 'afternoon', label: 'Tarde', desc: '12h – 18h' },
                                            { id: 'evening', label: 'Noite', desc: '18h – 00h' },
                                        ].map(opt => (
                                            <div key={opt.id}>
                                                <OptionCard
                                                    isSelected={profile.preferredPeriod === opt.id}
                                                    onClick={() => onUpdate({ ...profile, preferredPeriod: opt.id as any })}
                                                >
                                                    <span className="text-[10px] font-black uppercase tracking-widest block mb-1">{opt.label}</span>
                                                    <span className="text-[9px] text-gray-400 font-bold">{opt.desc}</span>
                                                </OptionCard>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <SectionLabel>Sua Profissão</SectionLabel>
                                    <div className="relative group">
                                        <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Ex: YouTuber, Médico, Programador..."
                                            value={profile.profession || ''}
                                            onChange={e => onUpdate({ ...profile, profession: e.target.value })}
                                            className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-700 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 outline-none transition shadow-inner placeholder:text-gray-300"
                                        />
                                    </div>
                                </section>

                                <section>
                                    <SectionLabel>Salto Temporal Padrão</SectionLabel>
                                    <div className="grid gap-3">
                                        {[
                                            { id: 'tomorrow', label: 'Amanhã', sub: 'Próximo dia útil' },
                                            { id: 'day_after', label: 'Depois de Amanhã', sub: 'Em 2 dias' },
                                            { id: 'next_week', label: 'Próxima Semana', sub: 'Mesmo dia da semana' },
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => onUpdate({ ...profile, postponeTarget: opt.id as any })}
                                                className={`flex items-center justify-between p-5 rounded-[24px] border transition-all ${profile.postponeTarget === opt.id
                                                    ? 'bg-white border-blue-200 ring-4 ring-blue-500/5 shadow-md'
                                                    : 'bg-gray-50/50 border-gray-100 hover:bg-white hover:border-gray-200 shadow-inner'
                                                    }`}
                                            >
                                                <div className="text-left">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${profile.postponeTarget === opt.id ? 'text-blue-600' : 'text-gray-500'}`}>
                                                        {opt.label}
                                                    </span>
                                                    <span className="text-[9px] text-gray-400 font-bold">{opt.sub}</span>
                                                </div>
                                                {profile.postponeTarget === opt.id && (
                                                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                                        <Check size={14} strokeWidth={4} className="text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* LIFESTYLE */}
                        {activeTab === 'lifestyle' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="bg-purple-50/50 border border-purple-100 p-6 rounded-[32px] flex items-start gap-4">
                                    <Coffee size={20} className="text-purple-400 shrink-0" />
                                    <p className="text-xs font-medium text-purple-700 leading-relaxed">
                                        Saber seus horários de sono permite que a IA Chronos gerencie sua energia de forma otimizada, sugerindo pausas em momentos críticos.
                                    </p>
                                </div>

                                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { label: 'Hora de Acordar', field: 'wakeTime' as const, icon: Sun },
                                        { label: 'Hora de Dormir', field: 'sleepTime' as const, icon: Moon },
                                    ].map(item => (
                                        <div key={item.field} className="space-y-3">
                                            <label className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] block px-1">{item.label}</label>
                                            <div className="relative group">
                                                <item.icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 group-focus-within:text-purple-500 transition-colors" />
                                                <input
                                                    type="time"
                                                    value={profile[item.field]}
                                                    onChange={e => onUpdate({ ...profile, [item.field]: e.target.value })}
                                                    className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-700 focus:bg-white focus:border-purple-200 outline-none transition shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </section>

                                <section>
                                    <SectionLabel>Pico de Disposição</SectionLabel>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            { id: 'morning', label: 'Manhã', desc: 'Máximo Foco' },
                                            { id: 'afternoon', label: 'Tarde', desc: 'Flow Criativo' },
                                            { id: 'evening', label: 'Noite', desc: 'Foco Silencioso' },
                                            { id: 'night', label: 'Madrugada', desc: 'Pico Alpha' },
                                        ].map(opt => (
                                            <div key={opt.id}>
                                                <OptionCard
                                                    isSelected={profile.peakEnergyTime === opt.id}
                                                    onClick={() => onUpdate({ ...profile, peakEnergyTime: opt.id as any })}
                                                >
                                                    <span className="text-[10px] font-black uppercase tracking-widest block mb-1">{opt.label}</span>
                                                    <span className="text-[9px] text-gray-400 font-bold">{opt.desc}</span>
                                                </OptionCard>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* ACTIVITY */}
                        {activeTab === 'activity' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <section>
                                    <SectionLabel>Foco em Máquina</SectionLabel>
                                    <div className="grid grid-cols-4 gap-2 bg-gray-50/50 p-2 rounded-[24px] border border-gray-100">
                                        {['morning', 'afternoon', 'evening', 'night'].map(period => (
                                            <button
                                                key={period}
                                                onClick={() => onUpdate({ ...profile, computerWorkPreference: period as any })}
                                                className={`py-3 rounded-[18px] text-[9px] font-black uppercase tracking-widest transition-all ${profile.computerWorkPreference === period
                                                    ? 'bg-white text-emerald-600 border border-emerald-100 shadow-md'
                                                    : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                {period === 'morning' ? 'Manhã' : period === 'afternoon' ? 'Tarde' : period === 'evening' ? 'Noite' : 'Madru'}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                {[
                                    { label: 'Atividade Física', field: 'physicalActivityDays' as const, color: 'emerald', icon: Move },
                                    { label: 'Ritual de Gastos', field: 'spendingTendencyDays' as const, color: 'amber', icon: CreditCard },
                                ].map(section => (
                                    <section key={section.field}>
                                        <div className="flex items-center gap-2 mb-4">
                                            <section.icon size={14} className={`text-${section.color}-500`} />
                                            <SectionLabel>{section.label}</SectionLabel>
                                        </div>
                                        <div className="flex justify-between gap-2 p-3 bg-gray-50/50 border border-gray-100 rounded-[28px] shadow-inner">
                                            {daysOfWeek.map(day => {
                                                const active = profile[section.field].includes(day.id);
                                                return (
                                                    <button
                                                        key={day.id}
                                                        onClick={() => toggleDay(day.id, section.field)}
                                                        className={`flex-1 aspect-square rounded-[20px] text-[9px] font-black border transition-all flex items-center justify-center ${active
                                                            ? section.color === 'emerald'
                                                                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-90'
                                                                : 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20 active:scale-90'
                                                            : 'bg-white border-gray-100 text-gray-300 hover:border-gray-300 hover:text-gray-500 hover:shadow-sm'
                                                            }`}
                                                    >
                                                        {day.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        )}

                        {/* SYNC */}
                        {activeTab === 'sync' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <section className="space-y-4">
                                    <SectionLabel>Configurações Locais</SectionLabel>
                                    <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 space-y-6 shadow-inner">
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">Seu Nome Visual</label>
                                            <div className="relative group">
                                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500" />
                                                <input
                                                    type="text"
                                                    value={profile.userName || ''}
                                                    onChange={e => onUpdate({ ...profile, userName: e.target.value })}
                                                    className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-gray-700 focus:border-blue-200 outline-none transition placeholder:text-gray-300"
                                                    placeholder="Como deseja ser chamado"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-gray-400 font-black uppercase tracking-widest px-1">Caminho do Vault</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1 group">
                                                    <Home size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500" />
                                                    <input
                                                        type="text"
                                                        value={profile.localVaultPath || ''}
                                                        onChange={e => onUpdate({ ...profile, localVaultPath: e.target.value })}
                                                        className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold font-mono text-gray-600 focus:border-blue-200 outline-none transition placeholder:text-gray-300"
                                                        placeholder="C:/Users/Workspace/Vault"
                                                    />
                                                </div>
                                                <button className="bg-white hover:bg-gray-50 px-5 rounded-2xl border border-gray-100 transition-all text-gray-400 hover:text-blue-500 shadow-sm">
                                                    <Monitor size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center justify-between p-6 bg-blue-50/30 border border-blue-100 rounded-[32px] group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm border border-blue-50">
                                                <Cloud size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 tracking-tight">Sincronização em Nuvem</h4>
                                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">Supabase Realtime Storage</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onUpdate({ ...profile, isSyncEnabled: !profile.isSyncEnabled })}
                                            className={`w-14 h-8 rounded-full transition-all relative ${profile.isSyncEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all ${profile.isSyncEnabled ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <SectionLabel>Recuperação & Backup</SectionLabel>
                                    <div className="grid grid-cols-5 gap-2">
                                        <select
                                            value={profile.backupFrequency}
                                            onChange={e => onUpdate({ ...profile, backupFrequency: e.target.value as any })}
                                            className="col-span-3 bg-gray-50/50 border border-gray-100 rounded-2xl p-4 text-xs font-black uppercase tracking-widest text-gray-500 outline-none focus:border-blue-200 transition"
                                        >
                                            <option value="hour">A cada Hora</option>
                                            <option value="daily">Diariamente</option>
                                            <option value="weekly">Semanalmente</option>
                                            <option value="manual">Manual</option>
                                        </select>
                                        <button
                                            onClick={onBackupNow}
                                            className="col-span-2 bg-gray-900 hover:bg-black text-white px-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Zap size={14} className="text-yellow-400" /> Backup Agora
                                        </button>
                                    </div>

                                    {profile.backups && profile.backups.length > 0 ? (
                                        <div className="space-y-2 mt-4">
                                            {profile.backups.map(backup => (
                                                <div key={backup.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:border-blue-100 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400">
                                                            <Monitor size={16} />
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-black text-gray-800 tracking-tight">{backup.name}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold block mt-0.5">{new Date(backup.timestamp).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => onRestoreBackup(backup)}
                                                        className="text-[9px] bg-gray-50 hover:bg-gray-900 hover:text-white border border-gray-100 px-4 py-2 rounded-xl text-gray-500 font-black uppercase tracking-widest transition-all shadow-sm"
                                                    >
                                                        Restaurar
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-gray-50/50 rounded-[32px] border-2 border-dashed border-gray-100">
                                            <p className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Nenhum snapshot encontrado</p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 md:p-8 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center group">
                    <div className="hidden md:flex items-center gap-3">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest group-hover:text-emerald-600 transition-colors">Sistema Online & Sincronizado</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full md:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                    >
                        Salvar Perfil
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
