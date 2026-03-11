import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GalleryItem, CardData, Connection, CameraState, CardColor, CardShape, ChatMessage, EventGroup, CardVisualSettings, CardBehaviorSettings, Attachment, NavigationFilters, FeedPost, AiCallState, UserAiProfile, DreamCard, DreamInteractionSession, SharedGif, DreamRequest, ProcessPack, CanvasFilters, CanvasStats, CompletionRecord } from './types';
import CardNode from './components/CardNode';
import ConnectionLayer from './components/ConnectionLayer';
import EventModal from './components/EventModal';
import CalendarModal from './components/CalendarModal';
import TaskOrderModal from './components/TaskOrderModal';
import ShortcutsModal from './components/ShortcutsModal';
import SettingsModal from './components/SettingsModal';
import MediaGalleryModal from './components/MediaGalleryModal';
import VisionMode from './components/VisionMode';
import VoiceChatPanel from './components/VoiceChatPanel';
import HistoryPanel from './components/HistoryPanel';
import TimerSettingsModal from './components/TimerSettingsModal';
import ScheduleModal from './components/ScheduleModal';
import CardListSidebar from './components/CardListSidebar';
import SidebarSettingsModal from './components/SidebarSettingsModal';
import { SidebarSettings } from './types';
import { getTaskSuggestions, AiAction, speakText as serviceSpeakText, connectLiveSession, optimizeTaskSchedule, estimateTaskDuration, setGeminiApiKey, validateApiKey, scheduleTasks, getDreamInteractionResponse } from './services/geminiService';
import ApiKeyModal from './components/ApiKeyModal';
import { Plus, Image as ImageIcon, Search, Filter, MessageSquare, Target, List, ListOrdered, Mic, Send, X, CornerDownRight, Spline, Minus, Activity, Type, MicOff, Calendar, Folder, Maximize2, Minimize2, ChevronLeft, ChevronRight, Square, Lock, Unlock, Headphones, CalendarCheck2, Settings, Layers, Eye, AudioLines, StickyNote, Keyboard, ScrollText, CalendarDays, CalendarRange, LogOut, LogIn, Tag, Zap, User, TrendingUp, Cloud, Film, Video, Package, Bell, Play, BarChart3, Trash2, CloudUpload, ZoomIn, ZoomOut, Wrench, Bot, Music2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthUI } from './components/Auth';
import { persistenceService } from './services/persistenceService';
import UserProfileModal from './components/UserProfileModal';
import FeedPanel from './components/FeedPanel';
import AiCallOverlay from './components/AiCallOverlay';
import DreamModal from './components/DreamModal';
import DreamInteractionModal from './components/DreamInteractionModal';
import GifGalleryModal from './components/GifGalleryModal';
import GifConverterModal from './components/GifConverterModal';
import DreamSprintModal from './components/DreamSprintModal';
import PackGalleryModal from './components/PackGalleryModal';
import CanvasControlModal from './components/CanvasControlModal';
import { Share2, Phone } from 'lucide-react';
import MetronomePanel from './components/MetronomePanel';



