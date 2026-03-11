export type CardStatus = 'pending' | 'active' | 'completed' | 'skipped';
export type CardColor = 'red' | 'yellow' | 'purple' | 'blue' | 'green' | 'gray' | 'white';
export type CardShape = 'rectangle' | 'circle' | 'hexagon' | 'diamond';

export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'video' | 'gif' | 'pdf';
  url: string; // Base64 data or URL
  timestamp: number;
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'audio' | 'video' | 'gif' | 'pdf';
  url: string;
  name?: string;
  timestamp: number;
}

export interface IntervalSettings {
  count: number;
  duration: number; // seconds per interval
}

export interface AiThought {
  timestamp: number;
  content: string;
}

export interface CardVisualSettings {
  showImage: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showTimer: boolean;
  showCompleteBtn: boolean;
  showDeleteBtn: boolean;
  showSchedule: boolean;
  showIntervals: boolean;
  showTags: boolean;
  showLastCompleted: boolean;
  showCompletionCount: boolean;
  showAttachmentIndicator: boolean; // "Indicator of attached images"
  showAttachmentActions: boolean;   // "Icon to attach image/audio"

  // Defaults
  defaultShape?: CardShape;
  defaultColor?: CardColor;

  // Typography
  fontFamily?: string;
  fontSize?: number;
}

export interface CardBehaviorSettings {
  // Timing
  preTimeSeconds: number; // Warm-up time before task starts
  postTimeSeconds: number; // Cooldown/Buffer time after task ends

  // Pauses
  maxPauses: number;
  pauseDuration: number; // Duration value
  pauseDurationMode: 'fixed' | 'percent'; // 'fixed' = seconds, 'percent' = % of total card time

  // Interaction Toggles
  requireClickToStart: boolean; // If true, routine won't auto-start card, user must click
  requireClickToFinish: boolean; // If true, timer ending won't auto-complete, user must click done
  autoFlowAfterPostTime: boolean; // If true, automatically goes to next card after post-time ends

  // Granular Click Toggles
  requireClickToStartTimer: boolean; // After pre-time ends, wait for click to start main timer
  requireClickToStartInterval: boolean; // When interval is due, wait for click to start interval
  requireClickToEndInterval: boolean; // When interval ends, wait for click to resume main task
  requireClickToStartPostTime: boolean; // After task finishes, wait for click to start post-time
  requireClickToFinishPostTime: boolean; // After post-time ends, wait for click to finalize
}

export interface InteractionMetric {
  phase: 'pre-start' | 'timer-start' | 'interval-start' | 'interval-end' | 'task-end' | 'post-start' | 'post-end';
  expectedTime: number; // Timestamp when it *should* have happened
  actualTime: number;   // Timestamp when it *did* happen
  delaySeconds: number; // Difference
  negativeTime?: number; // For intervals/timers running over
}

export interface SlideSettings {
  isEnabled: boolean;
  idleTimeout: number; // in seconds
  interval: number; // in seconds
  mediaType: 'all' | 'image' | 'video' | 'audio' | 'gif';
  transitionEffect: 'fade' | 'slide' | 'zoom';
  showIdleTime?: boolean; // Toggle to show time since last completion/creation
}

export interface Lap {
  id: string;
  timestamp: number;
  time: number; // The chronoCurrent value at the time of the lap
  duration: number; // Time since last lap or start
}

export interface PomodoroConfig {
  timerSeconds: number;         // Default timer duration (e.g. 25 * 60)
  direction: 'up' | 'down';     // Countup or countdown
  lapTimeEnabled: boolean;      // Whether lap time mode is on
  captureEnabled: boolean;      // Whether auto-capture (audio + photo + transcript) is on
  captureWindowSeconds: number; // Window in seconds (10–60) for capture after activation/lap
  aiEnabled: boolean;           // When true, AI analyzes each lap's image + transcription
}

export interface PomodoroLap {
  id: string;
  timestamp: number;            // When this lap/session was triggered
  duration: number;             // Seconds elapsed in this lap
  audioUrl?: string;            // Base64 audio recording
  imageUrl?: string;            // Base64 camera snapshot
  transcription?: string;       // Speech-to-text result
  lapIndex: number;             // Lap number (1-based)
  // AI-generated fields
  aiTitle?: string;
  aiDescription?: string;
  aiRecommendedMinutes?: number;
  aiReasoning?: string;
  isAnalyzing?: boolean;        // True while AI is processing
}

