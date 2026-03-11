import { GoogleGenAI, Type, Modality, LiveServerMessage, FunctionDeclaration } from "@google/genai";
import { CardData, CardColor, UserAiProfile } from "../types";

const getApiKey = () => {
    return (import.meta as any).env.VITE_GEMINI_API_KEY ||
        (import.meta as any).env.GEMINI_API_KEY ||
        (import.meta as any).env.VITE_BACKUP_GEMINI_API_KEY ||
        (import.meta as any).env.VITE_GEMINI_API_KEY_SECONDARY ||
        'AIzaSyDlbQg25TuIfYk5-YGA9DowvtiL8XHyihs';
};

// Use lazy initialization to avoid crash if API key is not ready during module load
let _ai: GoogleGenAI | null = null;

export const getAi = () => {
    if (!_ai) {
        const key = getApiKey() || 'placeholder-key';
        _ai = new GoogleGenAI({ apiKey: key });
    }
    return _ai;
};

export const setGeminiApiKey = (key: string) => {
    _ai = new GoogleGenAI({ apiKey: key });
    console.log('[Gemini] API key updated, new instance created.');
};

// Always use current instance to avoid stale closures
export const getCurrentAi = () => _ai || getAi();




export const validateApiKey = async (): Promise<boolean> => {
    try {
        // Simple call to check if key is valid using the environment's model
        await getCurrentAi().models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ parts: [{ text: "ping" }] }]
        });
        return true;
    } catch (e: any) {
        console.error("API Key validation failed:", e);
        // Log the specific error message to help debug
        if (e.message) console.log("Error details:", e.message);
        return false;
    }
};

// --- Audio Helpers ---

function floatTo16BitPCM(input: Float32Array) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
}