function App() {
    // --- Auth ---
    const { user, loading: authLoading, signOut } = useAuth();
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    // Auto-close auth modal on login
    useEffect(() => {
        if (user) {
            setIsAuthModalOpen(false);
        }
    }, [user]);

    // Close popovers on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-filter-popover]') && !target.closest('[data-tools-popover]') && !target.closest('[data-ai-settings]')) {
                setIsFilterPopoverOpen(false);
                setIsToolsPopoverOpen(false);
                setIsAiSettingsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- State ---
    const [cards, setCards] = useState<CardData[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [events, setEvents] = useState<EventGroup[]>([]);
    const [camera, setCamera] = useState<CameraState>({ x: 0, y: 0, zoom: 1 });
    const [schedulingCardId, setSchedulingCardId] = useState<string | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState((import.meta as any).env.VITE_GEMINI_API_KEY || '');
    const [aiStatus, setAiStatus] = useState<'connected' | 'error' | 'idle'>('idle');
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [isContinuousMic, setIsContinuousMic] = useState(false);
    const [interimTranscription, setInterimTranscription] = useState('');
    const [isRecordingAudio, setIsRecordingAudio] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
    const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [aiVoice, setAiVoice] = useState('Puck'); // Default for live, speakText often uses Charon
    const [aiLanguage, setAiLanguage] = useState('Português (Brasil)');
    const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
    const [apiDiagnostics, setApiDiagnostics] = useState<{
        sources: Array<{ label: string; status: 'idle' | 'working' | 'failed' }>;
        activeLabel: string | null;
    }>({
        sources: [
            { label: 'Chave do Usuário', status: 'idle' },
            { label: 'Fallback 1 (Env)', status: 'idle' },
            { label: 'Fallback 2 (Backup)', status: 'idle' },
            { label: 'Fallback 3 (Secondary)', status: 'idle' },
        ],
        activeLabel: null
    });
    const [isFastMode, setIsFastMode] = useState(false);
    const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);

    // Wrapper for speakText to always use the user-selected voice
    const speakText = useCallback((text: string) => {
        return serviceSpeakText(text, aiVoice);
    }, [aiVoice]);

    // Alarm/Scheduling Check
    useEffect(() => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }

        const interval = setInterval(() => {
            const now = new Date();
            cards.forEach(card => {
                if (!card.scheduledStart || card.status === 'completed' || card.status === 'skipped') return;

                const startTime = new Date(card.scheduledStart);

                // 1. Alarm at the exact time
                if (now >= startTime && !card.alarmPlayed) {
                    playAlarm(card.title, "O horário agendado chegou!");
                    handleUpdateCard(card.id, { alarmPlayed: true });
                    // Ativa o Modo Focus automaticamente no card agendado
                    setTimeout(() => {
                        handleStartRoutine([card]);
                    }, 1000);
                    return;
                }

                // 2. Reminder (1-5 hours before)
                if (card.reminderHours && card.reminderHours > 0) {
                    const reminderTime = new Date(startTime.getTime() - card.reminderHours * 60 * 60 * 1000);
                    // Check if we are within the reminder minute and haven't played an alarm yet
                    // Special flag for reminder to avoid blocking the main alarm
                    if (now >= reminderTime && now < startTime && !card.alarmPlayed) {
                        // For reminders, we might want a different flag or just check if it's very close to the reminder time
                        // To keep it simple as requested, let's play the alarm and mark it so it doesn't repeat every 30s
                        // But we want the main alarm to play too... 
                        // Let's use a composite key or just check if the current time is within 1 min of reminderTime
                        const diffSecs = Math.abs(now.getTime() - reminderTime.getTime()) / 1000;
                        if (diffSecs < 60) {
                            playAlarm(card.title, `Lembrete: Inicia em ${card.reminderHours}h.`);
                        }
                    }
                }
            });
        }, 30000); // Check every 30 seconds

        return () => clearInterval(interval);
    }, [cards]);

    const playAlarm = (title: string, message: string) => {
        // Notification API
        if (Notification.permission === "granted") {
            try {
                new Notification(title, { body: message, icon: '/favicon.ico' });
            } catch (e) {
                console.error("Notification error", e);
            }
        }

        // Audio Alarm
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Audio play blocked, needs user interaction", e));

        // Visual Alert as fallback
        // alert(`${title}: ${message}`);
    };
    const [filterColor, setFilterColor] = useState<CardColor | 'all'>('all');
    const [filterTags, setFilterTags] = useState<string[]>([]);

    // Vision Mode State
    const [isVisionModeOpen, setIsVisionModeOpen] = useState(false);
    const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
    const [voiceChatMessages, setVoiceChatMessages] = useState<Array<{ id: string; text: string; isUser: boolean; timestamp: number }>>([]);
    const [liveStream, setLiveStream] = useState<MediaStream | null>(null);

    // AI Status Check
    useEffect(() => {
        if (apiKey) {
            handleSaveApiKey(apiKey);
        }
    }, []);

    const handleSaveApiKey = async (key: string) => {
        if (!key?.trim()) return false;
        setAiStatus('idle');

        // Reset diagnostics
        setApiDiagnostics({
            sources: [
                { label: 'Chave do Usuário', status: 'idle' },
                { label: 'Fallback 1 (Env)', status: 'idle' },
                { label: 'Fallback 2 (Backup)', status: 'idle' },
                { label: 'Fallback 3 (Secondary)', status: 'idle' },
            ],
            activeLabel: null
        });

        const updateDiagnostic = (label: string, status: 'working' | 'failed') => {
            setApiDiagnostics(prev => ({
                ...prev,
                sources: prev.sources.map(s => s.label === label ? { ...s, status } : s),
                activeLabel: status === 'working' ? label : prev.activeLabel
            }));
        };

        // Helper to test a key and set it active if valid
        const tryKey = async (k: string): Promise<boolean> => {
            setGeminiApiKey(k);
            let valid = await validateApiKey();
            // One retry after transient failure
            if (!valid) {
                await new Promise(r => setTimeout(r, 1500));
                valid = await validateApiKey();
            }
            return valid;
        };

        // 1. Try user's key first
        if (await tryKey(key)) {
            updateDiagnostic('Chave do Usuário', 'working');
            setAiStatus('connected');
            setApiKey(key);
            return true;
        }
        updateDiagnostic('Chave do Usuário', 'failed');

        console.warn('[AI] User key failed. Falling back to default env key...');

        // 2. Fallback: default env key (VITE_GEMINI_API_KEY)
        const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
        if (envKey && envKey !== key) {
            if (await tryKey(envKey)) {
                updateDiagnostic('Fallback 1 (Env)', 'working');
                setAiStatus('connected');
                setApiKey(key);
                return true;
            }
        }
        updateDiagnostic('Fallback 1 (Env)', 'failed');

        // 3. Fallback: backup env key (VITE_BACKUP_GEMINI_API_KEY)
        const backupKey = (import.meta as any).env.VITE_BACKUP_GEMINI_API_KEY;
        if (backupKey && backupKey !== key && backupKey !== envKey) {
            console.warn('[AI] Default key failed. Trying backup key...');
            if (await tryKey(backupKey)) {
                updateDiagnostic('Fallback 2 (Backup)', 'working');
                setAiStatus('connected');
                setApiKey(key);
                return true;
            }
        }
        updateDiagnostic('Fallback 2 (Backup)', 'failed');

        // 4. Fallback: secondary env key or hardcoded final key
        const secondaryKey = (import.meta as any).env.VITE_GEMINI_API_KEY_SECONDARY || 'AIzaSyDlbQg25TuIfYk5-YGA9DowvtiL8XHyihs';
        if (secondaryKey !== key && secondaryKey !== envKey && secondaryKey !== backupKey) {
            console.warn('[AI] Backup key failed. Trying secondary fallback key...');
            if (await tryKey(secondaryKey)) {
                updateDiagnostic('Fallback 3 (Secondary)', 'working');
                setAiStatus('connected');
                setApiKey(key);
                return true;
            }
        }
        updateDiagnostic('Fallback 3 (Secondary)', 'failed');

        // All keys exhausted
        setAiStatus('error');
        return false;
    };

    const [cardVisualSettings, setCardVisualSettings] = useState<CardVisualSettings>({
        showImage: true,
        showTitle: true,
        showDescription: true,
        showTimer: true,
        showCompleteBtn: true,
        showDeleteBtn: true,
        showSchedule: true,
        showIntervals: true,
        showTags: true,
        showLastCompleted: true,
        showCompletionCount: true,
        showAttachmentIndicator: true,
        showAttachmentActions: true,
        defaultShape: 'rectangle',
        defaultColor: 'blue',
        fontFamily: 'Inter, sans-serif',
        fontSize: 14
    });

    // Behavior Configuration State
    const [cardBehaviorSettings, setCardBehaviorSettings] = useState<CardBehaviorSettings>({
        preTimeSeconds: 0,
        postTimeSeconds: 0,
        maxPauses: 3,
        pauseDuration: 5,
        pauseDurationMode: 'fixed',
        requireClickToStart: false,
        requireClickToFinish: false,
        autoFlowAfterPostTime: true,
        requireClickToStartTimer: false,
        requireClickToStartInterval: false,
        requireClickToEndInterval: false,
        requireClickToStartPostTime: false,
        requireClickToFinishPostTime: false
    });

    // Shortcuts State
    const [shortcuts, setShortcuts] = useState<Record<string, string>>({
        groupByTags: 'g',
        openCalendar: 'c',
        createEvent: 'e',
        createNote: 'n',
        toggleMic: 'm'
    });

    // UI State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiProcessing, setIsAiProcessing] = useState(false);

    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
    const [isTaskOrderModalOpen, setIsTaskOrderModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
    const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
    const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
    const [isCanvasControlModalOpen, setIsCanvasControlModalOpen] = useState(false);
    const [isCardListOpen, setIsCardListOpen] = useState(false);
    const [isSidebarSettingsOpen, setIsSidebarSettingsOpen] = useState(false);
    const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
    const [isToolsPopoverOpen, setIsToolsPopoverOpen] = useState(false);
    const [sidebarSettings, setSidebarSettings] = useState<SidebarSettings>({
        // Produtividade (sidebar inferior)
        showScheduleCheck: true,   // Agenda Ativa - visível
        showCardManager: true,     // Gestor de Cards - visível
        showCanvasControls: false, // Controles Canvas - oculto
        showSettings: true,        // Configurações - visível
        showProfile: true,         // Perfil IA - visível
        showBackup: false,         // Backup Nuvem - oculto
        showFeed: true,            // Feed & Conquistas - visível
        showDreamCenter: false,    // Centro de Sonhos - oculto
        showGifGallery: false,     // Galeria GIFs - oculto
        showGifConverter: false,   // Conversor GIF - oculto
        showNotifications: true,   // Notificações - visível
        showMarketplace: false,    // Marketplace - oculto
        showShortcuts: false,      // Atalhos - oculto
        showHistory: false,        // Histórico - oculto
        showFocusMode: false,      // Modo Foco - oculto
        // Criação de cards (toolbar superior)
        showAddCard: false,        // Card Clássico - oculto (usar quick)
        showAddNote: false,        // Nota (Post-it) - oculto
        showBatchCard: false,      // Batch / GreenCard - oculto
        showWhiteSquare: true,     // Quadrado Branco - VISÍVEL
        showQuickCard: false,      // Quick Card - oculto
        // Ferramentas
        showChat: true,            // Chat IA - visível
        showTaskOrder: true,       // Ordem de Tarefas - visível
        showEventManager: false,   // Gestor de Eventos - oculto
        showMediaGallery: false,   // Galeria de Mídia - oculto
        // Agendamento
        showCalendarMain: true,    // Calendário IA principal - visível
        showExtraCalendars: false, // CalendarDays + CalendarRange - ocultos
        // IA / Voz
        showVoiceMode: true,       // Modo Voz (mic) - visível
        showLiveAudio: false,      // Live Áudio IA - oculto
        showVoiceChat: false,      // Voice Chat - oculto
        showVisionMode: false,     // Modo Visão - oculto
        showApiKey: true,          // Chave API Gemini - visível
        // Automação
        autoShareIncomplete: false
    });
    const [canvasFilters, setCanvasFilters] = useState<CanvasFilters>({
        showPending: true,
        showCompleted: true,
        showMedia: true,
        showNotes: true,
        selectedTags: [],
        selectedGroups: [],
        hideAll: false
    });
    const [interactionLatency, setInteractionLatency] = useState(0);

    const handleClearCanvas = useCallback(() => {
        setCards([]);
        setConnections([]);
        if (user) {
            persistenceService.clearAllData(user.id).catch(console.error);
        }
        speakText("O canvas foi limpo completamente.");
    }, [user]);

    const handleExpandAll = useCallback(() => {
        setCards(prev => prev.map(c => ({ ...c, isExpanded: true })));
        speakText("Todos os grupos foram expandidos.");
    }, []);

    const handleResetFilters = useCallback(() => {
        setCanvasFilters({
            showPending: true,
            showCompleted: true,
            showMedia: true,
            showNotes: true,
            selectedTags: [],
            selectedGroups: [],
            hideAll: false
        });
        speakText("Todos os filtros foram limpos.");
    }, []);

    const canvasStats = useMemo<CanvasStats>(() => {
        const mediaCount = cards.filter(c => c.type === 'media').length;
        const noteCount = cards.filter(c => c.type === 'note').length;
        const total = cards.length;

        // Simples escalonamento de load baseado em números brutos + latência medida
        let level: CanvasStats['loadLevel'] = 'low';
        const loadScore = (total * 1) + (mediaCount * 5) + (noteCount * 2) + (interactionLatency * 10);

        if (loadScore > 500) level = 'critical';
        else if (loadScore > 200) level = 'high';
        else if (loadScore > 100) level = 'medium';

        return {
            cardCount: total,
            mediaCount,
            noteCount,
            connectionCount: connections.length,
            interactionSpeedMs: interactionLatency,
            loadLevel: level
        };
    }, [cards, connections, interactionLatency]);

    const [userAiProfile, setUserAiProfile] = useState<UserAiProfile>({
        userName: '',
        localVaultPath: 'My Canvas Vault',
        isSyncEnabled: true,
        backupFrequency: 'hour',
        backups: [],
        preferredPeriod: 'morning',
        postponeTarget: 'tomorrow',
        sleepTime: '23:00',
        wakeTime: '07:00',
        peakEnergyTime: 'morning',
        mealTimes: {
            breakfast: '08:00',
            lunch: '13:00',
            dinner: '20:00'
        },
        physicalActivityDays: ['monday', 'wednesday', 'friday'],
        computerWorkPreference: 'morning',
        readingPreference: 'evening',
        spendingTendencyDays: ['saturday']
    });

    const [navFilters, setNavFilters] = useState<NavigationFilters>({
        allowNotes: true,
        allowNice: true,
        allowGreen: true,
        allowClassic: true,
        allowFaster: true,
        allowMedia: true
    });

    const [isFeedOpen, setIsFeedOpen] = useState(false);
    const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
    const [aiCallState, setAiCallState] = useState<AiCallState>({
        isActive: false,
        incoming: false,
        callerName: 'Chronos IA',
        callerAvatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Chronos&backgroundColor=b6e3f4'
    });
    const [isDreamModalOpen, setIsDreamModalOpen] = useState(false);
    const [isDreamInteractionOpen, setIsDreamInteractionOpen] = useState(false);
    const [sharedDreams, setSharedDreams] = useState<DreamCard[]>([]);
    const [activeDreamForInteraction, setActiveDreamForInteraction] = useState<DreamCard | null>(null);
    const [dreamSession, setDreamSession] = useState<DreamInteractionSession | null>(null);
    const [isAiProcessingDream, setIsAiProcessingDream] = useState(false);
    const [isGifGalleryOpen, setIsGifGalleryOpen] = useState(false);
    const [isGifConverterOpen, setIsGifConverterOpen] = useState(false);
    const [sharedGifs, setSharedGifs] = useState<SharedGif[]>([]);
    const [isDreamSprintOpen, setIsDreamSprintOpen] = useState(false);
    const [isPackGalleryOpen, setIsPackGalleryOpen] = useState(false);
    const [dreamRequests, setDreamRequests] = useState<DreamRequest[]>([]);
    const [activeDreamRequest, setActiveDreamRequest] = useState<DreamRequest | null>(null);
    const [processPacks, setProcessPacks] = useState<ProcessPack[]>([]);


    // Simulation: Incoming Dream Requests
    useEffect(() => {
        if (!userAiProfile.profession || isDreamSprintOpen) return;

        const interval = setInterval(() => {
            // 20% chance of receiving a request every 2 minutes
            if (Math.random() < 0.2) {
                const professions = ['Médico', 'YouTuber', 'Programador', 'Advogado', 'Marceneiro'];
                const descriptions = [
                    "Quero criar um canal de tecnologia de sucesso.",
                    "Meu sonho é abrir uma clínica popular no interior.",
                    "Desejo construir uma oficina de móveis planejados de luxo.",
                    "Pretendo abrir um escritório de advocacia ambiental.",
                    "Quero lançar meu próprio software de gestão para pequenas empresas."
                ];

                const randomIdx = Math.floor(Math.random() * descriptions.length);

                const newRequest: DreamRequest = {
                    id: Math.random().toString(36).substr(2, 9),
                    dreamerName: `Explorador_${Math.floor(Math.random() * 1000)}`,
                    dreamDescription: descriptions[randomIdx],
                    professionRequired: userAiProfile.profession,
                    timestamp: Date.now()
                };

                setDreamRequests(prev => [newRequest, ...prev]);
                // Notify user somehow? For now just add to list
            }
        }, 120000);

        return () => clearInterval(interval);
    }, [userAiProfile.profession, isDreamSprintOpen]);


    const [editingTimerCardId, setEditingTimerCardId] = useState<string | null>(null);
    const [isAiOptimizing, setIsAiOptimizing] = useState(false);
    const [isMobile, setIsMobile] = useState(() => {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmall = window.innerWidth < 1024; // Increased threshold for tablets
        return isTouch && isSmall;
    });

    useEffect(() => {
        const handleResize = () => {
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            const isSmall = window.innerWidth < 1024;
            setIsMobile(isTouch && isSmall);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isAnyModalOpen = isAuthModalOpen || isApiKeyModalOpen || isGalleryModalOpen || isEventModalOpen || isCalendarModalOpen || isTaskOrderModalOpen || isSettingsModalOpen || isShortcutsModalOpen || isHistoryPanelOpen || isUserProfileModalOpen || isCanvasControlModalOpen || isCardListOpen || isSidebarSettingsOpen || isFeedOpen || isDreamModalOpen || isDreamInteractionOpen || isGifGalleryOpen || isGifConverterOpen || isDreamSprintOpen || isPackGalleryOpen || !!schedulingCardId || !!editingTimerCardId;

    const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
    const [liveVideoStream, setLiveVideoStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    // Focus & Navigation State
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isCameraLocked, setIsCameraLocked] = useState(true);
    const toggleCameraLock = () => setIsCameraLocked(prev => !prev);
    const [activeRoutineIds, setActiveRoutineIds] = useState<string[]>([]); // Subset of card IDs for the current routine
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);

    const closeAllModals = () => {
        setIsTaskOrderModalOpen(false);
        setIsEventModalOpen(false);
        setIsGalleryModalOpen(false);
        setIsCalendarModalOpen(false);
        setIsSettingsModalOpen(false);
        setIsUserProfileModalOpen(false);
        setIsDreamModalOpen(false);
        setIsGifGalleryOpen(false);
        setIsGifConverterOpen(false);
        setIsPackGalleryOpen(false);
        setIsShortcutsModalOpen(false);
        setIsSidebarSettingsOpen(false);
        setIsApiKeyModalOpen(false);
        setIsCardListOpen(false);
        setIsHistoryPanelOpen(false);
        setIsChatOpen(false);
        setIsFeedOpen(false);
        setIsCanvasControlModalOpen(false);
        setIsFilterPopoverOpen(false);
        setIsToolsPopoverOpen(false);
        setSchedulingCardId(null);
        setEditingTimerCardId(null);
    };

    const toggleModal = (setter: (val: boolean) => void, currentVal: boolean) => {
        const nextVal = !currentVal;
        closeAllModals();
        setter(nextVal);
    };

    // Connection Visual Settings
    const [connectionStyle, setConnectionStyle] = useState<'curved' | 'straight'>('curved');
    const [connectionWidth, setConnectionWidth] = useState<number>(2);
    const [showConnectionLabels, setShowConnectionLabels] = useState<boolean>(false);

    // Interaction State
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
    const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStartInfo, setResizeStartInfo] = useState<{
        cardId: string;
        handle: string;
        startX: number;
        startY: number;
        cardX: number;
        cardY: number;
        cardWidth: number;
        cardHeight: number;
        aspectRatio: number | undefined;
    } | null>(null);

    const [connectingMousePos, setConnectingMousePos] = useState({ x: 0, y: 0 });
    const [connectionDropMenu, setConnectionDropMenu] = useState<{ x: number, y: number, parentId: string } | null>(null);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const isVoiceModeRef = useRef(isVoiceMode);
    const isAiProcessingRef = useRef(isAiProcessing);
    const lastTouchRef = useRef<{ x: number, y: number } | null>(null);
    const initialPinchDistanceRef = useRef<number | null>(null);

    useEffect(() => { isVoiceModeRef.current = isVoiceMode; }, [isVoiceMode]);
    useEffect(() => { isAiProcessingRef.current = isAiProcessing; }, [isAiProcessing]);
    useEffect(() => {
        const handleClickOutside = () => setConnectionDropMenu(null);
        if (connectionDropMenu) {
            window.addEventListener('click', handleClickOutside);
            return () => window.removeEventListener('click', handleClickOutside);
        }
    }, [connectionDropMenu]);
    const disconnectLiveSessionRef = useRef<(() => void) | null>(null);
    const isConnectingRef = useRef(false);

    // --- Data Persistence ---
    useEffect(() => {
        if (user && !dataLoaded) {
            const loadData = async () => {
                try {
                    const [fetchedCards, fetchedConns, profile] = await Promise.all([
                        persistenceService.fetchCards(user.id),
                        persistenceService.fetchConnections(user.id),
                        persistenceService.fetchProfile(user.id)
                    ]);

                    if (fetchedCards.length > 0) setCards(fetchedCards);
                    if (fetchedConns.length > 0) setConnections(fetchedConns);

                    if (profile?.settings) {
                        const s = profile.settings;
                        if (s.cardVisualSettings) setCardVisualSettings(prev => ({ ...prev, ...s.cardVisualSettings }));
                        if (s.cardBehaviorSettings) setCardBehaviorSettings(prev => ({ ...prev, ...s.cardBehaviorSettings }));
                        if (s.shortcuts) setShortcuts(prev => ({ ...prev, ...s.shortcuts }));
                        // Restore user-specific API key
                        if (s.geminiApiKey) {
                            handleSaveApiKey(s.geminiApiKey);
                        }
                    }
                    setDataLoaded(true);
                } catch (err) {
                    console.error("Error loading data:", err);
                }
            };
            loadData();
        }
    }, [user, dataLoaded]);

    // Save Settings
    useEffect(() => {
        if (user && dataLoaded) {
            persistenceService.saveProfile(user.id, {
                cardVisualSettings,
                cardBehaviorSettings,
                shortcuts,
                ...(apiKey ? { geminiApiKey: apiKey } : {})
            });
        }
    }, [user, dataLoaded, cardVisualSettings, cardBehaviorSettings, shortcuts, apiKey]);

    // Sync refs
    useEffect(() => { isVoiceModeRef.current = isVoiceMode; }, [isVoiceMode]);
    useEffect(() => { isAiProcessingRef.current = isAiProcessing; }, [isAiProcessing]);



    // --- Helpers ---
    const screenToCanvas = useCallback((sx: number, sy: number) => {
        if (!containerRef.current) return { x: sx, y: sy };
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // (sx - centerX - tx) / zoom = x
        const x = (sx - rect.left - centerX - camera.x) / camera.zoom;
        const y = (sy - rect.top - centerY - camera.y) / camera.zoom;
        return { x, y };
    }, [camera]);

    const centerCameraOnCard = useCallback((cardId: string, zoomLevel: number = 1.0) => {
        const card = cards.find(c => c.id === cardId);
        if (!card || !containerRef.current) return;

        const cardWidth = card.width || 256;
        const cardHeight = card.height || 300;

        // World-space center of the card
        const cardCenterX = card.x + cardWidth / 2;
        const cardCenterY = card.y + cardHeight / 2;

        // The canvas origin is placed at viewport center (left-1/2 top-1/2).
        // camera.(x,y) is a translation applied AFTER the origin shift.
        // To bring world point (cx, cy) to viewport center:
        //   cx * zoom + camX = 0  =>  camX = -(cx * zoom)
        const newCamX = -(cardCenterX * zoomLevel);
        const newCamY = -(cardCenterY * zoomLevel);

        setCamera({
            x: newCamX,
            y: newCamY,
            zoom: zoomLevel
        });
    }, [cards]);

    const handleLocateCard = useCallback((cardId: string) => {
        let cardFound = cards.find(c => c.id === cardId);
        if (!cardFound) return;

        // Recursive function to ensure all parents are expanded
        setCards(prev => {
            const expandParents = (id: string, currentCards: CardData[]): CardData[] => {
                const card = currentCards.find(c => c.id === id);
                if (card && card.parentId) {
                    const updatedCards = currentCards.map(c =>
                        c.id === card.parentId ? { ...c, isExpanded: true } : c
                    );
                    return expandParents(card.parentId, updatedCards);
                }
                return currentCards;
            };
            return expandParents(cardId, prev);
        });

        // Fix filters if they are hiding the card
        if (cardFound.status === 'completed' && !canvasFilters.showCompleted) {
            setCanvasFilters(f => ({ ...f, showCompleted: true }));
        }
        if (cardFound.type === 'note' && !canvasFilters.showNotes) {
            setCanvasFilters(f => ({ ...f, showNotes: true }));
        }

        // Delay to allow React to update state (expansion/filters) before centering
        setTimeout(() => {
            centerCameraOnCard(cardId, 1.2);
            // Optionally close the task order modal to see the result
            setIsTaskOrderModalOpen(false);
        }, 100);
    }, [cards, centerCameraOnCard, canvasFilters]);

    // --- Handlers (Memoized for Performance) ---

    const handleAiOptimize = useCallback(async (cardId: string) => {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        setIsAiOptimizing(true);
        try {
            const completedHistory = cards.filter(c => c.status === 'completed');
            const result = await optimizeTaskSchedule(card, completedHistory);

            // Update Card
            setCards(prev => prev.map(c => c.id === cardId ? {
                ...c,
                timerTotal: result.timerTotal,
                timerRemaining: result.timerTotal,
                preTimeSeconds: result.preTime,
                postTimeSeconds: result.postTime,
                intervals: result.intervals
            } : c));

            // Create Reasoning Note
            const noteId = Date.now().toString();
            const noteCard: CardData = {
                id: noteId,
                type: 'note',
                x: card.x + 300,
                y: card.y,
                title: `AI Plan: ${card.title}`,
                description: result.reasoning,
                color: 'purple',
                timerTotal: 0,
                timerRemaining: 0,
                status: 'pending',
                notes: [],
                tags: ['ai-log'],
                completionCount: 0,
                attachments: []
            };
            setCards(prev => [...prev, noteCard]);
            speakText("I've optimized the schedule and created a note explaining my reasoning.");
        } catch (error) {
            console.error("Optimization failed", error);
            speakText("Sorry, I couldn't optimize the schedule.");
        } finally {
            setIsAiOptimizing(false);
        }
    }, [cards]);



    const handleAddCard = useCallback((parentId?: string, customData?: Partial<CardData>) => {
        // Find parent card for inheritance and positioning
        const parentCard = parentId ? cards.find(c => c.id === parentId) : null;

        // Calculate center based on current camera state
        const newX = -camera.x / camera.zoom;
        const newY = -camera.y / camera.zoom;

        // Use a larger offset for child cards to avoid overlapping
        const offset = 200;
        const jitter = (Math.random() - 0.5) * 40; // Tiny random jitter to avoid perfect stacking
        const spawnX = customData?.x ?? (parentId ? (parentCard?.x || newX) + offset : newX) + jitter;
        const spawnY = customData?.y ?? (parentId ? (parentCard?.y || newY) + offset : newY) + jitter;

        // Child cards should be slightly smaller (e.g., 80% or 200px default)
        const defaultChildSize = 200;
        const baseWidth = parentCard ? (parentCard.width ? parentCard.width * 0.8 : defaultChildSize) : 256;
        const baseHeight = parentCard ? (typeof parentCard.height === 'number' ? parentCard.height * 0.8 : (parentCard.shape === 'circle' ? baseWidth : 200)) : (customData?.shape === 'circle' ? 256 : 300);

        const newCard: CardData = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            x: spawnX,
            y: spawnY,
            title: customData?.title || 'New Task',
            description: customData?.description || 'Description here...',
            color: (customData?.color as CardColor) || (parentCard?.color) || 'blue',
            type: customData?.type || (parentCard?.type) || 'task',
            shape: customData?.shape || (parentCard?.shape) || 'rectangle',
            timerFillMode: customData?.timerFillMode || (parentCard?.timerFillMode) || 'none',
            width: customData?.width || baseWidth,
            height: customData?.height || baseHeight,
            timerTotal: customData?.timerTotal ?? (parentCard?.timerTotal) ?? 300,
            timerRemaining: customData?.timerTotal ?? (parentCard?.timerTotal) ?? 300,
            status: 'pending',
            notes: [],
            tags: [],
            completionCount: 0,
            attachments: [],
            intervals: { count: 1, duration: 300 },
            aiThoughts: [],
            parentId,
            isExpanded: true, // Default to expanded
            ...customData
        };

        setCards(prevCards => [...prevCards, newCard]);

        if (user) {
            persistenceService.saveCard(user.id, newCard).catch(console.error);
        }

        if (parentId) {
            const conn: Connection = { id: crypto.randomUUID(), fromId: parentId, toId: newCard.id, label: 'Sub-task' };
            setConnections(prev => [...prev, conn]);
            if (user) {
                persistenceService.saveConnection(user.id, conn).catch(console.error);
            }
        }
    }, [camera, user, cards]);

    const handleAddBatchCard = useCallback(() => {
        // Create a green card with 10 intervals of 10 minutes (600 seconds)
        handleAddCard(undefined, {
            title: "Batch Cleaning",
            description: "10x Tasks - 10 mins each",
            color: 'green',
            timerTotal: 600, // 10 minutes
            timerRemaining: 600,
            intervals: { count: 10, duration: 600 },
            currentInterval: 1
        });
    }, [handleAddCard]);



    const handleUpdateCard = useCallback((id: string, updates: Partial<CardData>) => {
        setCards(prev => {
            let finalUpdates = { ...updates };

            // Check for #N pattern to set targetMicroTasks
            if (updates.title !== undefined || updates.description !== undefined || updates.panes !== undefined) {
                const card = prev.find(c => c.id === id);
                const title = updates.title !== undefined ? updates.title : (card?.title || '');
                const desc = updates.description !== undefined ? updates.description : (card?.description || '');

                // Also search in panes if we haven't found it yet
                let panesText = '';
                const panes = updates.panes !== undefined ? updates.panes : (card?.panes || []);
                panes.forEach(p => p.elements?.forEach(el => {
                    if (el.content) panesText += ' ' + el.content;
                }));

                const fullText = title + ' ' + desc + ' ' + panesText;

                // 1. Check for #N pattern to set targetMicroTasks
                const match = fullText.match(/#\s*(\d+)/); // Robust regex for #12 or # 12
                if (match && !fullText.includes('!')) { // Only use this if NOT a batch command
                    finalUpdates.targetMicroTasks = parseInt(match[1]);
                }

                // 2. ADVANCED: Quick Command Syntax ". nN [time] [titles...] #tags ."
                const advancedMatch = fullText.match(/\. (.+) \./);
                if (advancedMatch) {
                    const content = advancedMatch[1];
                    const commandStr = advancedMatch[0];

                    // Helper to parse time string like m3s20
                    const parseTime = (timeStr: string) => {
                        let total = 0;
                        const units: Record<string, number> = {
                            s: 1,
                            m: 60,
                            h: 3600,
                            w: 2592000, // 30 days as requested (month)
                            y: 31536000  // 365 days
                        };
                        const parts = timeStr.matchAll(/([smhyw])(\d+)/g);
                        let hasParts = false;
                        for (const p of parts) {
                            hasParts = true;
                            total += parseInt(p[2]) * (units[p[1]] || 0);
                        }
                        return hasParts ? total : null;
                    };

                    // Extract global tags
                    const tags: string[] = [];
                    const tagMatches = content.matchAll(/#(\w+)/g);
                    for (const tm of tagMatches) tags.push(tm[1]);

                    // Extract card count if explicitly provided
                    const countMatch = content.match(/n(\d+)/);
                    const explicitCount = countMatch ? parseInt(countMatch[1]) : null;

                    // Remove count and tags from content for segment processing
                    let processingStr = content.replace(/n\d+/g, '').replace(/#\w+/g, '').trim();

                    // Check for a leading "global/default" time
                    const leadingTimeMatch = processingStr.match(/^([smhyw]\d+(?:[smhyw]\d+)*)\s+/);
                    let defaultTime = 300;
                    if (leadingTimeMatch) {
                        const parsed = parseTime(leadingTimeMatch[1]);
                        if (parsed !== null) defaultTime = parsed;
                        processingStr = processingStr.replace(leadingTimeMatch[0], '').trim();
                    }

                    // Split into segments by , or ;
                    const segments = processingStr.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 0);

                    const newCardsToCreate: { title: string, time: number }[] = [];
                    segments.forEach(seg => {
                        const segTimeMatch = seg.match(/([smhyw]\d+(?:[smhyw]\d+)*)/);
                        let segTime = defaultTime;
                        let segTitle = seg;

                        if (segTimeMatch) {
                            const parsed = parseTime(segTimeMatch[0]);
                            if (parsed !== null) {
                                segTime = parsed;
                                segTitle = seg.replace(segTimeMatch[0], '').trim();
                            }
                        }

                        if (segTitle) {
                            newCardsToCreate.push({ title: segTitle, time: segTime });
                        }
                    });

                    // If explicitCount is larger than newCardsToCreate.length, maybe repeat last?
                    // User says "n3 m30 A, B, C" creates 3.
                    // If they just say "n3 m30 task", it might create 3 tasks? 
                    // Let's follow the segments first, and if only one segment and explicitCount > 1, repeat it.
                    if (explicitCount && explicitCount > newCardsToCreate.length) {
                        if (newCardsToCreate.length === 1) {
                            // If only one title given but count > 1, duplicate it
                            const template = newCardsToCreate[0];
                            for (let i = 1; i < explicitCount; i++) {
                                newCardsToCreate.push({ ...template });
                            }
                        } else if (newCardsToCreate.length === 0 && explicitCount > 0) {
                            // If no title provided but count > 0, create generic tasks
                            for (let i = 0; i < explicitCount; i++) {
                                newCardsToCreate.push({ title: `Task ${i + 1}`, time: defaultTime });
                            }
                        }
                    }

                    // Cleanup text
                    if (updates.title && updates.title.includes(commandStr)) {
                        finalUpdates.title = updates.title.replace(commandStr, '').trim();
                    } else if (card?.title.includes(commandStr)) {
                        finalUpdates.title = card.title.replace(commandStr, '').trim();
                    }

                    if (updates.description && updates.description.includes(commandStr)) {
                        finalUpdates.description = updates.description.replace(commandStr, '').trim();
                    } else if (card?.description.includes(commandStr)) {
                        finalUpdates.description = card.description.replace(commandStr, '').trim();
                    }

                    if (finalUpdates.panes) {
                        finalUpdates.panes = finalUpdates.panes.map(p => ({
                            ...p,
                            elements: p.elements?.map(el => ({
                                ...el,
                                content: el.content?.includes(commandStr) ? el.content.replace(commandStr, '').trim() : el.content
                            }))
                        }));
                    }

                    // Execute spawning
                    setTimeout(() => {
                        let prevId = id;
                        newCardsToCreate.forEach((cData, idx) => {
                            const newId = crypto.randomUUID();
                            const offset = 200 + (idx * 60);

                            const newCard: CardData = {
                                id: newId,
                                parentId: id,
                                title: cData.title,
                                description: `Iniciado via comando rápido`,
                                timerTotal: cData.time,
                                timerRemaining: cData.time,
                                color: (card?.color as CardColor) || 'blue',
                                type: card?.type || 'task',
                                shape: (card?.shape as CardShape) || 'rectangle',
                                timerFillMode: card?.timerFillMode || 'none',
                                status: 'pending',
                                x: (card?.x || 0) + offset,
                                y: (card?.y || 0) + offset,
                                notes: [],
                                tags: [...tags],
                                completionCount: 0,
                                attachments: [],
                                isExpanded: true
                            };

                            setCards(prevCards => [...prevCards, newCard]);

                            const conn: Connection = {
                                id: crypto.randomUUID(),
                                fromId: prevId,
                                toId: newId,
                                label: idx === 0 ? 'Start' : 'Next'
                            };
                            setConnections(prevConns => [...prevConns, conn]);
                            prevId = newId;

                            if (user) {
                                persistenceService.saveCard(user.id, newCard).catch(console.error);
                                persistenceService.saveConnection(user.id, conn).catch(console.error);
                            }
                        });
                        if (newCardsToCreate.length > 0) {
                            speakText(`Criados ${newCardsToCreate.length} cards com sucesso.`);
                        }
                    }, 100);
                }
            }

            const newCards = prev.map(c => c.id === id ? { ...c, ...finalUpdates } : c);
            if (user) {
                const updatedCard = newCards.find(c => c.id === id);
                if (updatedCard) {
                    persistenceService.saveCard(user.id, updatedCard).catch(console.error);
                }
            }
            return newCards;
        });
    }, [user]);

    const handleMicroTaskComplete = useCallback((id: string) => {
        setCards(prev => {
            const card = prev.find(c => c.id === id);
            if (!card) return prev;

            return prev.map(c => {
                if (c.id === id) {
                    return { ...c, microTaskCount: (c.microTaskCount || 0) + 1 };
                }
                return c;
            });
        });
    }, []);

    // Register a global dispatcher for AI tool calls from Live session
    useEffect(() => {
        (window as any).__dispatchAiAction = (action: AiAction) => {
            if (action.type === 'create_card' && action.cardData) {
                handleAddCard(action.cardData.parentId, action.cardData);
            } else if (action.type === 'update_card' && action.updateData) {
                handleUpdateCard(action.updateData.targetId, action.updateData.updates);
            }
        };
        return () => { delete (window as any).__dispatchAiAction; };
    }, [handleAddCard, handleUpdateCard]);

    const handleScheduleCard = (cardId: string, start: string, reminderHours: number) => {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;
        const duration = card.timerTotal || 3600;
        const end = new Date(new Date(start).getTime() + duration * 1000).toISOString();

        handleUpdateCard(cardId, {
            scheduledStart: start,
            scheduledEnd: end,
            reminderHours,
            alarmPlayed: false
        });
    };

    const handlePostponeAi = useCallback(async (cardId: string) => {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        const busySlots = cards
            .filter(c => c.id !== cardId && c.scheduledStart && c.scheduledEnd)
            .map(c => ({ start: c.scheduledStart!, end: c.scheduledEnd! }));

        const now = new Date();
        const startTimeISO = now.toISOString();
        const endTimeISO = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const tasksToSchedule = [{
            id: card.id,
            title: card.title,
            durationMinutes: Math.max(15, Math.round(card.timerTotal / 60))
        }];

        let success = false;
        try {
            const suggestedSchedules = await scheduleTasks(tasksToSchedule, startTimeISO, endTimeISO, busySlots, userAiProfile);

            if (suggestedSchedules && suggestedSchedules.length > 0) {
                const { start } = suggestedSchedules[0];
                handleScheduleCard(cardId, start, card.reminderHours || 0);
                speakText(`Tarefa "${card.title}" reagendada pela IA para ${new Date(start).toLocaleDateString('pt-BR')} às ${new Date(start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`).catch(console.error);
                success = true;
            }
        } catch (e) {
            console.error("Postpone AI error, falling back to profile logic.", e);
        }

        if (!success) {
            // FALLBACK LOGIC based on User Profile
            const targetDate = new Date();

            // 1. Calculate target day
            if (userAiProfile.postponeTarget === 'tomorrow') {
                targetDate.setDate(targetDate.getDate() + 1);
            } else if (userAiProfile.postponeTarget === 'day_after') {
                targetDate.setDate(targetDate.getDate() + 2);
            } else if (userAiProfile.postponeTarget === 'next_week') {
                targetDate.setDate(targetDate.getDate() + 7);
            }

            // 2. Adjust for specific preference of period (fallback)
            let hour = 9; // default morning
            if (userAiProfile.preferredPeriod === 'afternoon') hour = 14;
            if (userAiProfile.preferredPeriod === 'evening') hour = 20;

            // 3. Optional: check for peak energy/meal conflicts (Simplified for fixed hour here)
            // But we'll try to use the profile's preferred period as the main driver.
            targetDate.setHours(hour, 0, 0, 0);

            handleScheduleCard(cardId, targetDate.toISOString(), card.reminderHours || 0);
            speakText(`Não consegui otimizar via IA agora, então reagendei seguindo seu perfil: ${new Date(targetDate).toLocaleDateString('pt-BR')} às ${new Date(targetDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`).catch(console.error);
        }
    }, [cards, handleScheduleCard, userAiProfile]);

    const handleShareCard = useCallback((cardId: string) => {
        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        const newPost: FeedPost = {
            id: Math.random().toString(36).substr(2, 9),
            cardId: card.id,
            userId: user?.id || 'anon',
            userName: user?.email?.split('@')[0] || 'Explorador',
            userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'anon'}`,
            timestamp: Date.now(),
            likes: 0,
            likedBy: [],
            cardData: { ...card },
            stats: {
                completed: card.completionCount || 0,
                pending: cards.filter(c => c.status === 'pending').length,
                postponed: card.failureCount || 0,
                completionTime: card.lastDuration,
                record: card.bestDuration
            }
        };

        setFeedPosts(prev => [newPost, ...prev].slice(0, 50));
        setIsFeedOpen(true);

        // Trigger AI Call if performance is low or shared
        const needsMotivation = (card.failureCount || 0) > 2 || (card.lastDuration && card.bestDuration && card.lastDuration > card.bestDuration * 1.5);

        setTimeout(() => {
            setAiCallState({
                isActive: false,
                incoming: true,
                cardId: card.id,
                callerName: 'Chronos IA',
                callerAvatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Chronos&backgroundColor=b6e3f4',
                reason: needsMotivation ? 'motivation' : 'praise'
            });
        }, 2000);

    }, [cards, user]);
    const handleShareDream = useCallback((dream: DreamCard) => {
        setSharedDreams(prev => [dream, ...prev]);
    }, []);

    const handleInteractWithDream = useCallback((dream: DreamCard) => {
        const newSession: DreamInteractionSession = {
            id: Math.random().toString(36).substr(2, 9),
            dreamId: dream.id,
            professionalUserId: user?.id || 'anon',
            professionalProfession: userAiProfile.profession || 'Explorador',
            messages: [],
            status: 'active'
        };
        setDreamSession(newSession);
        setActiveDreamForInteraction(dream);
        setIsDreamInteractionOpen(true);
    }, [user, userAiProfile.profession]);

    const handleSendMessageToAiDream = useCallback(async (text: string) => {
        if (!dreamSession || !activeDreamForInteraction) return;

        const updatedMessages = [...dreamSession.messages, { role: 'pro' as const, text, timestamp: Date.now() }];
        setDreamSession({ ...dreamSession, messages: updatedMessages });
        setIsAiProcessingDream(true);

        try {
            const response = await getDreamInteractionResponse(activeDreamForInteraction, updatedMessages, userAiProfile.profession || 'Explorador');

            setDreamSession(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    messages: [...prev.messages, {
                        role: 'ai' as const,
                        text: response.text,
                        timestamp: Date.now(),
                        reasoning: response.reasoning
                    }],
                    status: response.status,
                    generatedCards: response.generatedCards as any
                };
            });
        } catch (e) {
            console.error(e);
        } finally {
            setIsAiProcessingDream(false);
        }
    }, [dreamSession, activeDreamForInteraction, userAiProfile.profession]);

    const handleCreateCardsFromDream = useCallback((cardsToCreate: Partial<CardData>[]) => {
        cardsToCreate.forEach((c, idx) => {
            const newCard: CardData = {
                id: Math.random().toString(36).substr(2, 9),
                title: c.title || 'Novo Processo',
                description: c.description || '',
                x: 100 + (idx * 220),
                y: 100,
                color: (c.color as any) || 'blue',
                shape: (c.shape as any) || 'rectangle',
                timerTotal: c.timerTotal || 3600,
                timerRemaining: c.timerTotal || 3600,
                status: 'pending',
                notes: [],
                tags: ['dream-process'],
                completionCount: 0,
                attachments: []
            };
            setCards(prev => [...prev, newCard]);
        });
        setIsDreamInteractionOpen(false);
        setIsDreamModalOpen(false);
    }, []);
    const handleShareGif = useCallback((gifUrl: string) => {
        const newGif: SharedGif = {
            id: Math.random().toString(36).substr(2, 9),
            url: gifUrl,
            userId: user?.id || 'anon',
            userName: user?.email?.split('@')[0] || 'Explorador',
            timestamp: Date.now(),
            likes: 0,
            downloadCount: 0
        };
        setSharedGifs(prev => [newGif, ...prev]);
        setIsGifConverterOpen(false);
        setIsGifGalleryOpen(true);
    }, [user]);

    const handleLikeGif = useCallback((gifId: string) => {
        setSharedGifs(prev => prev.map(gif =>
            gif.id === gifId ? { ...gif, likes: gif.likes + 1 } : gif
        ));
    }, []);
    const handleAcceptDreamRequest = useCallback((request: DreamRequest) => {
        setActiveDreamRequest(request);
        setIsDreamSprintOpen(true);
        // Remove from requests once accepted
        setDreamRequests(prev => prev.filter(r => r.id !== request.id));
    }, []);

    const handleFinishSprint = useCallback((createdCards: Partial<CardData>[]) => {
        if (!activeDreamRequest) return;

        const newPack: ProcessPack = {
            id: Math.random().toString(36).substr(2, 9),
            profession: activeDreamRequest.professionRequired,
            creatorName: user?.email?.split('@')[0] || 'Especialista',
            dreamDescription: activeDreamRequest.dreamDescription,
            cards: createdCards,
            timestamp: Date.now(),
            downloads: 0
        };

        setProcessPacks(prev => [newPack, ...prev]);
        setIsDreamSprintOpen(false);
        setActiveDreamRequest(null);
        setIsPackGalleryOpen(true); // Open gallery to show it was added
    }, [activeDreamRequest, user]);

    // --- Backup & Sync Logic ---
    const handleBackupNow = useCallback(async () => {
        if (!user) return;
        try {
            const backupName = `Backup ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
            const filePath = await persistenceService.createBackup(user.id, cards, connections, backupName);

            const newBackup = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                type: 'cloud' as const,
                name: backupName,
                filePath // Store path for restoring
            };

            setUserAiProfile(prev => ({
                ...prev,
                backups: [newBackup, ...(prev.backups || [])].slice(0, 2)
            }));

            speakText("Backup concluído com sucesso e salvo no storage.");
        } catch (err) {
            console.error("Backup failed", err);
            speakText("Falha ao criar backup.");
        }
    }, [user, cards, connections]);

    const handleRestoreBackup = useCallback(async (backup: any) => {
        if (!backup.filePath) return;
        try {
            const data = await persistenceService.restoreBackup(backup.filePath);
            if (data.cards) setCards(data.cards);
            if (data.connections) setConnections(data.connections);
            speakText("Restauração concluída. Seus dados foram atualizados.");
        } catch (err) {
            console.error("Restore failed", err);
            speakText("Falha ao restaurar backup.");
        }
    }, []);

    // Periodic Backup
    useEffect(() => {
        if (!user || userAiProfile.backupFrequency === 'manual') return;

        const intervalMs = {
            hour: 3600000,
            daily: 86400000,
            weekly: 604800000
        }[userAiProfile.backupFrequency];

        if (!intervalMs) return;

        const timer = setInterval(() => {
            handleBackupNow();
        }, intervalMs);

        return () => clearInterval(timer);
    }, [user, userAiProfile.backupFrequency, handleBackupNow]);

    // Auto-Sync
    useEffect(() => {
        if (user && dataLoaded && userAiProfile.isSyncEnabled) {
            // Save settings whenever they change
            persistenceService.saveProfile(user.id, {
                cardVisualSettings,
                cardBehaviorSettings,
                shortcuts,
                userAiProfile
            });
        }
    }, [user, dataLoaded, userAiProfile, cardVisualSettings, cardBehaviorSettings, shortcuts]);

    const handleLoadPack = useCallback((pack: ProcessPack) => {
        const startX = camera.x - window.innerWidth / 2 + 100;
        const startY = camera.y - window.innerHeight / 2 + 100;

        pack.cards.forEach((card, idx) => {
            const newCard: CardData = {
                id: Math.random().toString(36).substr(2, 9),
                title: card.title || 'Passo do Pack',
                description: card.description || '',
                x: startX + (idx % 3) * 350,
                y: startY + Math.floor(idx / 3) * 250,
                color: (card.color as any) || 'purple',
                shape: (card.shape as any) || 'rectangle',
                timerTotal: card.timerTotal || 1800,
                timerRemaining: card.timerTotal || 1800,
                status: 'pending',
                notes: [],
                tags: ['pack', pack.profession],
                completionCount: 0,
                attachments: []
            };
            setCards(prev => [...prev, newCard]);
        });

        setIsPackGalleryOpen(false);
        // Visual feedback
    }, [camera]);

    const handleSaveGifToGallery = useCallback((gifUrl: string) => {
        const newItem: GalleryItem = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'gif',
            url: gifUrl,
            timestamp: Date.now(),
            name: `GIF_${new Date().getTime()}`
        };
        setGalleryItems(prev => [newItem, ...prev]);
        // Feedback visual poderia ser adicionado aqui
    }, []);

    const handleLikePost = useCallback((postId: string) => {
        setFeedPosts(prev => prev.map(post => {
            if (post.id === postId) {
                const isLiked = post.likedBy.includes(user?.id || 'anon');
                return {
                    ...post,
                    likes: isLiked ? post.likes - 1 : post.likes + 1,
                    likedBy: isLiked ? post.likedBy.filter(id => id !== (user?.id || 'anon')) : [...post.likedBy, user?.id || 'anon']
                };
            }
            return post;
        }));
    }, [user]);

    const handleAcceptCall = useCallback(() => {
        setAiCallState(prev => ({ ...prev, isActive: true, incoming: false }));

        const card = cards.find(c => c.id === aiCallState.cardId);
        if (card) {
            const prompt = aiCallState.reason === 'motivation'
                ? `Oi! Notei que você adiou "${card.title}" algumas vezes ou o desempenho caiu. Não desanima! Lembre-se do seu objetivo. Como posso te ajudar a focar agora?`
                : `Parabéns pela dedicação em "${card.title}"! Você compartilhou isso no feed e está inspirando outros. Continue assim! Precisa de algo para o próximo passo?`;

            speakText(prompt).catch(console.error);
        }
    }, [aiCallState, cards]);

    const handleEndCall = useCallback(() => {
        setAiCallState(prev => ({ ...prev, isActive: false, incoming: false }));
    }, []);


    // --- Sub-card Progress Calculation ---
    const calculateParentProgress = useCallback((parentId: string, allCards: CardData[], visited = new Set<string>()): number => {
        if (visited.has(parentId)) return 0;
        visited.add(parentId);

        const children = allCards.filter(c => c.parentId === parentId);
        if (children.length === 0) {
            // If a card has no children, its progress is based on its own status
            const self = allCards.find(c => c.id === parentId);
            return self?.status === 'completed' ? 100 : 0;
        }

        let totalProgress = 0;
        children.forEach(child => {
            const childSubCards = allCards.filter(c => c.parentId === child.id);
            if (childSubCards.length > 0) {
                // If the child is also a parent, recurse
                totalProgress += calculateParentProgress(child.id, allCards, visited);
            } else {
                // Otherwise, use its own status
                totalProgress += child.status === 'completed' ? 100 : 0;
            }
        });

        return totalProgress / children.length;
    }, []);

    useEffect(() => {
        const allParents = Array.from(new Set(cards.map(c => c.parentId).filter(Boolean))) as string[];

        allParents.forEach(parentId => {
            const parent = cards.find(c => c.id === parentId);
            if (!parent) return;

            const newProgress = calculateParentProgress(parentId, cards);

            // Only update if progress actually changed to avoid infinite loop
            if (Math.abs((parent.progress || 0) - newProgress) > 0.1) {
                handleUpdateCard(parentId, { progress: newProgress });
            }
        });
    }, [cards, calculateParentProgress, handleUpdateCard]);

    const handleAddNote = useCallback(() => {
        // Create a yellow note
        handleAddCard(undefined, {
            title: "New Note",
            description: "Write something...",
            color: 'yellow',
            type: 'note',
            timerTotal: 0,
            timerRemaining: 0
        });
    }, [handleAddCard]);

    const handleAddNoteToCard = useCallback((parentId: string) => {
        const parentCard = cards.find(c => c.id === parentId);
        if (!parentCard) return;

        const newNoteData: Partial<CardData> = {
            type: 'note',
            title: 'New Note',
            description: 'Attached note...',
            color: 'yellow',
            x: parentCard.x,
            y: parentCard.y,
            isInternal: true
        };
        handleAddCard(parentId, newNoteData);
    }, [cards, handleAddCard]);

    const handleAutoDuration = useCallback(async (id: string) => {
        const card = cards.find(c => c.id === id);
        if (!card) return;

        // Show loading feedback?
        const duration = await estimateTaskDuration(card.title, card.description);
        handleUpdateCard(id, { timerTotal: duration * 60, timerRemaining: duration * 60 });
        speakText(`I've set the timer to ${duration} minutes.`);
    }, [cards, handleUpdateCard]);

    const handleBatchUpdate = useCallback((updates: { id: string, data: Partial<CardData> }[]) => {
        setCards(prev => {
            const newCards = [...prev];
            updates.forEach(u => {
                const idx = newCards.findIndex(c => c.id === u.id);
                if (idx !== -1) {
                    newCards[idx] = { ...newCards[idx], ...u.data };
                    if (user) {
                        persistenceService.saveCard(user.id, newCards[idx]).catch(console.error);
                    }
                }
            });
            return newCards;
        });
    }, [user]);

    const deleteCard = useCallback((id: string) => {
        setCards(prev => prev.filter(c => c.id !== id));
        setConnections(prev => prev.filter(c => c.fromId !== id && c.toId !== id));
        if (user) {
            persistenceService.deleteCard(id).catch(console.error);
        }
    }, [user]);

    const isCardExpanded = useCallback((card: CardData, visited = new Set<string>()): boolean => {
        if (!card.parentId) return true;
        if (visited.has(card.id)) return false; // Cycle detected
        visited.add(card.id);
        const parent = cards.find(p => p.id === card.parentId);
        if (!parent) return true;
        return (parent.isExpanded ?? true) && isCardExpanded(parent, visited);
    }, [cards]);

    const cardsToRender = useMemo(() => {
        if (canvasFilters.hideAll) return [];

        if (isFocusMode && selectedCardId) {
            return cards.filter(c => c.id === selectedCardId);
        }
        return cards.filter(c => {
            if (isFocusMode && selectedCardId && c.id !== selectedCardId) return false;

            if (c.status === 'pending' && !canvasFilters.showPending) return false;
            if (c.status === 'completed' && !canvasFilters.showCompleted) return false;
            if (c.type === 'media' && !canvasFilters.showMedia) return false;
            if (c.type === 'note' && !canvasFilters.showNotes) return false;

            const matchesColor = filterColor === 'all' || c.color === filterColor;

            const activeTags = [...filterTags, ...canvasFilters.selectedTags];
            const matchesTags = activeTags.length === 0 || (c.tags && activeTags.some(t => c.tags.includes(t)));

            const query = tagSearchQuery.toLowerCase().trim();
            const matchesSearchQuery = !query || (c.tags && c.tags.some(t => t.toLowerCase().includes(query))) || (c.title && c.title.toLowerCase().includes(query));

            return isCardExpanded(c) && matchesColor && matchesTags && matchesSearchQuery;
        });
    }, [cards, isFocusMode, selectedCardId, filterColor, filterTags, isCardExpanded, canvasFilters, tagSearchQuery]);

    const visibleCardIds = useMemo(() => new Set(cardsToRender.map(c => c.id)), [cardsToRender]);

    const handleSelectCard = useCallback((id: string) => {
        setSelectedCardId(id);
    }, []);

    // Automatic camera centering in Focus Mode
    useEffect(() => {
        if (isFocusMode && isCameraLocked && selectedCardId) {
            // Small delay to ensure the card is rendered and positioned
            const timer = setTimeout(() => centerCameraOnCard(selectedCardId, 1.2), 100);
            return () => clearTimeout(timer);
        }
    }, [isFocusMode, isCameraLocked, selectedCardId, centerCameraOnCard]);


    const handleCardDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, id: string) => {
        e.stopPropagation();
        if (isFocusMode) return; // Disable dragging in focus mode
        setDraggingCardId(id);
        setSelectedCardId(id);

        // Initialize lastTouchRef for mobile dragging
        if ('touches' in e) {
            const touch = e.touches[0];
            lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        }
    }, [isFocusMode]);

    const handleCardResizeStart = useCallback((
        e: React.MouseEvent,
        cardId: string,
        handle: string
    ) => {
        e.stopPropagation();
        const card = cards.find(c => c.id === cardId);
        if (!card) return;

        const cardWidth = card.width || (card.shape === 'circle' ? 256 : 256);
        let cardHeight = card.height;
        if (typeof cardHeight !== 'number') {
            cardHeight = 256;
        }

        setIsResizing(true);
        setResizeStartInfo({
            cardId,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            cardX: card.x,
            cardY: card.y,
            cardWidth: cardWidth,
            cardHeight: cardHeight,
            aspectRatio: card.aspectRatio,
        });
    }, [cards]);

    const handleConnectStart = useCallback((id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (isFocusMode) return;
        setConnectingFromId(id);

        if (e) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const worldX = (e.clientX - rect.left - centerX - camera.x) / camera.zoom;
                const worldY = (e.clientY - rect.top - centerY - camera.y) / camera.zoom;
                setConnectingMousePos({ x: worldX, y: worldY });
            }
        }
    }, [isFocusMode, camera, containerRef]);

    const handleConnectEnd = useCallback((toId: string) => {
        if (connectingFromId && connectingFromId !== toId) {
            const newConn: Connection = { id: crypto.randomUUID(), fromId: connectingFromId, toId: toId };
            setConnections(prev => [...prev, newConn]);
            if (user) {
                persistenceService.saveConnection(user.id, newConn).catch(console.error);
            }
        }
        setConnectingFromId(null);
    }, [connectingFromId, user]);

    const handleBreakdown = useCallback((parentId: string, steps: any[]) => {
        setCards(prevCards => {
            const parent = prevCards.find(c => c.id === parentId);
            if (!parent) return prevCards;

            const newCards: CardData[] = [];
            const newConns: Connection[] = [];
            let lastId = parentId;

            steps.forEach((step, idx) => {
                const id = crypto.randomUUID();
                newCards.push({
                    id,
                    x: parent.x + 300,
                    y: parent.y + (idx * 250) - (steps.length * 100),
                    title: step.title,
                    description: step.description,
                    color: parent.color,
                    timerTotal: step.duration * 60,
                    timerRemaining: step.duration * 60,
                    status: 'pending',
                    notes: [],
                    tags: [],
                    completionCount: 0,
                    attachments: [],
                    intervals: { count: 1, duration: step.duration * 60 },
                    aiThoughts: [],
                    parentId: parentId
                });
                newConns.push({ id: crypto.randomUUID(), fromId: lastId, toId: id, label: `Step ${idx + 1}` });
                lastId = id;
            });

            setTimeout(() => {
                setConnections(c => [...c, ...newConns]);
                if (user) {
                    newConns.forEach(conn => persistenceService.saveConnection(user.id, conn).catch(console.error));
                }
            }, 0);

            if (user) {
                newCards.forEach(card => persistenceService.saveCard(user.id, card).catch(console.error));
            }

            return [...prevCards, ...newCards];
        });
    }, [user]);

    // --- Order & Routine Handlers ---
    const handleReorderCards = (newOrder: CardData[]) => {
        setCards(newOrder);
    };

    const advanceToNextTaskInRoutine = useCallback((currentCards: CardData[], routineIds: string[]) => {
        // Find the first task in the routine list that is pending
        let nextId = null;

        // Iterate through the routine IDs in order
        for (const id of routineIds) {
            const card = currentCards.find(c => c.id === id);
            if (card && card.status === 'pending') {
                nextId = id;
                break;
            }
        }

        if (nextId) {
            setCards(prev => prev.map(c => c.id === nextId ? { ...c, status: 'active' } : c));
            setSelectedCardId(nextId);
            if (isCameraLocked) {
                setTimeout(() => centerCameraOnCard(nextId, 1.2), 50);
            }
        } else {
            speakText("All tasks in this routine are finished.");
            setIsFocusMode(false);
            setCamera(prev => ({ ...prev, zoom: 1 }));
        }
    }, [centerCameraOnCard, isCameraLocked]);

    const handleStartRoutine = (orderedList?: CardData[]) => {
        let routineIds: string[] = [];
        let listToUse = cards;

        // If specific list provided (Drag Drop Modal or Event)
        if (orderedList) {
            routineIds = orderedList.map(c => c.id);
            const idsSet = new Set(routineIds);
            // Reorder global cards to match the modal's order + others appended
            const others = cards.filter(c => !idsSet.has(c.id));
            listToUse = [...orderedList, ...others];
            setCards(listToUse);
        } else {
            // Default: all cards are in the routine
            routineIds = cards.map(c => c.id);
        }

        setActiveRoutineIds(routineIds);

        // Reset status for cards in this routine (including completed ones if they are part of the target)
        const updatedCards = listToUse.map(c => {
            const isInRoutine = routineIds.includes(c.id);
            // If it's the target card or currently active, reset to pending to allow working on it again
            if (isInRoutine && (c.status === 'active' || c.status === 'completed' || c.id === selectedCardId)) {
                return { ...c, status: 'pending' as const };
            }
            return c;
        });
        setCards(updatedCards);

        // Trigger start
        setIsTaskOrderModalOpen(false);
        setIsFocusMode(true);
        setIsCameraLocked(true);

        // We need to pass the *updated* cards to advance logic
        setTimeout(() => advanceToNextTaskInRoutine(updatedCards, routineIds), 0);
    };

    const handleStopRoutine = useCallback(() => {
        setCards(prev => prev.map(c => c.status === 'active' ? { ...c, status: 'pending' } : c));
        setIsFocusMode(false);
        setActiveRoutineIds([]);
        setCamera(prev => ({ ...prev, zoom: 1 }));
        speakText("Routine stopped.");
    }, []);

    const handleCompleteTask = useCallback((id: string, metadata?: { startedAt?: number, endedAt?: number, idleDuration?: number }) => {
        setCards(prev => {
            const card = prev.find(c => c.id === id);
            if (!card) return prev;

            const target = card.targetMicroTasks || 0;
            const current = card.microTaskCount || 0;

            // Check children: if any child is not completed, parent is also incomplete (brown)
            const children = prev.filter(c => c.parentId === id);
            const childrenAllDone = children.every(c => c.status === 'completed');

            const isFullyComplete = (target === 0 || current >= target) && childrenAllDone;

            const newRecord: CompletionRecord = {
                id: crypto.randomUUID(),
                index: (card.completionHistory?.length || 0) + 1,
                type: isFullyComplete ? 'completed' : 'not_finished',
                completedAt: Date.now(),
                startedAt: metadata?.startedAt,
                endedAt: metadata?.endedAt,
                duration: metadata?.startedAt && metadata?.endedAt ? Math.floor((metadata.endedAt - metadata.startedAt) / 1000) : 0,
                idleDuration: metadata?.idleDuration || 0
            };

            // 1. Mark current as completed
            const updated = prev.map(c => {
                if (c.id === id) {
                    return {
                        ...c,
                        status: 'completed',
                        timerRemaining: 0,
                        completionCount: isFullyComplete ? (c.completionCount || 0) + 1 : (c.completionCount || 0),
                        incompleteCount: !isFullyComplete ? (c.incompleteCount || 0) + 1 : (c.incompleteCount || 0),
                        lastCompleted: Date.now(),
                        completionHistory: [...(c.completionHistory || []), newRecord]
                    } as CardData;
                }

                // If it's a child card being completed, increment the PARENT'S microTaskCount (teal)
                if (c.id === card.parentId) {
                    return {
                        ...c,
                        microTaskCount: (c.microTaskCount || 0) + 1
                    } as CardData;
                }

                // If it's a child of the current card being completed, also complete it
                if (c.parentId === id && c.status !== 'completed') {
                    return {
                        ...c,
                        status: 'completed',
                        timerRemaining: 0,
                        lastCompleted: Date.now()
                    } as CardData;
                }

                return c;
            });

            // 2. Advance to next
            // We need to run the advance logic *after* state update, but we are inside setState.
            // So we do the find logic here manually.
            let nextId: string | null = null;
            if (activeRoutineIds.length > 0) {
                for (const rid of activeRoutineIds) {
                    const c = updated.find(x => x.id === rid);
                    if (c && c.status === 'pending') {
                        nextId = rid;
                        break;
                    }
                }
            } else {
                // Fallback if no routine is defined (just find next pending in global list)
                const next = updated.find(c => c.status === 'pending');
                if (next) nextId = next.id;
            }

            if (nextId) {
                // Activate next
                const finalUpdate = updated.map(c => c.id === nextId ? { ...c, status: 'active' } as CardData : c);

                // Side effects (Camera)
                setTimeout(() => {
                    setSelectedCardId(nextId);
                    if (isCameraLocked) centerCameraOnCard(nextId!, 1.2);
                }, 50);

                // --- Auto-share/Motivation on Incomplete ---
                if (sidebarSettings.autoShareIncomplete) {
                    setTimeout(() => {
                        setAiCallState({
                            isActive: false,
                            incoming: true,
                            cardId: id,
                            callerName: 'Chronos IA',
                            callerAvatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Chronos&backgroundColor=b6e3f4',
                            reason: 'motivation'
                        });
                    }, 2000);
                }

                return finalUpdate;
            } else {
                // Routine done
                setTimeout(() => {
                    speakText("Routine complete!");
                    setIsFocusMode(false);
                    setCamera(prev => ({ ...prev, zoom: 1 }));
                }, 500);

                if (sidebarSettings.autoShareIncomplete) {
                    setTimeout(() => {
                        setAiCallState({
                            isActive: false,
                            incoming: true,
                            cardId: id,
                            callerName: 'Chronos IA',
                            callerAvatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Chronos&backgroundColor=b6e3f4',
                            reason: 'motivation'
                        });
                    }, 2000);
                }

                return updated;
            }
        });
    }, [activeRoutineIds, isCameraLocked, centerCameraOnCard, sidebarSettings.autoShareIncomplete]);

    const handleSnooze = useCallback((id: string, metadata?: { startedAt?: number, endedAt?: number, idleDuration?: number }) => {
        setCards(prev => {
            const card = prev.find(c => c.id === id);
            if (!card) return prev;

            const newRecord: CompletionRecord = {
                id: crypto.randomUUID(),
                index: (card.completionHistory?.length || 0) + 1,
                type: 'deferred',
                completedAt: Date.now(),
                startedAt: metadata?.startedAt,
                endedAt: metadata?.endedAt,
                duration: metadata?.startedAt && metadata?.endedAt ? Math.floor((metadata.endedAt - metadata.startedAt) / 1000) : 0,
                idleDuration: metadata?.idleDuration || 0
            };

            const updated = prev.map(c => c.id === id ? { 
                ...c, 
                status: 'pending',
                completionHistory: [...(c.completionHistory || []), newRecord]
            } as CardData : c);

            // Reorder the routine IDs: move this ID to the end
            if (activeRoutineIds.includes(id)) {
                const newOrder = activeRoutineIds.filter(x => x !== id).concat(id);
                setActiveRoutineIds(newOrder); // Update routine order state

                // Now find next in the NEW order
                let nextId = null;
                for (const rid of newOrder) {
                    const c = updated.find(x => x.id === rid);
                    if (c && c.status === 'pending') {
                        nextId = rid;
                        break;
                    }
                }

                if (nextId) {
                    const finalUpdate = updated.map(c => c.id === nextId ? { ...c, status: 'active' } as CardData : c);
                    setTimeout(() => {
                        setSelectedCardId(nextId);
                        if (isCameraLocked) centerCameraOnCard(nextId!, 1.2);
                    }, 50);

                    // --- Auto-share/Motivation on Snooze ---
                    if (sidebarSettings.autoShareIncomplete) {
                        setTimeout(() => {
                            setAiCallState({
                                isActive: false,
                                incoming: true,
                                cardId: id,
                                callerName: 'Chronos IA',
                                callerAvatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Chronos&backgroundColor=b6e3f4',
                                reason: 'motivation'
                            });
                        }, 2000);
                    }

                    return finalUpdate;
                }
            }
            return updated;
        });
    }, [activeRoutineIds, isCameraLocked, centerCameraOnCard, sidebarSettings.autoShareIncomplete]);

    const handleIncompleteTask = useCallback((id: string, metadata?: { startedAt?: number, endedAt?: number, idleDuration?: number }) => {
        setCards(prev => {
            const card = prev.find(c => c.id === id);
            if (!card) return prev;

            const newRecord: CompletionRecord = {
                id: crypto.randomUUID(),
                index: (card.completionHistory?.length || 0) + 1,
                type: 'not_finished',
                completedAt: Date.now(),
                startedAt: metadata?.startedAt,
                endedAt: metadata?.endedAt,
                duration: metadata?.startedAt && metadata?.endedAt ? Math.floor((metadata.endedAt - metadata.startedAt) / 1000) : 0,
                idleDuration: metadata?.idleDuration || 0
            };

            const updated = prev.map(c => {
                if (c.id === id) {
                    return {
                        ...c,
                        status: 'completed',
                        timerRemaining: 0,
                        incompleteCount: (c.incompleteCount || 0) + 1,
                        lastCompleted: Date.now(),
                        completionHistory: [...(c.completionHistory || []), newRecord]
                    } as CardData;
                }
                return c;
            });

            let nextId = null;
            if (activeRoutineIds.length > 0) {
                for (const rid of activeRoutineIds) {
                    const c = updated.find(x => x.id === rid);
                    if (c && c.status === 'pending') {
                        nextId = rid;
                        break;
                    }
                }
            } else {
                const next = updated.find(c => c.status === 'pending');
                if (next) nextId = next.id;
            }

            if (nextId) {
                const finalUpdate = updated.map(c => c.id === nextId ? { ...c, status: 'active' } as CardData : c);
                setTimeout(() => {
                    setSelectedCardId(nextId);
                    if (isCameraLocked) centerCameraOnCard(nextId!, 1.2);
                }, 50);
                return finalUpdate;
            } else {
                setTimeout(() => {
                    speakText("Routine finished.");
                    setIsFocusMode(false);
                    setCamera(prev => ({ ...prev, zoom: 1 }));
                }, 500);
                return updated;
            }
        });
    }, [activeRoutineIds, isCameraLocked, centerCameraOnCard]);

    const handleSkip = useCallback((id: string, metadata?: { startedAt?: number, endedAt?: number, idleDuration?: number }) => {
        setCards(prev => {
            const card = prev.find(c => c.id === id);
            if (!card) return prev;

            const newRecord: CompletionRecord = {
                id: crypto.randomUUID(),
                index: (card.completionHistory?.length || 0) + 1,
                type: 'deferred',
                completedAt: Date.now(),
                startedAt: metadata?.startedAt,
                endedAt: metadata?.endedAt,
                duration: metadata?.startedAt && metadata?.endedAt ? Math.floor((metadata.endedAt - metadata.startedAt) / 1000) : 0,
                idleDuration: metadata?.idleDuration || 0
            };

            const updated = prev.map(c => c.id === id ? { 
                ...c, 
                status: 'skipped', 
                timerRemaining: 0,
                completionHistory: [...(c.completionHistory || []), newRecord]
            } as CardData : c);

            // Find next in current routine
            let nextId = null;
            if (activeRoutineIds.length > 0) {
                for (const rid of activeRoutineIds) {
                    const c = updated.find(x => x.id === rid);
                    if (c && c.status === 'pending') {
                        nextId = rid;
                        break;
                    }
                }
            }

            if (nextId) {
                const finalUpdate = updated.map(c => c.id === nextId ? { ...c, status: 'active' } as CardData : c);
                setTimeout(() => {
                    setSelectedCardId(nextId);
                    if (isCameraLocked) centerCameraOnCard(nextId!, 1.2);
                }, 50);

                // --- Auto-share/Motivation on Skip ---
                if (sidebarSettings.autoShareIncomplete) {
                    setTimeout(() => {
                        setAiCallState({
                            isActive: false,
                            incoming: true,
                            cardId: id,
                            callerName: 'Chronos IA',
                            callerAvatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Chronos&backgroundColor=b6e3f4',
                            reason: 'motivation'
                        });
                    }, 2000);
                }

                return finalUpdate;
            }
            return updated;
        });
    }, [activeRoutineIds, isCameraLocked, centerCameraOnCard, sidebarSettings.autoShareIncomplete]);


    // --- Schedule Handlers ---
    const handleSaveEvent = (newEvent: EventGroup) => {
        setEvents(prev => [...prev, newEvent]);
    };

    const handleDeleteEvent = (eventId: string) => {
        setEvents(prev => prev.filter(e => e.id !== eventId));
    };

    const handleApplySchedule = (updates: Array<{ id: string; start: string; end: string }>) => {
        setCards(prev => prev.map(c => {
            const update = updates.find(u => u.id === c.id);
            if (update) {
                return { ...c, scheduledStart: update.start, scheduledEnd: update.end };
            }
            return c;
        }));
        // Provide feedback
        const msg = `Scheduled ${updates.length} tasks successfully.`;
        setChatMessages(prev => [...prev, { role: 'model', text: msg, timestamp: Date.now() }]);
        speakText(msg);
    };

    const handleUnscheduleTask = (cardId: string) => {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, scheduledStart: undefined, scheduledEnd: undefined } : c));
    };

    const toggleFocusMode = () => {
        if (!isFocusMode) {
            // Entering focus mode
            let targetId = selectedCardId;
            if (!targetId) {
                const active = cards.find(c => c.status === 'active');
                targetId = active ? active.id : cards[0]?.id;
            }

            if (targetId) {
                setSelectedCardId(targetId);
                centerCameraOnCard(targetId, 1.2);
                setIsFocusMode(true);
                setIsCameraLocked(true); // Reset to locked on enter
            }
        } else {
            handleStopRoutine(); // Exiting via toggle acts as stop
        }
    };



    const handleGroupByTags = useCallback(() => {
        setCards(prev => {
            const rootCards = prev.filter(c => !c.parentId);
            const groups: Record<string, CardData[]> = {};

            // Group by first tag or "Untagged"
            rootCards.forEach(card => {
                const primaryTag = card.tags && card.tags.length > 0 ? card.tags[0] : 'Untagged';
                if (!groups[primaryTag]) groups[primaryTag] = [];
                groups[primaryTag].push(card);
            });

            const updatedCards = [...prev];
            const groupNames = Object.keys(groups).sort();
            const cardsPerColumn = 4;
            const horizontalGap = 400;
            const verticalGap = 350;

            groupNames.forEach((tag, groupIdx) => {
                const col = groupIdx % cardsPerColumn;
                const row = Math.floor(groupIdx / cardsPerColumn);

                const startX = col * horizontalGap * 1.5;
                const startY = row * verticalGap * 4;

                groups[tag].forEach((card, cardIdx) => {
                    const cIdx = updatedCards.findIndex(c => c.id === card.id);
                    if (cIdx !== -1) {
                        updatedCards[cIdx] = {
                            ...updatedCards[cIdx],
                            x: startX + (cardIdx % 2) * horizontalGap,
                            y: startY + Math.floor(cardIdx / 2) * verticalGap
                        };
                    }
                });
            });

            return updatedCards;
        });
        speakText("Cards organized by tags.");
    }, []);

    // --- Camera-only handler (independent of AI) ---
    const handleToggleCamera = useCallback(async () => {
        if (isVisionModeOpen) {
            // Close camera: stop tracks and disconnect AI if active
            if (liveVideoStream) {
                liveVideoStream.getTracks().forEach(t => t.stop());
                setLiveVideoStream(null);
            }
            if (isLiveSessionActive && disconnectLiveSessionRef.current) {
                disconnectLiveSessionRef.current();
                disconnectLiveSessionRef.current = null;
                setIsLiveSessionActive(false);
            }
            setIsVisionModeOpen(false);
            return;
        }

        // Open camera independently — always works regardless of AI
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode },
                audio: false
            });
            setLiveVideoStream(stream);
            setIsVisionModeOpen(true);

            // If AI is connected, try to attach live session on top
            if (aiStatus === 'connected' && !isLiveSessionActive && !isConnectingRef.current) {
                isConnectingRef.current = true;
                if (isVoiceMode) setIsVoiceMode(false);
                const disconnect = await connectLiveSession(
                    (habit, implication) => {
                        setCards(prev => {
                            let insightsCard = prev.find(c => c.title === "🧠 User Insights");
                            if (!insightsCard) {
                                const newCard: CardData = {
                                    id: crypto.randomUUID(),
                                    x: -camera.x + 100,
                                    y: -camera.y + 100,
                                    title: "🧠 User Insights",
                                    description: "AI-observed habits and behavioral patterns.",
                                    color: 'purple',
                                    timerTotal: 0,
                                    timerRemaining: 0,
                                    status: 'pending',
                                    notes: [],
                                    tags: ['ai-insights'],
                                    completionCount: 0,
                                    attachments: [],
                                    aiThoughts: [{ timestamp: Date.now(), content: `OBSERVATION: ${habit}\nIMPLICATION: ${implication}` }],
                                };
                                if (user) persistenceService.saveCard(user.id, newCard).catch(console.error);
                                return [...prev, newCard];
                            } else {
                                const finalUpdate = prev.map(c => c.id === insightsCard!.id ? { ...c, aiThoughts: [...(c.aiThoughts || []), { timestamp: Date.now(), content: `OBSERVATION: ${habit}\nIMPLICATION: ${implication}` }] } : c);
                                if (user) { const uc = finalUpdate.find(x => x.id === insightsCard!.id); if (uc) persistenceService.saveCard(user.id, uc).catch(console.error); }
                                return finalUpdate;
                            }
                        });
                    },
                    (isActive) => {
                        setIsLiveSessionActive(isActive);
                        isConnectingRef.current = false;
                        if (!isActive) {
                            // AI disconnected but camera stays open
                            setIsLiveSessionActive(false);
                        }
                    },
                    (aiStream) => {
                        // AI may provide its own stream; prefer user-opened camera
                        if (!liveVideoStream) setLiveVideoStream(aiStream);
                    },
                    (text, isUser) => {
                        setVoiceChatMessages(prev => [...prev, { id: crypto.randomUUID(), text, isUser, timestamp: Date.now() }]);
                    },
                    facingMode,
                    (cardId, newStartTime) => { handleScheduleCard(cardId, newStartTime, 0); },
                    cards,
                    aiVoice,
                    aiLanguage,
                    isFastMode
                );
                disconnectLiveSessionRef.current = disconnect as any;
            }
        } catch (err) {
            console.error('Camera access denied or unavailable:', err);
            alert('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
        }
    }, [isVisionModeOpen, liveVideoStream, isLiveSessionActive, aiStatus, isVoiceMode, facingMode, camera, user, cards]);

    // --- Live Session Handler (Audio/VoiceChat only — camera already handled separately) ---
    const handleToggleLiveSession = useCallback(async (mode: 'audio' | 'vision' | 'voice_chat' = 'audio') => {
        // Redirect vision mode to the new independent camera handler
        if (mode === 'vision') {
            handleToggleCamera();
            return;
        }

        // Prevent race conditions
        if (isConnectingRef.current) return;

        if (isLiveSessionActive) {
            if (mode === 'voice_chat' && !isVoiceChatOpen) {
                setIsVoiceChatOpen(true);
                return;
            }

            // Disconnect audio/voice_chat session
            if (disconnectLiveSessionRef.current) {
                disconnectLiveSessionRef.current();
                disconnectLiveSessionRef.current = null;
            }
            setIsLiveSessionActive(false);
            setIsVoiceChatOpen(false);
        } else {
            // Start audio/voice_chat session only
            isConnectingRef.current = true;
            if (isVoiceMode) setIsVoiceMode(false);
            if (mode === 'voice_chat') setIsVoiceChatOpen(true);

            const disconnect = await connectLiveSession(
                (habit, implication) => {
                    // CALLBACK: When habit is detected by AI
                    setCards(prev => {
                        // Find or create "User Insights" card
                        let insightsCard = prev.find(c => c.title === "🧠 User Insights");

                        if (!insightsCard) {
                            const newCard: CardData = {
                                id: crypto.randomUUID(),
                                x: -camera.x + 100,
                                y: -camera.y + 100,
                                title: "🧠 User Insights",
                                description: "AI-observed habits and behavioral patterns.",
                                color: 'purple',
                                timerTotal: 0,
                                timerRemaining: 0,
                                status: 'pending',
                                notes: [],
                                tags: ['ai-insights'],
                                completionCount: 0,
                                attachments: [],
                                aiThoughts: [],
                            };
                            // Add new thought immediately
                            newCard.aiThoughts = [{
                                timestamp: Date.now(),
                                content: `OBSERVATION: ${habit}\nIMPLICATION: ${implication}`
                            }];
                            const updated = [...prev, newCard];
                            if (user) persistenceService.saveCard(user.id, newCard).catch(console.error);
                            return updated;
                        } else {
                            // Update existing
                            const finalUpdate = prev.map(c => c.id === insightsCard!.id ? {
                                ...c,
                                aiThoughts: [
                                    ...(c.aiThoughts || []),
                                    {
                                        timestamp: Date.now(),
                                        content: `OBSERVATION: ${habit}\nIMPLICATION: ${implication}`
                                    }
                                ]
                            } : c);
                            if (user) {
                                const updatedCard = finalUpdate.find(x => x.id === insightsCard!.id);
                                if (updatedCard) persistenceService.saveCard(user.id, updatedCard).catch(console.error);
                            }
                            return finalUpdate;
                        }
                    });
                },
                (isActive) => {
                    setIsLiveSessionActive(isActive);
                    isConnectingRef.current = false;
                    if (!isActive) {
                        setIsVoiceChatOpen(false);
                    }
                },
                (_stream) => {
                    // For audio/voice_chat sessions we don't update video stream
                },
                (text, isUser) => {
                    setVoiceChatMessages(prev => [...prev, {
                        id: crypto.randomUUID(),
                        text,
                        isUser,
                        timestamp: Date.now()
                    }]);
                },
                facingMode,
                (cardId, newStartTime) => {
                    handleScheduleCard(cardId, newStartTime, 0);
                },
                cards,
                aiVoice,
                aiLanguage,
                isFastMode
            );
            disconnectLiveSessionRef.current = disconnect as any;
        }
    }, [isLiveSessionActive, isVoiceChatOpen, isVoiceMode, handleToggleCamera, facingMode]);

    // NOTE: Live session no longer auto-starts on mount.
    // Camera and AI are now independent — user opens camera manually via the Vision button.

    // --- Zoom to Cursor Logic ---
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (isFocusMode && isCameraLocked) return;

        // Block canvas zoom if scrolling inside a card
        const target = e.target as HTMLElement;
        if (target.closest('.custom-scrollbar') || target.closest('.card-node')) {
            // If the card is selected, we definitely only want to scroll it
            if (selectedCardId) return;

            // Even if not selected, if it's scrollable content, we prioritize it over canvas zoom
            // unless the user is holding Ctrl/Meta (standard behavior)
            if (!e.ctrlKey && !e.metaKey) return;
        }

        if (e.ctrlKey || e.metaKey || true) {
            const container = containerRef.current;
            if (!container) return;
            const rect = container.getBoundingClientRect();

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const mouseRelX = mouseX - centerX;
            const mouseRelY = mouseY - centerY;

            const worldX = (mouseRelX - camera.x) / camera.zoom;
            const worldY = (mouseRelY - camera.y) / camera.zoom;

            const zoomSensitivity = 0.001;
            const zoomFactor = Math.exp(-e.deltaY * zoomSensitivity);
            const newZoom = Math.min(Math.max(0.1, camera.zoom * zoomFactor), 5);

            const newCamX = mouseRelX - (worldX * newZoom);
            const newCamY = mouseRelY - (worldY * newZoom);

            setCamera({
                x: newCamX,
                y: newCamY,
                zoom: newZoom
            });
        }
    }, [camera, isFocusMode, isCameraLocked, selectedCardId]);

    const handleZoomIn = useCallback(() => {
        setCamera(prev => ({
            ...prev,
            zoom: Math.min(5, prev.zoom * 1.2)
        }));
    }, []);

    const handleZoomOut = useCallback(() => {
        setCamera(prev => ({
            ...prev,
            zoom: Math.max(0.1, prev.zoom / 1.2)
        }));
    }, []);

    const handleResetCamera = useCallback(() => {
        setCamera({ x: 0, y: 0, zoom: 1 });
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isFocusMode && isCameraLocked) return; // Disable drag in locked mode
        if (e.button === 1 || e.button === 0) {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
            setSelectedCardId(null); // Deselect when clicking on canvas
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const start = performance.now();
        if (draggingCardId && !isFocusMode) {
            const dx = (e.movementX) / camera.zoom;
            const dy = (e.movementY) / camera.zoom;
            setCards(prev => prev.map(c => c.id === draggingCardId ? { ...c, x: c.x + dx, y: c.y + dy } : c));
        } else if (isResizing && resizeStartInfo) {
            const { cardId, handle, startX, startY, cardX, cardY, cardWidth, cardHeight, aspectRatio } = resizeStartInfo;

            const dx = (e.clientX - startX) / camera.zoom;
            const dy = (e.clientY - startY) / camera.zoom;

            let newX = cardX;
            let newY = cardY;
            let newWidth = cardWidth;
            let newHeight = cardHeight;

            const minSize = 50;

            if (handle.includes('right')) newWidth = cardWidth + dx;
            if (handle.includes('left')) newWidth = cardWidth - dx;
            if (handle.includes('bottom')) newHeight = cardHeight + dy;
            if (handle.includes('top')) newHeight = cardHeight - dy;

            if (aspectRatio) {
                if (handle.includes('left') || handle.includes('right')) {
                    newHeight = newWidth / aspectRatio;
                } else { // top, bottom, and corners
                    newWidth = newHeight * aspectRatio;
                }
            }

            if (handle.includes('left')) newX = cardX + (cardWidth - newWidth);
            if (handle.includes('top')) newY = cardY + (cardHeight - newHeight);

            // Clamp to min size
            if (newWidth < minSize) newWidth = minSize;
            if (newHeight < minSize) newHeight = minSize;

            handleUpdateCard(cardId, {
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight
            });
        } else if (connectingFromId) {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const worldX = (e.clientX - rect.left - centerX - camera.x) / camera.zoom;
                const worldY = (e.clientY - rect.top - centerY - camera.y) / camera.zoom;
                setConnectingMousePos({ x: worldX, y: worldY });
            }
        } else if (isDragging && (!isFocusMode || !isCameraLocked)) {
            const totalDist = Math.sqrt(
                Math.pow(e.clientX - dragStart.x, 2) +
                Math.pow(e.clientY - dragStart.y, 2)
            );
            if (totalDist > 3) {
                setCamera(prev => ({ ...prev, x: prev.x + e.movementX, y: prev.y + e.movementY }));
            }
        }

        const end = performance.now();
        if (Math.random() > 0.9) {
            setInteractionLatency(prev => Math.floor(prev * 0.9 + (end - start) * 0.1));
        }
    };

    const handleGlobalMouseUp = useCallback(() => {
        if (connectingFromId) {
            setConnectingFromId(null);
        }
        setIsDragging(false);
        setDraggingCardId(null);
        setIsResizing(false);
        setResizeStartInfo(null);
        lastTouchRef.current = null;
        initialPinchDistanceRef.current = null;
    }, [connectingFromId]);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isFocusMode && isCameraLocked) return;
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            setIsDragging(true);
            setDragStart({ x: touch.clientX, y: touch.clientY });
            lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dist = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            initialPinchDistanceRef.current = dist;
            setIsDragging(false);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 1 && lastTouchRef.current) {
            const touch = e.touches[0];
            const dx = touch.clientX - lastTouchRef.current.x;
            const dy = touch.clientY - lastTouchRef.current.y;

            const totalDist = Math.sqrt(
                Math.pow(touch.clientX - (dragStart.x || 0), 2) +
                Math.pow(touch.clientY - (dragStart.y || 0), 2)
            );

            if (totalDist < 5) return;

            if (draggingCardId && !isFocusMode) {
                const worldDx = dx / camera.zoom;
                const worldDy = dy / camera.zoom;
                setCards(prev => prev.map(c => c.id === draggingCardId ? { ...c, x: c.x + worldDx, y: c.y + worldDy } : c));
            } else if (isDragging && (!isFocusMode || !isCameraLocked)) {
                setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            }
            lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2 && initialPinchDistanceRef.current) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dist = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );

            const zoomFactor = dist / initialPinchDistanceRef.current;
            const sensitivity = 0.5;
            const newZoom = Math.min(Math.max(0.1, camera.zoom * (1 + (zoomFactor - 1) * sensitivity)), 5);

            setCamera(prev => ({ ...prev, zoom: newZoom }));
            initialPinchDistanceRef.current = dist;
        }
    };

    const handleFinishDrag = useCallback((clientX: number, clientY: number) => {
        if (connectingFromId) {
            if (!isFocusMode) {
                const { x: canvasX, y: canvasY } = screenToCanvas(clientX, clientY);
                setConnectionDropMenu({ x: canvasX, y: canvasY, parentId: connectingFromId });
            }
            setConnectingFromId(null);
        }

        if (draggingCardId) {
            const draggedCard = cards.find(c => c.id === draggingCardId);
            if (draggedCard) {
                const { x: mouseX, y: mouseY } = screenToCanvas(clientX, clientY);
                const parentCard = cardsToRender.find(c => {
                    if (c.id === draggingCardId) return false;
                    const cardWidth = c.width || (c.shape === 'circle' ? 256 : 256);
                    const cardHeight = c.height || (c.shape === 'circle' ? 256 : 300);
                    return (
                        mouseX >= c.x &&
                        mouseX <= c.x + cardWidth &&
                        mouseY >= c.y &&
                        mouseY <= c.y + cardHeight
                    );
                });

                if (parentCard) {
                    if (draggedCard.type === 'note') {
                        handleUpdateCard(draggedCard.id, { parentId: parentCard.id, isInternal: true });
                    } else if (draggedCard.type === 'media' && draggedCard.attachments?.[0]) {
                        const mediaAttachment = draggedCard.attachments[0];
                        handleUpdateCard(parentCard.id, {
                            attachments: [...(parentCard.attachments || []), mediaAttachment]
                        });
                        deleteCard(draggedCard.id);
                    }
                } else if (draggedCard.isInternal && draggedCard.type === 'note') {
                    handleUpdateCard(draggedCard.id, { isInternal: false });
                }
            }
        }

        setIsDragging(false);
        setDraggingCardId(null);
        setIsResizing(false);
        setResizeStartInfo(null);
        lastTouchRef.current = null;
        initialPinchDistanceRef.current = null;
    }, [connectingFromId, draggingCardId, cards, cardsToRender, screenToCanvas, isFocusMode, handleUpdateCard, deleteCard]);

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touch = e.changedTouches[0];
        if (touch) {
            handleFinishDrag(touch.clientX, touch.clientY);
        } else {
            setIsDragging(false);
            setDraggingCardId(null);
            lastTouchRef.current = null;
            initialPinchDistanceRef.current = null;
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        handleFinishDrag(e.clientX, e.clientY);
    };

    const handleCanvasDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();

        // Handle dragging element OUT of a card
        try {
            const json = e.dataTransfer.getData('application/json');
            if (json) {
                const data = JSON.parse(json);
                const { x: canvasX, y: canvasY } = screenToCanvas(e.clientX, e.clientY);

                if (data.element.type === 'calendar' || data.element.type === 'note' || data.element.type === 'text') {
                    // Extract as a new note card with proper pane configuration
                    e.dataTransfer.dropEffect = 'move';

                    // IF we have a sourceCardId, remove the element from it to prevent duplication
                    if (data.sourceCardId) {
                        setCards(prev => prev.map(c => {
                            if (c.id === data.sourceCardId) {
                                const panes = [...(c.panes || [])];
                                const activeIdx = data.sourcePaneIndex || 0;
                                if (panes[activeIdx]?.elements) {
                                    panes[activeIdx] = {
                                        ...panes[activeIdx],
                                        elements: panes[activeIdx].elements.filter(el => el.id !== data.element.id)
                                    };
                                    return { ...c, panes };
                                }
                            }
                            return c;
                        }));
                    }

                    handleAddCard(undefined, {
                        type: 'note',
                        title: data.element.title || (data.element.type === 'calendar' ? 'Agenda' : 'Nota ExtraÃ­da'),
                        description: data.element.type === 'calendar' ? '' : data.element.content,
                        x: canvasX,
                        y: canvasY,
                        color: data.element.type === 'calendar' ? 'blue' : 'gray',
                        width: 400,
                        height: 400,
                        visualSettings: {
                            showTitle: true,
                            showDescription: data.element.type !== 'calendar',
                            showTimer: false,
                            showImage: false,
                            showCompleteBtn: true,
                            showDeleteBtn: true,
                            showSchedule: true,
                            showIntervals: false,
                            showTags: true,
                            showAttachmentIndicator: true,
                            showAttachmentActions: true,
                            showLastCompleted: false,
                            showCompletionCount: false
                        },
                        panes: [
                            {
                                id: crypto.randomUUID(),
                                type: 'mixed',
                                elements: [
                                    {
                                        id: crypto.randomUUID(),
                                        type: data.element.type,
                                        content: data.element.content,
                                        timestamp: Date.now(),
                                        width: 380,
                                        height: 350
                                    }
                                ],
                                timestamp: Date.now()
                            }
                        ],
                        activePaneIndex: 0
                    });
                } else {
                    // Standard media extraction
                    const attachment: Attachment = {
                        id: crypto.randomUUID(),
                        type: data.element.type as any,
                        url: data.element.content,
                        timestamp: Date.now()
                    };

                    handleAddCard(undefined, {
                        type: 'media',
                        title: data.element.title || 'Extracted Media',
                        description: '',
                        x: canvasX,
                        y: canvasY,
                        attachments: [attachment]
                    });
                }

                e.dataTransfer.dropEffect = 'move';
                return;
            } else {
                // Handle external URL drops (e.g., dragging an image from a website)
                const uriList = e.dataTransfer.getData('text/uri-list');
                const plainText = e.dataTransfer.getData('text/plain');
                const url = uriList || (plainText && plainText.startsWith('http') ? plainText : null);

                if (url) {
                    const { x: canvasX, y: canvasY } = screenToCanvas(e.clientX, e.clientY);
                    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i);
                    const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
                    const isAudio = url.match(/\.(mp3|wav|ogg)$/i);

                    if (isImage || isVideo || isAudio) {
                        const attachment: Attachment = {
                            id: crypto.randomUUID(),
                            type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
                            url: url,
                            timestamp: Date.now()
                        };

                        handleAddCard(undefined, {
                            type: 'media',
                            title: isImage ? 'Imagem da Web' : isVideo ? 'VÃ­deo da Web' : 'Ã udio da Web',
                            description: '',
                            x: canvasX,
                            y: canvasY,
                            attachments: [attachment]
                        });
                        return;
                    }
                }
            }
        } catch (err) {
            console.error('Canvas drop processing error', err);
        }

        const files = Array.from(e.dataTransfer.files) as File[];
        if (files.length === 0) return;

        const { x: canvasX, y: canvasY } = screenToCanvas(e.clientX, e.clientY);

        files.forEach((file: File, index) => {
            const reader = new FileReader();
            reader.onload = () => {
                let type: 'image' | 'video' | 'audio' | 'gif' = 'image';
                if (file.type.startsWith('image/')) {
                    type = file.type.includes('gif') ? 'gif' : 'image';
                } else if (file.type.startsWith('video/')) {
                    type = 'video';
                } else if (file.type.startsWith('audio/')) {
                    type = 'audio';
                }

                const attachment: Attachment = {
                    id: crypto.randomUUID(),
                    type,
                    url: reader.result as string,
                    timestamp: Date.now()
                };

                handleAddCard(undefined, {
                    type: 'media',
                    title: file.name,
                    description: '',
                    x: canvasX + (index * 20),
                    y: canvasY + (index * 20),
                    attachments: [attachment]
                });
            };
            reader.readAsDataURL(file);
        });
    }, [screenToCanvas, handleAddCard]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // --- Popover Click Outside ---
    useEffect(() => {
        const handleClickOutsideModals = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (isFilterPopoverOpen && !target.closest('[data-filter-popover]')) {
                setIsFilterPopoverOpen(false);
            }
            if (isToolsPopoverOpen && !target.closest('[data-tools-popover]')) {
                setIsToolsPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutsideModals);
        return () => document.removeEventListener('mousedown', handleClickOutsideModals);
    }, [isFilterPopoverOpen, isToolsPopoverOpen]);

    // Keyboard Navigation & Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            // --- SHORTCUTS ---
            const key = e.key.toLowerCase();

            if (key === shortcuts.groupByTags) {
                handleGroupByTags();
            } else if (key === shortcuts.openCalendar) {
                setIsCalendarModalOpen(prev => !prev);
            } else if (key === shortcuts.createEvent) {
                setIsEventModalOpen(prev => !prev);
            } else if (key === shortcuts.createNote) {
                handleAddNote();
            } else if (key === shortcuts.toggleMic) {
                setIsVoiceMode(prev => !prev);
            }

            // FILTER CARDS based on user preferences
            const getFilteredCards = () => {
                return cards.filter(c => {
                    if (c.type === 'note' && !navFilters.allowNotes) return false;
                    if (c.type === 'media' && !navFilters.allowMedia) return false;
                    if (c.color === 'purple' && c.shape === 'circle' && !navFilters.allowNice) return false;
                    if (c.color === 'green' && c.shape === 'rectangle' && !navFilters.allowGreen) return false;
                    if (c.color === 'blue' && c.shape === 'rectangle' && !navFilters.allowClassic) return false;
                    if (c.tags?.includes('faster') && !navFilters.allowFaster) return false;
                    return true;
                });
            };

            const filteredCards = getFilteredCards();
            if (filteredCards.length === 0) return;

            // If no card selected, pick the first visible or closest to center
            let effectiveSelectedId = selectedCardId;
            if (!effectiveSelectedId || !filteredCards.find(c => c.id === effectiveSelectedId)) {
                if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                    effectiveSelectedId = filteredCards[0].id;
                    setSelectedCardId(effectiveSelectedId);
                    centerCameraOnCard(effectiveSelectedId, 1.0);
                }
                return;
            }

            if (isFocusMode && isCameraLocked) {
                // --- TASK ORDER NAVIGATION (LOCKED MODE) ---
                const listIds = activeRoutineIds.length > 0 ? activeRoutineIds : filteredCards.map(c => c.id);
                const currentIndex = listIds.indexOf(effectiveSelectedId!);

                if (currentIndex === -1) return;

                let nextIndex = -1;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = currentIndex + 1;
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = currentIndex - 1;

                if (nextIndex >= 0 && nextIndex < listIds.length) {
                    const nextId = listIds[nextIndex];
                    setSelectedCardId(nextId);
                    centerCameraOnCard(nextId, 1.0);
                }
            } else {
                // --- SPATIAL NAVIGATION (FREE LOOK MODE) ---
                const current = filteredCards.find(c => c.id === effectiveSelectedId);
                if (!current) return;

                let next: CardData | undefined;
                if (e.key === 'ArrowRight') next = filteredCards.filter(c => c.x > current.x).sort((a, b) => a.x - b.x)[0];
                else if (e.key === 'ArrowLeft') next = filteredCards.filter(c => c.x < current.x).sort((a, b) => b.x - a.x)[0];
                else if (e.key === 'ArrowDown') next = filteredCards.filter(c => c.y > current.y).sort((a, b) => a.y - b.y)[0];
                else if (e.key === 'ArrowUp') next = filteredCards.filter(c => c.y < current.y).sort((a, b) => b.y - a.y)[0];


                if (next) {
                    setSelectedCardId(next.id);
                    if (isFocusMode) {
                        // In free look focus mode, just select it
                        // User can pan if they want
                    } else {
                        // Standard canvas behavior — center card at viewport origin
                        setCamera(prev => {
                            const cardWidth = next!.width || 256;
                            const cardHeight = next!.height || 300;
                            const nextCenterX = next!.x + cardWidth / 2;
                            const nextCenterY = next!.y + cardHeight / 2;
                            return {
                                ...prev,
                                x: -(nextCenterX * prev.zoom),
                                y: -(nextCenterY * prev.zoom)
                            };
                        });
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedCardId, cards, isFocusMode, isCameraLocked, centerCameraOnCard, activeRoutineIds, shortcuts, handleGroupByTags, handleAddNote, navFilters]);



    // AI Chat & Action Handling
    const handleSendMessage = useCallback(async (textOverride?: string, audioUrl?: string) => {
        const text = typeof textOverride === 'string' ? textOverride : chatInput;
        if (!text?.trim() && !audioUrl) return;

        // Clear input if using text box
        if (!textOverride) setChatInput('');

        const userMsg: ChatMessage = { role: 'user', text: text || "Áudio enviado", timestamp: Date.now(), audioUrl };
        setChatMessages(prev => [...prev, userMsg]);

        setIsAiProcessing(true);

        // Add AI placeholder
        setChatMessages(prev => [...prev, { role: 'model', text: 'Thinking...', timestamp: Date.now() + 1 }]);

        // Call AI Service
        const actions: AiAction[] = await getTaskSuggestions(cards, userMsg.text, isFastMode);

        setIsAiProcessing(false);
        setChatMessages(prev => prev.slice(0, -1)); // Remove placeholder

        // Execute Actions
        for (const action of actions) {
            if (action.type === 'chat' && action.text) {
                setChatMessages(prev => [...prev, { role: 'model', text: action.text!, timestamp: Date.now() }]);
                speakText(action.text).catch(console.error);
            }
            else if (action.type === 'create_card' && action.cardData) {
                handleAddCard(action.cardData.parentId, action.cardData);
            }
            else if (action.type === 'move_card' && action.moveData) {
                const targetId = action.moveData.targetId;
                handleUpdateCard(targetId, { x: action.moveData.x, y: action.moveData.y });
            }
            else if (action.type === 'connect_cards' && action.connectData) {
                setConnections(prev => [...prev, {
                    id: crypto.randomUUID(),
                    fromId: action.connectData!.fromId,
                    toId: action.connectData!.toId,
                    label: action.connectData!.label
                }]);
            }
            else if (action.type === 'update_settings' && action.settingsData) {
                setCardBehaviorSettings(prev => ({ ...prev, ...action.settingsData }));
                setChatMessages(prev => [...prev, { role: 'model', text: "Updated behavior settings based on your request.", timestamp: Date.now() }]);
            }
            else if (action.type === 'camera_focus' && action.focusData) {
                centerCameraOnCard(action.focusData.targetId, action.focusData.zoom || 1.2);
            }
            else if (action.type === 'schedule_card' && action.scheduleData) {
                handleScheduleCard(action.scheduleData.targetId, action.scheduleData.start, action.scheduleData.reminderHours || 0);
            }
            else if (action.type === 'update_card' && action.updateData) {
                handleUpdateCard(action.updateData.targetId, action.updateData.updates);
            }
        }

        // Restart Voice Mode if continuous mic is enabled
        if (isContinuousMic) {
            setTimeout(() => {
                if (!isVoiceMode) setIsVoiceMode(true);
            }, 1000); // Small delay after AI finishes speaking
        }
    }, [cards, chatInput, handleAddCard, handleUpdateCard, isContinuousMic, isVoiceMode]);

    // --- Voice Mode Logic ---
    const handleSendMessageRef = useRef(handleSendMessage);
    useEffect(() => { handleSendMessageRef.current = handleSendMessage; }, [handleSendMessage]);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false; // Capture one phrase at a time
            recognition.lang = 'pt-BR';
            recognition.interimResults = true;

            recognition.onresult = (event: any) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        const finalResult = event.results[i][0].transcript;
                        if (finalResult) {
                            handleSendMessageRef.current(finalResult);
                            setInterimTranscription('');
                        }
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                setInterimTranscription(interim);
            };

            recognition.onend = () => {
                // Restart if voice mode is on AND AI isn't processing/speaking (prevents echo)
                if (isVoiceModeRef.current && !isAiProcessingRef.current) {
                    try { recognition.start(); } catch (e) { /* ignore */ }
                }
            };

            recognition.onerror = (e: any) => {
                console.error("Speech error", e);
                if (e.error === 'not-allowed') {
                    setIsVoiceMode(false);
                    speakText("Acesso ao microfone negado.");
                }
            };

            recognitionRef.current = recognition;
        } else {
            console.warn("Speech Recognition not supported in this browser.");
        }
    }, []);

    // --- Audio Recording Logic (WhatsApp Style) ---
    const startRecordingAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                handleSendMessage("MENSAGEM DE VOZ", audioUrl);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecordingAudio(true);
            setRecordingDuration(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            speakText("Não foi possível acessar o microfone para gravar.");
        }
    };

    const stopRecordingAudio = () => {
        if (mediaRecorderRef.current && isRecordingAudio) {
            mediaRecorderRef.current.stop();
            setIsRecordingAudio(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        }
    };

    const cancelRecordingAudio = () => {
        if (mediaRecorderRef.current && isRecordingAudio) {
            mediaRecorderRef.current.onstop = null; // Prevent sending
            mediaRecorderRef.current.stop();
            setIsRecordingAudio(false);
            if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Effect to start/stop based on mode and processing status
    useEffect(() => {
        const recognition = recognitionRef.current;
        if (!recognition) return;

        if (isVoiceMode && !isAiProcessing && !isLiveSessionActive) {
            try { recognition.start(); } catch (e) { /* ignore */ }
        } else {
            recognition.stop();
        }
    }, [isVoiceMode, isAiProcessing, isLiveSessionActive]);


    // Visual settings toggles
    const toggleConnectionStyle = () => setConnectionStyle(prev => prev === 'curved' ? 'straight' : 'curved');
    const toggleConnectionWidth = () => setConnectionWidth(prev => prev === 2 ? 4 : prev === 4 ? 8 : 2);
    const toggleConnectionLabels = () => setShowConnectionLabels(prev => !prev);



    // Extract all unique tags for filter display
    const allTags = Array.from(new Set(cards.flatMap(c => c.tags || []))).sort();

    const activeTask = cards.find(c => c.status === 'active');
    const nextTask = !activeTask ? cards.find(c => c.status === 'pending') : null;

    // Schedule Stats
    const scheduledTaskCount = cards.filter(c => c.scheduledStart).length;

    return (
        <div className="w-screen h-screen bg-[#fafafa] overflow-hidden relative font-sans text-gray-900">
            {/* Global Tag Search Overlay */}
            {!isFocusMode && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 group">
                    <div className="relative flex items-center">
                        <div className="absolute left-3 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por tags ou título..."
                            value={tagSearchQuery}
                            onChange={(e) => setTagSearchQuery(e.target.value)}
                            className="w-64 md:w-96 bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-full py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:w-80 md:focus:w-112 transition-all placeholder:text-gray-400 text-sm font-medium"
                        />
                        {tagSearchQuery && (
                            <button
                                onClick={() => setTagSearchQuery('')}
                                className="absolute right-3 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsFilterPopoverOpen(prev => !prev)}
                            className={`p-2.5 rounded-full transition-all flex items-center justify-center ${isFilterPopoverOpen || filterColor !== 'all' || filterTags.length > 0
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-white/80 backdrop-blur-md border border-white/20 text-gray-600 hover:text-blue-500 shadow-xl'
                                }`}
                            title="Filtros rápidos"
                        >
                            <Filter size={18} />
                        </button>
                        <button
                            onClick={() => setIsCanvasControlModalOpen(prev => !prev)}
                            className={`p-2.5 rounded-full transition-all flex items-center justify-center ${isCanvasControlModalOpen
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                                : 'bg-white/80 backdrop-blur-md border border-white/20 text-gray-600 hover:text-indigo-500 shadow-xl'
                                }`}
                            title="Gestão do Canvas"
                        >
                            <Activity size={18} />
                        </button>
                        {/* Metronome Button */}
                        <div className="relative">
                            <button
                                onClick={() => setIsMetronomeOpen(prev => !prev)}
                                className={`p-2.5 rounded-full transition-all flex items-center justify-center ${isMetronomeOpen
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                    : 'bg-white/80 backdrop-blur-md border border-white/20 text-gray-600 hover:text-violet-500 shadow-xl'
                                    }`}
                                title="Metrônomo"
                            >
                                <Music2 size={18} />
                            </button>
                            {isMetronomeOpen && (
                                <div className="absolute top-full mt-3 right-0 z-[200]">
                                    <MetronomePanel onClose={() => setIsMetronomeOpen(false)} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Dotted Grid Background */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                    backgroundSize: `${20 * camera.zoom}px ${20 * camera.zoom}px`,
                    backgroundPosition: `${camera.x}px ${camera.y}px`
                }}
            />
            {/* --- Focus Mode Overlay --- */}
            {isFocusMode && (
                <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center">
                    <div className="bg-gradient-to-b from-black/80 to-transparent w-full h-32 flex justify-center pt-8">
                        <div className="pointer-events-auto flex items-center gap-4">
                            {/* Status Pill with Lock Toggle */}
                            <div className="bg-dark-800 border border-white/20 rounded-full px-6 py-2 flex items-center gap-4 shadow-2xl">
                                <span className="text-sm font-bold tracking-widest text-blue-400 animate-pulse">
                                    {isCameraLocked ? 'LOCKED FOCUS' : 'FREE LOOK'}
                                </span>

                                <div className="w-[1px] h-4 bg-gray-600" />

                                <button
                                    onClick={toggleCameraLock}
                                    className={`p-1 rounded-full transition ${isCameraLocked ? 'text-green-400 hover:text-green-300' : 'text-yellow-400 hover:text-yellow-300'}`}
                                    title={isCameraLocked ? "Unlock Camera (Free Look)" : "Lock Camera (Auto-Focus)"}
                                >
                                    {isCameraLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                </button>

                                <button
                                    onClick={toggleFocusMode}
                                    className="bg-gray-700/50 hover:bg-gray-700 text-gray-200 hover:text-white rounded-full p-1 transition ml-2"
                                    title="Exit Focus Mode (Keep Running)"
                                >
                                    <Minimize2 size={16} />
                                </button>
                            </div>

                            <button
                                onClick={handleStopRoutine}
                                className="pointer-events-auto bg-red-600/80 hover:bg-red-500 text-white rounded-full px-4 py-2 text-sm font-bold shadow-2xl flex items-center gap-2"
                                title="Stop Active Routine"
                            >
                                <Square size={14} fill="currentColor" /> STOP ROUTINE
                            </button>
                        </div>
                    </div>

                    {/* Navigation Hints */}
                    <div className="absolute top-1/2 left-4 -translate-y-1/2 text-white/10 pointer-events-none transition-opacity duration-300">
                        <ChevronLeft size={64} />
                        <span className="block text-center text-xs opacity-50">{isCameraLocked ? 'PREV TASK' : 'PAN LEFT'}</span>
                    </div>
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 text-white/10 pointer-events-none transition-opacity duration-300">
                        <ChevronRight size={64} />
                        <span className="block text-center text-xs opacity-50">{isCameraLocked ? 'NEXT TASK' : 'PAN RIGHT'}</span>
                    </div>
                </div>
            )}

            {/* --- Live Camera Preview --- */}
            {isLiveSessionActive && liveVideoStream && (
                <div className="absolute bottom-4 right-4 z-50 w-64 h-48 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-orange-500/50 animate-in slide-in-from-bottom-10 fade-in duration-500">
                    <video
                        ref={videoRef => {
                            if (videoRef && liveVideoStream) {
                                videoRef.srcObject = liveVideoStream;
                                videoRef.play().catch(e => console.error("Video play error", e));
                            }
                        }}
                        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                        muted
                        playsInline
                    />
                    <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/60 px-2 py-1 rounded-full backdrop-blur-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-white tracking-wider">AI VISION ACTIVE</span>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-end justify-center pb-2">
                        <span className="text-[10px] text-white/70">Chronos is watching...</span>
                    </div>
                </div>
            )}
            {/* --- Canvas Navigation Controls --- */}
            {!isFocusMode && (
                <div className={`absolute z-50 flex gap-2 transition-all duration-300 ${isMobile ? 'bottom-20 left-4' : 'bottom-4 left-4'} flex-col bg-dark-800/80 backdrop-blur border border-white/10 p-2 rounded-lg shadow-xl`}>
                    <button onClick={handleZoomIn} className="p-2 bg-gray-700/50 hover:bg-blue-600 rounded transition-all text-white/70 hover:text-white" title="Zoom In (+)">
                        <ZoomIn size={18} />
                    </button>
                    <div className="text-[10px] font-black text-center text-white/40 font-mono py-1 border-y border-white/5">
                        {Math.round(camera.zoom * 100)}%
                    </div>
                    <button onClick={handleZoomOut} className="p-2 bg-gray-700/50 hover:bg-blue-600 rounded transition-all text-white/70 hover:text-white" title="Zoom Out (-)">
                        <ZoomOut size={18} />
                    </button>
                    <div className="h-[1px] bg-white/5 w-full my-1" />
                    <button onClick={handleResetCamera} className="p-2 bg-gray-700/50 hover:bg-indigo-600 rounded transition-all text-white/70 hover:text-white" title="Reset Camera (100%)">
                        <Maximize2 size={18} />
                    </button>
                </div>
            )}
            {/* --- Toolbar --- */}
            <div className={`fixed z-[3000] flex transition-all duration-300 ${isFocusMode || (isMobile && isAnyModalOpen) ? 'opacity-0 pointer-events-none translate-y-10' : 'opacity-100 translate-y-0'} ${isMobile ? 'bottom-0 inset-x-0 justify-center p-0 pointer-events-none' : 'top-4 left-4 flex-col gap-2 max-h-[calc(100vh-2rem)] overflow-visible no-select'}`}>
                {/* Scrollable creation section */}
                <div className={`flex pointer-events-auto ${isMobile ? 'flex-row items-center gap-2 bg-dark-800/95 backdrop-blur-xl border-t border-white/10 p-2 rounded-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)] w-full overflow-x-auto scrollbar-hide' : 'flex-col gap-2 bg-dark-800/80 backdrop-blur border border-white/10 p-2 rounded-lg shadow-xl max-h-[70vh] overflow-y-auto custom-scrollbar'}`}>
                    {/* Card creation buttons */}
                    {sidebarSettings.showAddCard && (
                        <button onClick={() => handleAddCard()} className="p-2 bg-blue-600 rounded hover:bg-blue-500 transition tooltip-container group">
                            <Plus size={20} />
                            <span className="absolute left-12 bg-black/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none whitespace-nowrap shadow-xl">Add Card</span>
                        </button>
                    )}
                    {sidebarSettings.showAddNote && (
                        <button onClick={handleAddNote} className="p-2 bg-yellow-600 rounded hover:bg-yellow-500 transition relative group" title="Add Note (Post-it)">
                            <StickyNote size={20} />
                            <span className="absolute left-12 bg-black/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none whitespace-nowrap shadow-xl">Add Note</span>
                        </button>
                    )}
                    {sidebarSettings.showBatchCard && (
                        <button onClick={handleAddBatchCard} className="p-2 bg-emerald-600 rounded hover:bg-emerald-500 transition relative group" title="Add Batch Task (Green)">
                            <Layers size={20} />
                            <span className="absolute left-12 bg-black/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none whitespace-nowrap shadow-xl">Batch Task</span>
                        </button>
                    )}
                    {sidebarSettings.showWhiteSquare && (
                        <button
                            onClick={() => {
                                const id = crypto.randomUUID();
                                handleAddCard(undefined, { id, title: '', description: '', color: 'white', type: 'note', width: 220, height: 220 });
                                setSelectedCardId(id);
                            }}
                            className="p-2 bg-gray-500 rounded hover:bg-gray-400 transition relative group"
                            title="Plain White Square (Note)"
                        >
                            <Square size={20} />
                            <span className="absolute left-12 bg-black/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none whitespace-nowrap shadow-xl">White Square</span>
                        </button>
                    )}
                    {sidebarSettings.showQuickCard && (
                        <button
                            onClick={() => {
                                const id = crypto.randomUUID();
                                handleAddCard(undefined, { id, title: '', description: '', color: 'yellow' });
                                setSelectedCardId(id);
                            }}
                            className="p-2 bg-orange-600 rounded hover:bg-orange-500 transition relative group"
                            title="Quick Card (Empty)"
                        >
                            <Zap size={20} />
                            <span className="absolute left-12 bg-black/90 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none whitespace-nowrap shadow-xl">Quick Card</span>
                        </button>
                    )}

                    {/* Tools */}
                    {sidebarSettings.showChat && (
                        <button onClick={() => toggleModal(setIsChatOpen, isChatOpen)} className="p-2 bg-purple-600 rounded hover:bg-purple-500 transition group">
                            <MessageSquare size={20} />
                        </button>
                    )}
                    {sidebarSettings.showTaskOrder && (
                        <>
                            <button onClick={() => toggleModal(setIsTaskOrderModalOpen, isTaskOrderModalOpen)} className="p-2 bg-gray-700 rounded hover:bg-gray-600 transition group" title="Ordered Task List">
                                <ListOrdered size={20} />
                            </button>
                            <button onClick={() => handleStartRoutine()} className="p-2 bg-rose-600 rounded hover:bg-rose-500 transition group" title="Modo Focus (Iniciar Routine)">
                                <Target size={20} />
                            </button>
                        </>
                    )}
                    {sidebarSettings.showEventManager && (
                        <button onClick={() => toggleModal(setIsEventModalOpen, isEventModalOpen)} className="p-2 bg-indigo-600 rounded hover:bg-indigo-500 transition group" title="Event Manager">
                            <Folder size={20} />
                        </button>
                    )}
                    {sidebarSettings.showMediaGallery && (
                        <button onClick={() => toggleModal(setIsGalleryModalOpen, isGalleryModalOpen)} className="p-2 bg-purple-600 rounded hover:bg-purple-500 transition group" title="Global Media Gallery">
                            <ImageIcon size={20} />
                        </button>
                    )}

                    {/* Calendar — main + extras */}
                    {sidebarSettings.showCalendarMain && (
                        <button onClick={() => toggleModal(setIsCalendarModalOpen, isCalendarModalOpen)} className="p-2 bg-green-600 rounded hover:bg-green-500 transition group relative" title="Calendar AI">
                            <Calendar size={20} />
                            {scheduledTaskCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                    {scheduledTaskCount}
                                </span>
                            )}
                        </button>
                    )}
                    {sidebarSettings.showExtraCalendars && (
                        <>
                            <button onClick={() => toggleModal(setIsCalendarModalOpen, isCalendarModalOpen)} className="p-2 bg-sky-600 rounded hover:bg-sky-500 transition group" title="Monthly Calendar View">
                                <CalendarDays size={20} />
                            </button>
                            <button onClick={() => toggleModal(setIsCalendarModalOpen, isCalendarModalOpen)} className="p-2 bg-teal-600 rounded hover:bg-teal-500 transition group" title="Weekly Calendar View">
                                <CalendarRange size={20} />
                            </button>
                        </>
                    )}

                    <div className="h-[1px] bg-gray-300 w-full my-1" />

                    {/* Auth Status / Login Button */}
                    <button
                        onClick={() => user ? signOut() : toggleModal(setIsAuthModalOpen, isAuthModalOpen)}
                        className={`p-2 rounded transition group shadow-lg ${user ? 'bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-500/30' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                        title={user ? "Sair da Conta" : "Entrar / Cadastrar"}
                    >
                        {user ? <LogOut size={20} /> : <LogIn size={20} />}
                        <span className="fixed left-16 bg-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition z-50 pointer-events-none">
                            {user ? 'Sair' : 'Entrar'}
                        </span>
                    </button>

                    {/* New Schedule Check Button */}
                    {sidebarSettings.showScheduleCheck && (
                        <button
                            onClick={() => toggleModal(setIsCalendarModalOpen, isCalendarModalOpen)}
                            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded transition group relative"
                            title="Active Scheduled Items"
                        >
                            <CalendarCheck2 size={20} />
                            {scheduledTaskCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                    {scheduledTaskCount}
                                </span>
                            )}
                        </button>
                    )}

                    {sidebarSettings.showCardManager && (
                        <button
                            onClick={() => toggleModal(setIsCardListOpen, isCardListOpen)}
                            className="p-2 bg-[#1a1c23] border border-white/5 hover:border-blue-500/30 text-white rounded transition group shadow-xl"
                            title="Gestor de Cards (Sidebar)"
                        >
                            <List size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}

                    {sidebarSettings.showCanvasControls && (
                        <button
                            onClick={() => toggleModal(setIsCanvasControlModalOpen, isCanvasControlModalOpen)}
                            className="p-2 bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white rounded transition group shadow-lg"
                            title="Canvas Performance & Controls"
                        >
                            <BarChart3 size={20} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    )}

                    {sidebarSettings.showSettings && (
                        <button
                            onClick={() => toggleModal(setIsSettingsModalOpen, isSettingsModalOpen)}
                            className="p-2 bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white rounded transition group"
                            title="Visual & Behavior Configuration"
                        >
                            <Settings size={20} />
                        </button>
                    )}

                    {sidebarSettings.showProfile && (
                        <button
                            onClick={() => toggleModal(setIsUserProfileModalOpen, isUserProfileModalOpen)}
                            className="p-2 bg-gradient-to-tr from-blue-700 to-purple-600 hover:from-blue-600 hover:to-purple-500 text-white rounded transition group shadow-lg"
                            title="AI Behavioral Profile"
                        >
                            <User size={20} />
                        </button>
                    )}

                    {sidebarSettings.showBackup && (
                        <button
                            onClick={handleBackupNow}
                            className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded transition group shadow-xl"
                            title="Backup Instantâneo para Nuvem"
                        >
                            <CloudUpload size={20} className="group-hover:translate-y-[-2px] transition-transform" />
                        </button>
                    )}

                    {sidebarSettings.showFeed && (
                        <button
                            onClick={() => toggleModal(setIsFeedOpen, isFeedOpen)}
                            className={`p-2 rounded transition group shadow-lg relative ${isFeedOpen ? 'bg-blue-600 text-white' : 'bg-dark-800 border border-white/10 text-gray-400 hover:text-white'}`}
                            title="Feed de Posts e Conquistas"
                        >
                            <TrendingUp size={20} />
                            {feedPosts.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse border-2 border-dark-900" />
                            )}
                        </button>
                    )}

                    {sidebarSettings.showDreamCenter && (
                        <button
                            onClick={() => toggleModal(setIsDreamModalOpen, isDreamModalOpen)}
                            className="p-2 bg-[#1a1c23] border border-white/5 hover:border-blue-500/30 text-blue-400 hover:text-blue-300 rounded transition group shadow-xl"
                            title="Centro de Sonhos & Objetivos Mundiais"
                        >
                            <Cloud size={20} className="group-hover:animate-bounce" />
                        </button>
                    )}

                    {sidebarSettings.showGifGallery && (
                        <button
                            onClick={() => toggleModal(setIsGifGalleryOpen, isGifGalleryOpen)}
                            className="p-2 bg-[#1a1c23] border border-white/5 hover:border-pink-500/30 text-pink-400 hover:text-pink-300 rounded transition group shadow-xl"
                            title="Galeria Global de GIFs"
                        >
                            <Zap size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}

                    {sidebarSettings.showGifConverter && (
                        <button
                            onClick={() => toggleModal(setIsGifConverterOpen, isGifConverterOpen)}
                            className="p-2 bg-[#1a1c23] border border-white/5 hover:border-cyan-500/30 text-cyan-400 hover:text-cyan-300 rounded transition group shadow-xl"
                            title="Conversor de Mídia para GIF"
                        >
                            <Film size={20} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    )}

                    {sidebarSettings.showNotifications && (
                        <button
                            onClick={() => {
                                if (dreamRequests.length > 0) {
                                    handleAcceptDreamRequest(dreamRequests[0]);
                                }
                            }}
                            className={`p-2 rounded transition group shadow-xl relative ${dreamRequests.length > 0 ? 'bg-yellow-500 text-black border-yellow-400 animate-bounce' : 'bg-[#1a1c23] border-white/5 text-gray-500'}`}
                            title="Solicitações de Especialista"
                        >
                            <Bell size={20} />
                            {dreamRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-black border-2 border-[#0d1117]">
                                    {dreamRequests.length}
                                </span>
                            )}
                        </button>
                    )}

                    {sidebarSettings.showMarketplace && (
                        <button
                            onClick={() => toggleModal(setIsPackGalleryOpen, isPackGalleryOpen)}
                            className="p-2 bg-[#1a1c23] border border-white/5 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded transition group shadow-xl"
                            title="Marketplace de Packs de Processos"
                        >
                            <Package size={20} className="group-hover:scale-110 transition-transform" />
                        </button>
                    )}


                    {user && (
                        <button
                            onClick={() => signOut()}
                            className="p-2 bg-dark-700 hover:bg-red-900/40 text-gray-300 hover:text-red-400 rounded transition group"
                            title="Sign Out"
                        >
                            <LogOut size={20} />
                        </button>
                    )}


                    {sidebarSettings.showShortcuts && (
                        <button
                            onClick={() => toggleModal(setIsShortcutsModalOpen, isShortcutsModalOpen)}
                            className="p-2 bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white rounded transition group"
                            title="Keyboard Shortcuts"
                        >
                            <Keyboard size={20} />
                        </button>
                    )}

                    {sidebarSettings.showHistory && (
                        <button
                            onClick={() => toggleModal(setIsHistoryPanelOpen, isHistoryPanelOpen)}
                            className="p-2 bg-dark-700 hover:bg-dark-600 text-gray-300 hover:text-white rounded transition group"
                            title="History & Insights"
                        >
                            <ScrollText size={20} />
                        </button>
                    )}

                    {sidebarSettings.showFocusMode && (
                        <button
                            onClick={toggleFocusMode}
                            className="p-2 bg-teal-600 rounded hover:bg-teal-500 transition group"
                            title="Enter Focus Mode"
                        >
                            <Maximize2 size={20} />
                        </button>
                    )}

                    <div className="w-8 h-[1px] bg-white/10 my-2" />

                    <button
                        onClick={() => toggleModal(setIsSidebarSettingsOpen, isSidebarSettingsOpen)}
                        className="p-2 bg-dark-900 border border-white/10 hover:border-blue-500/50 text-gray-500 hover:text-blue-400 rounded-xl transition shadow-xl"
                        title="Visibilidade da Sidebar"
                    >
                        <Eye size={20} />
                    </button>

                    {/* Voice Mode */}
                    {sidebarSettings.showVoiceMode && (
                        <button
                            onClick={() => setIsVoiceMode(!isVoiceMode)}
                            className={`p-2 rounded transition group relative ${isVoiceMode ? 'bg-red-500/20 text-red-500 border border-red-500 animate-pulse' : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-gray-600'}`}
                            title={isVoiceMode ? "Disable Voice Mode" : "Enable Voice Mode"}
                        >
                            {isVoiceMode ? <Mic size={20} /> : <MicOff size={20} />}
                            {isVoiceMode && (
                                <span className="absolute left-10 top-1/2 -translate-y-1/2 whitespace-nowrap bg-red-600 text-white text-[10px] px-2 py-0.5 rounded">
                                    Listening...
                                </span>
                            )}
                        </button>
                    )}

                    {/* Live Conversation Button */}
                    {sidebarSettings.showLiveAudio && (
                        <button
                            onClick={() => handleToggleLiveSession('audio')}
                            className={`p-2 rounded transition group relative ${isLiveSessionActive && !isVisionModeOpen && !isVoiceChatOpen ? 'bg-orange-500/20 text-orange-400 border border-orange-500 animate-pulse shadow-[0_0_15px_rgba(251,146,60,0.5)]' : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-gray-600'}`}
                            title="AI Live Conversation (Audio Only)"
                        >
                            <Headphones size={20} className={isLiveSessionActive && !isVisionModeOpen && !isVoiceChatOpen ? "animate-bounce" : ""} />
                        </button>
                    )}

                    {/* Voice Chat Button */}
                    {sidebarSettings.showVoiceChat && (
                        <button
                            onClick={() => handleToggleLiveSession('voice_chat')}
                            className={`p-2 rounded transition group relative ${isLiveSessionActive && isVoiceChatOpen ? 'bg-purple-500/20 text-purple-400 border border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-gray-600'}`}
                            title="Voice Chat (Audio + Text)"
                        >
                            <AudioLines size={20} className={isLiveSessionActive && isVoiceChatOpen ? "animate-pulse" : ""} />
                        </button>
                    )}

                    {/* Vision Mode Button — Camera opens independently, AI joins if available */}
                    {sidebarSettings.showVisionMode && (
                        <button
                            onClick={handleToggleCamera}
                            className={`p-2 rounded transition group relative ${isVisionModeOpen ? 'bg-blue-500/20 text-blue-400 border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-gray-600'}`}
                            title={isVisionModeOpen ? "Fechar Câmera" : "Abrir Câmera (IA se conecta se disponível)"}
                        >
                            <Eye size={20} />
                        </button>
                    )}

                    <div className="w-[1px] bg-white/10 h-6 mx-1 self-center hidden md:block" />
                    <div className="h-[1px] bg-white/10 w-full my-1 md:hidden" />

                    {/* AI Status / API Key Button */}
                    {sidebarSettings.showApiKey && (
                        <button
                            onClick={() => toggleModal(setIsApiKeyModalOpen, isApiKeyModalOpen)}
                            className="p-2 bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white rounded-xl transition group relative shadow-lg"
                            title="Configure Gemini API Key"
                        >
                            <Zap size={20} className={aiStatus === 'connected' ? 'text-purple-400' : 'text-gray-500'} />
                            {aiStatus !== 'idle' && (
                                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-dark-900 ${aiStatus === 'connected' ? 'bg-green-500 animate-blink-green' : 'bg-red-500 animate-blink-red'}`} />
                            )}
                        </button>
                    )}

                    {/* Filters — single button with popover */}
                    <div data-filter-popover className="relative flex flex-col items-center">
                        <button
                            onClick={() => setIsFilterPopoverOpen(prev => !prev)}
                            className={`p-2 rounded-xl transition relative ${filterColor !== 'all' || filterTags.length > 0
                                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                                : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-gray-600'
                                } shadow-lg`}
                            title="Filtros de Cor & Tags"
                        >
                            <Filter size={18} />
                            {(filterColor !== 'all' || filterTags.length > 0) && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-dark-900" />
                            )}
                        </button>

                        {isFilterPopoverOpen && (
                            <div
                                className={`absolute ${isMobile ? 'bottom-16 left-0' : 'left-12 top-0'} z-[1001] bg-[#1a1c23]/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 w-52 flex flex-col gap-3 animate-in fade-in ${isMobile ? 'slide-in-from-bottom-4' : 'slide-in-from-left-4'} duration-300`}
                            >
                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Filtrar por cor</div>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {(['red', 'yellow', 'purple', 'blue', 'green', 'gray', 'white'] as CardColor[]).map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setFilterColor(filterColor === color ? 'all' : color)}
                                            className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${filterColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                                                }`}
                                            style={{ backgroundColor: color === 'red' ? '#ef4444' : color === 'yellow' ? '#eab308' : color === 'purple' ? '#a855f7' : color === 'blue' ? '#3b82f6' : '#22c55e' }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => { setFilterColor('all'); setFilterTags([]); }}
                                    className={`text-[10px] font-bold rounded-lg px-2 py-1 transition ${filterColor === 'all' && filterTags.length === 0
                                        ? 'bg-white/10 text-white'
                                        : 'text-gray-500 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    ✕ Limpar filtros
                                </button>

                                {allTags.length > 0 && (
                                    <>
                                        <div className="h-[1px] bg-white/10 w-full" />
                                        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest"># Tags</div>
                                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                                            {allTags.map(tag => (
                                                <button
                                                    key={tag}
                                                    onClick={() => {
                                                        if (filterTags.includes(tag)) {
                                                            setFilterTags(prev => prev.filter(t => t !== tag));
                                                        } else {
                                                            setFilterTags(prev => [...prev, tag]);
                                                        }
                                                    }}
                                                    className={`text-[10px] px-2 py-1 rounded-lg truncate transition-all text-left ${filterTags.includes(tag)
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white/5 text-gray-400 hover:text-gray-200'
                                                        }`}
                                                    title={tag}
                                                >
                                                    #{tag}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* View Settings — single button with popover */}
                    <div data-tools-popover className="relative flex flex-col items-center">
                        <button
                            onClick={() => setIsToolsPopoverOpen(prev => !prev)}
                            className="p-2 bg-dark-800/80 backdrop-blur border border-white/10 rounded-lg shadow-xl text-gray-400 hover:text-white hover:bg-white/10 transition flex items-center justify-center"
                            title="Ferramentas de Conexão"
                        >
                            <Wrench size={18} />
                        </button>

                        {isToolsPopoverOpen && (
                            <div className={`absolute ${isMobile ? 'bottom-16 left-0' : 'left-12 top-0'} z-[1001] bg-[#1a1c23]/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 w-60 flex flex-col gap-3 animate-in fade-in ${isMobile ? 'slide-in-from-bottom-4' : 'slide-in-from-left-4'} duration-300`}>
                                {/* Group */}
                                <button
                                    onClick={handleGroupByTags}
                                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600/25 transition text-purple-300"
                                >
                                    <Target size={16} />
                                    <div className="text-left">
                                        <div className="text-xs font-bold">Agrupar por Tags</div>
                                        <div className="text-[9px] text-purple-400/60">Auto-organizar canvas (G)</div>
                                    </div>
                                </button>

                                <div className="h-[1px] bg-white/10 w-full" />
                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Estilo de Conexão</div>

                                {/* Connection Style */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { if (connectionStyle !== 'curved') toggleConnectionStyle(); }}
                                        className={`flex-1 p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${connectionStyle === 'curved'
                                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                            }`}
                                        title="Curvo"
                                    >
                                        <Spline size={14} /> Curvo
                                    </button>
                                    <button
                                        onClick={() => { if (connectionStyle === 'curved') toggleConnectionStyle(); }}
                                        className={`flex-1 p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${connectionStyle !== 'curved'
                                            ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                            }`}
                                        title="Reto"
                                    >
                                        <Minus size={14} /> Reto
                                    </button>
                                </div>

                                {/* Connection Width */}
                                <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">Espessura</div>
                                <div className="flex gap-1.5">
                                    {([2, 4, 8] as const).map(w => (
                                        <button
                                            key={w}
                                            onClick={() => { if (connectionWidth !== w) toggleConnectionWidth(); }}
                                            className={`flex-1 h-9 rounded-xl border transition flex items-center justify-center ${connectionWidth === w
                                                ? 'bg-blue-600/20 border-blue-500/40'
                                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                }`}
                                        >
                                            <div className="w-5 bg-current rounded-full" style={{ height: w === 2 ? 1 : w === 4 ? 2 : 4, opacity: connectionWidth === w ? 1 : 0.4 }} />
                                        </button>
                                    ))}
                                </div>

                                {/* Connection Labels */}
                                <div className="h-[1px] bg-white/10 w-full mt-1" />
                                <button
                                    onClick={toggleConnectionLabels}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition ${showConnectionLabels
                                        ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <Type size={14} /> Labels nas conexões
                                    </div>
                                    <div className={`w-8 h-4 rounded-full relative transition-colors ${showConnectionLabels ? 'bg-blue-600' : 'bg-white/10'
                                        }`}>
                                        <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showConnectionLabels ? 'translate-x-4' : ''
                                            }`} />
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- Modals --- */}
            <VoiceChatPanel
                isOpen={isVoiceChatOpen}
                onClose={() => setIsVoiceChatOpen(false)}
                isActive={isLiveSessionActive}
                onToggleSession={() => handleToggleLiveSession('voice_chat')}
                messages={voiceChatMessages}
            />

            {isVisionModeOpen && (
                <VisionMode
                    stream={liveStream}
                    isActive={isLiveSessionActive}
                    onClose={() => setIsVisionModeOpen(false)}
                    onToggleMic={() => { }}
                    isMicOn={true}
                    onSwitchCamera={() => {
                        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
                        if (isLiveSessionActive) {
                            handleToggleLiveSession('vision'); // Restart with new camera
                            setTimeout(() => handleToggleLiveSession('vision'), 500);
                        }
                    }}
                />
            )}

            <EventModal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                cards={cards}
                events={events}
                onSaveEvent={handleSaveEvent}
            />
            <CalendarModal
                isOpen={isCalendarModalOpen}
                onClose={() => setIsCalendarModalOpen(false)}
                cards={cards}
                events={events}
                onApplySchedule={handleApplySchedule}
                onBatchUpdate={handleBatchUpdate}
                onUnschedule={handleUnscheduleTask}
                scheduledCount={scheduledTaskCount}
            />
            <TaskOrderModal
                isOpen={isTaskOrderModalOpen}
                onClose={() => setIsTaskOrderModalOpen(false)}
                cards={cards}
                events={events}
                isRoutineActive={isFocusMode && activeRoutineIds.length > 0}
                onReorder={handleReorderCards}
                onStart={handleStartRoutine}
                onStop={handleStopRoutine}
                onLocate={handleLocateCard}
                onSaveEvent={handleSaveEvent}
                onDeleteEvent={handleDeleteEvent}
            />
            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                visualSettings={cardVisualSettings}
                behaviorSettings={cardBehaviorSettings}
                onUpdateVisual={setCardVisualSettings}
                onUpdateBehavior={setCardBehaviorSettings}
            />

            <UserProfileModal
                isOpen={isUserProfileModalOpen}
                onClose={() => setIsUserProfileModalOpen(false)}
                profile={userAiProfile}
                onUpdate={setUserAiProfile}
                onBackupNow={handleBackupNow}
                onRestoreBackup={handleRestoreBackup}
            />

            <CanvasControlModal
                isOpen={isCanvasControlModalOpen}
                onClose={() => setIsCanvasControlModalOpen(false)}
                filters={canvasFilters}
                onUpdateFilters={setCanvasFilters}
                stats={canvasStats}
                onClearCanvas={handleClearCanvas}
                availableTags={allTags}
                availableGroups={[]} // Expansion point
                onExpandAll={handleExpandAll}
                onResetFilters={handleResetFilters}
            />

            <CardListSidebar
                isOpen={isCardListOpen}
                onClose={() => setIsCardListOpen(false)}
                cards={cards}
                onSelectCard={(id) => {
                    handleSelectCard(id);
                    centerCameraOnCard(id, 1.2);
                    setIsCardListOpen(false);
                }}
            />

            <MediaGalleryModal
                isOpen={isGalleryModalOpen}
                onClose={() => setIsGalleryModalOpen(false)}
                galleryItems={galleryItems}
                setGalleryItems={setGalleryItems}
                cards={cards}
                events={events}
                onUpdateCard={handleUpdateCard}
            />
            <ShortcutsModal
                isOpen={isShortcutsModalOpen}
                onClose={() => setIsShortcutsModalOpen(false)}
                shortcuts={shortcuts}
                onUpdateShortcuts={setShortcuts}
                navFilters={navFilters}
                onUpdateNavFilters={setNavFilters}
            />

            <SidebarSettingsModal
                isOpen={isSidebarSettingsOpen}
                onClose={() => setIsSidebarSettingsOpen(false)}
                settings={sidebarSettings}
                onUpdate={(updates) => setSidebarSettings(prev => ({ ...prev, ...updates }))}
            />

            <HistoryPanel
                isOpen={isHistoryPanelOpen}
                onClose={() => setIsHistoryPanelOpen(false)}
                cards={cards}
            />
            {editingTimerCardId && (
                <TimerSettingsModal
                    isOpen={!!editingTimerCardId}
                    onClose={() => setEditingTimerCardId(null)}
                    card={cards.find(c => c.id === editingTimerCardId)!}
                    onUpdate={(updates) => handleUpdateCard(editingTimerCardId, updates)}
                    onAiOptimize={handleAiOptimize}
                    isAiOptimizing={isAiOptimizing}
                />
            )}

            {/* --- Connecting Indicator --- */}
            {connectingFromId && !isFocusMode && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500/20 text-blue-300 border border-blue-500 px-4 py-2 rounded-full animate-pulse backdrop-blur flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    Drag to another card to connect...
                    <button onClick={() => setConnectingFromId(null)} className="ml-4 text-white underline font-bold px-2 py-0.5 hover:bg-white/10 rounded">Cancel</button>
                </div>
            )}

            {/* --- Canvas --- */}
            <div
                ref={containerRef}
                className={`w-full h-full ${isFocusMode && isCameraLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDrop={handleCanvasDrop}
                onDragOver={handleDragOver}
                style={{
                    backgroundImage: isFocusMode ? 'none' : 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundColor: isFocusMode ? '#000' : 'transparent',
                    backgroundSize: '30px 30px',
                    transition: 'background-color 0.5s ease',
                    userSelect: (isDragging || draggingCardId || isResizing) ? 'none' : 'auto'
                }}
            >
                <div
                    className="absolute left-1/2 top-1/2 w-0 h-0 will-change-transform"
                    style={{
                        transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
                        transition: (isDragging || draggingCardId || isResizing) ? 'none' : 'transform 0.5s ease-in-out'
                    }}
                >
                    {cardsToRender.map(card => {
                        const attachedNotes = cards.filter(c => c.parentId === card.id && c.type === 'note');
                        const childrenCount = cards.filter(c => c.parentId === card.id && c.type !== 'note').length;
                        const connectionCount = connections.filter(c => c.fromId === card.id || c.toId === card.id).length;
                        return (
                            <CardNode
                                key={card.id}
                                card={card}
                                visualSettings={card.visualSettings || cardVisualSettings}
                                behaviorSettings={cardBehaviorSettings}
                                isSelected={selectedCardId === card.id}
                                isActiveTask={activeTask?.id === card.id}
                                isNextTask={nextTask?.id === card.id}
                                onUpdate={handleUpdateCard}
                                onDelete={deleteCard}
                                onSelect={handleSelectCard}
                                onStartDrag={handleCardDragStart}
                                onConnectStart={handleConnectStart}
                                onConnectEnd={handleConnectEnd}
                                onBreakdown={handleBreakdown}
                                onSnooze={handleSnooze}
                                onSkip={handleSkip}
                                onCompleteTask={handleCompleteTask}
                                onIncompleteTask={handleIncompleteTask}
                                onMicroTaskComplete={handleMicroTaskComplete}
                                onAutoDuration={handleAutoDuration}
                                isDragging={draggingCardId === card.id || isDragging}
                                onTimerClick={(id) => { closeAllModals(); setEditingTimerCardId(id); }}
                                connectionCount={connectionCount}
                                onAddSubCard={handleAddCard}
                                onResizeStart={handleCardResizeStart}
                                attachedNotes={attachedNotes}
                                childrenCount={childrenCount}
                                onAddNoteToCard={handleAddNoteToCard}
                                onCenterView={centerCameraOnCard}
                                onSchedule={(id) => { closeAllModals(); setSchedulingCardId(id); }}
                                onPostponeAi={handlePostponeAi}
                                onShare={handleShareCard}
                                onLike={(id) => {
                                    handleUpdateCard(id, { completionCount: (cards.find(c => c.id === id)?.completionCount || 0) + 1 });
                                }}
                                isMobile={isMobile}
                            />
                        );
                    })}

                    {!isFocusMode && (
                        <ConnectionLayer
                            connections={connections}
                            cards={cards} // Always use full cards list for stable center calculation
                            visibleCardIds={visibleCardIds}
                            connectionStyle={connectionStyle}
                            strokeWidth={connectionWidth}
                            showLabels={showConnectionLabels}
                            connectingFromId={connectingFromId}
                            connectingMousePos={connectingMousePos}
                            onUpdateCard={handleUpdateCard}
                        />
                    )}

                    {connectionDropMenu && (
                        <div
                            className="absolute bg-white text-black rounded shadow-xl border border-gray-200 py-1 z-[100] min-w-[160px] animate-in fade-in zoom-in duration-150"
                            style={{
                                left: connectionDropMenu.x,
                                top: connectionDropMenu.y,
                                transform: `scale(${1 / camera.zoom})`,
                                transformOrigin: 'top left'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm transition-colors"
                                onClick={() => {
                                    handleAddCard(connectionDropMenu.parentId, { x: connectionDropMenu.x, y: connectionDropMenu.y });
                                    setConnectionDropMenu(null);
                                }}
                            >
                                <Plus size={14} className="text-blue-500" /> Add card
                            </button>
                            <button
                                className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm transition-colors"
                                onClick={() => {
                                    handleAddCard(connectionDropMenu.parentId, {
                                        x: connectionDropMenu.x,
                                        y: connectionDropMenu.y,
                                        type: 'note',
                                        title: 'New Note',
                                        color: 'yellow',
                                        timerTotal: 0,
                                        timerRemaining: 0
                                    });
                                    setConnectionDropMenu(null);
                                }}
                            >
                                <StickyNote size={14} className="text-yellow-600" /> Add note from vault
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Chat Panel --- */}
            <div className={`fixed inset-0 md:inset-y-0 md:right-0 md:left-auto w-full md:w-96 md:m-4 bg-white/95 backdrop-blur-2xl border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.1)] md:rounded-[32px] transform transition-all duration-500 ease-out flex flex-col z-[4000] ${isChatOpen ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95 pointer-events-none'}`}>
                <div className="p-6 border-b border-gray-50 flex justify-between items-center relative">
                    <div>
                        <h2 className="font-black text-gray-900 flex items-center gap-2 text-lg tracking-tighter">
                            <div className="p-2 bg-blue-50 rounded-xl">
                                <Target className="text-blue-500" size={20} />
                            </div>
                            AI Assistant
                        </h2>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 ml-11">Chronos Logic</p>
                    </div>
                    <div className="flex items-center gap-2" data-ai-settings>
                        <button
                            onClick={() => setIsFastMode(!isFastMode)}
                            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all border ${isFastMode ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-gray-50 text-gray-400 hover:text-amber-500 hover:bg-amber-50 border-gray-100'}`}
                            title={isFastMode ? "Fast Mode On" : "Fast Mode Off"}
                        >
                            <Zap size={18} fill={isFastMode ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={() => setIsAiSettingsOpen(!isAiSettingsOpen)}
                            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all border ${isAiSettingsOpen ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-gray-50 text-gray-400 hover:text-blue-500 hover:bg-blue-50 border-gray-100'}`}
                            title="AI Voice & Language Settings"
                        >
                            <Settings size={20} />
                        </button>
                        <button onClick={() => setIsChatOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all border border-gray-100">
                            <X size={20} />
                        </button>
                    </div>

                    {isAiSettingsOpen && (
                        <div className="absolute top-20 right-6 z-[4001] w-64 bg-white border border-gray-100 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-5 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Available Voice</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['Aoede', 'Charon', 'Kore', 'Puck', 'Zephyr', 'Enceladus'].map(voice => (
                                            <button
                                                key={voice}
                                                onClick={() => setAiVoice(voice)}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${aiVoice === voice ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-blue-200'}`}
                                            >
                                                {voice}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-[1px] bg-gray-50 w-full" />

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Language</label>
                                    <div className="flex flex-col gap-1.5">
                                        {['Português (Brasil)', 'English (US)', 'Español', 'Français'].map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setAiLanguage(lang)}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between ${aiLanguage === lang ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-100'}`}
                                            >
                                                {lang}
                                                {aiLanguage === lang && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto md:p-6 p-4 space-y-6 custom-scrollbar scrollbar-hide">
                    {chatMessages.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center px-8 opacity-60">
                            <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4 border border-gray-100">
                                <Bot className="text-blue-500" size={32} />
                            </div>
                            <p className="text-sm font-bold text-gray-600">How can I help you today?</p>
                            <p className="text-xs mt-2 leading-relaxed">Ask me to create tasks, organize your layout, or connect cards in a sequence.</p>
                        </div>
                    )}
                    {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm relative group shadow-sm transition-all ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                }`}>
                                <div className="flex items-center gap-2">
                                    {msg.audioUrl && (
                                        <button
                                            onClick={() => {
                                                const audio = new Audio(msg.audioUrl);
                                                audio.play();
                                            }}
                                            className="p-1.5 bg-black/10 hover:bg-black/20 rounded-full transition-all"
                                        >
                                            <AudioLines size={14} />
                                        </button>
                                    )}
                                    <span className="font-medium leading-relaxed">{msg.text}</span>
                                </div>
                                {msg.role === 'model' && msg.text !== 'Thinking...' && (
                                    <button onClick={() => speakText(msg.text).catch(console.error)} className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-500 transition-all">
                                        <Mic size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {isVoiceMode && !isAiProcessing && (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {interimTranscription && (
                                <div className="flex justify-end">
                                    <div className="max-w-[85%] p-4 rounded-2xl text-sm bg-blue-50 text-blue-600 italic border border-blue-100 rounded-tr-none shadow-sm">
                                        {interimTranscription}...
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-start">
                                <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-2xl text-[10px] flex items-center gap-3 border border-blue-100 font-bold uppercase tracking-wider shadow-sm">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                                    </span>
                                    Chronos está ouvindo...
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50/50 border-t border-gray-100 rounded-b-[32px] space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <button
                            onClick={() => setIsContinuousMic(!isContinuousMic)}
                            className={`text-[9px] font-black px-3 py-1 rounded-full border transition-all tracking-widest ${isContinuousMic ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'}`}
                        >
                            {isContinuousMic ? "HANDS-FREE: ON" : "HANDS-FREE: OFF"}
                        </button>
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Input Mode</span>
                    </div>

                    {isRecordingAudio ? (
                        <div className="flex items-center gap-4 bg-white border border-red-100 rounded-2xl px-4 py-3 shadow-lg shadow-red-500/5 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-red-500 text-sm font-bold font-mono">{formatDuration(recordingDuration)}</span>
                                <div className="flex-1 h-1.5 bg-red-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 animate-waveform w-full origin-left" style={{ animationDuration: '0.5s' }} />
                                </div>
                            </div>
                            <button onClick={cancelRecordingAudio} className="text-gray-300 hover:text-gray-500 transition-colors">
                                <X size={20} />
                            </button>
                            <button onClick={stopRecordingAudio} className="w-10 h-10 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 flex items-center justify-center">
                                <Send size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex items-center gap-2">
                            <div className="relative flex-1 group">
                                <input
                                    className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm text-gray-800 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 pr-12 transition-all placeholder:text-gray-400 font-medium shadow-sm"
                                    placeholder="Ask AI..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                />
                                <button onClick={() => handleSendMessage()} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-600 transition-colors p-1.5 hover:bg-blue-50 rounded-lg" disabled={isAiProcessing}>
                                    {isAiProcessing ? <Activity size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setIsVoiceMode(!isVoiceMode)}
                                    className={`w-12 h-12 rounded-2xl transition-all border flex items-center justify-center ${isVoiceMode ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/30 active:scale-95' : 'bg-white border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-300 shadow-sm'}`}
                                    title={isVoiceMode ? "Mute Microphone" : "Speak to AI"}
                                >
                                    {isVoiceMode ? <Mic size={22} /> : <MicOff size={22} />}
                                </button>

                                <button
                                    onMouseDown={startRecordingAudio}
                                    className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all border border-blue-400/30 shadow-lg shadow-blue-600/20 flex items-center justify-center active:scale-95"
                                    title="Segure para gravar áudio"
                                >
                                    <AudioLines size={22} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Help / Shortcuts Overlay */}
            <div className="absolute bottom-4 right-4 text-xs text-gray-500 pointer-events-none select-none">
                Click the circle node to connect cards • Double-click card to edit • Scroll to Zoom
            </div>

            {/* Auth Overlay */}
            {isAuthModalOpen && !authLoading && (
                <AuthUI onClose={() => setIsAuthModalOpen(false)} />
            )}

            {authLoading && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                        <span className="text-white font-medium">Carregando Chronos...</span>
                    </div>
                </div>
            )}
            <ScheduleModal
                isOpen={!!schedulingCardId}
                onClose={() => setSchedulingCardId(null)}
                card={cards.find(c => c.id === schedulingCardId) || null}
                onSchedule={handleScheduleCard}
            />
            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setIsApiKeyModalOpen(false)}
                currentKey={apiKey}
                onSave={handleSaveApiKey}
                diagnostics={apiDiagnostics}
            />
            <AiCallOverlay
                callState={aiCallState}
                onAccept={handleAcceptCall}
                onDecline={handleEndCall}
                onEnd={handleEndCall}
                userAvatar={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'anon'}`}
            />

            <FeedPanel
                isOpen={isFeedOpen}
                onClose={() => setIsFeedOpen(false)}
                posts={feedPosts}
                onLike={handleLikePost}
                onCall={(cardId) => {
                    const card = cards.find(c => c.id === cardId);
                    if (card) {
                        setAiCallState({
                            isActive: false,
                            incoming: true,
                            cardId,
                            callerName: 'Chronos IA',
                            callerAvatar: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=Chronos&backgroundColor=b6e3f4',
                            reason: (card.failureCount || 0) > 0 ? 'motivation' : 'followup'
                        });
                    }
                }}
                currentUserId={user?.id || 'anon'}
            />

            <DreamModal
                isOpen={isDreamModalOpen}
                onClose={() => setIsDreamModalOpen(false)}
                userProfile={userAiProfile}
                onUpdateProfile={(updates) => setUserAiProfile(prev => ({ ...prev, ...updates }))}
                onShareDream={handleShareDream}
                sharedDreams={sharedDreams}
                onInteractWithDream={handleInteractWithDream}
            />

            <DreamInteractionModal
                isOpen={isDreamInteractionOpen}
                onClose={() => setIsDreamInteractionOpen(false)}
                dream={activeDreamForInteraction}
                session={dreamSession}
                onSendMessage={handleSendMessageToAiDream}
                isAiProcessing={isAiProcessingDream}
                onActionComplete={handleCreateCardsFromDream}
            />

            <GifGalleryModal
                isOpen={isGifGalleryOpen}
                onClose={() => setIsGifGalleryOpen(false)}
                sharedGifs={sharedGifs}
                onSaveToGallery={handleSaveGifToGallery}
                onLikeGif={handleLikeGif}
            />

            <GifConverterModal
                isOpen={isGifConverterOpen}
                onClose={() => setIsGifConverterOpen(false)}
                gallery={galleryItems}
                onShareGif={handleShareGif}
                onSaveToGallery={handleSaveGifToGallery}
            />

            <DreamSprintModal
                isOpen={isDreamSprintOpen}
                onClose={() => setIsDreamSprintOpen(false)}
                request={activeDreamRequest}
                onFinishSprint={handleFinishSprint}
            />

            <PackGalleryModal
                isOpen={isPackGalleryOpen}
                onClose={() => setIsPackGalleryOpen(false)}
                packs={processPacks}
                onLoadPack={handleLoadPack}
            />
        </div>
    );
}

export default App;