export interface CardPaneElement {
  id: string;
  type: 'image' | 'video' | 'audio' | 'gif' | 'pdf' | 'text' | 'location' | 'note' | 'calendar';
  content: string;
  timestamp: number;
  width?: number;
  height?: number;
}

export interface CardPane {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'pdf' | 'location' | 'note' | 'empty' | 'mixed' | 'calendar';
  content?: string; // Legacy / Primary content
  elements?: CardPaneElement[]; // Multiple items in one pane
  title?: string;
  attachments?: Attachment[];
  timestamp: number;
}

export interface CompletionRecord {
  id: string;
  index: number;
  type: 'completed' | 'deferred' | 'not_finished' | 'pushed' | 'skipped' | 'green' | 'others';
  completedAt: number; // data de clique
  startedAt?: number;   // data inicio do cronometro
  endedAt?: number;     // data fim do cronometro
  duration: number;    // duração cronometro
  idleDuration: number;// duração que ficou sem clicar (since last completion/creation/previous completion)
}

export interface CardData {
  id: string;
  type?: 'task' | 'note' | 'media';
  createdAt?: number; // Timestamp of creation
  x: number;
  y: number;
  title: string;
  description: string;
  color: CardColor;
  shape?: CardShape;
  timerTotal: number; // in seconds
  timerRemaining: number; // in seconds
  status: CardStatus;
  imageUrl?: string; // Main cover image
  imageShape?: 'circle' | 'rectangle';
  aspectRatio?: number;
  timerFillMode?: 'none' | 'pizza-slice' | 'radial-card-fill';
  parentId?: string; // For nesting visualization
  notes: string[];
  isExpanded?: boolean; // If expanded, shows children
  width?: number; // Current width of the card
  height?: number; // Current height of the card
  progress?: number; // 0-100, calculated from sub-cards

  // Multi-Pane Support
  panes?: CardPane[];
  activePaneIndex?: number;

  // Detailed Info Fields
  tags: string[];
  completionCount: number;
  failureCount?: number;
  lastCompleted?: number; // Timestamp
  attachments: Attachment[];
  intervals?: IntervalSettings;
  currentInterval?: number; // 1-based index of current interval
  metrics?: InteractionMetric[]; // Behavioral tracking
  microTaskCount?: number;
  targetMicroTasks?: number;
  incompleteCount?: number;
  completionHistory?: CompletionRecord[]; // Detailed completion history

  // Chrono/Lap Fields
  lapTimeEnabled?: boolean;
  laps?: Lap[];

  // Card-specific Behavior Overrides
  preTimeSeconds?: number;
  postTimeSeconds?: number;

  // Scheduling
  scheduledStart?: string; // ISO String
  scheduledEnd?: string;   // ISO String
  reminderHours?: number;  // Hours before to notify
  alarmPlayed?: boolean;   // To avoid repeating the alarm

  // Deep Thinking
  aiThoughts?: AiThought[]; // History of AI analysis

  // Sticky Notes & Connections
  isInternal?: boolean;
  isConnectionHidden?: boolean;

  // Wallpaper/Slide Settings
  slideSettings?: SlideSettings;
  visualSettings?: CardVisualSettings;
  wallpaperMode?: boolean;
  backgroundMode?: boolean;
  scheduleFailureHandled?: boolean;
  lastInteractionTimestamp?: number;
  lastDuration?: number; // in seconds
  bestDuration?: number; // in seconds

  // Pomodoro / Focus Mode
  pomodoroEnabled?: boolean;
  pomodoroConfig?: PomodoroConfig;
  pomodoroLaps?: PomodoroLap[];
}


export interface EventGroup {
  id: string;
  title: string;
  cardIds: string[];
}

export interface Connection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  audioUrl?: string; // For voice messages
}

export interface BackupInfo {
  id: string;
  timestamp: number;
  type: 'local' | 'cloud';
  name: string;
  filePath?: string;
}