function base64ToUint8Array(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// --- Live API Implementation ---

export const connectLiveSession = async (
    onHabitDetected: (habit: string, implication: string) => void,
    onStatusChange: (isActive: boolean) => void,
    onStreamReady?: (stream: MediaStream) => void,
    onTranscript?: (text: string, isUser: boolean) => void,
    facingMode: 'user' | 'environment' = 'user',
    onRescheduleCard?: (cardId: string, newStartTime: string) => void,
    cards: CardData[] = [],
    voice: string = 'Puck',
    language: string = 'Português (Brasil)',
    isFastMode: boolean = false
) => {
    let audioContext: AudioContext | null = null;
    let mediaStream: MediaStream | null = null;
    let audioProcessor: ScriptProcessorNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let nextStartTime = 0;
    let videoInterval: any = null;

    // Tool Definition
    const habitTool: FunctionDeclaration = {
        name: 'registerUserHabit',
        description: 'Registra um hábito, comportamento ou preferência percebido do usuário durante a conversa.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                habit: { type: Type.STRING, description: 'O hábito ou comportamento observado.' },
                implication: { type: Type.STRING, description: 'O que isso significa para a produtividade dele.' }
            },
            required: ['habit', 'implication']
        }
    };

    const rescheduleTool: FunctionDeclaration = {
        name: 'rescheduleCard',
        description: 'Reagenda uma tarefa/card que o usuário não conseguiu concluir ou que está pendente.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                cardId: { type: Type.STRING, description: 'O ID do card a ser reagendado.' },
                newStartTime: { type: Type.STRING, description: 'A nova data e hora de início no formato ISO.' }
            },
            required: ['cardId', 'newStartTime']
        }
    };

    const createCardsTool: FunctionDeclaration = {
        name: 'createMultipleCards',
        description: 'Cria múltiplos cards de uma vez no canvas. Útil para "Modo Rápido" ou quando o usuário pede listas/passos.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                cards: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: 'Título do card' },
                            description: { type: Type.STRING, description: 'Descrição curta' },
                            parentId: { type: Type.STRING, description: 'ID do card pai se for um subcard ou nota anexa' },
                            type: { type: Type.STRING, enum: ['task', 'note'], description: 'Tipo do card' },
                            color: { type: Type.STRING, enum: ['white', 'blue', 'purple', 'green', 'yellow', 'red'], description: 'Cor do card' }
                        },
                        required: ['title']
                    }
                }
            },
            required: ['cards']
        }
    };

    try {
        // ... previous setup code ...
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                sampleRate: 16000
            },
            video: {
                facingMode: facingMode,
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 15 }
            }
        });

        if (onStreamReady && mediaStream) {
            onStreamReady(mediaStream);
        }

        const cardContext = cards.map(c => `ID: ${c.id}, Título: ${c.title}, Status: ${c.status} `).join('\n');

        // 2. Connect to Gemini Live
        const sessionPromise = getCurrentAi().live.connect({
            model: 'gemini-2.0-flash-exp',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: `Você é a Chronos, uma assistente de produtividade IA motivadora e empática. 
                Fale em ${language} com um tom casual, enérgico e amigável.
    ${language === 'Português (Brasil)' ? 'Comece a conversa cumprimentando o usuário e comentando algo positivo que você vê.' : 'Start the conversation by greeting the user and commenting on something positive you see.'} 
                Your goal is to help the user stay motivated and productive.
                
                DURING THE CONVERSATION:
1. Give practical productivity TIPS based on what you see or hear.
                2. Ask reflective QUESTIONS to help the user think clearly.
                3. MOTIVATION: Use encouraging phrases.

    RESCHEDULING:
                If the user mentions they couldn't finish something or if you notice incomplete cards, use the 'rescheduleCard' tool to ask and set a new time.
                
                CURRENT CARDS ON CANVAS:
                ${cardContext}
                
                ${isFastMode ? 'MODO RÁPIDO ATIVO: Seja extremamente produtivo e rápido. Se o usuário pedir para criar vários cards ou notas, use a ferramenta createMultipleCards imediatamente para criar todos. Não hesite em criar 10, 20 cards se solicitado. Use cor "white" por padrão a menos que pedido diferente.' : ''}

                Use 'registerUserHabit' to note important behaviors discreetly.`,
                tools: [{ functionDeclarations: [habitTool, rescheduleTool, createCardsTool] }]
            },
            callbacks: {
                onopen: () => {
                    console.log("Live Session Connected");
                    onStatusChange(true);

                    // --- Audio Handling ---
                    source = audioContext!.createMediaStreamSource(mediaStream!);
                    audioProcessor = audioContext!.createScriptProcessor(4096, 1, 1);

                    audioProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const pcm16 = floatTo16BitPCM(inputData);
                        const base64Data = arrayBufferToBase64(pcm16);

                        sessionPromise.then(session => {
                            session.sendRealtimeInput({
                                media: {
                                    mimeType: `audio / pcm; rate = ${audioContext?.sampleRate || 16000} `,
                                    data: base64Data
                                }
                            });
                        });
                    };

                    source.connect(audioProcessor);
                    audioProcessor.connect(audioContext!.destination);

                    // --- Video Handling ---
                    // Use standard Video element + Canvas for broad browser support
                    const video = document.createElement('video');
                    video.srcObject = mediaStream;
                    video.muted = true;
                    video.playsInline = true; // Important for mobile
                    video.play().catch(e => console.warn("Video play error", e));

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    let hasSentInitialFrame = false;

                    videoInterval = setInterval(() => {
                        if (video.readyState >= 2 && ctx) { // HAVE_CURRENT_DATA or better
                            try {
                                canvas.width = video.videoWidth / 2; // Downscale
                                canvas.height = video.videoHeight / 2;
                                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                                const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

                                sessionPromise.then(session => {
                                    const payload: any = {
                                        media: {
                                            mimeType: 'image/jpeg',
                                            data: base64Image
                                        }
                                    };

                                    // Send text prompt ONLY with the very first frame to force a reaction
                                    if (!hasSentInitialFrame) {
                                        session.sendRealtimeInput(payload);
                                        // Send text as a separate input if supported, or just rely on the image context
                                        // For now, let's just send the image payload. The system instruction already tells it to react.
                                        // If we really need text, we might need to use a different method or format.
                                        // But to fix the type error, we remove the array.
                                        hasSentInitialFrame = true;
                                    } else {
                                        session.sendRealtimeInput(payload);
                                    }
                                }).catch(e => {
                                    // Session might be closed
                                });
                            } catch (e) {
                                // Ignore frame capture errors
                            }
                        }
                    }, 1000); // Send 1 frame per second
                },
                onmessage: async (msg: LiveServerMessage) => {
                    // Handle Tool Calls
                    if (msg.toolCall) {
                        for (const fc of msg.toolCall.functionCalls) {
                            if (fc.name === 'registerUserHabit') {
                                const args = fc.args as any;
                                onHabitDetected(args.habit, args.implication);

                                sessionPromise.then(session => {
                                    session.sendToolResponse({
                                        functionResponses: {
                                            id: fc.id,
                                            name: fc.name,
                                            response: { result: "Habit saved successfully." }
                                        }
                                    });
                                });
                            } else if (fc.name === 'rescheduleCard') {
                                const args = fc.args as any;
                                if (onRescheduleCard) {
                                    onRescheduleCard(args.cardId, args.newStartTime);
                                }

                                sessionPromise.then(session => {
                                    session.sendToolResponse({
                                        functionResponses: {
                                            id: fc.id,
                                            name: fc.name,
                                            response: { result: "Card rescheduled successfully." }
                                        }
                                    });
                                });
                            } else if (fc.name === 'createMultipleCards') {
                                const args = fc.args as any;
                                if (args.cards && Array.isArray(args.cards)) {
                                    args.cards.forEach((cData: any) => {
                                        // We map the internal function calls to the external handler
                                        // The external handler for this tool will need to be implemented in App.tsx
                                        // or we can invoke handleAddCard directly if we pass it.
                                        // For Live session, we use a custom callback.
                                        (window as any).__dispatchAiAction?.({
                                            type: 'create_card',
                                            cardData: {
                                                ...cData,
                                                color: cData.color || 'white', // Default to white as requested
                                                x: Math.random() * 500 - 250,
                                                y: Math.random() * 500 - 250
                                            }
                                        });
                                    });
                                }
                                sessionPromise.then(session => {
                                    session.sendToolResponse({
                                        functionResponses: {
                                            id: fc.id,
                                            name: fc.name,
                                            response: { result: `${args.cards?.length || 0} cards criados.` }
                                        }
                                    });
                                });
                            }
                        }
                    }

                    // Handle Audio Output
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContext) {
                        try {
                            const audioBytes = base64ToUint8Array(audioData);

                            // Create buffer for 24kHz (Standard Gemini Live output)
                            const buffer = audioContext.createBuffer(1, audioBytes.length / 2, 24000);
                            const channelData = buffer.getChannelData(0);

                            // CRITICAL: Use DataView to enforce Little Endian decoding
                            const dataView = new DataView(audioBytes.buffer, audioBytes.byteOffset, audioBytes.byteLength);
                            for (let i = 0; i < channelData.length; i++) {
                                // Read 16-bit signed integer, Little Endian = true
                                const int16 = dataView.getInt16(i * 2, true);
                                channelData[i] = int16 / 32768.0;
                            }

                            const source = audioContext.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioContext.destination);

                            // Schedule playback
                            const currentTime = audioContext.currentTime;
                            // If nextStartTime is in the past, reset it to now to avoid huge delays
                            if (nextStartTime < currentTime) {
                                nextStartTime = currentTime;
                            }
                            source.start(nextStartTime);
                            nextStartTime += buffer.duration;
                        } catch (e) {
                            console.error("Audio decoding error", e);
                        }
                    }

                    // Handle Transcription (if available)
                    // Check for model turn text (output transcription)
                    const modelText = msg.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
                    if (modelText && onTranscript) {
                        onTranscript(modelText, false);
                    }

                    // Check for user turn text (input transcription) - usually in a different message type or part
                    // Note: The SDK might expose this differently. We check standard places.
                    // For now, we rely on model output. User input transcription might come in 'clientContent' or similar if echoed, 
                    // but typically the server sends 'turnComplete' with input text? 
                    // Actually, for now let's just capture model output. User input visualization might need local STT if the API doesn't echo it.
                },
                onclose: () => {
                    console.log("Live Session Closed");
                    onStatusChange(false);
                },
                onerror: (e) => {
                    console.error("Live Session Error", e);
                    onStatusChange(false);
                }
            }
        });

        return () => {
            sessionPromise.then(session => session.close());
            if (source) source.disconnect();
            if (audioProcessor) audioProcessor.disconnect();
            if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
            if (audioContext) audioContext.close();
            if (videoInterval) clearInterval(videoInterval);
        };

    } catch (e) {
        console.error("Failed to connect live session", e);
        onStatusChange(false);
        speakText("Não foi possível conectar a sessão ao vivo. Verifique o microfone.", voice);
        return () => { };
    }
};

