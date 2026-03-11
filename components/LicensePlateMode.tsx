import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Play, Square, Mic, MicOff, Settings, Check, ChevronRight,
    Eye, EyeOff, RotateCcw, AlertCircle, Trophy, ChevronDown, ChevronUp,
    List, Pause, Coins, ShoppingBag, Music, Shield, Volume2, Search,
    Flame, Zap, User, Star, Languages, MessageSquare, Headphones, Car
} from 'lucide-react';

// ─────────────────────────────────────────────
// Styles & Animations
// ─────────────────────────────────────────────
const ANIMATIONS = `
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes vibration {
    0%, 100% { transform: translate(0,0) rotate(0); }
    25% { transform: translate(2px, 1px) rotate(0.5deg); }
    50% { transform: translate(-1px, -2px) rotate(-1deg); }
    75% { transform: translate(2px, -1px) rotate(1deg); }
  }
  @keyframes rainfall {
    0% { transform: translateY(-20px) rotate(15deg); opacity: 0; }
    50% { opacity: 0.6; }
    100% { transform: translateY(120px) rotate(15deg); opacity: 0; }
  }
  .animate-marquee {
    display: flex;
    width: max-content;
    animation: marquee 20s linear infinite;
  }
  .animate-vibration {
    animation: vibration 0.2s linear infinite;
  }
  .rain-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  .raindrop {
    position: absolute;
    width: 1px;
    height: 15px;
    background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.6));
    animation: rainfall 0.5s linear infinite;
  }
`;

// ─────────────────────────────────────────────
// Car Database & Economy
// ─────────────────────────────────────────────
interface CarBrand {
    id: string;
    name: string;
    soundUrl: string;
    price: number;
    color: string;
    accent: string;
}