export interface UserAiProfile {
  userName?: string;
  localVaultPath?: string;
  isSyncEnabled: boolean;
  backupFrequency: 'hour' | 'daily' | 'weekly' | 'manual';
  backups: BackupInfo[];
  preferredPeriod: 'morning' | 'afternoon' | 'evening';
  postponeTarget: 'tomorrow' | 'day_after' | 'next_week';
  sleepTime: string; // HH:mm
  wakeTime: string; // HH:mm
  peakEnergyTime: 'morning' | 'afternoon' | 'evening' | 'night';
  mealTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  physicalActivityDays: string[]; // ['monday', 'wednesday'...]
  computerWorkPreference: 'morning' | 'afternoon' | 'evening' | 'night';
  readingPreference: 'morning' | 'afternoon' | 'evening' | 'night';
  spendingTendencyDays: string[];
  profession?: string;
}


export interface CanvasFilters {
  showPending: boolean;
  showCompleted: boolean;
  showMedia: boolean;
  showNotes: boolean;
  selectedTags: string[];
  selectedGroups: string[];
  hideAll: boolean;
}

export interface CanvasStats {
  cardCount: number;
  mediaCount: number;
  noteCount: number;
  connectionCount: number;
  interactionSpeedMs: number; // Time for a typical canvas operation
  loadLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface NavigationFilters {
  allowNotes: boolean;
  allowNice: boolean;
  allowGreen: boolean;
  allowClassic: boolean;
  allowFaster: boolean;
  allowMedia: boolean;
}


export interface FeedPost {
  id: string;
  cardId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: number;
  likes: number;
  likedBy: string[]; // List of user IDs who liked
  cardData: CardData; // Snapshot of the card when shared
  stats: {
    completed: number;
    pending: number;
    postponed: number;
    completionTime?: number; // seconds
    record?: number; // seconds
  };
}

export interface AiCallState {
  isActive: boolean;
  incoming: boolean;
  cardId?: string;
  callerName: string;
  callerAvatar: string;
  reason?: 'motivation' | 'praise' | 'followup';
}

export interface DreamCard {
  id: string;
  userId: string;
  userName: string;
  userProfession: string;
  dreamDescription: string;
  challengesOvercome: string;
  conquests: string;
  remainingSteps: string;
  difficulties: string;
  motivation: string;
  timestamp: number;
}

export interface DreamInteractionSession {
  id: string;
  dreamId: string;
  professionalUserId: string;
  professionalProfession: string;
  messages: { role: 'ai' | 'pro'; text: string; timestamp: number; reasoning?: string }[];
  status: 'active' | 'completed';
  generatedCards?: Partial<CardData>[];
}

export interface SharedGif {
  id: string;
  url: string;
  userId: string;
  userName: string;
  timestamp: number;
  likes: number;
  downloadCount: number;
}

export interface DreamRequest {
  id: string;
  dreamerName: string;
  dreamDescription: string;
  professionRequired: string;
  timestamp: number;
}

export interface ProcessPack {
  id: string;
  profession: string;
  creatorName: string;
  dreamDescription: string;
  cards: Partial<CardData>[];
  timestamp: number;
  downloads: number;
}

export interface SidebarSettings {
  // Produtividade
  showScheduleCheck: boolean;
  showCardManager: boolean;
  showCanvasControls: boolean;
  showSettings: boolean;
  showProfile: boolean;
  showBackup: boolean;
  showFeed: boolean;
  showDreamCenter: boolean;
  showGifGallery: boolean;
  showGifConverter: boolean;
  showNotifications: boolean;
  showMarketplace: boolean;
  showShortcuts: boolean;
  showHistory: boolean;
  showFocusMode: boolean;
  // Criação de cards
  showAddCard: boolean;
  showAddNote: boolean;
  showBatchCard: boolean;
  showWhiteSquare: boolean;
  showQuickCard: boolean;
  // Ferramentas
  showChat: boolean;
  showTaskOrder: boolean;
  showEventManager: boolean;
  showMediaGallery: boolean;
  // Agendamento (calendar)
  showCalendarMain: boolean;
  showExtraCalendars: boolean; // CalendarDays + CalendarRange
  // IA / Voz
  showVoiceMode: boolean;
  showLiveAudio: boolean;
  showVoiceChat: boolean;
  showVisionMode: boolean;
  showApiKey: boolean;
  // Automação
  autoShareIncomplete: boolean;
}