// --- Existing REST Services ---

// Audio Decoding Helpers (Keeping existing ones for TTS fallback)
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number = 24000,
    numChannels: number = 1,
): Promise<AudioBuffer> {
    // Use DataView for safe endianness handling even in TTS fallback
    const frameCount = data.byteLength / 2 / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Offset: i * 2 * numChannels + channel * 2
            const offset = (i * numChannels + channel) * 2;
            const int16 = dataView.getInt16(offset, true);
            channelData[i] = int16 / 32768.0;
        }
    }
    return buffer;
}

export const speakText = async (text: string, voice: string = 'Charon') => {
    try {
        const response = await getCurrentAi().models.generateContent({
            model: "gemini-1.5-flash",
            contents: { parts: [{ text: text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) return;

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioCtx);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.onended = () => {
            audioCtx.close();
        };
        source.start();

    } catch (error) {
        console.error("TTS Error:", error);
    }
};

export const generateCardImage = async (title: string, description: string): Promise<string | null> => {
    try {
        const response = await getCurrentAi().models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: `Create a futuristic, minimalist, cyberpunk style square icon / image representing the task: "${title}".Description: ${description}. High contrast, dark background.`,
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data: image / png; base64, ${part.inlineData.data} `;
            }
        }
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
};

export const breakDownTask = async (taskTitle: string): Promise<Array<{ title: string; description: string; duration: number }>> => {
    try {
        const response = await getCurrentAi().models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Break down the task "${taskTitle}" into exactly 5 sequential sub - steps to help a user organize their routine.Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING, description: "Short title of the sub-task" },
                            description: { type: Type.STRING, description: "Brief description" },
                            duration: { type: Type.NUMBER, description: "Estimated duration in minutes (integer)" }
                        },
                        required: ["title", "description", "duration"],
                    },
                },
            },
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (error) {
        console.error("Error breaking down task:", error);
        return [];
    }
};

export interface AiAction {
    type: 'chat' | 'create_card' | 'move_card' | 'connect_cards' | 'update_settings' | 'camera_focus' | 'schedule_card' | 'update_card';
    text?: string;
    cardData?: {
        title: string;
        description: string;
        type?: 'task' | 'note';
        x?: number;
        y?: number;
        color?: string;
        shape?: 'rectangle' | 'circle' | 'hexagon' | 'diamond';
        timerFillMode?: 'none' | 'pizza-slice' | 'radial-card-fill';
        parentId?: string;
    };
    moveData?: {
        targetId: string;
        x: number;
        y: number;
    };
    connectData?: {
        fromId: string;
        toId: string;
        label?: string;
    };
    settingsData?: {
        requireClickToStart?: boolean;
        requireClickToFinish?: boolean;
        requireClickToStartTimer?: boolean;
        requireClickToStartInterval?: boolean;
        requireClickToEndInterval?: boolean;
        requireClickToStartPostTime?: boolean;
        requireClickToFinishPostTime?: boolean;
    };
    focusData?: {
        targetId: string;
        zoom?: number;
    };
    scheduleData?: {
        targetId: string;
        start: string; // ISO
        reminderHours?: number;
    };
    updateData?: {
        targetId: string;
        updates: Partial<CardData>;
    };
}

export const getTaskSuggestions = async (cards: CardData[], query: string, isFastMode: boolean = false): Promise<AiAction[]> => {
    try {
        const cardContext = cards.map(c =>
            `ID: ${c.id}, Título: ${c.title}, Status: ${c.status}, Pos: (${Math.round(c.x)}, ${Math.round(c.y)})`
        ).join('\n');

        const systemPrompt = `You are Chronos, a relaxed, fun, and energetic productivity assistant.You speak Portuguese(Brazil).
        
        Current Cards on Canvas:
        ${cardContext}
        
        Definitions of Card Styles(Use these when asked to create specifically):
- CLASSIC: Color: 'blue', Shape: 'rectangle'.Professional and clear.
        - NICE: Color: 'purple', Shape: 'circle'.Elegant and stylish.
        - GREEN: Color: 'green', Shape: 'rectangle'.For growth and success.
        - NOTE / POST - IT: Color: 'yellow', Shape: 'rectangle', Type: 'note'.Smaller, quick notes.
        
        Advanced Capabilities:
1. NESTING: If the user says "create X in Y", find Y's ID and set 'parentId' in 'cardData'.
2. CAMERA CONTROL: Use 'camera_focus' to center the view on a card.
        3. SCHEDULING: Use 'schedule_card' to set a start time(ISO string).
        4. TIMER MODES: Use 'update_card' with 'updates: { timerFillMode: "pizza-slice" }' for "pizza" mode, or "radial-card-fill" for "bar" mode. "none" is numeric.
        5. FUZZY MATCHING: If the user mentions a card title, find the closest ID from context.
        
        User Query: ${query}

        ${isFastMode ? 'FAST MODE ENABLED: Be hyper-productive. If user asks for multiple items (e.g. "create 10 cards", "5 notes"), return ALL of them as separate create_card actions in one list IMMEDIALTELY. Do not explain much, just do it. Use color "white" for general tasks unless specific style is requested.' : ''}

Instructions:
- Return a list of actions.
        - Always include a 'chat' action with a concise, fun response.
        - If asked to "planejar" or "dicas", analyze current cards and suggest connections or moves.
        `;

        const response = await getCurrentAi().models.generateContent({
            model: "gemini-2.0-flash",
            contents: systemPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['chat', 'create_card', 'move_card', 'connect_cards', 'update_settings', 'camera_focus', 'schedule_card', 'update_card'] },
                            text: { type: Type.STRING },
                            cardData: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['task', 'note'] },
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER },
                                    color: { type: Type.STRING, enum: ['red', 'yellow', 'purple', 'blue', 'green', 'gray', 'white'] },
                                    shape: { type: Type.STRING, enum: ['rectangle', 'circle', 'hexagon', 'diamond'] },
                                    timerFillMode: { type: Type.STRING, enum: ['none', 'pizza-slice', 'radial-card-fill'] },
                                    parentId: { type: Type.STRING }
                                }
                            },
                            moveData: {
                                type: Type.OBJECT,
                                properties: {
                                    targetId: { type: Type.STRING },
                                    x: { type: Type.NUMBER },
                                    y: { type: Type.NUMBER }
                                }
                            },
                            connectData: {
                                type: Type.OBJECT,
                                properties: {
                                    fromId: { type: Type.STRING },
                                    toId: { type: Type.STRING },
                                    label: { type: Type.STRING }
                                }
                            },
                            settingsData: {
                                type: Type.OBJECT,
                                properties: {
                                    requireClickToStart: { type: Type.BOOLEAN },
                                    requireClickToFinish: { type: Type.BOOLEAN },
                                    requireClickToStartTimer: { type: Type.BOOLEAN },
                                    requireClickToStartInterval: { type: Type.BOOLEAN },
                                    requireClickToEndInterval: { type: Type.BOOLEAN },
                                    requireClickToStartPostTime: { type: Type.BOOLEAN },
                                    requireClickToFinishPostTime: { type: Type.BOOLEAN }
                                }
                            },
                            focusData: {
                                type: Type.OBJECT,
                                properties: {
                                    targetId: { type: Type.STRING },
                                    zoom: { type: Type.NUMBER }
                                }
                            },
                            scheduleData: {
                                type: Type.OBJECT,
                                properties: {
                                    targetId: { type: Type.STRING },
                                    start: { type: Type.STRING },
                                    reminderHours: { type: Type.NUMBER }
                                }
                            },
                            updateData: {
                                type: Type.OBJECT,
                                properties: {
                                    targetId: { type: Type.STRING },
                                    updates: { type: Type.OBJECT }
                                }
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [{ type: 'chat', text: "I couldn't process that." }];
        return JSON.parse(text) as AiAction[];

    } catch (e) {
        console.error(e);
        return [{ type: 'chat', text: "Error connecting to AI assistant." }];
    }
}

export const scheduleTasks = async (
    tasksToSchedule: { id: string; title: string; durationMinutes: number }[],
    startTimeISO: string,
    endTimeISO: string,
    busySlots: { start: string; end: string }[] = [],
    userProfile?: UserAiProfile
): Promise<Array<{ id: string; start: string; end: string }>> => {

    try {
        const response = await getCurrentAi().models.generateContent({
            model: "gemini-2.0-flash",
            contents: `
                I have a list of new tasks to schedule between ${startTimeISO} and ${endTimeISO}.

Constraints:
1. You must find empty time slots for the NEW TASKS.
                2. You MUST NOT overlap with the following BUSY SLOTS: ${JSON.stringify(busySlots)}.
3. The new tasks are: ${JSON.stringify(tasksToSchedule)}.
4. Schedule as many new tasks as possible in the sequence provided, filling gaps.
    ${userProfile ? `5. Consider the USER PROFILE for better placement: ${JSON.stringify(userProfile)}. Avoid scheduling near sleepTime (${userProfile.sleepTime}) or during peak energy times if the task is minor (or vice versa). Preference: ${userProfile.preferredPeriod}.` : ''}
                
                Return a JSON array of scheduled objects.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            start: { type: Type.STRING, description: "ISO Date String" },
                            end: { type: Type.STRING, description: "ISO Date String" }
                        },
                        required: ["id", "start", "end"]
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);
    } catch (e) {
        console.error("Scheduling error", e);
        return [];
    }
};

export const estimateTaskDuration = async (title: string, description: string): Promise<number> => {
    try {
        const response = await getCurrentAi().models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Estimate the duration in minutes for this task: "${title}".Description: "${description}".Return ONLY the number(integer).If unclear, default to 15.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        duration: { type: Type.NUMBER }
                    }
                }
            }
        });
        const text = response.text;
        if (!text) return 15;
        const json = JSON.parse(text);
        return json.duration || 15;
    } catch (e) {
        console.error("Duration estimation error", e);
        return 15;
    }
};