const CAR_BRANDS: CarBrand[] = [
    { id: 'sedan', name: 'Sedan Popular', soundUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-car-engine-loop-2541.mp3', price: 0, color: 'bg-gray-400', accent: 'text-gray-400' },
    { id: 'muscle', name: 'V8 Muscle', soundUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-car-ignition-and-engine-start-1539.mp3', price: 150, color: 'bg-orange-600', accent: 'text-orange-500' },
    { id: 'porsche', name: '911 Carrera', soundUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-sports-car-engine-idle-1537.mp3', price: 250, color: 'bg-silver-400', accent: 'text-slate-300' },
    { id: 'ferrari', name: 'Ferrari F40', soundUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-luxury-car-passing-by-1536.mp3', price: 400, color: 'bg-red-600', accent: 'text-red-500' },
    { id: 'lamborghini', name: 'Lambo V12', soundUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-sports-car-engine-revving-1540.mp3', price: 600, color: 'bg-yellow-500', accent: 'text-yellow-400' },
];

interface PlateInstance {
    text: string;
    brandId: string;
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface PlateConfig {
    totalPlates: number;        // total unique items in session
    showNewPlateSecs: number;   // seconds item is shown before recall
    vocalTimeSecs: number;      // seconds user has to vocalize each recall round
    repsPerPlate: number;       // times each item must be spoken/typed per round
    maxAttempts: number;        // attempts per vocalization
    maskPlates: boolean;        // if true, items are hidden during recall
    cumulative: boolean;        // if true, all previous items are recalled
    accumulationWindow: number; // 0 for all, >0 for last N items
    autoAdvanceOnFail: boolean; // if true, move to next item after fail
    mode: 'plates' | 'phrases';
    language: 'PT' | 'EN' | 'ES' | 'FR';
    weather: 'none' | 'rain' | 'night';
    motion: boolean;
    aiVoice: boolean;
}

const EVIDENCES = [
    { id: 'speed', name: 'Excesso de Velocidade', icon: <Flame size={12} />, points: 30, tag: "Speeding" },
    { id: 'light', name: 'Lanterna Quebrada', icon: <Zap size={12} />, points: 30, tag: "Broken Light" },
    { id: 'belt', name: 'Sem Cinto', icon: <User size={12} />, points: 30, tag: "No Seatbelt" },
    { id: 'phone', name: 'Uso de Celular', icon: <MessageSquare size={12} />, points: 50, tag: "Phone Usage" },
];

const LANGUAGE_PHRASES = {
    EN: [
        "Why run so fast, sir?",
        "Please, show me your driver's license.",
        "Give me the documents of your car.",
        "Have you been drinking tonight?",
        "Step out of the vehicle, please.",
        "This is a restricted area.",
        "Your tail light is broken.",
        "Follow the white line.",
        "Keep your hands on the steering wheel.",
        "I'm issuing a warning."
    ],
    PT: [
        "Por que estava correndo tanto, senhor?",
        "Por favor, me mostre sua habilitação.",
        "Apresente os documentos do veículo.",
        "Você bebeu alguma coisa hoje?",
        "Saia do veículo, por favor.",
        "Esta é uma área restrita.",
        "Sua lanterna traseira está quebrada.",
        "Siga a linha branca.",
        "Mantenha as mãos no volante.",
        "Estou aplicando uma advertência."
    ],
    ES: [
        "¿Por qué corre tanto, señor?",
        "Por favor, muéstreme su licencia.",
        "Entrégueme los documentos del coche.",
        "¿Ha estado bebiendo esta noche?",
        "Salga del vehículo, por favor.",
        "Esta es una zona restringida.",
        "Su luz trasera está rota.",
        "Siga la línea blanca.",
        "Mantenga as manos en el volante.",
        "Le estoy dando una advertencia."
    ],
    FR: [
        "Pourquoi roulez-vous si vite, monsieur ?",
        "S'il vous plaît, montrez-moi votre permis.",
        "Donnez-moi les papiers du véhicule.",
        "Avez-vous bu ce soir ?",
        "Sortez du véhicule, s'il vous plaît.",
        "C'est une zone réglementée.",
        "Votre feu arrière est cassé.",
        "Suivez la ligne blanche.",
        "Gardez les mains sur le volant.",
        "Je vous donne un avertissement."
    ]
};

type Phase = 'config' | 'intro' | 'idle' | 'showing' | 'recall' | 'success' | 'fail' | 'complete' | 'shop';
type Theme = 'classic' | 'officer';

// ─────────────────────────────────────────────
// Plate Generators
// ─────────────────────────────────────────────
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '0123456789';
const rL = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
const rD = () => DIGITS[Math.floor(Math.random() * DIGITS.length)];

const genMercosulPlate = () => `${rL()}${rL()}${rL()}${rD()}${rL()}${rD()}${rD()}`;
const genOldPlate = () => `${rL()}${rL()}${rL()}-${rD()}${rD()}${rD()}${rD()}`;

const generatePlates = (count: number, unlockedIds: string[], config: PlateConfig): PlateInstance[] => {
    if (config.mode === 'phrases') {
        const pool = LANGUAGE_PHRASES[config.language] || LANGUAGE_PHRASES.EN;
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
        return shuffled.map(text => ({ 
            text, 
            brandId: unlockedIds[Math.floor(Math.random() * unlockedIds.length)] 
        }));
    }
    return Array.from({ length: count }, () => {
        const text = Math.random() > 0.45 ? genMercosulPlate() : genOldPlate();
        const brandId = unlockedIds[Math.floor(Math.random() * unlockedIds.length)];
        return { text, brandId };
    });
};

// ─────────────────────────────────────────────
// Matching helpers
// ─────────────────────────────────────────────
const normPlate = (s: string) => s.replace(/[\s\-]/g, '').toUpperCase();
const plateMatch = (input: string, target: string): boolean => {
    const s = normPlate(input);
    const p = normPlate(target);
    if (!s || !p) return false;
    // Exact match or contains target
    if (s === p || s.includes(p)) return true;
    // For voice: if it's high length and has most characters
    if (s.length >= p.length) {
        let matches = 0;
        for (let char of p) {
            if (s.includes(char)) matches++;
        }
        return matches >= p.length - 1; // Allow 1 mistake for voice
    }
    return false;
};

// ─────────────────────────────────────────────
// Build recall queue: plates[0..level], each repeated reps times
// ─────────────────────────────────────────────
const buildQueue = (plates: PlateInstance[], level: number, reps: number, config: PlateConfig): PlateInstance[] => {
    const result: PlateInstance[] = [];
    let startIdx = 0;
    if (!config.cumulative) {
        startIdx = level;
    } else if (config.accumulationWindow > 0) {
        startIdx = Math.max(0, level - config.accumulationWindow + 1);
    }

    for (let i = startIdx; i <= level; i++) {
        for (let r = 0; r < reps; r++) {
            result.push(plates[i]);
        }
    }
    return result;
};

// ─────────────────────────────────────────────
// Brazilian Plate Visual Component
// ─────────────────────────────────────────────
interface PlateProps {
    plate: string;
    brandId?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    hidden?: boolean;
    checked?: boolean;
    active?: boolean;
    weather?: 'none' | 'rain' | 'night';
    motion?: boolean;
}

const PlateDisplay: React.FC<PlateProps> = ({ plate, size = 'lg', hidden = false, checked = false, active = false, brandId, weather = 'none', motion = false }) => {
    const isMercosul = !/^\w{3}-\d{4}$/.test(plate);
    const brand = CAR_BRANDS.find(b => b.id === brandId);

    const sizes = {
        sm:  { box: 'w-24 h-14', font: 'text-[10px]', top: 'text-[6px]', bot: 'text-[5px]' },
        md:  { box: 'w-36 h-20', font: 'text-xs', top: 'text-[7px]', bot: 'text-[6px]' },
        lg:  { box: 'w-64 h-32', font: 'text-sm px-4', top: 'text-[9px]', bot: 'text-[8px]' },
        xl:  { box: 'w-80 min-h-40 py-8 px-6', font: 'text-2xl px-2', top: 'text-xs', bot: 'text-[9px]' },
    };
    const s = sizes[size];

    return (
        <div className={`relative ${s.box} rounded-xl overflow-hidden border-4 ${active ? 'border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.5)]' : 'border-white/80'} transition-all duration-300 select-none shadow-2xl ${motion && active ? 'animate-vibration' : ''}`}
            style={{ background: 'linear-gradient(135deg, #fff 0%, #f0f0e8 100%)' }}>

            {/* Weather: Night Overlay */}
            {weather === 'night' && (
                <div className="absolute inset-0 bg-blue-950/40 z-30 pointer-events-none mix-blend-multiply" />
            )}

            {/* Weather: Rain Overlay */}
            {weather === 'rain' && (
                <div className="rain-overlay z-40">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="raindrop" style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*2}s`, top: `${Math.random()*100}%` }} />
                    ))}
                </div>
            )}
            
            {/* Brand indicator */}
            {brand && !hidden && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${brand.color} z-20`} />
            )}

            {/* Top bar - green (Mercosul) or blue (old) */}
            <div className={`absolute top-0 left-0 right-0 h-[22%] flex items-center justify-center gap-1 ${isMercosul ? 'bg-green-600' : 'bg-blue-700'} transition-opacity ${hidden ? 'opacity-0' : 'opacity-100'}`}>
                <span className={`${s.top} font-black text-white tracking-[0.25em] uppercase`}>
                    {isMercosul ? '🇧🇷 BRASIL' : '🇧🇷 BRASIL'}
                </span>
            </div>
            {/* Bottom bar */}
            <div className={`absolute bottom-0 left-0 right-0 h-[18%] flex items-center justify-center ${isMercosul ? 'bg-green-600' : 'bg-blue-700'} transition-opacity ${hidden ? 'opacity-0' : 'opacity-100'}`}>
                <span className={`${s.bot} font-black text-white tracking-widest flex items-center gap-1`}>
                    {isMercosul ? 'MERCOSUL' : 'BRASIL'}
                </span>
            </div>
            {/* Plate content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
                {hidden ? (
                    <span className={`${s.font} font-black text-gray-300 tracking-widest`}>???</span>
                ) : (
                    <>
                        {brand && size !== 'sm' && (
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{brand.name}</span>
                        )}
                        <span className={`${s.font} font-black text-gray-900 tracking-tight leading-tight text-center uppercase`}>{plate}</span>
                    </>
                )}
            </div>
            {/* Check overlay */}
            {checked && (
                <div className="absolute inset-0 bg-emerald-500/40 backdrop-blur-[1px] flex items-center justify-center animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                        <Check size={40} className="text-white" strokeWidth={4} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// Shop Component
// ─────────────────────────────────────────────
const Shop: React.FC<{
    coins: number;
    unlockedCars: string[];
    theme: Theme;
    onToggleTheme: () => void;
    onBuy: (carId: string, price: number) => void;
    onClose: () => void;
}> = ({ coins, unlockedCars, theme, onToggleTheme, onBuy, onClose }) => {
    return (
        <div className={`flex flex-col gap-6 p-6 max-w-2xl w-full rounded-3xl border shadow-2xl animate-in zoom-in-95 fade-in duration-300 ${
            theme === 'officer' ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-100'
        }`}>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>
                        <ShoppingBag className="text-indigo-400" size={20} /> Garagem
                    </h2>
                    <p className={`text-[10px] md:text-sm ${theme === 'officer' ? 'text-gray-400' : 'text-gray-500'}`}>Desbloqueie novos sons de motor.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={onToggleTheme}
                        className={`p-2 rounded-xl border transition-all flex items-center gap-2 ${
                            theme === 'officer' ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 border-gray-200 text-gray-600 hover:text-indigo-600'
                        }`}
                    >
                        {theme === 'officer' ? <EyeOff size={18} /> : <Eye size={18} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{theme === 'officer' ? 'Tema: Officer' : 'Tema: Clássico'}</span>
                    </button>
                    <div className="bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-2xl flex items-center gap-2">
                        <Coins className="text-yellow-400" size={20} />
                        <span className="text-xl font-black text-yellow-400 tabular-nums">{coins}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CAR_BRANDS.map(car => {
                    const isUnlocked = unlockedCars.includes(car.id);
                    const canAfford = coins >= car.price;
                    return (
                        <div key={car.id} className={`p-4 rounded-2xl border transition-all ${
                            isUnlocked 
                                ? theme === 'officer' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'
                                : theme === 'officer' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'
                        }`}>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className={`font-black uppercase text-sm tracking-widest ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>{car.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-3 h-3 rounded-full ${car.color}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${theme === 'officer' ? 'text-gray-500' : 'text-gray-400'}`}>Motor Ativo</span>
                                    </div>
                                </div>
                                {isUnlocked ? (
                                    <div className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">Desbloqueado</div>
                                ) : (
                                    <div className="flex items-center gap-1 text-yellow-500 font-black text-sm">
                                        <Coins size={14} /> {car.price}
                                    </div>
                                )}
                            </div>
                            
                            {!isUnlocked && (
                                <button
                                    onClick={() => canAfford && onBuy(car.id, car.price)}
                                    disabled={!canAfford}
                                    className={`w-full py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                        canAfford ? 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 shadow-lg shadow-yellow-400/20' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {canAfford ? 'Comprar Agora' : 'Moedas Insuficientes'}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <button onClick={onClose} className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                theme === 'officer' ? 'bg-white/5 hover:bg-white/10 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
            }`}>Voltar ao Painel</button>
        </div>
    );
};

// ─────────────────────────────────────────────
// Config Panel
// ─────────────────────────────────────────────
interface ConfigPanelProps {
    config: PlateConfig;
    theme: Theme;
    feedbacks: string[];
    onChange: (c: PlateConfig) => void;
    onStart: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, theme, feedbacks, onChange, onStart }) => {
    const [tab, setTab] = useState<'mission' | 'language'>('mission');
    const set = (key: keyof PlateConfig, val: any) =>
        onChange({ ...config, [key]: val });

    const Row = ({ label, sub, k, min, max, step = 1, suffix = '' }: {
        label: string; sub?: string; k: keyof PlateConfig; min: number; max: number; step?: number; suffix?: string;
    }) => (
        <div className={`flex items-center justify-between gap-4 py-3 border-b last:border-0 ${theme === 'officer' ? 'border-white/5' : 'border-gray-50'}`}>
            <div className="flex flex-col">
                <span className={`text-sm font-black ${theme === 'officer' ? 'text-gray-200' : 'text-gray-800'}`}>{label}</span>
                {sub && <span className="text-[10px] text-gray-400 font-medium">{sub}</span>}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => set(k, Math.max(min, (config[k] as number) - step))} className={`w-7 h-7 rounded-xl flex items-center justify-center font-black transition-all active:scale-90 ${theme === 'officer' ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>−</button>
                <span className={`text-base font-black w-10 text-center tabular-nums ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>{config[k] as number}{suffix}</span>
                <button onClick={() => set(k, Math.min(max, (config[k] as number) + step))} className={`w-7 h-7 rounded-xl flex items-center justify-center font-black transition-all active:scale-90 ${theme === 'officer' ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>+</button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6 max-w-md w-full relative overflow-y-auto max-h-[85vh] custom-scrollbar">
            {/* Feedback Marquee */}
            {feedbacks.length > 0 && (
                <div className={`-mx-6 -mt-6 mb-2 py-2 overflow-hidden whitespace-nowrap border-b relative ${
                    theme === 'officer' ? 'bg-indigo-500/5 border-white/5' : 'bg-indigo-50/50 border-gray-100'
                }`}>
                    <div className="flex animate-marquee gap-8">
                        {[...feedbacks, ...feedbacks].map((f, i) => (
                            <span key={i} className={`text-[9px] font-bold uppercase tracking-wider ${theme === 'officer' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                " {f} "
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-2 p-1 bg-black/10 rounded-2xl">
                <button onClick={() => setTab('mission')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'mission' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>Treino de Placas</button>
                <button onClick={() => setTab('language')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'language' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>Treino de Idioma</button>
            </div>

            {tab === 'mission' ? (
                <>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em] mb-1">Configurar Missão</p>
                        <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Oficial de Trânsito</h2>
                        <p className={`text-xs md:text-sm mt-1 leading-relaxed ${theme === 'officer' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Anoter as placas dos infratores. Ganhe moedas para equipar sua viatura com novos motores.
                        </p>
                    </div>

                    <div className={`rounded-3xl border shadow-sm px-5 py-2 ${theme === 'officer' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                        <Row label="Infratores" sub="Total de placas na missão" k="totalPlates" min={2} max={20} />
                        <Row label="Tempo de Avistamento" sub="Tempo para memorizar o veículo" k="showNewPlateSecs" min={2} max={30} suffix="s" />
                        <Row label="Tempo de Registro" sub="Tempo para registrar no sistema" k="vocalTimeSecs" min={10} max={120} step={5} suffix="s" />
                        <Row label="Repetições" sub="Confirmações necessárias no teclado" k="repsPerPlate" min={1} max={5} />
                        <Row label="Tentativas" sub="Chances de erro na voz/digitação" k="maxAttempts" min={1} max={10} />
                        
                        <div className={`mt-2 pt-2 border-t ${theme === 'officer' ? 'border-white/5' : 'border-gray-50'}`}>
                            <div className="flex items-center justify-between py-2">
                                <span className={`text-sm font-black ${theme === 'officer' ? 'text-gray-200' : 'text-gray-800'}`}>Modo Cumulativo</span>
                                <button onClick={() => set('cumulative', !config.cumulative)} className={`w-12 h-6 rounded-full relative transition-all ${config.cumulative ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.cumulative ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div>
                        <p className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em] mb-1">Academia de Polícia</p>
                        <h2 className={`text-xl md:text-2xl font-black uppercase tracking-tight flex items-center gap-2 ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Treinamento Multilíngue</h2>
                        <p className={`text-xs md:text-sm mt-1 leading-relaxed ${theme === 'officer' ? 'text-gray-400' : 'text-gray-500'}`}>
                            Aprenda frases essenciais para abordagens internacionais. Memorize e pronuncie como um nativo.
                        </p>
                    </div>

                    <div className={`rounded-3xl border shadow-sm px-4 md:px-5 py-2 ${theme === 'officer' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'officer' ? 'text-gray-500' : 'text-gray-400'}`}>Selecione o Idioma Alvo</p>
                        <div className="grid grid-cols-2 gap-2">
                            {['EN', 'PT', 'ES', 'FR'].map(lang => (
                                <button key={lang} onClick={() => { set('language', lang); set('mode', 'phrases'); }} 
                                    className={`py-3 rounded-2xl font-black transition-all ${config.language === lang && config.mode === 'phrases' ? 'bg-indigo-600 text-white shadow-lg' : theme === 'officer' ? 'bg-white/5 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                                    {lang === 'EN' && '🇺🇸 English'}
                                    {lang === 'PT' && '🇧🇷 Português'}
                                    {lang === 'ES' && '🇪🇸 Español'}
                                    {lang === 'FR' && '🇫🇷 Français'}
                                </button>
                            ))}
                        </div>
                        <div className={`mt-2 pt-2 border-t flex flex-col gap-2 ${theme === 'officer' ? 'border-white/5' : 'border-gray-50'}`}>
                            <Row label="Atos de Abordagem" sub="Quantidade de frases no treino" k="totalPlates" min={2} max={10} />
                            <Row label="Foco na Pronúncia" sub="Tempo para ler a frase" k="showNewPlateSecs" min={3} max={15} suffix="s" />
                            
                            <div className="flex items-center justify-between py-2">
                                <div>
                                    <p className={`text-sm font-black ${theme === 'officer' ? 'text-gray-200' : 'text-gray-800'}`}>Pronúncia da IA</p>
                                    <p className="text-[10px] text-gray-500 uppercase">Ouça antes de memorizar</p>
                                </div>
                                <button onClick={() => set('aiVoice', !config.aiVoice)} className={`w-12 h-6 rounded-full relative transition-all ${config.aiVoice ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.aiVoice ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className={`mt-2 pt-2 border-t flex flex-col gap-3 ${theme === 'officer' ? 'border-white/5' : 'border-gray-50'}`}>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'officer' ? 'text-gray-500' : 'text-gray-400'}`}>Dificuldade Oficial</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => set('weather', config.weather === 'rain' ? 'none' : 'rain')} className={`py-2 px-3 rounded-xl border flex items-center gap-2 transition-all ${config.weather === 'rain' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                    <Headphones size={14} /> <span className="text-[10px] font-black uppercase">Chuva</span>
                                </button>
                                <button onClick={() => set('weather', config.weather === 'night' ? 'none' : 'night')} className={`py-2 px-3 rounded-xl border flex items-center gap-2 transition-all ${config.weather === 'night' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                    <EyeOff size={14} /> <span className="text-[10px] font-black uppercase">Noite</span>
                                </button>
                                <button onClick={() => set('motion', !config.motion)} className={`col-span-2 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${config.motion ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                    <Zap size={14} /> <span className="text-[10px] font-black uppercase">Viatura em Alta Velocidade</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <button onClick={onStart} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-indigo-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                {tab === 'language' ? <Languages size={18} strokeWidth={3} /> : <Shield size={18} strokeWidth={3} />} 
                {tab === 'language' ? 'Iniciar Treino de Abordagem' : 'Iniciar Patrulha'}
            </button>
        </div>
    );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
interface LicensePlateModeProps {
    onClose: () => void;
}

const LicensePlateMode: React.FC<LicensePlateModeProps> = ({ onClose }) => {
    // ── CONFIG & PERSISTANCE ──
    const [config, setConfig] = useState<PlateConfig>({
        totalPlates: 6,
        showNewPlateSecs: 5,
        vocalTimeSecs: 30,
        repsPerPlate: 3,
        maxAttempts: 3,
        maskPlates: false,
        autoAdvanceOnFail: false,
        mode: 'plates',
        language: 'EN',
        weather: 'none',
        motion: false,
        aiVoice: true,
    });

    const [coins, setCoins] = useState(() => Number(localStorage.getItem('mark_one_coins') || '0'));
    const [unlockedCars, setUnlockedCars] = useState<string[]>(() => {
        const saved = localStorage.getItem('mark_one_unlocked_cars');
        return saved ? JSON.parse(saved) : ['sedan'];
    });
    const [theme, setTheme] = useState<Theme>(() => localStorage.getItem('mark_one_theme') as Theme || 'officer');

    const [feedbacks, setFeedbacks] = useState<string[]>(() => {
        const saved = localStorage.getItem('mark_one_feedbacks');
        // Initial sample feedbacks for the marquee
        return saved ? JSON.parse(saved) : ["Senti minha atenção muito mais aguçada!", "Consigo memorizar 7 dígitos agora com facilidade.", "O som dos motores ajuda a focar na missão."];
    });

    useEffect(() => {
        localStorage.setItem('mark_one_coins', coins.toString());
        localStorage.setItem('mark_one_unlocked_cars', JSON.stringify(unlockedCars));
        localStorage.setItem('mark_one_theme', theme);
        localStorage.setItem('mark_one_feedbacks', JSON.stringify(feedbacks));
    }, [coins, unlockedCars, theme, feedbacks]);

    // ── STATE ──
    const [phase, setPhase] = useState<Phase>('config');
    const [plates, setPlates] = useState<PlateInstance[]>([]);
    const [level, setLevel] = useState(0);
    const [queue, setQueue] = useState<PlateInstance[]>([]);
    const [qIdx, setQIdx] = useState(0);
    const [timer, setTimer] = useState(0);
    const [micActive, setMicActive] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [paused, setPaused] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [score, setScore] = useState({ correct: 0, wrong: 0 });
    const [userFeedback, setUserFeedback] = useState('');
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [sirenActive, setSirenActive] = useState(false);
    const [lastHeard, setLastHeard] = useState('');
    const [activeEvidence, setActiveEvidence] = useState<{id: string, x: number, y: number} | null>(null);

    // ── REFS ──
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const recognitionRef = useRef<any>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const sirenAudioRef = useRef<HTMLAudioElement | null>(null);

    // ── AUDIO ──
    const stopEngineSound = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    }, []);

    const playEngineSound = useCallback((brandId: string) => {
        const brand = CAR_BRANDS.find(b => b.id === brandId);
        if (!brand) return;
        stopEngineSound();
        const audio = new Audio(brand.soundUrl);
        audio.loop = true;
        audio.volume = 0.25;
        audio.play().catch(() => {});
        audioRef.current = audio;
    }, [stopEngineSound]);

    const toggleSiren = useCallback(() => {
        if (sirenActive) {
            if (sirenAudioRef.current) {
                sirenAudioRef.current.pause();
                sirenAudioRef.current = null;
            }
            setSirenActive(false);
        } else {
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-police-siren-loop-1602.mp3');
            audio.loop = true;
            audio.volume = 0.3;
            audio.play().catch(() => {});
            sirenAudioRef.current = audio;
            setSirenActive(true);
        }
    }, [sirenActive]);

    // Cleanup siren on unmount or phase change away from gameplay
    useEffect(() => {
        if (phase === 'config' || phase === 'complete' || phase === 'shop') {
            if (sirenAudioRef.current) {
                sirenAudioRef.current.pause();
                sirenAudioRef.current = null;
                setSirenActive(false);
            }
        }
    }, [phase]);

    useEffect(() => {
        if (phase === 'showing' && plates[level]) {
            playEngineSound(plates[level].brandId);
        } else if (phase === 'recall' && queue[qIdx]) {
            playEngineSound(queue[qIdx].brandId);
        } else {
            stopEngineSound();
        }
    }, [phase, level, qIdx, plates, queue, playEngineSound, stopEngineSound]);

    // ── HELPERS ──
    const clearTimerInterval = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    function speakPhrase(text: string, lang: string) {
        if (!config.aiVoice) return;
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        const map: any = { 'EN': 'en-US', 'PT': 'pt-BR', 'ES': 'es-ES', 'FR': 'fr-FR' };
        utterance.lang = map[lang] || 'en-US';
        utterance.rate = 0.9;
        synth.speak(utterance);
    }

    function stopMic() {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setMicActive(false);
        setTranscript('');
    }

    function flashFeedback(type: 'correct' | 'wrong') {
        setFeedback(type);
        setTimeout(() => setFeedback(null), 800);
    }

    function startCountdown(seconds: number, onEnd: () => void) {
        clearTimerInterval();
        setTimer(seconds);
        let current = seconds;
        timerRef.current = setInterval(() => {
            current -= 1;
            setTimer(current);
            if (current <= 0) {
                clearTimerInterval();
                onEnd();
            }
        }, 1000);
    }

    function handleTimeFail() {
        stopMic();
        setPhase('fail');
        setScore(s => ({ ...s, wrong: s.wrong + 1 }));
    }

    function beginRecall(plts: PlateInstance[], lvl: number) {
        const q = buildQueue(plts, lvl, config.repsPerPlate, config);
        setQueue(q);
        setQIdx(0);
        setAttempts(0);
        setPhase('recall');

        // Progressive time adjustment for recall
        let recallTime = config.vocalTimeSecs;
        if (config.cumulative) {
            const uniqueItems = Math.min(lvl + 1, config.accumulationWindow > 0 ? config.accumulationWindow : lvl + 1);
            if (uniqueItems > 1) {
                // Adds 50% of base time for each extra unique item beyond the first
                recallTime = Math.floor(config.vocalTimeSecs * (1 + (uniqueItems - 1) * 0.5));
            }
        }

        startCountdown(recallTime, () => handleTimeFail());
        setTimeout(() => startMic(), 200);
    }

    function beginLevel(plts: PlateInstance[], lvl: number) {
        setPhase('showing');
        setPaused(false);
        setQIdx(0);
        setAttempts(0);
        setActiveEvidence(null);
        if (config.mode === 'phrases') {
            speakPhrase(plts[lvl].text, config.language);
        }

        // Progressive time adjustment for memorization
        let showTime = config.showNewPlateSecs;
        if (config.cumulative && lvl > 0) {
            // Adds 2 seconds per level to account for increasing mental load
            showTime += lvl * 2;
        }

        startCountdown(showTime, () => beginRecall(plts, lvl));
    }

    function handleStart() {
        const gen = generatePlates(config.totalPlates, unlockedCars, config);
        setPlates(gen);
        setLevel(0);
        setScore({ correct: 0, wrong: 0 });
        beginLevel(gen, 0);
    }

    function advanceQueue(currentQ: PlateInstance[], nextIdx: number, lvl: number, plts: PlateInstance[]) {
        if (nextIdx >= currentQ.length) {
            clearTimerInterval();
            stopMic();
            setScore(s => ({ ...s, correct: s.correct + 1 }));
            setPhase('success');
            setTimeout(() => {
                const nextLvl = lvl + 1;
                if (nextLvl >= plts.length) setPhase('complete');
                else { setLevel(nextLvl); beginLevel(plts, nextLvl); }
            }, 1500);
        } else {
            setQIdx(nextIdx);
            // Spawn random evidence during recall transitions
            if (Math.random() > 0.6) {
                const ev = EVIDENCES[Math.floor(Math.random() * EVIDENCES.length)];
                setActiveEvidence({ id: ev.id, x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 });
                setTimeout(() => setActiveEvidence(null), 3000);
            }
        }
    }

    function handleSpokenInput(text: string, isFinal: boolean = true) {
        if (phase !== 'recall' || !queue[qIdx]) return;
        const normalized = normPlate(text);
        if (normalized.length === 0) return;

        if (plateMatch(text, queue[qIdx].text)) {
            flashFeedback('correct');
            setAttempts(0);
            setCoins(c => c + 15);
            setTranscript(''); 
            setLastHeard('');
            // Small delay to show the green checkmark
            setTimeout(() => {
                advanceQueue(queue, qIdx + 1, level, plates);
            }, 500);
        } else if (isFinal) {
            // Only count as a "wrong" attempt if it was a final result
            setAttempts(prev => {
                const n = prev + 1;
                flashFeedback('wrong');
                setLastHeard(text);
                if (n >= config.maxAttempts) {
                    stopMic();
                    // Optionally handle auto-fail logic if enabled
                }
                return n;
            });
        }
    }

    function startMic() {
        const SpeechRecognitionApi = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionApi) return;
        
        // If already active, don't start another one
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch(e) {}
        }

        const rec = new SpeechRecognitionApi();
        rec.lang = 'pt-BR';
        rec.continuous = true;
        rec.interimResults = true;
        
        let lastMatch = '';

        rec.onresult = (e: any) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; ++i) {
                const transcriptText = e.results[i][0].transcript;
                if (e.results[i].isFinal) {
                    handleSpokenInput(transcriptText, true);
                    interim = '';
                } else {
                    interim += transcriptText;
                }
            }
            if (interim) {
                setTranscript(interim);
                if (plateMatch(interim, queue[qIdx]?.text || '') && interim !== lastMatch) {
                    lastMatch = interim;
                    handleSpokenInput(interim, false); // Match on interim: count as success
                }
            }
        };

        rec.onend = () => {
            // Restart if we are still in recall phase and mic should be active
            if (phase === 'recall' && micActive && !paused) {
                try { rec.start(); } catch(e) {}
            } else {
                setMicActive(false);
            }
        };

        rec.onerror = (e: any) => {
            console.error("Mic Error:", e.error);
            if (e.error === 'no-speech') {
                // Ignore no-speech errors, they are common
            } else {
                setMicActive(false);
            }
        };

        try {
            rec.start();
            recognitionRef.current = rec;
            setMicActive(true);
        } catch(e) {
            console.error("Failed to start mic:", e);
        }
    }

    const handleTextSubmit = () => {
        if (!textInput.trim() || phase !== 'recall') return;
        handleSpokenInput(textInput.trim());
    };

    const onInputChange = (val: string) => {
        const up = val.toUpperCase();
        setTextInput(up);
        // Auto advance if match
        if (plateMatch(up, queue[qIdx]?.text || '')) {
            handleSpokenInput(up);
        }
    };

    const handlePauseToggle = () => {
        if (paused) { setPaused(false); startMic(); }
        else { setPaused(true); stopMic(); clearTimerInterval(); }
    };

    function handleRestart() {
        clearTimerInterval();
        stopMic();
        setPhase('config');
        setPlates([]);
        setLevel(0);
        setQueue([]);
        setFeedbackSubmitted(false);
        setUserFeedback('');
    }

    function submitFeedback() {
        if (!userFeedback.trim()) return;
        const newFeedbacks = [userFeedback, ...feedbacks].slice(0, 10); // Keep last 10
        setFeedbacks(newFeedbacks);
        setFeedbackSubmitted(true);
        setUserFeedback('');
    }

    const buyCar = (carId: string, price: number) => {
        setCoins(c => c - price);
        setUnlockedCars(prev => [...prev, carId]);
    };

    // ── RENDER HELPERS ──
    const progressPct = queue.length > 0 ? (qIdx / queue.length) * 100 : 0;
    const currentTarget = queue[qIdx]?.text || '';
    const timerPct = phase === 'showing' ? (timer / config.showNewPlateSecs) * 100 : (timer / config.vocalTimeSecs) * 100;

    return (
        <div className={`fixed inset-0 z-[9999] flex overflow-hidden font-sans transition-colors duration-500 ${theme === 'officer' ? 'bg-gray-950' : 'bg-gray-50'}`}>
            
            {/* Sidebar Plate History - Hidden on small screens unless explicitly toggled */}
            <div className={`transition-all duration-300 transform ${isSidebarOpen ? 'w-48 px-3' : 'w-0 md:w-12 px-0 md:px-1'} border-r flex flex-col py-6 overflow-y-auto custom-scrollbar shrink-0 shadow-2xl z-50 ${
                theme === 'officer' ? 'bg-gray-900 border-white/5' : 'bg-white border-gray-100'
            }`}>
                <div 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`flex justify-center mb-6 cursor-pointer hover:scale-110 transition-transform ${theme === 'officer' ? 'text-indigo-400' : 'text-indigo-600'}`}
                >
                    <Shield size={24} />
                </div>
                {isSidebarOpen && (
                    <div className="space-y-4">
                        <p className={`text-[10px] font-black uppercase tracking-widest text-center mb-4 ${theme === 'officer' ? 'text-gray-500' : 'text-gray-400'}`}>Histórico de Placas</p>
                        {plates.map((plate, i) => (
                            <div key={i} className={`transition-all duration-500 ${i > level ? 'opacity-20 grayscale' : 'opacity-100'}`}>
                                <div className="flex justify-between px-1 mb-1">
                                    <span className={`text-[8px] font-black uppercase ${theme === 'officer' ? 'text-gray-500' : 'text-gray-400'}`}>Viatura {i+1}</span>
                                    {i < level && <Check size={10} className="text-emerald-500" />}
                                </div>
                                <PlateDisplay plate={plate.text} brandId={plate.brandId} size="sm" active={i === level} checked={i < level} />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative">
                
                {/* Header / Dashboard */}
                <div className={`h-16 border-b backdrop-blur-md px-6 flex items-center justify-between ${
                    theme === 'officer' ? 'bg-gray-900/50 border-white/5' : 'bg-white/80 border-gray-100'
                }`}>
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl ${
                            theme === 'officer' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'
                        }`}>
                            <User size={14} className={theme === 'officer' ? 'text-indigo-400' : 'text-indigo-600'} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Oficial Millerium</span>
                        </div>
                        <div className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1.5 rounded-xl">
                            <Coins size={14} className="text-yellow-400" />
                            <span className={`text-xs font-black text-yellow-400 tabular-nums`}>{coins}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {(phase === 'showing' || phase === 'recall') && (
                            <button 
                                onClick={toggleSiren} 
                                className={`w-9 h-9 border rounded-xl flex items-center justify-center transition-all ${
                                    sirenActive 
                                        ? 'bg-red-500 border-red-400 text-white animate-pulse' 
                                        : theme === 'officer' ? 'bg-white/5 border-white/10 text-gray-400 hover:text-red-400' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-red-600'
                                }`}
                                title="Alternar Sirene"
                            >
                                <Volume2 size={18} className={sirenActive ? 'animate-bounce' : ''} />
                            </button>
                        )}
                        <button onClick={() => setPhase('shop')} className={`w-9 h-9 border rounded-xl flex items-center justify-center transition-all ${
                            theme === 'officer' ? 'bg-white/5 border-white/10 text-gray-400 hover:text-indigo-400' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-indigo-600'
                        }`}>
                            <ShoppingBag size={18} />
                        </button>
                        <button onClick={onClose} className={`w-9 h-9 border rounded-xl flex items-center justify-center transition-all ${
                            theme === 'officer' ? 'bg-white/5 border-white/10 text-gray-400 hover:text-red-400' : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-red-600'
                        }`}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative overflow-y-auto custom-scrollbar">
                    
                    {/* Phase Renderers */}
                    {phase === 'config' && (
                        <div className={`w-[95%] md:w-auto rounded-[32px] md:rounded-[40px] shadow-2xl animate-in fade-in zoom-in-95 duration-500 overflow-hidden border ${
                            theme === 'officer' ? 'bg-gray-900 border-white/5' : 'bg-white border-gray-100'
                        }`}>
                            <ConfigPanel config={config} theme={theme} feedbacks={feedbacks} onChange={setConfig} onStart={handleStart} />
                        </div>
                    )}

                    {phase === 'shop' && (
                        <Shop 
                            coins={coins} 
                            unlockedCars={unlockedCars} 
                            theme={theme}
                            onToggleTheme={() => setTheme(t => t === 'officer' ? 'classic' : 'officer')}
                            onBuy={buyCar} 
                            onClose={() => setPhase('config')} 
                        />
                    )}

                    {phase === 'showing' && (
                        <div className="flex flex-col items-center gap-8 animate-in zoom-in-95 duration-500">
                            <div className="text-center">
                                <span className={`px-4 py-1 border rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block ${
                                    theme === 'officer' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                                }`}>Radar Identificou Infrator</span>
                                <h1 className={`text-4xl font-black uppercase tracking-tighter mb-2 ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Memorize a Placa</h1>
                                <p className={`text-sm ${theme === 'officer' ? 'text-gray-500' : 'text-gray-400'}`}>O veículo está fugindo! Você tem {config.showNewPlateSecs}s.</p>
                            </div>
                             <PlateDisplay 
                                plate={plates[level]?.text} 
                                brandId={plates[level]?.brandId} 
                                size="xl" 
                                active 
                                weather={config.weather}
                                motion={config.motion}
                            />
                            <div className={`w-64 h-2 rounded-full overflow-hidden ${theme === 'officer' ? 'bg-white/10' : 'bg-gray-200'}`}>
                                <div className="h-full bg-yellow-400 transition-all duration-1000" style={{ width: `${timerPct}%` }} />
                            </div>
                        </div>
                    )}

                    {phase === 'recall' && (
                        <div className="w-full max-w-2xl flex flex-col items-center gap-4 md:gap-8 animate-in fade-in duration-300">
                            <div className="w-full space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'officer' ? 'text-indigo-400' : 'text-indigo-600'}`}>Protocolo de Registro</p>
                                        <p className={`text-xl font-black uppercase tracking-tight ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Registro {qIdx+1}/{queue.length}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${theme === 'officer' ? 'text-gray-500' : 'text-gray-400'}`}>Tempo de Resposta</p>
                                        <p className={`text-xl font-black tabular-nums ${timer <= 5 ? 'text-red-500 animate-pulse' : theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>{timer}s</p>
                                    </div>
                                </div>
                                <div className={`h-1.5 w-full rounded-full overflow-hidden ${theme === 'officer' ? 'bg-white/5' : 'bg-gray-200'}`}>
                                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
                                </div>
                            </div>

                            <PlateDisplay 
                                plate={currentTarget} 
                                brandId={queue[qIdx]?.brandId} 
                                size="xl" 
                                active={!paused} 
                                hidden={config.maskPlates} 
                                checked={feedback === 'correct'}
                                weather={config.weather}
                                motion={config.motion}
                            />

                            {/* Evidence Popover */}
                            {activeEvidence && (
                                <button 
                                    onClick={() => {
                                        const ev = EVIDENCES.find(e => e.id === activeEvidence.id);
                                        if (ev) setCoins(c => c + ev.points);
                                        setActiveEvidence(null);
                                        flashFeedback('correct');
                                    }}
                                    className="absolute animate-bounce bg-yellow-400 text-gray-900 p-3 rounded-full shadow-2xl z-50 flex items-center gap-2 border-2 border-white scale-110"
                                    style={{ left: `${activeEvidence.x}%`, top: `${activeEvidence.y}%` }}
                                >
                                    {EVIDENCES.find(e => e.id === activeEvidence.id)?.icon}
                                    <span className="text-[10px] font-black uppercase whitespace-nowrap">Coletar Evidência!</span>
                                </button>
                            )}

                            <div className="w-full flex flex-col items-center gap-4">
                                <div className="flex gap-2 w-full">
                                    <div className="relative flex-1">
                                        <input
                                            ref={textInputRef}
                                            value={textInput}
                                            onChange={e => onInputChange(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                                            autoFocus
                                            className={`w-full border-2 rounded-2xl px-6 py-4 font-black tracking-[0.2em] uppercase outline-none transition-all ${
                                                theme === 'officer' 
                                                    ? 'bg-gray-900 border-white/10 text-white focus:border-indigo-500 placeholder-gray-700' 
                                                    : 'bg-white border-gray-200 text-gray-900 focus:border-indigo-600 placeholder-gray-300 shadow-sm'
                                            }`}
                                            placeholder="REGISTRE AQUI..."
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                            {textInput.length > 0 && (
                                                <button 
                                                    onClick={handleTextSubmit}
                                                    className={`p-2 rounded-xl transition-all ${theme === 'officer' ? 'bg-indigo-600 text-white' : 'bg-indigo-500 text-white animate-pulse'}`}
                                                >
                                                    <ChevronRight size={18} strokeWidth={3} />
                                                </button>
                                            )}
                                            {micActive && <div className="flex gap-1 items-center px-1">
                                                {[1,2,3,4,5].map(i => (
                                                    <div 
                                                        key={i} 
                                                        className={`w-1 rounded-full animate-pulse ${theme === 'officer' ? 'bg-indigo-400' : 'bg-indigo-500'}`} 
                                                        style={{ 
                                                            height: `${Math.random()*20+10}px`, 
                                                            animationDuration: `${Math.random()*0.5+0.5}s` 
                                                        }} 
                                                    />
                                                ))}
                                            </div>}
                                            <button onClick={() => micActive ? stopMic() : startMic()} className={`p-2 rounded-xl transition-all ${micActive ? 'bg-red-500 text-white ring-4 ring-red-500/20 shadow-lg' : theme === 'officer' ? 'bg-white/5 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                                {micActive ? <Mic size={18} className="animate-pulse" /> : <MicOff size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {transcript && <p className={`${theme === 'officer' ? 'text-indigo-400' : 'text-indigo-600'} animate-pulse text-xs font-black italic`}>Sintonizando: "{transcript}"</p>}
                                {lastHeard && !transcript && (
                                    <div className={`mt-2 py-1 px-3 rounded-lg flex items-center gap-2 ${theme === 'officer' ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
                                        <AlertCircle size={12} />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">Ouvido: "{lastHeard}" (Incorreto)</p>
                                    </div>
                                )}
                            </div>

                            <div className="h-8">
                                {feedback && (
                                    <div className={`flex items-center gap-2 animate-in slide-in-from-bottom-2 ${feedback === 'correct' ? 'text-emerald-400' : 'text-red-500'}`}>
                                        {feedback === 'correct' ? <Check size={20} strokeWidth={4} /> : <X size={20} strokeWidth={4} />}
                                        <span className="font-black uppercase tracking-widest text-sm">{feedback === 'correct' ? 'Placa Confirmada (+15 moedas)' : 'Registro Incorreto'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {phase === 'success' && (
                        <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-emerald-500/20 border-4 border-emerald-500 rounded-full flex items-center justify-center">
                                <Star size={48} className="text-emerald-400 fill-emerald-400" />
                            </div>
                            <h2 className={`text-4xl font-black uppercase tracking-tighter ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Missão Cumprida</h2>
                            <p className={theme === 'officer' ? 'text-gray-400' : 'text-gray-500'}>Próximo objetivo em instantes...</p>
                        </div>
                    )}

                    {phase === 'fail' && (
                        <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                            <div className="w-24 h-24 bg-red-500/20 border-4 border-red-500 rounded-full flex items-center justify-center">
                                <AlertCircle size={48} className="text-red-400" />
                            </div>
                            <h2 className={`text-4xl font-black uppercase tracking-tighter ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Missão Abortada</h2>
                            <p className={`${theme === 'officer' ? 'text-gray-400' : 'text-gray-500'} mb-4`}>O infrator escapou do sistema.</p>
                            <div className="flex gap-4">
                                <button onClick={() => beginLevel(plates, level)} className={`px-8 py-3 rounded-2xl font-black uppercase tracking-widest ${
                                    theme === 'officer' ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}>Tentar Novamente</button>
                                <button onClick={handleRestart} className={`px-8 py-3 font-black uppercase tracking-widest rounded-2xl ${
                                    theme === 'officer' ? 'bg-red-600/20 text-red-400' : 'bg-red-50 text-red-600'
                                }`}>Nova Missão</button>
                            </div>
                        </div>
                    )}

                    {phase === 'complete' && (
                        <div className="flex flex-col items-center gap-6 md:gap-8 animate-in zoom-in-95 duration-500 text-center max-w-lg w-full max-h-full overflow-y-auto px-2 py-4 custom-scrollbar">
                            <style>{ANIMATIONS}</style>
                            <Trophy size={80} className="text-yellow-400" strokeWidth={1} />
                            <div>
                                <h1 className={`text-5xl font-black uppercase tracking-tighter ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Capitão Honorário</h1>
                                <p className={`mt-2 ${theme === 'officer' ? 'text-gray-400' : 'text-gray-500'}`}>Missão concluída com {plates.length} registros perfeitos.</p>
                            </div>

                            {/* AI DEBRIEFING SIMULATION */}
                            {config.mode === 'phrases' && (
                                <div className={`w-full p-6 rounded-[32px] border text-left bg-indigo-500/10 border-indigo-500/20 animate-in slide-in-from-bottom-4 duration-700`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
                                            <Headphones className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Simulação de Rádio</p>
                                            <h3 className={`text-base font-black uppercase tracking-tight ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Abordagem em Campo</h3>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                        <div className="flex gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0 flex items-center justify-center text-[8px] font-black text-white">IA</div>
                                            <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none text-xs text-gray-400 italic">
                                                "License and registration, please... Oh, wait. Why did you stop me, officer?"
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <div className="bg-indigo-600 p-3 rounded-2xl rounded-tr-none text-xs text-white font-medium">
                                                "{plates[0]?.text}"
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-indigo-400 shrink-0 flex items-center justify-center text-[8px] font-black text-white">YOU</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-700 shrink-0 flex items-center justify-center text-[8px] font-black text-white">IA</div>
                                            <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none text-xs text-gray-400 italic font-medium">
                                                "But I wasn't even over the limit! Look, I can't find the documents right now..."
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <div className="bg-indigo-600 p-3 rounded-2xl rounded-tr-none text-xs text-white font-medium">
                                                "{plates[1]?.text}"
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-indigo-400 shrink-0 flex items-center justify-center text-[8px] font-black text-white">YOU</div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-white/5">
                                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">Relatório de Performance do Comando:</p>
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className="text-yellow-400" />
                                            <p className="text-xs font-medium text-gray-300">
                                                Você manteu a autoridade mas esqueceu de pedir o teste do bafômetro. O suspeito quase fugiu pelo contexto, mas sua pronúncia foi <span className="text-emerald-400 font-bold uppercase">Excelente</span>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex items-center gap-4 bg-yellow-400/10 border-2 border-yellow-400/20 px-8 py-4 rounded-[32px]">
                                <Coins size={32} className="text-yellow-400" />
                                <span className="text-4xl font-black text-yellow-400 tracking-tighter">{coins}</span>
                            </div>

                            {!feedbackSubmitted ? (
                                <div className={`w-full p-6 rounded-[32px] border text-left flex flex-col gap-4 ${
                                    theme === 'officer' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'
                                }`}>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Debriefing de Missão</p>
                                        <h3 className={`text-lg font-black uppercase tracking-tight ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Avaliação de Memória</h3>
                                    </div>
                                    <p className={`text-xs ${theme === 'officer' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Qual melhoria você sentiu na sua memória após o exercício?
                                    </p>
                                    <textarea 
                                        value={userFeedback}
                                        onChange={(e) => setUserFeedback(e.target.value)}
                                        placeholder="Descreva sua experiência..."
                                        className={`w-full min-h-[100px] p-4 rounded-2xl resize-none outline-none transition-all text-sm font-medium ${
                                            theme === 'officer' 
                                                ? 'bg-gray-900 text-white border-white/10 focus:border-indigo-500' 
                                                : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-indigo-600'
                                        }`}
                                    />
                                    <button 
                                        onClick={submitFeedback}
                                        disabled={!userFeedback.trim()}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest transition-all"
                                    >
                                        Enviar Relatório
                                    </button>
                                </div>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Check size={32} className="text-emerald-500" strokeWidth={3} />
                                    </div>
                                    <p className={`font-black uppercase tracking-tight ${theme === 'officer' ? 'text-white' : 'text-gray-900'}`}>Dossiê Finalizado!</p>
                                    <p className="text-gray-500 text-xs mt-1">Ótimo trabalho na academia, recruta.</p>
                                </div>
                            )}

                            <button onClick={handleRestart} className="px-12 py-4 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border-2 border-indigo-500/20 rounded-[24px] font-black uppercase tracking-widest transition-all mt-4">Retornar ao Quartel</button>
                        </div>
                    )}

                </div>

                {/* Footer Toolbar */}
                <div className={`h-10 border-t flex items-center px-6 justify-between text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${
                    theme === 'officer' ? 'bg-gray-900/50 border-white/5 text-gray-600' : 'bg-white border-gray-100 text-gray-400'
                }`}>
                    <span>STATUS: {phase.toUpperCase()}</span>
                    <div className="flex gap-6">
                        <span className={sirenActive ? 'text-red-500 animate-pulse' : ''}>SIREN: {sirenActive ? 'ON' : 'OFF'}</span>
                        <span>AUDIO: ENGINE_LOOP_ON</span>
                        <span>MIC: {micActive ? 'ACTIVE' : 'IDLE'}</span>
                        <span>SIGNAL: 100%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LicensePlateMode;