export async function optimizeTaskSchedule(
    card: CardData,
    completedHistory: CardData[]
): Promise<{
    timerTotal: number;
    preTime: number;
    postTime: number;
    intervals: { count: number; duration: number };
    reasoning: string;
}> {
    const historySummary = completedHistory.map(c =>
        `- ${c.title}: ${Math.round(c.timerTotal / 60)}m total, ${c.intervals?.count || 0} intervals`
    ).join('\n');

    const prompt = `
    Analyze this task and the user's history to determine the optimal timing configuration.
    
    Current Task:
Title: ${card.title}
Description: ${card.description}
    
    User History(Completed Tasks):
    ${historySummary}

Determine:
1. Total Duration(in seconds)
2. Pre - Time(warmup in seconds)
3. Post - Time(cooldown in seconds)
4. Intervals(count and duration in seconds)
5. Reasoning(Explain why you chose these times based on the task type and history)
    
    Return ONLY JSON:
{
    "timerTotal": number,
        "preTime": number,
            "postTime": number,
                "intervals": { "count": number, "duration": number },
    "reasoning": "string"
}
`;

    try {
        const response = await getCurrentAi().models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ parts: [{ text: prompt }] }],
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");

        return JSON.parse(text);
    } catch (error) {
        console.error("Error optimizing schedule:", error);
        return {
            timerTotal: 1800,
            preTime: 60,
            postTime: 60,
            intervals: { count: 1, duration: 1500 },
            reasoning: "Default fallback due to error."
        };
    }
}

export const analyzeScheduleDeeply = async (cards: CardData[]): Promise<Array<{ id: string, thought: string }>> => {
    try {
        // We only analyze cards that have a title
        const taskList = cards.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            timerTotal: c.timerTotal,
            metrics: c.metrics, // Include behavioral metrics
            currentHistory: c.aiThoughts?.map(t => t.content).join(" | ") || "No history."
        }));

        const response = await getCurrentAi().models.generateContent({
            model: "gemini-2.0-flash",
            contents: `
                Perform a deep cognitive analysis on this user's task list to improve their productivity habits.
                
                For EACH task, I want you to:
1. Reflect on the task's meaning and complexity.
2. Consult the 'currentHistory'(previous thoughts) if available.
                3. Estimate realistic duration vs assigned duration.
                4. Identify potential psychological barriers(procrastination triggers) or habits.
                5. Think about the sequence(what should come before / after).
                6. ANALYZE BEHAVIORAL METRICS(if available): Look for 'delaySeconds' and 'negativeTime' in the 'metrics' array. 
                   - High delay before starting timer = Procrastination / Hesitation.
                   - High negative time(overtime) = Obsession or Flow State(or just forgetting to stop).
                   - Delay in intervals = Distraction.

    Tasks: ${JSON.stringify(taskList)}
                
                Return a JSON array where each object contains the card 'id' and a 'thought' string.The thought string should be a concise but deep paragraph of your analysis.
            `,
            config: {
                thinkingConfig: { thinkingBudget: 2048 }, // Enable Deep Thinking
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            thought: { type: Type.STRING }
                        },
                        required: ["id", "thought"]
                    }
                }
            }
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);

    } catch (error) {
        console.error("Deep Think Error:", error);
        return [];
    }
}

export const analyzePomodoroLap = async (
    imageBase64: string | undefined,
    transcription: string | undefined,
    lapDurationSeconds: number,
    lapIndex: number
): Promise<{
    title: string;
    description: string;
    recommendedMinutes: number;
    reasoning: string;
}> => {
    try {
        const parts: any[] = [];

        const textPrompt = `Você é um assistente de produtividade.Analise este momento de foco do usuário(Lap #${lapIndex}, duração: ${Math.round(lapDurationSeconds / 60)}min ${lapDurationSeconds % 60}s).
    ${transcription ? `Transcrição do que o usuário falou: "${transcription}"` : 'Sem transcrição de áudio.'}
${imageBase64 ? 'Uma imagem da câmera está incluída.' : 'Sem imagem disponível.'}

Com base nisso, responda em JSON:
- "title": Um título curto e preciso para esta sessão de foco(máx 6 palavras, em português)
    - "description": Uma descrição do que o usuário estava fazendo / pensando(1 - 2 frases, em português)
        - "recommendedMinutes": O tempo ideal recomendado para esta tarefa em minutos(número inteiro, baseado na complexidade observada)
            - "reasoning": Justificativa curta da recomendação de tempo(1 frase, em português)`;

        parts.push({ text: textPrompt });

        if (imageBase64) {
            const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                }
            });
        }

        const response = await getCurrentAi().models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ parts }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        recommendedMinutes: { type: Type.NUMBER },
                        reasoning: { type: Type.STRING }
                    },
                    required: ['title', 'description', 'recommendedMinutes', 'reasoning']
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error('No response');
        return JSON.parse(text);
    } catch (error) {
        console.error('Pomodoro lap AI analysis error:', error);
        return {
            title: `Lap #${lapIndex} `,
            description: transcription || 'Sessão de foco registrada.',
            recommendedMinutes: 25,
            reasoning: 'Tempo padrão aplicado.'
        };
    }
};

export const getDreamInteractionResponse = async (
    dream: any,
    history: { role: 'ai' | 'pro', text: string }[],
    proProfession: string
): Promise<{
    text: string;
    reasoning: string;
    status: 'active' | 'completed';
    generatedCards?: Array<{
        title: string;
        description: string;
        color: string;
        shape: string;
        timerTotal: number
    }>
}> => {
    try {
        const systemPrompt = `Você é a Chronos IA, especializada em mapeamento de processos para objetivos e sonhos.
        
        CONTEXTO DO SONHO:
- Descrição: ${dream.dreamDescription}
- Desafios Vencidos: ${dream.challengesOvercome}
- Desejado por alguém que quer ser: ${dream.userProfession}
        
        PROFISSIONAL INTERAGINDO:
- Profissão: ${proProfession}
        
        OBJETIVO DA SESSÃO:
        Fazer perguntas ao profissional de ${proProfession} para descobrir DETALHES PROCESSUAIS que só um especialista sabe sobre como realizar este sonho.
        A cada resposta, você deve:
1. Analisar tecnicamente.
        2. Identificar possíveis cards de tarefas(processos).
        3. Fazer uma nova pergunta ou finalizar se tiver cards suficientes(mínimo 3, máximo 5).
        
        HISTÓRICO DA CONVERSA:
        ${history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n')}
        
        INSTRUÇÕES DE RESPOSTA(JSON):
- "text": Sua fala(em Português do Brasil, tom encorajador).
- "reasoning": Seu raciocínio lógico por trás dessa pergunta / conclusão.
        - "status": 'active' para continuar a entrevista ou 'completed' se já tiver detalhes suficientes para 3 - 5 cards.
        - "generatedCards": (Opcional, preencha quando status for 'completed') Lista de objetos com title, description, color, shape, timerTotal(em segundos).`;

        const response = await getCurrentAi().models.generateContent({
            model: "gemini-2.0-flash",
            contents: systemPrompt,
            config: {
                thinkingConfig: { thinkingBudget: 1024 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING },
                        reasoning: { type: Type.STRING },
                        status: { type: Type.STRING, enum: ['active', 'completed'] },
                        generatedCards: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    color: { type: Type.STRING },
                                    shape: { type: Type.STRING },
                                    timerTotal: { type: Type.NUMBER }
                                }
                            }
                        }
                    },
                    required: ["text", "reasoning", "status"]
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response from AI");
        return JSON.parse(text);

    } catch (e) {
        console.error("Dream Interaction Error:", e);
        return {
            text: "Opa, tive um problema na rede global. Pode repetir o que disse?",
            reasoning: "Erro de conexão API.",
            status: 'active'
        };
    }
};
